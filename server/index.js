import express from "express";
import cors from "cors";
import multer from "multer";
import { trace } from "potrace";
import sharp from "sharp";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => res.send("OK"));

function extractSubpaths(d) {
  const idx = [];
  for (let i = 0; i < d.length; i++) {
    const c = d[i];
    if (c === "M" || c === "m") idx.push(i);
  }
  if (idx.length <= 1) return [d.trim()];

  const parts = [];
  for (let i = 0; i < idx.length; i++) {
    const start = idx[i];
    const end = i + 1 < idx.length ? idx[i + 1] : d.length;
    const piece = d.slice(start, end).trim();
    if (piece) parts.push(piece);
  }
  return parts.filter((p) => p[0] === "M" || p[0] === "m");
}

function extractViewBox(svg) {
  const m = svg.match(
    /viewBox="([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)"/
  );
  if (!m) return { width: 1000, height: 1000, left: 0, top: 0 };
  return {
    left: Number(m[1]),
    top: Number(m[2]),
    width: Number(m[3]),
    height: Number(m[4]),
  };
}

// Main vectorize endpoint
app.post("/vectorize", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const metadata = await sharp(req.file.buffer).metadata();
    const maxDim = Math.max(metadata.width || 800, metadata.height || 800);

    const pre = await sharp(req.file.buffer)
      .ensureAlpha()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
      .grayscale()
      .normalise()
      .threshold(160)
      .png()
      .toBuffer();

    trace(
      pre,
      {
        turdSize: 20,
        optCurve: true,
        alphaMax: 1,
        threshold: 160,
        color: "black",
        background: "transparent",
      },
      (err, svg) => {
        if (err) return res.status(500).json({ error: String(err) });

        const viewBox = extractViewBox(svg);
        const paths = [];
        const matches = svg.matchAll(/<path[^>]*d="([^"]+)"/g);
        for (const m of matches) {
          const sub = extractSubpaths(m[1]);
          for (const s of sub) {
            paths.push(s);
            if (paths.length >= 200) break;
          }
          if (paths.length >= 200) break;
        }

        if (!paths.length)
          return res.status(500).json({ error: "No path found" });

        res.json({ paths, viewBox });
      }
    );
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Batch vectorize endpoint
app.post("/vectorize-batch", upload.array("files", 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "No files uploaded" });

    const results = [];

    for (const file of req.files) {
      try {
        const metadata = await sharp(file.buffer).metadata();
        const maxDim = Math.max(metadata.width || 800, metadata.height || 800);

        const pre = await sharp(file.buffer)
          .ensureAlpha()
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
          .grayscale()
          .normalise()
          .threshold(160)
          .png()
          .toBuffer();

        const result = await new Promise((resolve, reject) => {
          trace(
            pre,
            {
              turdSize: 20,
              optCurve: true,
              alphaMax: 1,
              threshold: 160,
              color: "black",
              background: "transparent",
            },
            (err, svg) => {
              if (err) return reject(err);

              const viewBox = extractViewBox(svg);
              const paths = [];
              const matches = svg.matchAll(/<path[^>]*d="([^"]+)"/g);
              for (const m of matches) {
                const sub = extractSubpaths(m[1]);
                for (const s of sub) {
                  paths.push(s);
                  if (paths.length >= 200) break;
                }
                if (paths.length >= 200) break;
              }

              resolve({ name: file.originalname, paths, viewBox });
            }
          );
        });

        results.push(result);
      } catch (e) {
        results.push({ name: file.originalname, error: String(e) });
      }
    }

    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Smart crop - auto-detect subject bounds
app.post("/smart-crop", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const metadata = await sharp(req.file.buffer).metadata();
    
    // Get trimmed bounds (auto-detect subject)
    const trimmed = await sharp(req.file.buffer)
      .trim()
      .toBuffer({ resolveWithObject: true });

    const trimInfo = trimmed.info;
    
    // Calculate crop bounds
    const cropInfo = {
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      trimmedWidth: trimInfo.width,
      trimmedHeight: trimInfo.height,
      offsetX: trimInfo.trimOffsetLeft || 0,
      offsetY: trimInfo.trimOffsetTop || 0,
    };

    // Now vectorize the trimmed image
    const pre = await sharp(trimmed.data)
      .ensureAlpha()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .grayscale()
      .normalise()
      .threshold(160)
      .png()
      .toBuffer();

    trace(
      pre,
      {
        turdSize: 20,
        optCurve: true,
        alphaMax: 1,
        threshold: 160,
        color: "black",
        background: "transparent",
      },
      (err, svg) => {
        if (err) return res.status(500).json({ error: String(err) });

        const viewBox = extractViewBox(svg);
        const paths = [];
        const matches = svg.matchAll(/<path[^>]*d="([^"]+)"/g);
        for (const m of matches) {
          const sub = extractSubpaths(m[1]);
          for (const s of sub) {
            paths.push(s);
            if (paths.length >= 200) break;
          }
          if (paths.length >= 200) break;
        }

        if (!paths.length)
          return res.status(500).json({ error: "No path found" });

        res.json({ paths, viewBox, cropInfo });
      }
    );
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Background removal (basic - using alpha channel)
app.post("/remove-bg", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Extract alpha channel and use it to create clean silhouette
    const metadata = await sharp(req.file.buffer).metadata();
    
    let processed;
    
    if (metadata.hasAlpha) {
      // Has alpha - use it to extract subject
      processed = await sharp(req.file.buffer)
        .ensureAlpha()
        .extractChannel(3) // Alpha channel
        .threshold(128)
        .png()
        .toBuffer();
    } else {
      // No alpha - use edge detection approach
      processed = await sharp(req.file.buffer)
        .grayscale()
        .normalise()
        .threshold(200)
        .negate()
        .png()
        .toBuffer();
    }

    // Vectorize the result
    trace(
      processed,
      {
        turdSize: 15,
        optCurve: true,
        alphaMax: 1,
        threshold: 128,
        color: "black",
        background: "transparent",
      },
      (err, svg) => {
        if (err) return res.status(500).json({ error: String(err) });

        const viewBox = extractViewBox(svg);
        const paths = [];
        const matches = svg.matchAll(/<path[^>]*d="([^"]+)"/g);
        for (const m of matches) {
          const sub = extractSubpaths(m[1]);
          for (const s of sub) {
            paths.push(s);
            if (paths.length >= 200) break;
          }
          if (paths.length >= 200) break;
        }

        if (!paths.length)
          return res.status(500).json({ error: "No path found" });

        res.json({ paths, viewBox });
      }
    );
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Vectorize server running on", port));
