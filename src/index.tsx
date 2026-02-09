import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { addElementAtPoint, getDefaultPageDimensions } from "@canva/design";

const BACKEND_URL = "https://postconvulsive-aubrey-floriferously.ngrok-free.dev";

type Preset = "square" | "circle" | "rounded" | "heart" | "star" | "hexagon" | "diamond" | "arch" | "cross" | "oval";
type Tab = "quick" | "custom" | "batch" | "library" | "effects";

// ========== FRAME PATH DATA ==========
const FRAME_PATHS: Record<string, { paths: string[]; viewBox: { width: number; height: number; left: number; top: number } }> = {
  square: {
    paths: ["M 0 0 H 240 V 240 H 0 Z"],
    viewBox: { width: 240, height: 240, left: 0, top: 0 },
  },
  circle: {
    paths: ["M 120 0 C 186.274 0 240 53.726 240 120 C 240 186.274 186.274 240 120 240 C 53.726 240 0 186.274 0 120 C 0 53.726 53.726 0 120 0 Z"],
    viewBox: { width: 240, height: 240, left: 0, top: 0 },
  },
  rounded: {
    paths: ["M 40 0 H 200 C 222.091 0 240 17.909 240 40 V 200 C 240 222.091 222.091 240 200 240 H 40 C 17.909 240 0 222.091 0 200 V 40 C 0 17.909 17.909 0 40 0 Z"],
    viewBox: { width: 240, height: 240, left: 0, top: 0 },
  },
  heart: {
    paths: ["M 120 220 C 120 220 20 160 20 88 C 20 48 48 20 86 20 C 104 20 114 28 120 36 C 126 28 136 20 154 20 C 192 20 220 48 220 88 C 220 160 120 220 120 220 Z"],
    viewBox: { width: 240, height: 240, left: 0, top: 0 },
  },
  star: {
    paths: ["M 120 0 L 148 88 L 240 88 L 166 142 L 192 230 L 120 178 L 48 230 L 74 142 L 0 88 L 92 88 Z"],
    viewBox: { width: 240, height: 240, left: 0, top: 0 },
  },
  hexagon: {
    paths: ["M 120 0 L 226 60 L 226 180 L 120 240 L 14 180 L 14 60 Z"],
    viewBox: { width: 240, height: 240, left: 0, top: 0 },
  },
  diamond: {
    paths: ["M 120 0 L 240 120 L 120 240 L 0 120 Z"],
    viewBox: { width: 240, height: 240, left: 0, top: 0 },
  },
  arch: {
    paths: ["M 0 240 L 0 120 C 0 53.726 53.726 0 120 0 C 186.274 0 240 53.726 240 120 L 240 240 Z"],
    viewBox: { width: 240, height: 240, left: 0, top: 0 },
  },
  cross: {
    paths: ["M 80 0 H 160 V 80 H 240 V 160 H 160 V 240 H 80 V 160 H 0 V 80 H 80 Z"],
    viewBox: { width: 240, height: 240, left: 0, top: 0 },
  },
  oval: {
    paths: ["M 160 0 C 248.366 0 320 53.726 320 120 C 320 186.274 248.366 240 160 240 C 71.634 240 0 186.274 0 120 C 0 53.726 71.634 0 160 0 Z"],
    viewBox: { width: 320, height: 240, left: 0, top: 0 },
  },
};

// ========== FRAME PACKS ==========
const FRAME_PACKS: Record<string, { name: string; emoji: string; frames: Preset[] }> = {
  basic: { name: "Basic", emoji: "📐", frames: ["square", "circle", "rounded", "oval"] },
  fancy: { name: "Fancy", emoji: "✨", frames: ["heart", "star", "hexagon", "diamond"] },
  creative: { name: "Creative", emoji: "🎨", frames: ["arch", "cross", "star", "heart"] },
  wedding: { name: "Wedding", emoji: "💒", frames: ["heart", "circle", "oval", "arch"] },
  birthday: { name: "Birthday", emoji: "🎂", frames: ["star", "circle", "heart", "diamond"] },
};

// ========== FRAME EFFECTS ==========
type FrameEffect = "none" | "shadow" | "glow" | "outline" | "double";

// ========== UTILITIES ==========
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
  viewBox = { width: 1000, height: 1000, left: 0, top: 0 },
  color?: string
) {
  const box = await getPageFitBox();
  await addElementAtPoint({
    type: "shape",
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
    paths: paths.map((d) => ({
      d,
      fill: color ? { color } : { dropTarget: true },
    })),
    viewBox,
  });
}

async function addFrameWithEffect(
  paths: string[],
  viewBox: { width: number; height: number; left: number; top: number },
  effect: FrameEffect,
  color?: string
) {
  const box = await getPageFitBox();

  if (effect === "shadow") {
    // Shadow layer (slightly offset, darker)
    await addElementAtPoint({
      type: "shape",
      top: box.top + 4,
      left: box.left + 4,
      width: box.width,
      height: box.height,
      paths: paths.map((d) => ({ d, fill: { color: "#00000033" } })),
      viewBox,
    });
  }

  if (effect === "glow") {
    // Glow layer (slightly larger, colored)
    const glowSize = box.width * 1.04;
    const glowOffset = (glowSize - box.width) / 2;
    await addElementAtPoint({
      type: "shape",
      top: box.top - glowOffset,
      left: box.left - glowOffset,
      width: glowSize,
      height: glowSize,
      paths: paths.map((d) => ({ d, fill: { color: color || "#667eea44" } })),
      viewBox,
    });
  }

  if (effect === "outline" || effect === "double") {
    // Outline layer (slightly larger)
    const outlineSize = box.width * 1.06;
    const outlineOffset = (outlineSize - box.width) / 2;
    await addElementAtPoint({
      type: "shape",
      top: box.top - outlineOffset,
      left: box.left - outlineOffset,
      width: outlineSize,
      height: outlineSize,
      paths: paths.map((d) => ({ d, fill: { color: color || "#333333" } })),
      viewBox,
    });
  }

  if (effect === "double") {
    // Second outline (even larger)
    const outline2Size = box.width * 1.12;
    const outline2Offset = (outline2Size - box.width) / 2;
    await addElementAtPoint({
      type: "shape",
      top: box.top - outline2Offset,
      left: box.left - outline2Offset,
      width: outline2Size,
      height: outline2Size,
      paths: paths.map((d) => ({ d, fill: { color: "#00000022" } })),
      viewBox,
    });
  }

  // Main frame (always on top)
  await addElementAtPoint({
    type: "shape",
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
    paths: paths.map((d) => ({
      d,
      fill: { dropTarget: true },
    })),
    viewBox,
  });
}

// ========== STORAGE HELPER ==========
interface SavedFrame {
  id: string;
  name: string;
  paths: string[];
  viewBox: { width: number; height: number; left: number; top: number };
  timestamp: number;
}

function getSavedFrames(): SavedFrame[] {
  try {
    const raw = localStorage.getItem("frame_maker_library");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFrame(frame: Omit<SavedFrame, "id" | "timestamp">) {
  const frames = getSavedFrames();
  frames.unshift({
    ...frame,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
  });
  // Keep max 50
  if (frames.length > 50) frames.length = 50;
  localStorage.setItem("frame_maker_library", JSON.stringify(frames));
}

function deleteFrame(id: string) {
  const frames = getSavedFrames().filter((f) => f.id !== id);
  localStorage.setItem("frame_maker_library", JSON.stringify(frames));
}

// ========== COMPONENTS ==========

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid rgba(255,255,255,0.3)`,
        borderTop: `2px solid white`,
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
        display: "inline-block",
        marginRight: 6,
      }}
    />
  );
}

function Confetti() {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9999 }}>
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 8,
            height: 8,
            background: ["#667eea", "#764ba2", "#f093fb", "#4facfe", "#43e97b", "#fa709a"][i % 6],
            left: `${Math.random() * 100}%`,
            top: "-10px",
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animation: `fall ${1 + Math.random() * 2}s linear`,
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}

// ========== COLOR PICKER ==========
const COLOR_PRESETS = [
  "#7D2AE8", "#667eea", "#764ba2", "#f093fb", "#4facfe",
  "#43e97b", "#fa709a", "#fee140", "#FF6B6B", "#333333",
  "#FFFFFF", "#000000", "#FF9800", "#2196F3", "#4CAF50",
];

// ========== MAIN APP ==========
function App() {
  const [activeTab, setActiveTab] = useState<Tab>("quick");
  const [status, setStatus] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  // Custom tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [useSmartCrop, setUseSmartCrop] = useState(false);
  const [useRemoveBg, setUseRemoveBg] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Batch tab state
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchProgress, setBatchProgress] = useState<number>(0);

  // Library tab state
  const [savedFrames, setSavedFrames] = useState<SavedFrame[]>(getSavedFrames());

  // Effects tab state
  const [selectedEffect, setSelectedEffect] = useState<FrameEffect>("none");
  const [selectedColor, setSelectedColor] = useState<string>("#7D2AE8");
  const [customColor, setCustomColor] = useState<string>("#7D2AE8");
  const [selectedFrameForEffect, setSelectedFrameForEffect] = useState<Preset>("circle");

  // ========== KEYBOARD SHORTCUTS ==========
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        navigator.clipboard.read().then((items) => {
          for (const item of items) {
            const imageType = item.types.find((type) => type.startsWith("image/png"));
            if (imageType) {
              item.getType(imageType).then((blob) => {
                const file = new File([blob], "pasted-image.png", { type: "image/png" });
                onFileSelect(file);
                setActiveTab("custom");
              });
            }
          }
        }).catch(() => {});
      }
      if (e.key === "Enter" && selectedFile && !isConverting) {
        onConvertToFrame();
      }
      if (e.key === "Escape") {
        clearSelection();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFile, isConverting]);

  // ========== DRAG & DROP ==========
  useEffect(() => {
    const dz = dropZoneRef.current;
    if (!dz) return;

    const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer?.files || []);
      const pngs = files.filter((f) => f.type.includes("png"));
      if (pngs.length === 1) {
        onFileSelect(pngs[0]);
      } else if (pngs.length > 1) {
        setBatchFiles(pngs);
        setActiveTab("batch");
      } else if (files.length > 0) {
        setStatus("❌ Only PNG files allowed");
      }
    };

    dz.addEventListener("dragover", onDragOver);
    dz.addEventListener("dragleave", onDragLeave);
    dz.addEventListener("drop", onDrop);
    return () => {
      dz.removeEventListener("dragover", onDragOver);
      dz.removeEventListener("dragleave", onDragLeave);
      dz.removeEventListener("drop", onDrop);
    };
  }, []);

  // ========== HANDLERS ==========
  const showSuccess = (msg: string) => {
    setStatus(msg);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
    setTimeout(() => setStatus(""), 3000);
  };

  const onAddPreset = async (preset: Preset) => {
    try {
      setStatus("Adding frame…");
      const frame = FRAME_PATHS[preset];
      await addFrameFromPaths(frame.paths, frame.viewBox);
      showSuccess("✅ Frame added!");
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Failed"}`);
    }
  };

  const onFileSelect = (file: File | null) => {
    if (!file) { clearSelection(); return; }
    if (file.size > 5 * 1024 * 1024) { setStatus("❌ File too large! Max 5MB"); return; }
    if (!file.type.includes("png")) { setStatus("❌ Only PNG files allowed"); return; }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
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

      const endpoint = useSmartCrop ? "/smart-crop" : useRemoveBg ? "/remove-bg" : "/vectorize";
      const resp = await fetch(`${BACKEND_URL.replace(/\/$/, "")}${endpoint}`, { method: "POST", body: form });
      const text = await resp.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`Backend error (${resp.status})`); }
      if (!resp.ok) throw new Error(data?.error || `Failed (${resp.status})`);

      const paths: string[] = Array.isArray(data.paths) ? data.paths : typeof data.d === "string" ? [data.d] : [];
      if (!paths.length) throw new Error("No paths found");

      setStatus("Creating frame…");
      await addFrameFromPaths(paths, data.viewBox);

      // Save to library
      saveFrame({ name: selectedFile.name.replace(".png", ""), paths, viewBox: data.viewBox });
      setSavedFrames(getSavedFrames());

      showSuccess("🎉 Frame created & saved to library!");
      setTimeout(() => clearSelection(), 2500);
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Failed"}`);
    } finally {
      setIsConverting(false);
    }
  };

  // ========== BATCH CONVERT ==========
  const onBatchConvert = async () => {
    if (!batchFiles.length || isConverting) return;
    try {
      setIsConverting(true);
      setBatchProgress(0);

      const form = new FormData();
      batchFiles.forEach((f) => form.append("files", f));

      setStatus(`Uploading ${batchFiles.length} files…`);
      const resp = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/vectorize-batch`, { method: "POST", body: form });
      const text = await resp.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`Backend error (${resp.status})`); }
      if (!resp.ok) throw new Error(data?.error || `Failed (${resp.status})`);

      const results = data.results || [];
      let added = 0;

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        setBatchProgress(Math.round(((i + 1) / results.length) * 100));
        setStatus(`Creating frame ${i + 1}/${results.length}…`);

        if (r.paths && r.paths.length > 0) {
          await addFrameFromPaths(r.paths, r.viewBox);
          saveFrame({ name: r.name || `batch-${i}`, paths: r.paths, viewBox: r.viewBox });
          added++;
          // Small delay between frames
          await new Promise((res) => setTimeout(res, 300));
        }
      }

      setSavedFrames(getSavedFrames());
      showSuccess(`🎉 ${added}/${results.length} frames created!`);
      setBatchFiles([]);
      setBatchProgress(0);
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Batch failed"}`);
    } finally {
      setIsConverting(false);
    }
  };

  // ========== ADD FROM LIBRARY ==========
  const onAddFromLibrary = async (frame: SavedFrame) => {
    try {
      setStatus("Adding frame…");
      await addFrameFromPaths(frame.paths, frame.viewBox);
      showSuccess("✅ Frame added from library!");
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Failed"}`);
    }
  };

  // ========== ADD WITH EFFECT ==========
  const onAddWithEffect = async () => {
    try {
      setStatus("Adding frame with effect…");
      const frame = FRAME_PATHS[selectedFrameForEffect];
      await addFrameWithEffect(frame.paths, frame.viewBox, selectedEffect, selectedColor);
      showSuccess(`✅ Frame added with ${selectedEffect} effect!`);
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Failed"}`);
    }
  };

  // ========== RENDER ==========
  return (
    <div ref={dropZoneRef} style={{ padding: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(400px) rotate(360deg); opacity: 0; } }
        @keyframes slideIn { 0% { transform: translateY(10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        .tab-btn { padding: 8px 0; font-size: 11px; font-weight: 600; border: none; cursor: pointer; background: transparent; color: #888; border-bottom: 2px solid transparent; transition: all 0.2s; flex: 1; text-align: center; }
        .tab-btn.active { color: #7D2AE8; border-bottom-color: #7D2AE8; }
        .frame-grid-btn { padding: 10px; background: #7D2AE8; color: white; border-radius: 8px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s; text-align: center; }
        .frame-grid-btn:hover { background: #6B21D8; transform: scale(1.02); }
        .frame-grid-btn:active { transform: scale(0.98); }
      `}</style>

      {showConfetti && <Confetti />}

      {/* Header */}
      <div style={{ padding: "14px 16px 0", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "white" }}>✦ Frame Maker</h3>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Create custom frames for your designs</p>

        {/* Tabs */}
        <div style={{ display: "flex", marginTop: 12, gap: 0 }}>
          {([
            ["quick", "Quick"],
            ["custom", "Custom"],
            ["batch", "Batch"],
            ["library", "Library"],
            ["effects", "Effects"],
          ] as [Tab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              style={{
                color: activeTab === tab ? "white" : "rgba(255,255,255,0.6)",
                borderBottomColor: activeTab === tab ? "white" : "transparent",
              }}
            >
              {label}
              {tab === "library" && savedFrames.length > 0 && (
                <span style={{ marginLeft: 3, fontSize: 9, background: "rgba(255,255,255,0.3)", borderRadius: 10, padding: "1px 5px" }}>
                  {savedFrames.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16, animation: "slideIn 0.2s ease-out" }}>
        {/* Tutorial */}
        {showTutorial && activeTab === "quick" && (
          <div style={{ padding: "10px 12px", background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 8, fontSize: 12, marginBottom: 12, color: "#4338CA", position: "relative" }}>
            💡 <strong>Tip:</strong> Drag & drop PNG anywhere, or press Cmd+V to paste!
            <button onClick={() => setShowTutorial(false)} style={{ position: "absolute", top: 6, right: 8, background: "transparent", border: "none", cursor: "pointer", fontSize: 14, color: "#6366F1" }}>✕</button>
          </div>
        )}

        {/* ========== QUICK TAB ========== */}
        {activeTab === "quick" && (
          <div>
            {/* Frame Packs */}
            {Object.entries(FRAME_PACKS).map(([key, pack]) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, marginBottom: 8, fontWeight: 600, color: "#555" }}>
                  {pack.emoji} {pack.name}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                  {pack.frames.map((frame, i) => (
                    <button key={i} className="frame-grid-btn" onClick={() => onAddPreset(frame)}>
                      {frame.charAt(0).toUpperCase() + frame.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* All Shapes */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, marginBottom: 8, fontWeight: 600, color: "#555" }}>🔷 All Shapes</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {Object.keys(FRAME_PATHS).map((key) => (
                  <button key={key} className="frame-grid-btn" onClick={() => onAddPreset(key as Preset)}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========== CUSTOM TAB ========== */}
        {activeTab === "custom" && (
          <div>
            <input type="file" accept="image/png" onChange={(e) => onFileSelect(e.target.files?.[0] || null)} style={{ display: "none" }} id="file-input" disabled={isConverting} />

            <label htmlFor="file-input" style={{
              display: "block", padding: "14px 16px", background: isDragging ? "rgba(102,126,234,0.1)" : "#F5F5F5", color: "#333",
              borderRadius: 8, border: `2px dashed ${isDragging ? "#667eea" : "#CCC"}`, cursor: isConverting ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 600, textAlign: "center", transition: "all 0.2s", opacity: isConverting ? 0.5 : 1,
            }}>
              {isDragging ? "📂 Drop PNG here" : selectedFile ? `✓ ${selectedFile.name}` : "📁 Choose or Drop PNG"}
            </label>

            {/* Options */}
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <input type="checkbox" checked={useSmartCrop} onChange={(e) => setUseSmartCrop(e.target.checked)} />
                Smart Crop
              </label>
              <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <input type="checkbox" checked={useRemoveBg} onChange={(e) => setUseRemoveBg(e.target.checked)} />
                Remove BG
              </label>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div style={{ marginTop: 12, position: "relative" }}>
                <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                  <img src={previewUrl} alt="preview" style={{
                    width: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 8,
                    border: "2px solid #E5E5E5", background: "repeating-conic-gradient(#E5E5E5 0% 25%, white 0% 50%) 50% / 20px 20px",
                    opacity: isConverting ? 0.6 : 1,
                  }} />
                  <button onClick={clearSelection} disabled={isConverting} style={{
                    position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%",
                    background: "rgba(0,0,0,0.7)", border: "2px solid white", color: "white", fontSize: 16,
                    cursor: isConverting ? "not-allowed" : "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", padding: 0, lineHeight: 1, opacity: isConverting ? 0.5 : 1,
                  }} title="Remove (Esc)">✕</button>
                </div>
                <button style={{
                  marginTop: 10, width: "100%", padding: "12px 16px",
                  background: isConverting ? "#999" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white", borderRadius: 8, border: "none", cursor: isConverting ? "not-allowed" : "pointer",
                  fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                }} onClick={onConvertToFrame} disabled={!selectedFile || isConverting}>
                  {isConverting ? <><Spinner /> Converting...</> : "Convert to Frame ⏎"}
                </button>
              </div>
            )}

            <div style={{ fontSize: 11, marginTop: 10, opacity: 0.6 }}>
              Max 5MB • Cmd+V paste • Enter convert • Esc cancel
            </div>
          </div>
        )}

        {/* ========== BATCH TAB ========== */}
        {activeTab === "batch" && (
          <div>
            <input type="file" accept="image/png" multiple onChange={(e) => setBatchFiles(Array.from(e.target.files || []))} style={{ display: "none" }} id="batch-input" disabled={isConverting} />
            <label htmlFor="batch-input" style={{
              display: "block", padding: "14px 16px", background: "#F5F5F5", color: "#333",
              borderRadius: 8, border: "2px dashed #CCC", cursor: "pointer", fontSize: 13,
              fontWeight: 600, textAlign: "center",
            }}>
              {batchFiles.length > 0 ? `✓ ${batchFiles.length} files selected` : "📂 Choose multiple PNGs"}
            </label>

            {batchFiles.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {/* File list */}
                <div style={{ maxHeight: 150, overflowY: "auto", marginBottom: 10 }}>
                  {batchFiles.map((f, i) => (
                    <div key={i} style={{ fontSize: 11, padding: "4px 0", color: "#666", display: "flex", justifyContent: "space-between" }}>
                      <span>{f.name}</span>
                      <span style={{ opacity: 0.5 }}>{(f.size / 1024).toFixed(0)}KB</span>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                {batchProgress > 0 && (
                  <div style={{ height: 6, background: "#E5E5E5", borderRadius: 3, marginBottom: 10, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${batchProgress}%`, background: "linear-gradient(90deg, #667eea, #764ba2)", borderRadius: 3, transition: "width 0.3s" }} />
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{
                    flex: 1, padding: "12px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white", borderRadius: 8, border: "none", cursor: isConverting ? "not-allowed" : "pointer",
                    fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                  }} onClick={onBatchConvert} disabled={isConverting}>
                    {isConverting ? <><Spinner /> Converting...</> : `Convert All (${batchFiles.length})`}
                  </button>
                  <button style={{
                    padding: "12px 16px", background: "#F5F5F5", color: "#666", borderRadius: 8,
                    border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  }} onClick={() => setBatchFiles([])}>
                    Clear
                  </button>
                </div>
              </div>
            )}

            <div style={{ fontSize: 11, marginTop: 10, opacity: 0.6 }}>
              Select up to 20 PNGs • Or drag & drop multiple files
            </div>
          </div>
        )}

        {/* ========== LIBRARY TAB ========== */}
        {activeTab === "library" && (
          <div>
            {savedFrames.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: "#999" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
                <div style={{ fontSize: 13 }}>No saved frames yet</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Convert a PNG to start building your library</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11, marginBottom: 10, color: "#888" }}>
                  {savedFrames.length} saved frame{savedFrames.length !== 1 ? "s" : ""}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {savedFrames.map((frame) => (
                    <div key={frame.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 10px", background: "#F9F9F9", borderRadius: 8,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{frame.name}</div>
                        <div style={{ fontSize: 10, color: "#999" }}>
                          {frame.paths.length} path{frame.paths.length !== 1 ? "s" : ""} • {new Date(frame.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => onAddFromLibrary(frame)} style={{
                          padding: "6px 12px", background: "#7D2AE8", color: "white", borderRadius: 6,
                          border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                        }}>Add</button>
                        <button onClick={() => { deleteFrame(frame.id); setSavedFrames(getSavedFrames()); }} style={{
                          padding: "6px 10px", background: "#FEE", color: "#C33", borderRadius: 6,
                          border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                        }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== EFFECTS TAB ========== */}
        {activeTab === "effects" && (
          <div>
            {/* Frame selection */}
            <div style={{ fontSize: 12, marginBottom: 8, fontWeight: 600, color: "#555" }}>Choose Shape</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 16 }}>
              {(Object.keys(FRAME_PATHS) as Preset[]).map((key) => (
                <button key={key} onClick={() => setSelectedFrameForEffect(key)} style={{
                  padding: "8px 4px", background: selectedFrameForEffect === key ? "#7D2AE8" : "#F5F5F5",
                  color: selectedFrameForEffect === key ? "white" : "#333", borderRadius: 6, border: "none",
                  cursor: "pointer", fontSize: 11, fontWeight: 600,
                }}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>

            {/* Effect selection */}
            <div style={{ fontSize: 12, marginBottom: 8, fontWeight: 600, color: "#555" }}>Choose Effect</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
              {(["none", "shadow", "glow", "outline", "double"] as FrameEffect[]).map((effect) => (
                <button key={effect} onClick={() => setSelectedEffect(effect)} style={{
                  padding: "10px", background: selectedEffect === effect ? "#667eea" : "#F5F5F5",
                  color: selectedEffect === effect ? "white" : "#333", borderRadius: 8, border: "none",
                  cursor: "pointer", fontSize: 12, fontWeight: 600,
                }}>
                  {effect === "none" ? "No Effect" : effect.charAt(0).toUpperCase() + effect.slice(1)}
                </button>
              ))}
            </div>

            {/* Color picker */}
            <div style={{ fontSize: 12, marginBottom: 8, fontWeight: 600, color: "#555" }}>Effect Color</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {COLOR_PRESETS.map((color) => (
                <button key={color} onClick={() => { setSelectedColor(color); setCustomColor(color); }} style={{
                  width: 28, height: 28, borderRadius: "50%", background: color, border: selectedColor === color ? "3px solid #333" : "2px solid #DDD",
                  cursor: "pointer", padding: 0,
                }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 16 }}>
              <input type="color" value={customColor} onChange={(e) => { setCustomColor(e.target.value); setSelectedColor(e.target.value); }}
                style={{ width: 32, height: 32, border: "none", cursor: "pointer", padding: 0 }} />
              <span style={{ fontSize: 11, color: "#888" }}>Custom color</span>
            </div>

            {/* Apply button */}
            <button onClick={onAddWithEffect} style={{
              width: "100%", padding: "12px 16px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700,
            }}>
              Add {selectedFrameForEffect} with {selectedEffect === "none" ? "no" : selectedEffect} effect
            </button>
          </div>
        )}

        {/* ========== STATUS ========== */}
        {status && (
          <div style={{
            marginTop: 14, padding: "8px 12px",
            background: status.includes("❌") ? "#FEE" : status.includes("🎉") || status.includes("✅") ? "#F0F9FF" : "#E8F5E9",
            color: status.includes("❌") ? "#C33" : status.includes("🎉") || status.includes("✅") ? "#0369A1" : "#2E7D32",
            borderRadius: 6, fontSize: 12, fontWeight: 600,
            animation: isConverting ? "pulse 1.5s ease-in-out infinite" : "none",
          }}>
            {status}
          </div>
        )}
      </div>

      {/* Drag overlay */}
      {isDragging && activeTab !== "custom" && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(102,126,234,0.15)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 100, borderRadius: 0,
        }}>
          <div style={{ background: "white", padding: "20px 30px", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", fontSize: 16, fontWeight: 700, color: "#667eea" }}>
            📂 Drop PNG here
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
