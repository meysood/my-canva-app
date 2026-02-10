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

// FIXED: Extract ALL path data as single compound paths (preserves holes like O, D, etc.)
function extractCompoundPaths(svg, limit = 200) {
  const viewBox = extractViewBox(svg);
  const paths = [];
  const matches = svg.matchAll(/<path[^>]*d="([^"]+)"/g);
  for (const m of matches) {
    // Keep entire path data as ONE compound path — this preserves holes
    const d = m[1].trim();
    if (d) {
      paths.push(d);
      if (paths.length >= limit) break;
    }
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
  return extractCompoundPaths(svg);
}

// Vectorize
app.post("/vectorize", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const result = await processImage(req.file.buffer);
    if (!result.paths.length) return res.status(500).json({ error: "No path found" });
    res.json(result);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Batch
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

// Smart crop
app.post("/smart-crop", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const trimmed = await sharp(req.file.buffer).trim().toBuffer({ resolveWithObject: true });
    const result = await processImage(trimmed.data);
    if (!result.paths.length) return res.status(500).json({ error: "No path found" });
    res.json({ ...result, cropInfo: trimmed.info });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Remove BG
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
    const result = extractCompoundPaths(svg);
    if (!result.paths.length) return res.status(500).json({ error: "No path found" });
    res.json(result);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// FONTS available for text-to-frame
const FONTS = {
  "arial": { family: "Arial, Helvetica, sans-serif", weight: "bold" },
  "serif": { family: "Georgia, 'Times New Roman', serif", weight: "bold" },
  "mono": { family: "'Courier New', Courier, monospace", weight: "bold" },
  "impact": { family: "Impact, 'Arial Black', sans-serif", weight: "normal" },
  "cursive": { family: "'Comic Sans MS', cursive, sans-serif", weight: "bold" },
  "rounded": { family: "Verdana, Geneva, sans-serif", weight: "bold" },
  "thin": { family: "Arial, Helvetica, sans-serif", weight: "100" },
  "light": { family: "'Trebuchet MS', Helvetica, sans-serif", weight: "300" },
  "black": { family: "'Arial Black', Gadget, sans-serif", weight: "900" },
  "condensed": { family: "'Arial Narrow', Arial, sans-serif", weight: "bold" },
};

// TEXT TO FRAME with multiple fonts
app.post("/text-to-frame", async (req, res) => {
  try {
    const { text, fontSize, fontStyle } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "No text provided" });

    const size = fontSize || 200;
    const cleanText = text.trim().substring(0, 50);
    const font = FONTS[fontStyle] || FONTS["arial"];

    // Escape HTML entities
    const escaped = cleanText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // Create SVG with text — larger canvas for better quality
    const canvasW = 1600;
    const canvasH = 800;
    const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
      <rect width="${canvasW}" height="${canvasH}" fill="white"/>
      <text x="${canvasW / 2}" y="${canvasH / 2 + size * 0.1}" text-anchor="middle" dominant-baseline="middle"
        font-family="${font.family}"
        font-size="${size}"
        font-weight="${font.weight}"
        fill="black">${escaped}</text>
    </svg>`;

    // Render SVG to PNG at high quality
    const pngBuffer = await sharp(Buffer.from(textSvg))
      .png()
      .toBuffer();

    // Trim whitespace tightly
    const trimmed = await sharp(pngBuffer)
      .trim({ threshold: 20 })
      .toBuffer();

    // Process — lower turdSize for text detail, keep compound paths for holes
    const svg = await traceSvg(
      await sharp(trimmed)
        .ensureAlpha()
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .grayscale()
        .normalise()
        .threshold(128)
        .png()
        .toBuffer(),
      { threshold: 128, turdSize: 2 }
    );

    const result = extractCompoundPaths(svg);
    if (!result.paths.length) return res.status(500).json({ error: "Could not convert text" });

    res.json({ ...result, fontUsed: fontStyle || "arial" });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET available fonts
app.get("/fonts", (_req, res) => {
  res.json({ fonts: Object.keys(FONTS) });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Vectorize server running on", port));
