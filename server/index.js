import express from "express";
import cors from "cors";
import multer from "multer";
import { trace } from "potrace";
import sharp from "sharp";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: true, methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => res.send("OK"));

function extractViewBox(svg) {
  const m = svg.match(/viewBox="([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)"/);
  if (!m) return { width: 1000, height: 1000, left: 0, top: 0 };
  return { left: Number(m[1]), top: Number(m[2]), width: Number(m[3]), height: Number(m[4]) };
}

function traceSvg(buffer, opts = {}) {
  return new Promise((resolve, reject) => {
    trace(buffer, {
      turdSize: opts.turdSize || 20, optCurve: true, alphaMax: 1,
      threshold: opts.threshold || 160, color: "black", background: "transparent", ...opts,
    }, (err, svg) => { if (err) reject(err); else resolve(svg); });
  });
}

function splitToSingleMovePaths(d) {
  const parts = [];
  let current = "";
  for (let i = 0; i < d.length; i++) {
    const char = d[i];
    if ((char === "M" || char === "m") && current.trim().length > 0) {
      parts.push(current.trim());
      current = "";
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts
    .filter((p) => p.length > 3)
    .map((p) => {
      const t = p.trim();
      if (!t.endsWith("Z") && !t.endsWith("z")) return t + " Z";
      return t;
    });
}

function extractPaths(svg, limit = 300) {
  const viewBox = extractViewBox(svg);
  const paths = [];
  const matches = svg.matchAll(/<path[^>]*d="([^"]+)"/g);
  for (const m of matches) {
    const subPaths = splitToSingleMovePaths(m[1].trim());
    for (const sp of subPaths) {
      paths.push(sp);
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
    .grayscale().normalise().threshold(opts.threshold || 160).png().toBuffer();
  const svg = await traceSvg(pre, opts);
  return extractPaths(svg);
}

app.post("/vectorize", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const result = await processImage(req.file.buffer);
    if (!result.paths.length) return res.status(500).json({ error: "No path found" });
    res.json(result);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.post("/vectorize-batch", upload.array("files", 20), async (req, res) => {
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: "No files" });
    const results = [];
    for (const file of req.files) {
      try { const r = await processImage(file.buffer); results.push({ name: file.originalname, ...r }); }
      catch (e) { results.push({ name: file.originalname, error: String(e) }); }
    }
    res.json({ results });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.post("/smart-crop", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const trimmed = await sharp(req.file.buffer).trim().toBuffer({ resolveWithObject: true });
    const result = await processImage(trimmed.data);
    if (!result.paths.length) return res.status(500).json({ error: "No path found" });
    res.json({ ...result, cropInfo: trimmed.info });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.post("/remove-bg", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const metadata = await sharp(req.file.buffer).metadata();
    let processed;
    if (metadata.hasAlpha) {
      processed = await sharp(req.file.buffer).ensureAlpha().extractChannel(3).threshold(128).png().toBuffer();
    } else {
      processed = await sharp(req.file.buffer).grayscale().normalise().threshold(200).negate().png().toBuffer();
    }
    const svg = await traceSvg(processed, { threshold: 128, turdSize: 15 });
    const result = extractPaths(svg);
    if (!result.paths.length) return res.status(500).json({ error: "No path found" });
    res.json(result);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Real distinct fonts using system fonts
const FONTS = {
  "sans-bold":    { family: "Liberation Sans, DejaVu Sans, FreeSans, sans-serif", weight: "bold" },
  "serif-bold":   { family: "Liberation Serif, DejaVu Serif, FreeSerif, serif", weight: "bold" },
  "mono-bold":    { family: "Liberation Mono, DejaVu Sans Mono, FreeMono, monospace", weight: "bold" },
  "sans-black":   { family: "Liberation Sans, DejaVu Sans, sans-serif", weight: "900" },
  "sans-thin":    { family: "Liberation Sans, DejaVu Sans, sans-serif", weight: "100" },
  "sans-light":   { family: "Liberation Sans, DejaVu Sans, sans-serif", weight: "300" },
  "serif-normal": { family: "Liberation Serif, DejaVu Serif, serif", weight: "normal" },
  "mono-normal":  { family: "Liberation Mono, DejaVu Sans Mono, monospace", weight: "normal" },
  "noto-bold":    { family: "Noto Sans, DejaVu Sans, sans-serif", weight: "bold" },
  "noto-black":   { family: "Noto Sans, DejaVu Sans, sans-serif", weight: "900" },
};

async function renderTextToPng(text, fontSize, fontKey) {
  const font = FONTS[fontKey] || FONTS["sans-bold"];
  const escaped = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const canvasW = 2000, canvasH = 1000;
  const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
    <rect width="${canvasW}" height="${canvasH}" fill="white"/>
    <text x="${canvasW / 2}" y="${canvasH / 2 + fontSize * 0.1}" text-anchor="middle" dominant-baseline="middle"
      font-family="${font.family}" font-size="${fontSize}" font-weight="${font.weight}"
      fill="black">${escaped}</text>
  </svg>`;

  const pngBuffer = await sharp(Buffer.from(textSvg)).png().toBuffer();
  const trimmed = await sharp(pngBuffer).trim({ threshold: 20 }).toBuffer();
  return trimmed;
}

// Combined: all text as ONE frame
app.post("/text-to-frame", async (req, res) => {
  try {
    const { text, fontSize, fontStyle, mode } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "No text provided" });

    const size = fontSize || 250;
    const cleanText = text.trim().substring(0, 50);
    const isIndividual = mode === "individual";

    if (isIndividual) {
      // Individual: each letter becomes separate frame
      const letters = cleanText.split("").filter(c => c.trim());
      const results = [];

      for (const letter of letters) {
        try {
          const trimmed = await renderTextToPng(letter, size, fontStyle);
          const processed = await sharp(trimmed)
            .ensureAlpha().flatten({ background: { r: 255, g: 255, b: 255 } })
            .grayscale().normalise().threshold(128).png().toBuffer();
          const svg = await traceSvg(processed, { threshold: 128, turdSize: 2 });
          const result = extractPaths(svg);
          results.push({ letter, ...result });
        } catch (e) {
          results.push({ letter, paths: [], error: String(e) });
        }
      }

      res.json({ mode: "individual", results });
    } else {
      // Combined: entire text as ONE frame
      const trimmed = await renderTextToPng(cleanText, size, fontStyle);
      const processed = await sharp(trimmed)
        .ensureAlpha().flatten({ background: { r: 255, g: 255, b: 255 } })
        .grayscale().normalise().threshold(128).png().toBuffer();
      const svg = await traceSvg(processed, { threshold: 128, turdSize: 2 });
      const result = extractPaths(svg);

      if (!result.paths.length) return res.status(500).json({ error: "Could not convert text" });
      res.json({ mode: "combined", ...result });
    }
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Shape upload endpoint (user uploads PNG instead of export)
app.post("/shape-to-frame", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    // Trim whitespace, then process
    const trimmed = await sharp(req.file.buffer).trim({ threshold: 20 }).toBuffer();
    const result = await processImage(trimmed, { threshold: 140, turdSize: 5 });
    
    if (!result.paths.length) return res.status(500).json({ error: "No paths found" });
    res.json(result);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.get("/fonts", (_req, res) => res.json({ fonts: Object.keys(FONTS) }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Vectorize server running on", port));
