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
  const finalParts = [];
  for (const p of parts) {
    const again = p.split(/(?=[Mm])/g).map(s => s.trim()).filter(Boolean);
    for (const a of again) if (a) finalParts.push(a);
  }
  return finalParts.filter(p => p[0] === "M" || p[0] === "m");
}

function extractViewBox(svg) {
  const m = svg.match(/viewBox="([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)"/);
  if (!m) return { width: 1000, height: 1000, left: 0, top: 0 };
  const left = Number(m[1]);
  const top = Number(m[2]);
  const width = Number(m[3]);
  const height = Number(m[4]);
  return {
    width: Number.isFinite(width) ? width : 1000,
    height: Number.isFinite(height) ? height : 1000,
    left: Number.isFinite(left) ? left : 0,
    top: Number.isFinite(top) ? top : 0,
  };
}

app.post("/vectorize", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Better preprocessing - preserve size better
    const metadata = await sharp(req.file.buffer).metadata();
    const maxDim = Math.max(metadata.width || 800, metadata.height || 800);
    
    const pre = await sharp(req.file.buffer)
      .ensureAlpha()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
      .grayscale()
      .normalise()
      .threshold(160)  // Lower threshold for better detail
      .png()
      .toBuffer();

    trace(
      pre,
      {
        turdSize: 20,    // Better balance
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
          const d = m[1];
          const sub = extractSubpaths(d);
          for (const s of sub) {
            paths.push(s);
            if (paths.length >= 200) break;  // Increased limit
          }
          if (paths.length >= 200) break;
        }

        if (!paths.length) return res.status(500).json({ error: "No path found in SVG" });

        res.json({ paths, viewBox });
      }
    );
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Vectorize server running on", port));
