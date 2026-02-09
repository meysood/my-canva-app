import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { addElementAtPoint, getDefaultPageDimensions } from "@canva/design";

const BACKEND_URL = "https://postconvulsive-aubrey-floriferously.ngrok-free.dev";

type Preset = "square" | "circle" | "rounded" | "heart";

async function getPageFitBox() {
  const dims = await getDefaultPageDimensions();
  const pw = dims.width;
  const ph = dims.height;
  
  const padding = Math.min(pw, ph) * 0.1;
  const maxW = pw - padding * 2;
  const maxH = ph - padding * 2;
  const size = Math.min(maxW, maxH);
  
  const left = (pw - size) / 2;
  const top = (ph - size) / 2;
  
  return { top, left, width: size, height: size };
}

async function addFrameFromPaths(
  paths: string[],
  viewBox = { width: 1000, height: 1000, left: 0, top: 0 }
) {
  const box = await getPageFitBox();
  
  await addElementAtPoint({
    type: "shape",
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
    paths: paths.map((d) => ({ d, fill: { dropTarget: true } })),
    viewBox,
  });
}

async function addFramePreset(preset: Preset) {
  const square = ["M 0 0 H 240 V 240 H 0 Z"];
  const circle = ["M 120 0 C 186.274 0 240 53.726 240 120 C 240 186.274 186.274 240 120 240 C 53.726 240 0 186.274 0 120 C 0 53.726 53.726 0 120 0 Z"];
  const rounded = ["M 40 0 H 200 C 222.091 0 240 17.909 240 40 V 200 C 240 222.091 222.091 240 200 240 H 40 C 17.909 240 0 222.091 0 200 V 40 C 0 17.909 17.909 0 40 0 Z"];
  const heart = ["M 120 220 C 120 220 20 160 20 88 C 20 48 48 20 86 20 C 104 20 114 28 120 36 C 126 28 136 20 154 20 C 192 20 220 48 220 88 C 220 160 120 220 120 220 Z"];

  const paths = preset === "circle" ? circle : preset === "rounded" ? rounded : preset === "heart" ? heart : square;
  const box = await getPageFitBox();

  await addElementAtPoint({
    type: "shape",
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
    paths: paths.map((d) => ({ d, fill: { dropTarget: true } })),
    viewBox: { width: 240, height: 240, left: 0, top: 0 },
  });
}

function App() {
  const [status, setStatus] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const onAdd = async (preset: Preset) => {
    try {
      setStatus("Adding frame…");
      await addFramePreset(preset);
      setStatus("Done ✅");
      setTimeout(() => setStatus(""), 2000);
    } catch (e: any) {
      setStatus(`Error: ${e?.message || "Something went wrong"}`);
    }
  };

  const onFileSelect = (file: File | null) => {
    if (!file) {
      clearSelection();
      return;
    }
    
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStatus("");
  };

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl("");
    setStatus("");
  };

  const onConvertToFrame = async () => {
    if (!selectedFile) return;
    
    try {
      setStatus("Uploading PNG…");
      const form = new FormData();
      form.append("file", selectedFile);
      
      const resp = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/vectorize`, { 
        method: "POST", 
        body: form 
      });
      
      const text = await resp.text();
      let data: any;
      
      try { 
        data = JSON.parse(text); 
      } catch { 
        throw new Error(`Backend error (status ${resp.status})`); 
      }

      if (!resp.ok) throw new Error(data?.error || `Failed (${resp.status})`);

      const paths: string[] = Array.isArray(data.paths) 
        ? data.paths 
        : typeof data.d === "string" 
        ? [data.d] 
        : [];

      if (!paths.length) throw new Error("No paths found");

      setStatus("Creating frame…");
      await addFrameFromPaths(paths, data.viewBox);
      
      setStatus("✅ Done! Drag & drop image into frame.");
      setTimeout(() => {
        setStatus("");
        clearSelection();
      }, 2500);
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Failed"}`);
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <h3 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 700 }}>Frame Maker</h3>

      {/* Preset Frames */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7, fontWeight: 600 }}>Quick Frames</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button style={btn} onClick={() => onAdd("square")}>Square</button>
          <button style={btn} onClick={() => onAdd("circle")}>Circle</button>
          <button style={btn} onClick={() => onAdd("rounded")}>Rounded</button>
          <button style={btn} onClick={() => onAdd("heart")}>Heart</button>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(0,0,0,0.08)", margin: "16px 0" }} />

      {/* PNG to Frame */}
      <div>
        <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7, fontWeight: 600 }}>
          Custom PNG → Frame
        </div>
        
        <input
          type="file"
          accept="image/png"
          onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
          style={{ display: "none" }}
          id="file-input"
        />
        
        <label htmlFor="file-input" style={uploadBtn}>
          {selectedFile ? `✓ ${selectedFile.name}` : "Choose PNG"}
        </label>

        {/* Preview with Remove Button */}
        {previewUrl && (
          <div style={{ marginTop: 12, position: "relative" }}>
            <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
              <img 
                src={previewUrl} 
                alt="preview" 
                style={{ 
                  width: "100%",
                  maxHeight: 180, 
                  objectFit: "contain",
                  borderRadius: 8, 
                  border: "2px solid #E5E5E5",
                  background: "repeating-conic-gradient(#E5E5E5 0% 25%, white 0% 50%) 50% / 20px 20px"
                }} 
              />
              <button
                onClick={clearSelection}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.7)",
                  border: "2px solid white",
                  color: "white",
                  fontSize: 16,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  lineHeight: 1,
                }}
                title="Remove image"
              >
                ✕
              </button>
            </div>
            <button 
              style={convertBtn} 
              onClick={onConvertToFrame}
              disabled={!selectedFile}
            >
              Convert to Frame
            </button>
          </div>
        )}

        <div style={{ fontSize: 11, marginTop: 8, opacity: 0.6 }}>
          Best with black/white silhouette or clean-background images
        </div>
      </div>

      {/* Status */}
      {status && (
        <div style={{ 
          marginTop: 14, 
          padding: "8px 12px", 
          background: status.includes("Error") || status.includes("❌") ? "#FEE" : "#E8F5E9",
          color: status.includes("Error") || status.includes("❌") ? "#C33" : "#2E7D32",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600
        }}>
          {status}
        </div>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "10px 12px",
  background: "#7D2AE8",
  color: "white",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  transition: "all 0.2s",
};

const uploadBtn: React.CSSProperties = {
  display: "block",
  padding: "10px 16px",
  background: "#F5F5F5",
  color: "#333",
  borderRadius: 8,
  border: "2px dashed #CCC",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  textAlign: "center",
  transition: "all 0.2s",
};

const convertBtn: React.CSSProperties = {
  marginTop: 12,
  width: "100%",
  padding: "12px 16px",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "white",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  transition: "all 0.2s",
};

createRoot(document.getElementById("root")!).render(<App />);
