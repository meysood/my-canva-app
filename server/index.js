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

function traceSvg(buffer, opts = {}) {
  return new Promise((resolve, reject) => {
    trace(
      buffer,
      {
        turdSize: opts.turdSize || 20,
        optCurve: true,
        alphaMax: 1,
        threshold: opts.threshold || 160,
        color: "black",
        background: "transparent",
        ...opts,
      },
      (err, svg) => {
        if (err) return reject(err);
        resolve(svg);
      }
    );
  });
}

function extractPaths(svg, limit = 200) {
  const viewBox = extractViewBox(svg);
  const paths = [];
  const matches = svg.matchAll(/<path[^>]*d="([^"]+)"/g);
  for (const m of matches) {
    const sub = extractSubpaths(m[1]);
    for (const s of sub) {
      paths.push(s);
      if (paths.length >= limit) break;
    }
    if (paths.length >= limit) break;
  }
  return { paths, viewBox };
}

async function processImage(buffer, opts = {}) {
  const metadata = await sharp(buffer).metadata();
  const maxDim = Math.max(metadata.width || 800, metadata.height || 800);

  const pre = await sharp(buffer)
    .ensureAlpha()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
    .grayscale()
    .normalise()
    .threshold(opts.threshold || 160)
    .png()
    .toBuffer();

  const svg = await traceSvg(pre, opts);
  return extractPaths(svg);
}

// Main vectorize endpoint
app.post("/vectorize", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const result = await processImage(req.file.buffer);
    if (!result.paths.length) return res.status(500).json({ error: "No path found" });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Batch vectorize
app.post("/vectorize-batch", upload.array("files", 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "No files uploaded" });

    const results = [];
    for (const file of req.files) {
      try {
        const result = await processImage(file.buffer);
        results.push({ name: file.originalname, ...result });
      } catch (e) {
        results.push({ name: file.originalname, error: String(e) });
      }
    }
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Smart crop
app.post("/smart-crop", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const trimmed = await sharp(req.file.buffer)
      .trim()
      .toBuffer({ resolveWithObject: true });

    const result = await processImage(trimmed.data);
    if (!result.paths.length) return res.status(500).json({ error: "No path found" });

    res.json({ ...result, cropInfo: trimmed.info });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Remove BG
app.post("/remove-bg", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const metadata = await sharp(req.file.buffer).metadata();
    let processed;

    if (metadata.hasAlpha) {
      processed = await sharp(req.file.buffer)
        .ensureAlpha()
        .extractChannel(3)
        .threshold(128)
        .png()
        .toBuffer();
    } else {
      processed = await sharp(req.file.buffer)
        .grayscale()
        .normalise()
        .threshold(200)
        .negate()
        .png()
        .toBuffer();
    }

    const svg = await traceSvg(processed, { threshold: 128, turdSize: 15 });
    const result = extractPaths(svg);
    if (!result.paths.length) return res.status(500).json({ error: "No path found" });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// TEXT TO FRAME — render text as image then vectorize
app.post("/text-to-frame", async (req, res) => {
  try {
    const { text, fontSize, fontWeight } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "No text provided" });

    const size = fontSize || 200;
    const weight = fontWeight || "bold";
    const cleanText = text.trim().substring(0, 100);

    // Create SVG with text
    const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600">
      <rect width="1200" height="600" fill="white"/>
      <text x="600" y="350" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${size}"
        font-weight="${weight}"
        fill="black">${cleanText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
    </svg>`;

    // Render SVG to PNG
    const pngBuffer = await sharp(Buffer.from(textSvg))
      .png()
      .toBuffer();

    // Trim whitespace
    const trimmed = await sharp(pngBuffer)
      .trim()
      .toBuffer();

    // Process to get paths
    const result = await processImage(trimmed, { threshold: 128, turdSize: 5 });
    if (!result.paths.length) return res.status(500).json({ error: "Could not convert text to paths" });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Vectorize server running on", port));
