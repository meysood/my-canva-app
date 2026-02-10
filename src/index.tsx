import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { addElementAtPoint, getDefaultPageDimensions, selection } from "@canva/design";

const BACKEND_URL = "https://frame-maker-backend-production.up.railway.app";

type Preset = "square" | "circle" | "rounded" | "heart" | "star" | "hexagon" | "diamond" | "arch" | "cross" | "oval";
type Tab = "quick" | "custom" | "batch" | "library" | "effects" | "selection";
type FrameEffect = "none" | "shadow" | "glow" | "outline" | "double";

const FRAME_PATHS: Record<string, { paths: string[]; viewBox: { width: number; height: number; left: number; top: number } }> = {
  square: { paths: ["M 0 0 H 240 V 240 H 0 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 } },
  circle: { paths: ["M 120 0 C 186.274 0 240 53.726 240 120 C 240 186.274 186.274 240 120 240 C 53.726 240 0 186.274 0 120 C 0 53.726 53.726 0 120 0 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 } },
  rounded: { paths: ["M 40 0 H 200 C 222.091 0 240 17.909 240 40 V 200 C 240 222.091 222.091 240 200 240 H 40 C 17.909 240 0 222.091 0 200 V 40 C 0 17.909 17.909 0 40 0 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 } },
  heart: { paths: ["M 120 220 C 120 220 20 160 20 88 C 20 48 48 20 86 20 C 104 20 114 28 120 36 C 126 28 136 20 154 20 C 192 20 220 48 220 88 C 220 160 120 220 120 220 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 } },
  star: { paths: ["M 120 0 L 148 88 L 240 88 L 166 142 L 192 230 L 120 178 L 48 230 L 74 142 L 0 88 L 92 88 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 } },
  hexagon: { paths: ["M 120 0 L 226 60 L 226 180 L 120 240 L 14 180 L 14 60 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 } },
  diamond: { paths: ["M 120 0 L 240 120 L 120 240 L 0 120 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 } },
  arch: { paths: ["M 0 240 L 0 120 C 0 53.726 53.726 0 120 0 C 186.274 0 240 53.726 240 120 L 240 240 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 } },
  cross: { paths: ["M 80 0 H 160 V 80 H 240 V 160 H 160 V 240 H 80 V 160 H 0 V 80 H 80 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 } },
  oval: { paths: ["M 160 0 C 248.366 0 320 53.726 320 120 C 320 186.274 248.366 240 160 240 C 71.634 240 0 186.274 0 120 C 0 53.726 71.634 0 160 0 Z"], viewBox: { width: 320, height: 240, left: 0, top: 0 } },
};

const FRAME_PACKS: Record<string, { name: string; emoji: string; frames: Preset[] }> = {
  basic: { name: "Basic", emoji: "📐", frames: ["square", "circle", "rounded", "oval"] },
  fancy: { name: "Fancy", emoji: "✨", frames: ["heart", "star", "hexagon", "diamond"] },
  creative: { name: "Creative", emoji: "🎨", frames: ["arch", "cross", "star", "heart"] },
  wedding: { name: "Wedding", emoji: "💒", frames: ["heart", "circle", "oval", "arch"] },
  birthday: { name: "Birthday", emoji: "🎂", frames: ["star", "circle", "heart", "diamond"] },
};

const COLOR_PRESETS = ["#7D2AE8","#667eea","#764ba2","#f093fb","#4facfe","#43e97b","#fa709a","#fee140","#FF6B6B","#333333","#FFFFFF","#000000","#FF9800","#2196F3","#4CAF50"];

const FONT_OPTIONS = [
  { id: "sans-bold", name: "Sans Bold" },
  { id: "serif-bold", name: "Serif Bold" },
  { id: "mono-bold", name: "Mono Bold" },
  { id: "sans-black", name: "Sans Black" },
  { id: "sans-thin", name: "Sans Thin" },
  { id: "sans-light", name: "Sans Light" },
  { id: "serif-normal", name: "Serif Regular" },
  { id: "mono-normal", name: "Mono Regular" },
  { id: "noto-bold", name: "Noto Bold" },
  { id: "noto-black", name: "Noto Black" },
];

async function getPageFitBox() {
  const dims = await getDefaultPageDimensions();
  const pw = dims.width, ph = dims.height;
  const padding = Math.min(pw, ph) * 0.1;
  const size = Math.min(pw - padding * 2, ph - padding * 2);
  return { top: (ph - size) / 2, left: (pw - size) / 2, width: size, height: size };
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function addFrameFromPaths(paths: string[], viewBox = { width: 1000, height: 1000, left: 0, top: 0 }) {
  const box = await getPageFitBox();
  await addElementAtPoint({ type: "shape", top: box.top, left: box.left, width: box.width, height: box.height, paths: paths.map((d) => ({ d, fill: { dropTarget: true } })), viewBox });
}

async function addFrameWithEffect(paths: string[], viewBox: { width: number; height: number; left: number; top: number }, effect: FrameEffect, effectColor: string) {
  const box = await getPageFitBox();
  try {
    if (effect === "double") { const s = box.width * 1.16, o = (s - box.width) / 2; await addElementAtPoint({ type: "shape", top: box.top - o, left: box.left - o, width: s, height: s, paths: paths.map((d) => ({ d, fill: { color: effectColor } })), viewBox }); await delay(250); const s1 = box.width * 1.08, o1 = (s1 - box.width) / 2; await addElementAtPoint({ type: "shape", top: box.top - o1, left: box.left - o1, width: s1, height: s1, paths: paths.map((d) => ({ d, fill: { color: "#FFFFFF" } })), viewBox }); await delay(250); }
    if (effect === "outline") { const s = box.width * 1.10, o = (s - box.width) / 2; await addElementAtPoint({ type: "shape", top: box.top - o, left: box.left - o, width: s, height: s, paths: paths.map((d) => ({ d, fill: { color: effectColor } })), viewBox }); await delay(250); }
    if (effect === "glow") { const s = box.width * 1.12, o = (s - box.width) / 2; await addElementAtPoint({ type: "shape", top: box.top - o, left: box.left - o, width: s, height: s, paths: paths.map((d) => ({ d, fill: { color: effectColor } })), viewBox }); await delay(250); }
    if (effect === "shadow") { await addElementAtPoint({ type: "shape", top: box.top + 8, left: box.left + 8, width: box.width, height: box.height, paths: paths.map((d) => ({ d, fill: { color: "#333333" } })), viewBox }); await delay(250); }
    await addElementAtPoint({ type: "shape", top: box.top, left: box.left, width: box.width, height: box.height, paths: paths.map((d) => ({ d, fill: { dropTarget: true } })), viewBox });
  } catch { await addElementAtPoint({ type: "shape", top: box.top, left: box.left, width: box.width, height: box.height, paths: paths.map((d) => ({ d, fill: { dropTarget: true } })), viewBox }); }
}

interface SavedFrame { id: string; name: string; paths: string[]; viewBox: { width: number; height: number; left: number; top: number }; timestamp: number; }
function getSavedFrames(): SavedFrame[] { try { return JSON.parse(localStorage.getItem("frame_maker_library") || "[]"); } catch { return []; } }
function saveFrame(f: Omit<SavedFrame, "id" | "timestamp">) { const frames = getSavedFrames(); frames.unshift({ ...f, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), timestamp: Date.now() }); if (frames.length > 50) frames.length = 50; localStorage.setItem("frame_maker_library", JSON.stringify(frames)); }
function deleteFrame(id: string) { localStorage.setItem("frame_maker_library", JSON.stringify(getSavedFrames().filter((f) => f.id !== id))); }

function Spinner() { return <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block", marginRight: 6 }} />; }
function Confetti() { return <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9999 }}>{[...Array(30)].map((_, i) => <div key={i} style={{ position: "absolute", width: 8, height: 8, background: ["#667eea","#764ba2","#f093fb","#4facfe","#43e97b","#fa709a"][i % 6], left: `${Math.random() * 100}%`, top: "-10px", borderRadius: Math.random() > 0.5 ? "50%" : "2px", animation: `fall ${1 + Math.random() * 2}s linear`, animationDelay: `${Math.random() * 0.5}s` }} />)}</div>; }

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("quick");
  const [status, setStatus] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [useSmartCrop, setUseSmartCrop] = useState(false);
  const [useRemoveBg, setUseRemoveBg] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [savedFrames, setSavedFrames] = useState<SavedFrame[]>(getSavedFrames());
  const [selectedEffect, setSelectedEffect] = useState<FrameEffect>("none");
  const [selectedColor, setSelectedColor] = useState("#7D2AE8");
  const [customColor, setCustomColor] = useState("#7D2AE8");
  const [selectedFrameForEffect, setSelectedFrameForEffect] = useState<Preset>("circle");

  // Selection tab
  const [selectedText, setSelectedText] = useState("");
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [manualText, setManualText] = useState("");
  const [textFontSize, setTextFontSize] = useState(250);
  const [textFontStyle, setTextFontStyle] = useState("sans-bold");
  const [selectionMode, setSelectionMode] = useState<"text" | "shape">("text");
  const [textMode, setTextMode] = useState<"combined" | "individual">("combined");
  const [shapeFile, setShapeFile] = useState<File | null>(null);
  const [shapePreview, setShapePreview] = useState("");

  useEffect(() => {
    try {
      const dispose = selection.registerOnChange({
        scope: "plaintext",
        onChange: async (event) => {
          if (event.count > 0) {
            try { const draft = await event.read(); const t = draft.contents[0]?.text || ""; setSelectedText(t); setHasTextSelection(true); setManualText(t); } catch { setHasTextSelection(false); }
          } else { setHasTextSelection(false); setSelectedText(""); }
        },
      });
      return () => { if (dispose) dispose(); };
    } catch {}
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "v") { navigator.clipboard.read().then((items) => { for (const item of items) { const t = item.types.find((t) => t.startsWith("image/png")); if (t) item.getType(t).then((blob) => { onFileSelect(new File([blob], "pasted.png", { type: "image/png" })); setActiveTab("custom"); }); } }).catch(() => {}); }
      if (e.key === "Enter" && selectedFile && !isConverting) onConvertToFrame();
      if (e.key === "Escape") clearFileSelection();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedFile, isConverting]);

  useEffect(() => {
    const dz = dropZoneRef.current; if (!dz) return;
    const onOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onLeave = () => setIsDragging(false);
    const onDrop = (e: DragEvent) => { e.preventDefault(); setIsDragging(false); const files = Array.from(e.dataTransfer?.files || []); const pngs = files.filter((f) => f.type.includes("png")); if (pngs.length === 1) { onFileSelect(pngs[0]); setActiveTab("custom"); } else if (pngs.length > 1) { setBatchFiles(pngs); setActiveTab("batch"); } else if (files.length > 0) setStatus("❌ Only PNG files allowed"); };
    dz.addEventListener("dragover", onOver); dz.addEventListener("dragleave", onLeave); dz.addEventListener("drop", onDrop);
    return () => { dz.removeEventListener("dragover", onOver); dz.removeEventListener("dragleave", onLeave); dz.removeEventListener("drop", onDrop); };
  }, []);

  const showSuccess = (msg: string) => { setStatus(msg); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 2000); setTimeout(() => setStatus(""), 3000); };
  const onAddPreset = async (p: Preset) => { try { setStatus("Adding…"); await addFrameFromPaths(FRAME_PATHS[p].paths, FRAME_PATHS[p].viewBox); showSuccess("✅ Frame added!"); } catch (e: any) { setStatus(`❌ ${e?.message}`); } };
  const onFileSelect = (file: File | null) => { if (!file) { clearFileSelection(); return; } if (file.size > 5242880) { setStatus("❌ Max 5MB"); return; } if (!file.type.includes("png")) { setStatus("❌ Only PNG"); return; } setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); setStatus(""); setShowTutorial(false); };
  const clearFileSelection = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setSelectedFile(null); setPreviewUrl(""); setStatus(""); setIsConverting(false); };

  const onConvertToFrame = async () => {
    if (!selectedFile || isConverting) return;
    try { setIsConverting(true); setStatus("Uploading…"); const form = new FormData(); form.append("file", selectedFile); const ep = useSmartCrop ? "/smart-crop" : useRemoveBg ? "/remove-bg" : "/vectorize"; const data = await (await fetch(`${BACKEND_URL}${ep}`, { method: "POST", body: form })).json(); if (data.error) throw new Error(data.error); if (!data.paths?.length) throw new Error("No paths"); await addFrameFromPaths(data.paths, data.viewBox); saveFrame({ name: selectedFile.name.replace(".png", ""), paths: data.paths, viewBox: data.viewBox }); setSavedFrames(getSavedFrames()); showSuccess("🎉 Frame created!"); setTimeout(clearFileSelection, 2500); } catch (e: any) { setStatus(`❌ ${e?.message}`); } finally { setIsConverting(false); }
  };

  const onBatchConvert = async () => {
    if (!batchFiles.length || isConverting) return;
    try { setIsConverting(true); setBatchProgress(0); const form = new FormData(); batchFiles.forEach((f) => form.append("files", f)); const data = await (await fetch(`${BACKEND_URL}/vectorize-batch`, { method: "POST", body: form })).json(); const results = data.results || []; let added = 0; for (let i = 0; i < results.length; i++) { setBatchProgress(Math.round(((i + 1) / results.length) * 100)); const r = results[i]; if (r.paths?.length) { await addFrameFromPaths(r.paths, r.viewBox); saveFrame({ name: r.name || `batch-${i}`, paths: r.paths, viewBox: r.viewBox }); added++; await delay(300); } } setSavedFrames(getSavedFrames()); showSuccess(`🎉 ${added} created!`); setBatchFiles([]); setBatchProgress(0); } catch (e: any) { setStatus(`❌ ${e?.message}`); } finally { setIsConverting(false); }
  };

  const onAddFromLibrary = async (f: SavedFrame) => { try { setStatus("Adding…"); await addFrameFromPaths(f.paths, f.viewBox); showSuccess("✅ Added!"); } catch (e: any) { setStatus(`❌ ${e?.message}`); } };
  const onAddWithEffect = async () => { try { setIsConverting(true); const f = FRAME_PATHS[selectedFrameForEffect]; await addFrameWithEffect(f.paths, f.viewBox, selectedEffect, selectedColor); showSuccess("✅ Added!"); } catch (e: any) { setStatus(`❌ ${e?.message}`); } finally { setIsConverting(false); } };

  // TEXT → FRAME
  const onConvertTextToFrame = async () => {
    const text = manualText.trim();
    if (!text || isConverting) return;
    try {
      setIsConverting(true);
      setStatus(textMode === "individual" ? "🔄 Converting each letter…" : "🔄 Converting text…");

      const data = await (await fetch(`${BACKEND_URL}/text-to-frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fontSize: textFontSize, fontStyle: textFontStyle, mode: textMode }),
      })).json();

      if (data.error) throw new Error(data.error);

      if (textMode === "individual" && data.results) {
        // Individual: each letter = separate frame
        let added = 0;
        for (const r of data.results) {
          if (r.paths?.length) {
            await addFrameFromPaths(r.paths, r.viewBox);
            saveFrame({ name: `Letter: ${r.letter}`, paths: r.paths, viewBox: r.viewBox });
            added++;
            await delay(400);
          }
        }
        setSavedFrames(getSavedFrames());
        showSuccess(`🎉 ${added} letter frames created!`);
      } else {
        // Combined: all text = one frame
        if (!data.paths?.length) throw new Error("No paths");
        await addFrameFromPaths(data.paths, data.viewBox);
        saveFrame({ name: `Text: ${text.substring(0, 20)}`, paths: data.paths, viewBox: data.viewBox });
        setSavedFrames(getSavedFrames());
        showSuccess("🎉 Text frame created!");
      }
    } catch (e: any) { setStatus(`❌ ${e?.message}`); }
    finally { setIsConverting(false); }
  };

  // SHAPE → FRAME (via PNG upload)
  const onShapeFileSelect = (file: File | null) => {
    if (!file) { setShapeFile(null); setShapePreview(""); return; }
    if (!file.type.includes("png") && !file.type.includes("jpeg") && !file.type.includes("jpg")) { setStatus("❌ PNG or JPG only"); return; }
    if (file.size > 5242880) { setStatus("❌ Max 5MB"); return; }
    setShapeFile(file);
    setShapePreview(URL.createObjectURL(file));
  };

  const onConvertShapeToFrame = async () => {
    if (!shapeFile || isConverting) return;
    try {
      setIsConverting(true);
      setStatus("🔄 Converting shape…");
      const form = new FormData();
      form.append("file", shapeFile);
      const data = await (await fetch(`${BACKEND_URL}/shape-to-frame`, { method: "POST", body: form })).json();
      if (data.error) throw new Error(data.error);
      if (!data.paths?.length) throw new Error("No paths found");
      await addFrameFromPaths(data.paths, data.viewBox);
      saveFrame({ name: "Shape Frame", paths: data.paths, viewBox: data.viewBox });
      setSavedFrames(getSavedFrames());
      showSuccess("🎉 Shape converted to frame!");
      setShapeFile(null); setShapePreview("");
    } catch (e: any) { setStatus(`❌ ${e?.message}`); }
    finally { setIsConverting(false); }
  };

  return (
    <div ref={dropZoneRef} style={{ padding: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(400px) rotate(360deg); opacity: 0; } }
        @keyframes slideIn { 0% { transform: translateY(10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        .tab-btn { padding: 10px 4px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; background: transparent; color: rgba(255,255,255,0.5); border-bottom: 3px solid transparent; transition: all 0.2s; flex: 1; text-align: center; letter-spacing: 0.3px; }
        .tab-btn.active { color: white; border-bottom-color: white; background: rgba(255,255,255,0.15); border-radius: 8px 8px 0 0; }
        .frame-grid-btn { padding: 10px; background: #7D2AE8; color: white; border-radius: 8px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s; text-align: center; }
        .frame-grid-btn:hover { background: #6B21D8; transform: scale(1.02); }
      `}</style>

      {showConfetti && <Confetti />}

      <div style={{ padding: "14px 16px 0", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "white" }}>✦ Frame Maker</h3>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Create custom frames for your designs</p>
        <div style={{ display: "flex", marginTop: 12 }}>
          {([["quick","Quick"],["custom","Custom"],["batch","Batch"],["library","Library"],["effects","Effects"],["selection","Select"]] as [Tab,string][]).map(([tab,label]) => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
              {label}
              {tab === "library" && savedFrames.length > 0 && <span style={{ marginLeft: 3, fontSize: 9, background: "rgba(255,255,255,0.3)", borderRadius: 10, padding: "1px 5px" }}>{savedFrames.length}</span>}
              {tab === "selection" && hasTextSelection && <span style={{ marginLeft: 3, fontSize: 9, background: "#43e97b", color: "#000", borderRadius: 10, padding: "1px 5px" }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16, animation: "slideIn 0.2s ease-out" }}>
        {showTutorial && activeTab === "quick" && <div style={{ padding: "10px 12px", background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 8, fontSize: 12, marginBottom: 12, color: "#4338CA", position: "relative" }}>💡 <strong>Tip:</strong> Drag & drop PNG anywhere!<button onClick={() => setShowTutorial(false)} style={{ position: "absolute", top: 6, right: 8, background: "transparent", border: "none", cursor: "pointer", fontSize: 14, color: "#6366F1" }}>✕</button></div>}

        {/* QUICK */}
        {activeTab === "quick" && <div>{Object.entries(FRAME_PACKS).map(([k, p]) => <div key={k} style={{ marginBottom: 16 }}><div style={{ fontSize: 12, marginBottom: 8, fontWeight: 600, color: "#555" }}>{p.emoji} {p.name}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>{p.frames.map((f, i) => <button key={i} className="frame-grid-btn" onClick={() => onAddPreset(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>)}</div></div>)}<div style={{ marginTop: 8 }}><div style={{ fontSize: 12, marginBottom: 8, fontWeight: 600, color: "#555" }}>🔷 All Shapes</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>{Object.keys(FRAME_PATHS).map((k) => <button key={k} className="frame-grid-btn" onClick={() => onAddPreset(k as Preset)}>{k.charAt(0).toUpperCase() + k.slice(1)}</button>)}</div></div></div>}

        {/* CUSTOM */}
        {activeTab === "custom" && <div><input type="file" accept="image/png" onChange={(e) => onFileSelect(e.target.files?.[0] || null)} style={{ display: "none" }} id="file-input" disabled={isConverting} /><label htmlFor="file-input" style={{ display: "block", padding: "14px 16px", background: "#F5F5F5", color: "#333", borderRadius: 8, border: "2px dashed #CCC", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "center" }}>{selectedFile ? `✓ ${selectedFile.name}` : "📁 Choose or Drop PNG"}</label><div style={{ marginTop: 12, display: "flex", gap: 8 }}><label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><input type="checkbox" checked={useSmartCrop} onChange={(e) => setUseSmartCrop(e.target.checked)} /> Smart Crop</label><label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><input type="checkbox" checked={useRemoveBg} onChange={(e) => setUseRemoveBg(e.target.checked)} /> Remove BG</label></div>{previewUrl && <div style={{ marginTop: 12 }}><div style={{ position: "relative", width: "100%" }}><img src={previewUrl} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 8, border: "2px solid #E5E5E5", background: "repeating-conic-gradient(#E5E5E5 0% 25%, white 0% 50%) 50% / 20px 20px" }} /><button onClick={clearFileSelection} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "2px solid white", color: "white", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button></div><button style={{ marginTop: 10, width: "100%", padding: "12px", background: isConverting ? "#999" : "linear-gradient(135deg, #667eea, #764ba2)", color: "white", borderRadius: 8, border: "none", cursor: isConverting ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onConvertToFrame} disabled={!selectedFile || isConverting}>{isConverting ? <><Spinner /> Converting...</> : "Convert to Frame ⏎"}</button></div>}</div>}

        {/* BATCH */}
        {activeTab === "batch" && <div><input type="file" accept="image/png" multiple onChange={(e) => setBatchFiles(Array.from(e.target.files || []))} style={{ display: "none" }} id="batch-input" /><label htmlFor="batch-input" style={{ display: "block", padding: "14px 16px", background: "#F5F5F5", color: "#333", borderRadius: 8, border: "2px dashed #CCC", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "center" }}>{batchFiles.length > 0 ? `✓ ${batchFiles.length} files` : "📂 Choose PNGs"}</label>{batchFiles.length > 0 && <div style={{ marginTop: 12 }}>{batchProgress > 0 && <div style={{ height: 6, background: "#E5E5E5", borderRadius: 3, marginBottom: 10, overflow: "hidden" }}><div style={{ height: "100%", width: `${batchProgress}%`, background: "linear-gradient(90deg, #667eea, #764ba2)", borderRadius: 3, transition: "width 0.3s" }} /></div>}<div style={{ display: "flex", gap: 8 }}><button style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onBatchConvert} disabled={isConverting}>{isConverting ? <><Spinner /> Converting...</> : `Convert All (${batchFiles.length})`}</button><button style={{ padding: "12px 16px", background: "#F5F5F5", color: "#666", borderRadius: 8, border: "none", cursor: "pointer" }} onClick={() => setBatchFiles([])}>Clear</button></div></div>}</div>}

        {/* LIBRARY */}
        {activeTab === "library" && <div>{savedFrames.length === 0 ? <div style={{ textAlign: "center", padding: 30, color: "#999" }}><div style={{ fontSize: 32, marginBottom: 8 }}>📚</div><div style={{ fontSize: 13 }}>No saved frames</div></div> : <div><div style={{ fontSize: 11, marginBottom: 10, color: "#888" }}>{savedFrames.length} saved</div>{savedFrames.map((f) => <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "#F9F9F9", borderRadius: 8, marginBottom: 6 }}><div><div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div><div style={{ fontSize: 10, color: "#999" }}>{f.paths.length} paths</div></div><div style={{ display: "flex", gap: 6 }}><button onClick={() => onAddFromLibrary(f)} style={{ padding: "6px 12px", background: "#7D2AE8", color: "white", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Add</button><button onClick={() => { deleteFrame(f.id); setSavedFrames(getSavedFrames()); }} style={{ padding: "6px 10px", background: "#FEE", color: "#C33", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>✕</button></div></div>)}</div>}</div>}

        {/* EFFECTS */}
        {activeTab === "effects" && <div><div style={{ fontSize: 12, marginBottom: 8, fontWeight: 600, color: "#555" }}>Shape</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 16 }}>{(Object.keys(FRAME_PATHS) as Preset[]).map((k) => <button key={k} onClick={() => setSelectedFrameForEffect(k)} style={{ padding: "8px 4px", background: selectedFrameForEffect === k ? "#7D2AE8" : "#F5F5F5", color: selectedFrameForEffect === k ? "white" : "#333", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{k.charAt(0).toUpperCase() + k.slice(1)}</button>)}</div><div style={{ fontSize: 12, marginBottom: 8, fontWeight: 600, color: "#555" }}>Effect</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>{(["none","shadow","glow","outline","double"] as FrameEffect[]).map((e) => <button key={e} onClick={() => setSelectedEffect(e)} style={{ padding: "10px", background: selectedEffect === e ? "#667eea" : "#F5F5F5", color: selectedEffect === e ? "white" : "#333", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{e === "none" ? "No Effect" : e.charAt(0).toUpperCase() + e.slice(1)}</button>)}</div>{selectedEffect !== "none" && <><div style={{ fontSize: 12, marginBottom: 8, fontWeight: 600, color: "#555" }}>Color</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{COLOR_PRESETS.map((c) => <button key={c} onClick={() => { setSelectedColor(c); setCustomColor(c); }} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: selectedColor === c ? "3px solid #333" : "2px solid #DDD", cursor: "pointer", padding: 0 }} />)}</div><div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 16 }}><input type="color" value={customColor} onChange={(e) => { setCustomColor(e.target.value); setSelectedColor(e.target.value); }} style={{ width: 32, height: 32, border: "none", cursor: "pointer", padding: 0 }} /><span style={{ fontSize: 11, color: "#888" }}>Custom</span></div></>}<button onClick={onAddWithEffect} disabled={isConverting} style={{ width: "100%", padding: "12px", background: isConverting ? "#999" : "linear-gradient(135deg, #667eea, #764ba2)", color: "white", borderRadius: 8, border: "none", cursor: isConverting ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{isConverting ? <><Spinner /> Adding...</> : `Add Frame${selectedEffect !== "none" ? ` + ${selectedEffect}` : ""}`}</button></div>}

        {/* SELECTION TAB */}
        {activeTab === "selection" && (
          <div>
            <div style={{ display: "inline-block", padding: "3px 10px", background: "linear-gradient(135deg, #f093fb, #f5576c)", color: "white", borderRadius: 12, fontSize: 10, fontWeight: 700, marginBottom: 14 }}>✦ PRO</div>

            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              <button onClick={() => setSelectionMode("text")} style={{ flex: 1, padding: "10px", background: selectionMode === "text" ? "#667eea" : "#F5F5F5", color: selectionMode === "text" ? "white" : "#333", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>📝 Text → Frame</button>
              <button onClick={() => setSelectionMode("shape")} style={{ flex: 1, padding: "10px", background: selectionMode === "shape" ? "#667eea" : "#F5F5F5", color: selectionMode === "shape" ? "white" : "#333", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>🔷 Shape → Frame</button>
            </div>

            {/* TEXT MODE */}
            {selectionMode === "text" && (
              <div>
                {hasTextSelection && <div style={{ padding: "10px 12px", background: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: 8, marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 600, color: "#2E7D32", marginBottom: 4 }}>✅ Detected:</div><div style={{ fontSize: 14, fontWeight: 700, color: "#1B5E20" }}>"{selectedText}"</div></div>}

                <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 600, color: "#555" }}>Text</div>
                <input type="text" value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="Type here..." maxLength={50} style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "2px solid #DDD", fontSize: 16, fontWeight: 700, outline: "none", boxSizing: "border-box" }} onFocus={(e) => (e.target.style.borderColor = "#667eea")} onBlur={(e) => (e.target.style.borderColor = "#DDD")} />

                {/* Combined vs Individual */}
                <div style={{ fontSize: 12, marginTop: 12, marginBottom: 6, fontWeight: 600, color: "#555" }}>Convert Mode</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  <button onClick={() => setTextMode("combined")} style={{ flex: 1, padding: "10px", background: textMode === "combined" ? "#764ba2" : "#F5F5F5", color: textMode === "combined" ? "white" : "#333", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    🔗 All as One Frame
                  </button>
                  <button onClick={() => setTextMode("individual")} style={{ flex: 1, padding: "10px", background: textMode === "individual" ? "#764ba2" : "#F5F5F5", color: textMode === "individual" ? "white" : "#333", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    ✂️ Each Letter
                  </button>
                </div>

                {/* Font picker */}
                <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 600, color: "#555" }}>Font Style</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                  {FONT_OPTIONS.map((f) => (
                    <button key={f.id} onClick={() => setTextFontStyle(f.id)} style={{ padding: "8px 10px", background: textFontStyle === f.id ? "#667eea" : "#F5F5F5", color: textFontStyle === f.id ? "white" : "#333", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: textFontStyle === f.id ? 700 : 500, textAlign: "left" }}>
                      {f.name}
                    </button>
                  ))}
                </div>

                {/* Size */}
                <div style={{ fontSize: 12, marginBottom: 4, fontWeight: 600, color: "#555", display: "flex", justifyContent: "space-between" }}><span>Size</span><span style={{ color: "#888" }}>{textFontSize}</span></div>
                <input type="range" min={80} max={400} value={textFontSize} onChange={(e) => setTextFontSize(Number(e.target.value))} style={{ width: "100%" }} />

                {/* Preview */}
                {manualText.trim() && <div style={{ marginTop: 14, padding: "20px", background: "#F9F9F9", borderRadius: 8, textAlign: "center", border: "1px solid #E5E5E5" }}><div style={{ fontSize: Math.min(textFontSize / 5, 48), fontWeight: 700, color: "#333", wordBreak: "break-word" }}>{manualText}</div><div style={{ fontSize: 10, color: "#999", marginTop: 6 }}>{textMode === "individual" ? `${manualText.trim().replace(/\s/g, "").length} separate frames` : "1 combined frame"}</div></div>}

                <button onClick={onConvertTextToFrame} disabled={!manualText.trim() || isConverting} style={{ marginTop: 14, width: "100%", padding: "14px", background: !manualText.trim() || isConverting ? "#999" : "linear-gradient(135deg, #f093fb, #f5576c)", color: "white", borderRadius: 10, border: "none", cursor: !manualText.trim() || isConverting ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: !manualText.trim() || isConverting ? "none" : "0 4px 15px rgba(240,147,251,0.4)" }}>
                  {isConverting ? <><Spinner /> Converting...</> : textMode === "individual" ? "✦ Convert Each Letter" : "✦ Convert to Frame"}
                </button>
              </div>
            )}

            {/* SHAPE MODE */}
            {selectionMode === "shape" && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#333" }}>Shape → Frame</div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>
                  Upload a <strong>screenshot or PNG</strong> of your shape to convert it into a frame.
                </div>

                <input type="file" accept="image/png,image/jpeg" onChange={(e) => onShapeFileSelect(e.target.files?.[0] || null)} style={{ display: "none" }} id="shape-input" disabled={isConverting} />
                <label htmlFor="shape-input" style={{ display: "block", padding: "14px 16px", background: "#F5F5F5", color: "#333", borderRadius: 8, border: "2px dashed #CCC", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                  {shapeFile ? `✓ ${shapeFile.name}` : "📂 Upload Shape PNG"}
                </label>

                {shapePreview && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ position: "relative", width: "100%" }}>
                      <img src={shapePreview} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 8, border: "2px solid #E5E5E5", background: "repeating-conic-gradient(#E5E5E5 0% 25%, white 0% 50%) 50% / 20px 20px" }} />
                      <button onClick={() => { setShapeFile(null); setShapePreview(""); }} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "2px solid white", color: "white", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button>
                    </div>
                  </div>
                )}

                <button onClick={onConvertShapeToFrame} disabled={!shapeFile || isConverting} style={{
                  marginTop: 14, width: "100%", padding: "14px",
                  background: !shapeFile || isConverting ? "#999" : "linear-gradient(135deg, #f093fb, #f5576c)",
                  color: "white", borderRadius: 10, border: "none",
                  cursor: !shapeFile || isConverting ? "not-allowed" : "pointer",
                  fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: !shapeFile || isConverting ? "none" : "0 4px 15px rgba(240,147,251,0.4)",
                }}>
                  {isConverting ? <><Spinner /> Converting...</> : "✦ Convert Shape to Frame"}
                </button>

                <div style={{ fontSize: 11, marginTop: 12, opacity: 0.5, textAlign: "center" }}>
                  Tip: Take screenshot of your shape, upload here
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status */}
        {status && <div style={{ marginTop: 14, padding: "8px 12px", background: status.includes("❌") ? "#FEE" : status.includes("🎉") || status.includes("✅") ? "#F0F9FF" : "#E8F5E9", color: status.includes("❌") ? "#C33" : status.includes("🎉") || status.includes("✅") ? "#0369A1" : "#2E7D32", borderRadius: 6, fontSize: 12, fontWeight: 600, animation: isConverting ? "pulse 1.5s ease-in-out infinite" : "none" }}>{status}</div>}
      </div>

      {isDragging && activeTab !== "custom" && <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(102,126,234,0.15)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}><div style={{ background: "white", padding: "20px 30px", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", fontSize: 16, fontWeight: 700, color: "#667eea" }}>📂 Drop PNG here</div></div>}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
