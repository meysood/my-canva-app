import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { addElementAtPoint } from "@canva/design";

type Preset = "square" | "circle" | "rounded" | "heart";

async function addFramePreset(preset: Preset) {
  // Canvas placement + size
  const left = 160;
  const top = 140;
  const width = 360;
  const height = 360;

  // SVG paths (viewBox 240x240)
  const square = "M 0 0 H 240 V 240 H 0 Z";
  const circle =
    "M 120 0 C 186.274 0 240 53.726 240 120 C 240 186.274 186.274 240 120 240 C 53.726 240 0 186.274 0 120 C 0 53.726 53.726 0 120 0 Z";
  const rounded =
    "M 40 0 H 200 C 222.091 0 240 17.909 240 40 V 200 C 240 222.091 222.091 240 200 240 H 40 C 17.909 240 0 222.091 0 200 V 40 C 0 17.909 17.909 0 40 0 Z";

  // Heart (nice smooth heart)
  const heart =
    "M 120 220 C 120 220 20 160 20 88 C 20 48 48 20 86 20 C 104 20 114 28 120 36 C 126 28 136 20 154 20 C 192 20 220 48 220 88 C 220 160 120 220 120 220 Z";

  const d =
    preset === "circle"
      ? circle
      : preset === "rounded"
      ? rounded
      : preset === "heart"
      ? heart
      : square;

  await addElementAtPoint({
    type: "shape",
    top,
    left,
    width,
    height,
    paths: [
      {
        d,
        fill: { dropTarget: true },
      },
    ],
    viewBox: { width: 240, height: 240, left: 0, top: 0 },
  });
}

function App() {
  const [status, setStatus] = useState<string>("");

  const onAdd = async (preset: Preset) => {
    try {
      setStatus("Adding frame…");
      await addFramePreset(preset);
      setStatus("Done ✅ Now drag & drop any image into the frame.");
      setTimeout(() => setStatus(""), 2500);
    } catch (e: any) {
      setStatus(`Error: ${e?.message || "Something went wrong"}`);
    }
  };

  const onPngSelected = async (file: File | null) => {
    if (!file) return;
    // Placeholder for next chunk:
    // We will upload this PNG (silhouette/mask) to a tiny backend,
    // convert it to SVG path, then insert that path as a dropTarget frame.
    setStatus(
      `PNG selected: ${file.name}. Next step: convert PNG silhouette → SVG path (backend).`
    );
    setTimeout(() => setStatus(""), 3500);
  };

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <h3 style={{ margin: "0 0 10px 0" }}>Frame Maker</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button style={btn} onClick={() => onAdd("square")}>Square frame</button>
        <button style={btn} onClick={() => onAdd("circle")}>Circle frame</button>
        <button style={btn} onClick={() => onAdd("rounded")}>Rounded frame</button>
        <button style={btn} onClick={() => onAdd("heart")}>Heart frame</button>
      </div>

      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.85 }}>
          PNG silhouette → Frame (advanced)
        </div>
        <input
          type="file"
          accept="image/png"
          onChange={(e) => onPngSelected(e.target.files?.[0] || null)}
        />
        <div style={{ fontSize: 11, marginTop: 8, opacity: 0.75 }}>
          Tip: Best results with black/white silhouette PNG.
        </div>
      </div>

      {status ? (
        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.9 }}>{status}</div>
      ) : (
        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
          Add a frame, then drag & drop any image onto it.
        </div>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "12px 12px",
  background: "#7D2AE8",
  color: "white",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
