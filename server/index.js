import express from "express";
import cors from "cors";
import multer from "multer";
import { trace } from "potrace";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// CORS: Canva editor (web) se requests allow
// You can tighten this later by checking req.headers.origin.
// Canva CORS guidance: allow the Canva origin(s) for your app. (docs)
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.get("/", (_req, res) => res.send("OK"));

app.post("/vectorize", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  trace(
    req.file.buffer,
    {
      // silhouette PNG best results
      turdSize: 10,
      optCurve: true,
      alphaMax: 1,
      threshold: 180,
      color: "black",
      background: "transparent",
    },
    (err, svg) => {
      if (err) return res.status(500).json({ error: String(err) });

      // Extract first path "d" from the SVG output
      const match = svg.match(/<path[^>]*d="([^"]+)"/);
      if (!match) return res.status(500).json({ error: "No path found in SVG" });

      res.json({
        d: match[1],
        viewBox: { width: 1000, height: 1000, left: 0, top: 0 },
      });
    }
  );
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Vectorize server running on", port));
