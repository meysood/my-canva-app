import React, { useState, useEffect, useRef } from "react";
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
  const rounded = ["M 40 0 H 200 C 222.091 0 240 17.909 240 40 V 200 C 222.091 222.091 240 200 240 H 40 C 17.909 240 0 222.091 0 200 V 40 C 0 17.909 17.909 0 40 0 Z"];
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

// Spinner component
function Spinner() {
  return (
    <div style={{
      width: 16,
      height: 16,
      border: "2px solid rgba(255,255,255,0.3)",
      borderTop: "2px solid white",
      borderRadius: "50%",
      animation: "spin 0.6s linear infinite",
      display: "inline-block",
      marginRight: 6,
    }} />
  );
}

// Confetti component
function Confetti() {
  return (
    <div style={{ 
      position: "fixed", 
      top: 0, 
      left: 0, 
      width: "100%", 
      height: "100%", 
      pointerEvents: "none",
      zIndex: 9999,
    }}>
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 8,
            height: 8,
            background: ["#667eea", "#764ba2", "#f093fb", "#4facfe"][i % 4],
            left: `${Math.random() * 100}%`,
            top: "-10px",
            borderRadius: "50%",
            animation: `fall ${1 + Math.random() * 2}s linear`,
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}

function App() {
  const [status, setStatus] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts (Chunk 2)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + V: Paste from clipboard
      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        navigator.clipboard.read().then((items) => {
          for (const item of items) {
            const imageType = item.types.find((type) => type.startsWith("image/png"));
            if (imageType) {
              item.getType(imageType).then((blob) => {
                const file = new File([blob], "pasted-image.png", { type: "image/png" });
                onFileSelect(file);
              });
            }
          }
        }).catch(() => {
          // Clipboard access denied - silent fail
        });
      }

      // Enter: Convert (if file selected)
      if (e.key === "Enter" && selectedFile && !isConverting) {
        onConvertToFrame();
      }

      // Escape: Cancel/Clear
      if (e.key === "Escape") {
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFile, isConverting]);

  // Drag & Drop (Chunk 3)
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      if (e.target === dropZoneRef.current) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer?.files[0];
      if (file && file.type.includes("png")) {
        onFileSelect(file);
      } else if (file) {
        setStatus("❌ Only PNG files allowed");
      }
    };

    const dropZone = dropZoneRef.current;
    if (dropZone) {
      dropZone.addEventListener("dragover", handleDragOver);
      dropZone.addEventListener("dragleave", handleDragLeave);
      dropZone.addEventListener("drop", handleDrop);

      return () => {
        dropZone.removeEventListener("dragover", handleDragOver);
        dropZone.removeEventListener("dragleave", handleDragLeave);
        dropZone.removeEventListener("drop", handleDrop);
      };
    }
  }, []);

  const onAdd = async (preset: Preset) => {
    try {
      setStatus("Adding frame…");
      await addFramePreset(preset);
      setStatus("✅ Frame added!");
      setTimeout(() => setStatus(""), 2000);
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Failed"}`);
    }
  };

  const onFileSelect = (file: File | null) => {
    if (!file) {
      clearSelection();
      return;
    }

    // File size validation (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setStatus("❌ File too large! Max 5MB");
      return;
    }

    // File type validation
    if (!file.type.includes("png")) {
      setStatus("❌ Only PNG files allowed");
      return;
    }
    
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStatus("");
    setShowTutorial(false);
  };

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl("");
    setStatus("");
    setIsConverting(false);
  };

  const onConvertToFrame = async () => {
    if (!selectedFile || isConverting) return;
    
    try {
      setIsConverting(true);
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
      
      // Success with confetti (Chunk 4)
      setStatus("🎉 Success! Frame added!");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      
      setTimeout(() => {
        setStatus("");
        clearSelection();
      }, 2500);
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Failed"}`);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      {/* Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes fall {
          0% { 
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% { 
            transform: translateY(400px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Confetti */}
      {showConfetti && <Confetti />}

      <h3 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 700 }}>Frame Maker</h3>

      {/* Tutorial tooltip */}
      {showTutorial && !selectedFile && (
        <div style={{
          padding: "10px 12px",
          background: "#EEF2FF",
          border: "1px solid #C7D2FE",
          borderRadius: 8,
          fontSize: 12,
          marginBottom: 12,
          color: "#4338CA",
          position: "relative",
        }}>
          💡 <strong>Tip:</strong> Upload PNG, paste (Cmd+V), or drag & drop!
          <button
            onClick={() => setShowTutorial(false)}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              color: "#6366F1",
            }}
          >
            ✕
          </button>
        </div>
      )}

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

      {/* PNG to Frame with Drag & Drop Zone */}
      <div
        ref={dropZoneRef}
        style={{
          border: isDragging ? "2px dashed #667eea" : "none",
          borderRadius: 12,
          padding: isDragging ? 12 : 0,
          background: isDragging ? "rgba(102, 126, 234, 0.05)" : "transparent",
          transition: "all 0.2s",
        }}
      >
        <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7, fontWeight: 600 }}>
          Custom PNG → Frame
        </div>
        
        <input
          type="file"
          accept="image/png"
          onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
          style={{ display: "none" }}
          id="file-input"
          disabled={isConverting}
        />
        
        <label htmlFor="file-input" style={{
          ...uploadBtn,
          opacity: isConverting ? 0.5 : 1,
          cursor: isConverting ? "not-allowed" : "pointer",
          borderColor: isDragging ? "#667eea" : "#CCC",
        }}>
          {isDragging ? "📂 Drop PNG here" : selectedFile ? `✓ ${selectedFile.name}` : "Choose or Drop PNG"}
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
                  background: "repeating-conic-gradient(#E5E5E5 0% 25%, white 0% 50%) 50% / 20px 20px",
                  opacity: isConverting ? 0.6 : 1,
                }} 
              />
              <button
                onClick={clearSelection}
                disabled={isConverting}
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
                  cursor: isConverting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  lineHeight: 1,
                  opacity: isConverting ? 0.5 : 1,
                }}
                title="Remove image (Esc)"
              >
                ✕
              </button>
            </div>
            <button 
              style={{
                ...convertBtn,
                opacity: isConverting ? 0.7 : 1,
                cursor: isConverting ? "not-allowed" : "pointer",
              }}
              onClick={onConvertToFrame}
              disabled={!selectedFile || isConverting}
            >
              {isConverting ? (
                <><Spinner /> Converting...</>
              ) : (
                "Convert to Frame (Enter)"
              )}
            </button>
          </div>
        )}

        <div style={{ fontSize: 11, marginTop: 8, opacity: 0.6 }}>
          Max 5MB • Cmd+V to paste • Enter to convert • Esc to cancel
        </div>
      </div>

      {/* Status */}
      {status && (
        <div style={{ 
          marginTop: 14, 
          padding: "8px 12px", 
          background: status.includes("❌") ? "#FEE" : status.includes("🎉") ? "#F0F9FF" : "#E8F5E9",
          color: status.includes("❌") ? "#C33" : status.includes("🎉") ? "#0369A1" : "#2E7D32",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          animation: isConverting ? "pulse 1.5s ease-in-out infinite" : "none",
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
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

createRoot(document.getElementById("root")!).render(<App />);
