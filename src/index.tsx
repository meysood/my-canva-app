import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { addElementAtPoint, getDefaultPageDimensions, selection } from "@canva/design";

const BACKEND_URL = "https://frame-maker-backend-production.up.railway.app";

type Preset = "square" | "circle" | "rounded" | "heart" | "star" | "hexagon" | "diamond" | "arch" | "cross" | "oval";
type Tab = "frames" | "convert" | "effects" | "pro";
type FrameEffect = "none" | "shadow" | "glow" | "outline" | "double";

const FRAME_PATHS: Record<string, { paths: string[]; viewBox: { width: number; height: number; left: number; top: number }; emoji: string }> = {
  square:  { paths: ["M 0 0 H 240 V 240 H 0 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 }, emoji: "⬜" },
  circle:  { paths: ["M 120 0 C 186.274 0 240 53.726 240 120 C 240 186.274 186.274 240 120 240 C 53.726 240 0 186.274 0 120 C 0 53.726 53.726 0 120 0 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 }, emoji: "⭕" },
  rounded: { paths: ["M 40 0 H 200 C 222.091 0 240 17.909 240 40 V 200 C 240 222.091 222.091 240 200 240 H 40 C 17.909 240 0 222.091 0 200 V 40 C 0 17.909 17.909 0 40 0 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 }, emoji: "🔲" },
  heart:   { paths: ["M 120 220 C 120 220 20 160 20 88 C 20 48 48 20 86 20 C 104 20 114 28 120 36 C 126 28 136 20 154 20 C 192 20 220 48 220 88 C 220 160 120 220 120 220 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 }, emoji: "❤️" },
  star:    { paths: ["M 120 0 L 148 88 L 240 88 L 166 142 L 192 230 L 120 178 L 48 230 L 74 142 L 0 88 L 92 88 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 }, emoji: "⭐" },
  hexagon: { paths: ["M 120 0 L 226 60 L 226 180 L 120 240 L 14 180 L 14 60 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 }, emoji: "⬡" },
  diamond: { paths: ["M 120 0 L 240 120 L 120 240 L 0 120 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 }, emoji: "💎" },
  arch:    { paths: ["M 0 240 L 0 120 C 0 53.726 53.726 0 120 0 C 186.274 0 240 53.726 240 120 L 240 240 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 }, emoji: "🌈" },
  cross:   { paths: ["M 80 0 H 160 V 80 H 240 V 160 H 160 V 240 H 80 V 160 H 0 V 80 H 80 Z"], viewBox: { width: 240, height: 240, left: 0, top: 0 }, emoji: "✚" },
  oval:    { paths: ["M 160 0 C 248.366 0 320 53.726 320 120 C 320 186.274 248.366 240 160 240 C 71.634 240 0 186.274 0 120 C 0 53.726 71.634 0 160 0 Z"], viewBox: { width: 320, height: 240, left: 0, top: 0 }, emoji: "🥚" },
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

// FREE shapes (4) vs PRO shapes (6)
const FREE_SHAPES: Preset[] = ["square", "circle", "rounded", "heart"];
const PRO_SHAPES: Preset[] = ["star", "hexagon", "diamond", "arch", "cross", "oval"];

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

// Daily usage tracking
function getTodayUsage(): number { try { const d = JSON.parse(localStorage.getItem("frame_maker_usage") || "{}"); const today = new Date().toISOString().slice(0, 10); return d[today] || 0; } catch { return 0; } }
function incrementUsage() { try { const d = JSON.parse(localStorage.getItem("frame_maker_usage") || "{}"); const today = new Date().toISOString().slice(0, 10); d[today] = (d[today] || 0) + 1; localStorage.setItem("frame_maker_usage", JSON.stringify(d)); } catch {} }
const FREE_DAILY_LIMIT = 5;

function Spinner() { return <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block", marginRight: 6 }} />; }
function Confetti() { return <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9999 }}>{[...Array(30)].map((_, i) => <div key={i} style={{ position: "absolute", width: 8, height: 8, background: ["#667eea","#764ba2","#f093fb","#4facfe","#43e97b","#fa709a"][i % 6], left: `${Math.random() * 100}%`, top: "-10px", borderRadius: Math.random() > 0.5 ? "50%" : "2px", animation: `fall ${1 + Math.random() * 2}s linear`, animationDelay: `${Math.random() * 0.5}s` }} />)}</div>; }

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("frames");
  const [status, setStatus] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isPro, setIsPro] = useState(false); // Pro unlock state
  const [dailyUsage, setDailyUsage] = useState(getTodayUsage());

  // Convert tab
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [useSmartCrop, setUseSmartCrop] = useState(false);
  const [useRemoveBg, setUseRemoveBg] = useState(false);
  const [convertSubTab, setConvertSubTab] = useState<"png" | "batch" | "text" | "shape">("png");
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Batch
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);

  // Library
  const [savedFrames, setSavedFrames] = useState<SavedFrame[]>(getSavedFrames());
  const [showLibrary, setShowLibrary] = useState(false);

  // Effects
  const [selectedEffect, setSelectedEffect] = useState<FrameEffect>("none");
  const [selectedColor, setSelectedColor] = useState("#7D2AE8");
  const [customColor, setCustomColor] = useState("#7D2AE8");
  const [selectedFrameForEffect, setSelectedFrameForEffect] = useState<Preset>("circle");

  // Text
  const [selectedText, setSelectedText] = useState("");
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [manualText, setManualText] = useState("");
  const [textFontSize, setTextFontSize] = useState(250);
  const [textFontStyle, setTextFontStyle] = useState("sans-bold");
  const [textMode, setTextMode] = useState<"combined" | "individual">("combined");

  // Shape
  const [shapeFile, setShapeFile] = useState<File | null>(null);
  const [shapePreview, setShapePreview] = useState("");

  // Selection watch
  useEffect(() => {
    try {
      const dispose = selection.registerOnChange({ scope: "plaintext", onChange: async (event) => {
        if (event.count > 0) { try { const draft = await event.read(); setSelectedText(draft.contents[0]?.text || ""); setHasTextSelection(true); setManualText(draft.contents[0]?.text || ""); } catch { setHasTextSelection(false); } }
        else { setHasTextSelection(false); setSelectedText(""); }
      }}); return () => { if (dispose) dispose(); };
    } catch {}
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "v") { navigator.clipboard.read().then((items) => { for (const item of items) { const t = item.types.find((t) => t.startsWith("image/png")); if (t) item.getType(t).then((blob) => { onFileSelect(new File([blob], "pasted.png", { type: "image/png" })); setActiveTab("convert"); }); } }).catch(() => {}); }
      if (e.key === "Escape") clearFileSelection();
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);

  // Drag & drop
  useEffect(() => {
    const dz = dropZoneRef.current; if (!dz) return;
    const onOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onLeave = () => setIsDragging(false);
    const onDrop = (e: DragEvent) => { e.preventDefault(); setIsDragging(false); const files = Array.from(e.dataTransfer?.files || []); const pngs = files.filter((f) => f.type.includes("png")); if (pngs.length === 1) { onFileSelect(pngs[0]); setActiveTab("convert"); } else if (pngs.length > 1) { setBatchFiles(pngs); setActiveTab("convert"); setConvertSubTab("batch"); } };
    dz.addEventListener("dragover", onOver); dz.addEventListener("dragleave", onLeave); dz.addEventListener("drop", onDrop);
    return () => { dz.removeEventListener("dragover", onOver); dz.removeEventListener("dragleave", onLeave); dz.removeEventListener("drop", onDrop); };
  }, []);

  const canUseFeature = (proOnly: boolean) => {
    if (!proOnly) return true;
    if (isPro) return true;
    return false;
  };

  const canUseFreeConvert = () => {
    if (isPro) return true;
    return dailyUsage < FREE_DAILY_LIMIT;
  };

  const showSuccess = (msg: string) => { setStatus(msg); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 2000); setTimeout(() => setStatus(""), 3000); };

  const onAddPreset = async (preset: Preset) => {
    const isProShape = PRO_SHAPES.includes(preset);
    if (isProShape && !isPro) { setStatus("🔒 Pro shape — upgrade to unlock!"); setActiveTab("pro"); return; }
    if (!canUseFreeConvert()) { setStatus("🔒 Daily limit reached — upgrade to Pro!"); setActiveTab("pro"); return; }
    try { setStatus("Adding…"); await addFrameFromPaths(FRAME_PATHS[preset].paths, FRAME_PATHS[preset].viewBox); incrementUsage(); setDailyUsage(getTodayUsage()); showSuccess("✅ Frame added!"); }
    catch (e: any) { setStatus(`❌ ${e?.message}`); }
  };

  const onFileSelect = (file: File | null) => { if (!file) { clearFileSelection(); return; } if (file.size > 5242880) { setStatus("❌ Max 5MB"); return; } if (!file.type.includes("png")) { setStatus("❌ Only PNG"); return; } setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); setStatus(""); };
  const clearFileSelection = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setSelectedFile(null); setPreviewUrl(""); setStatus(""); setIsConverting(false); };

  const onConvertToFrame = async () => {
    if (!selectedFile || isConverting) return;
    if (!canUseFreeConvert()) { setStatus("🔒 Daily limit — upgrade!"); setActiveTab("pro"); return; }
    try { setIsConverting(true); setStatus("Uploading…"); const form = new FormData(); form.append("file", selectedFile); const ep = useSmartCrop ? "/smart-crop" : useRemoveBg ? "/remove-bg" : "/vectorize"; const data = await (await fetch(`${BACKEND_URL}${ep}`, { method: "POST", body: form })).json(); if (data.error) throw new Error(data.error); if (!data.paths?.length) throw new Error("No paths"); await addFrameFromPaths(data.paths, data.viewBox); saveFrame({ name: selectedFile.name.replace(".png", ""), paths: data.paths, viewBox: data.viewBox }); setSavedFrames(getSavedFrames()); incrementUsage(); setDailyUsage(getTodayUsage()); showSuccess("🎉 Frame created!"); setTimeout(clearFileSelection, 2500); } catch (e: any) { setStatus(`❌ ${e?.message}`); } finally { setIsConverting(false); }
  };

  const onBatchConvert = async () => {
    if (!batchFiles.length || isConverting) return;
    if (!isPro) { setStatus("🔒 Batch mode is Pro only"); setActiveTab("pro"); return; }
    try { setIsConverting(true); setBatchProgress(0); const form = new FormData(); batchFiles.forEach((f) => form.append("files", f)); const data = await (await fetch(`${BACKEND_URL}/vectorize-batch`, { method: "POST", body: form })).json(); const results = data.results || []; let added = 0; for (let i = 0; i < results.length; i++) { setBatchProgress(Math.round(((i + 1) / results.length) * 100)); const r = results[i]; if (r.paths?.length) { await addFrameFromPaths(r.paths, r.viewBox); saveFrame({ name: r.name || `batch-${i}`, paths: r.paths, viewBox: r.viewBox }); added++; await delay(300); } } setSavedFrames(getSavedFrames()); showSuccess(`🎉 ${added} created!`); setBatchFiles([]); setBatchProgress(0); } catch (e: any) { setStatus(`❌ ${e?.message}`); } finally { setIsConverting(false); }
  };

  const onAddFromLibrary = async (f: SavedFrame) => { try { setStatus("Adding…"); await addFrameFromPaths(f.paths, f.viewBox); showSuccess("✅ Added!"); } catch (e: any) { setStatus(`❌ ${e?.message}`); } };
  const onAddWithEffect = async () => {
    if (!isPro) { setStatus("🔒 Effects are Pro only"); setActiveTab("pro"); return; }
    try { setIsConverting(true); const f = FRAME_PATHS[selectedFrameForEffect]; await addFrameWithEffect(f.paths, f.viewBox, selectedEffect, selectedColor); showSuccess("✅ Added!"); } catch (e: any) { setStatus(`❌ ${e?.message}`); } finally { setIsConverting(false); }
  };

  const onConvertTextToFrame = async () => {
    const text = manualText.trim(); if (!text || isConverting) return;
    if (!isPro) { setStatus("🔒 Text frames are Pro only"); setActiveTab("pro"); return; }
    try { setIsConverting(true); setStatus("🔄 Converting…"); const data = await (await fetch(`${BACKEND_URL}/text-to-frame`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, fontSize: textFontSize, fontStyle: textFontStyle, mode: textMode }) })).json(); if (data.error) throw new Error(data.error);
      if (textMode === "individual" && data.results) { let added = 0; for (const r of data.results) { if (r.paths?.length) { await addFrameFromPaths(r.paths, r.viewBox); saveFrame({ name: `Letter: ${r.letter}`, paths: r.paths, viewBox: r.viewBox }); added++; await delay(400); } } setSavedFrames(getSavedFrames()); showSuccess(`🎉 ${added} letters!`); }
      else { if (!data.paths?.length) throw new Error("No paths"); await addFrameFromPaths(data.paths, data.viewBox); saveFrame({ name: `Text: ${text.substring(0, 20)}`, paths: data.paths, viewBox: data.viewBox }); setSavedFrames(getSavedFrames()); showSuccess("🎉 Text frame!"); }
    } catch (e: any) { setStatus(`❌ ${e?.message}`); } finally { setIsConverting(false); }
  };

  const onConvertShapeToFrame = async () => {
    if (!shapeFile || isConverting) return;
    if (!isPro) { setStatus("🔒 Shape convert is Pro only"); setActiveTab("pro"); return; }
    try { setIsConverting(true); setStatus("🔄 Converting…"); const form = new FormData(); form.append("file", shapeFile); const data = await (await fetch(`${BACKEND_URL}/shape-to-frame`, { method: "POST", body: form })).json(); if (data.error) throw new Error(data.error); if (!data.paths?.length) throw new Error("No paths"); await addFrameFromPaths(data.paths, data.viewBox); saveFrame({ name: "Shape Frame", paths: data.paths, viewBox: data.viewBox }); setSavedFrames(getSavedFrames()); showSuccess("🎉 Shape frame!"); setShapeFile(null); setShapePreview(""); } catch (e: any) { setStatus(`❌ ${e?.message}`); } finally { setIsConverting(false); }
  };

  const remainingFree = Math.max(0, FREE_DAILY_LIMIT - dailyUsage);

  return (
    <div ref={dropZoneRef} style={{ padding: 0, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", minHeight: "100vh", background: "#FAFAFA" }}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(400px) rotate(360deg); opacity: 0; } }
        @keyframes slideIn { 0% { transform: translateY(8px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        * { box-sizing: border-box; }
      `}</style>

      {showConfetti && <Confetti />}

      {/* ===== HEADER ===== */}
      <div style={{ padding: "16px 20px 0", background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A855F7 100%)", borderBottom: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "white", letterSpacing: -0.5 }}>✦ Frame Maker</h3>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>Drag & drop frames into your design</p>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {/* Library button */}
            <button onClick={() => setShowLibrary(!showLibrary)} style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", color: "white", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              📚
              {savedFrames.length > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#EF4444", color: "white", fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "1px 5px", minWidth: 16, textAlign: "center" }}>{savedFrames.length}</span>}
            </button>
            {/* Usage counter */}
            {!isPro && <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "4px 10px", fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{remainingFree}/{FREE_DAILY_LIMIT} free</div>}
            {isPro && <div style={{ background: "linear-gradient(135deg, #F59E0B, #EF4444)", borderRadius: 8, padding: "4px 10px", fontSize: 10, color: "white", fontWeight: 700 }}>✦ PRO</div>}
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", marginTop: 14, gap: 2 }}>
          {([
            { id: "frames" as Tab, icon: "🖼️", label: "Frames" },
            { id: "convert" as Tab, icon: "🔄", label: "Convert" },
            { id: "effects" as Tab, icon: "✨", label: "Effects" },
            { id: "pro" as Tab, icon: "👑", label: "Pro" },
          ]).map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, padding: "11px 6px", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
              background: activeTab === tab.id ? "white" : "rgba(255,255,255,0.08)",
              color: activeTab === tab.id ? "#6366F1" : "rgba(255,255,255,0.6)",
              borderRadius: "10px 10px 0 0",
              transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              boxShadow: activeTab === tab.id ? "0 -2px 10px rgba(0,0,0,0.05)" : "none",
            }}>
              <span style={{ fontSize: 14 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== LIBRARY DRAWER ===== */}
      {showLibrary && (
        <div style={{ padding: "12px 20px", background: "white", borderBottom: "1px solid #F0F0F0", animation: "slideIn 0.2s ease-out" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>📚 My Library</div>
            <button onClick={() => setShowLibrary(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#999" }}>✕</button>
          </div>
          {savedFrames.length === 0 ? <div style={{ textAlign: "center", padding: 16, color: "#999", fontSize: 12 }}>No saved frames yet</div> : (
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {savedFrames.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F5F5F5" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#444" }}>{f.name}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => onAddFromLibrary(f)} style={{ padding: "4px 10px", background: "#6366F1", color: "white", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>Add</button>
                    <button onClick={() => { deleteFrame(f.id); setSavedFrames(getSavedFrames()); }} style={{ padding: "4px 8px", background: "#FEE2E2", color: "#DC2626", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== CONTENT ===== */}
      <div style={{ padding: "16px 20px", animation: "slideIn 0.15s ease-out", background: "white", minHeight: 400 }}>

        {/* ===== FRAMES TAB ===== */}
        {activeTab === "frames" && (
          <div>
            {/* Free Shapes */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 10 }}>Free Frames</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {FREE_SHAPES.map((key) => {
                  const f = FRAME_PATHS[key];
                  return (
                    <button key={key} onClick={() => onAddPreset(key)} style={{
                      padding: "16px 12px", background: "linear-gradient(135deg, #F8F9FF, #EEF0FF)", borderRadius: 12,
                      border: "2px solid #E8EAFF", cursor: "pointer", transition: "all 0.15s",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    }}>
                      <span style={{ fontSize: 28 }}>{f.emoji}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#4F46E5" }}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pro Shapes */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                Pro Frames
                <span style={{ fontSize: 9, background: "linear-gradient(135deg, #F59E0B, #EF4444)", color: "white", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>PRO</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {PRO_SHAPES.map((key) => {
                  const f = FRAME_PATHS[key];
                  return (
                    <button key={key} onClick={() => onAddPreset(key)} style={{
                      padding: "14px 8px", background: isPro ? "linear-gradient(135deg, #FFF7ED, #FEF3C7)" : "#F9FAFB", borderRadius: 12,
                      border: isPro ? "2px solid #FDE68A" : "2px solid #E5E7EB", cursor: "pointer", transition: "all 0.15s",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      opacity: isPro ? 1 : 0.7, position: "relative",
                    }}>
                      <span style={{ fontSize: 24 }}>{f.emoji}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: isPro ? "#D97706" : "#9CA3AF" }}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                      {!isPro && <span style={{ position: "absolute", top: 6, right: 6, fontSize: 10 }}>🔒</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===== CONVERT TAB ===== */}
        {activeTab === "convert" && (
          <div>
            {/* Sub-tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#F3F4F6", borderRadius: 10, padding: 4 }}>
              {([
                { id: "png" as const, label: "PNG", icon: "🖼️" },
                { id: "batch" as const, label: "Batch", icon: "📦", pro: true },
                { id: "text" as const, label: "Text", icon: "📝", pro: true },
                { id: "shape" as const, label: "Shape", icon: "🔷", pro: true },
              ]).map((st) => (
                <button key={st.id} onClick={() => setConvertSubTab(st.id)} style={{
                  flex: 1, padding: "8px 4px", fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                  background: convertSubTab === st.id ? "white" : "transparent",
                  color: convertSubTab === st.id ? "#6366F1" : "#9CA3AF",
                  borderRadius: 8, transition: "all 0.15s",
                  boxShadow: convertSubTab === st.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                }}>
                  {st.icon} {st.label}
                  {st.pro && !isPro && <span style={{ fontSize: 8 }}>🔒</span>}
                </button>
              ))}
            </div>

            {/* PNG Convert */}
            {convertSubTab === "png" && (
              <div>
                <input type="file" accept="image/png" onChange={(e) => onFileSelect(e.target.files?.[0] || null)} style={{ display: "none" }} id="file-input" disabled={isConverting} />
                <label htmlFor="file-input" style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "24px 16px", background: isDragging ? "#EEF2FF" : "#F9FAFB", borderRadius: 14,
                  border: `2px dashed ${isDragging ? "#6366F1" : "#D1D5DB"}`, cursor: "pointer",
                  transition: "all 0.2s", gap: 8,
                }}>
                  <span style={{ fontSize: 32 }}>{selectedFile ? "✅" : "📁"}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{selectedFile ? selectedFile.name : "Drop or choose PNG"}</span>
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>Max 5MB • Cmd+V to paste</span>
                </label>

                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: "#666" }}><input type="checkbox" checked={useSmartCrop} onChange={(e) => setUseSmartCrop(e.target.checked)} style={{ accentColor: "#6366F1" }} /> Smart Crop</label>
                  <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: "#666" }}><input type="checkbox" checked={useRemoveBg} onChange={(e) => setUseRemoveBg(e.target.checked)} style={{ accentColor: "#6366F1" }} /> Remove BG</label>
                </div>

                {previewUrl && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ position: "relative" }}>
                      <img src={previewUrl} alt="" style={{ width: "100%", maxHeight: 160, objectFit: "contain", borderRadius: 10, border: "1px solid #E5E7EB", background: "repeating-conic-gradient(#F3F4F6 0% 25%, white 0% 50%) 50% / 16px 16px" }} />
                      <button onClick={clearFileSelection} style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "white", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    </div>
                    <button onClick={onConvertToFrame} disabled={isConverting} style={{
                      marginTop: 10, width: "100%", padding: "13px", background: isConverting ? "#A5B4FC" : "linear-gradient(135deg, #6366F1, #8B5CF6)",
                      color: "white", borderRadius: 10, border: "none", cursor: isConverting ? "wait" : "pointer", fontSize: 14, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
                    }}>{isConverting ? <><Spinner /> Converting...</> : "Convert to Frame ⏎"}</button>
                  </div>
                )}
              </div>
            )}

            {/* Batch */}
            {convertSubTab === "batch" && (
              <div>
                {!isPro && <div style={{ padding: "12px 14px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, marginBottom: 14, fontSize: 12, color: "#92400E" }}>🔒 Batch convert is a <strong>Pro feature</strong>. <button onClick={() => setActiveTab("pro")} style={{ background: "none", border: "none", color: "#D97706", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>Upgrade →</button></div>}
                <input type="file" accept="image/png" multiple onChange={(e) => setBatchFiles(Array.from(e.target.files || []))} style={{ display: "none" }} id="batch-input" />
                <label htmlFor="batch-input" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", background: "#F9FAFB", borderRadius: 14, border: "2px dashed #D1D5DB", cursor: "pointer", gap: 6 }}>
                  <span style={{ fontSize: 28 }}>📦</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{batchFiles.length > 0 ? `${batchFiles.length} files selected` : "Choose multiple PNGs"}</span>
                </label>
                {batchFiles.length > 0 && <div style={{ marginTop: 12 }}>{batchProgress > 0 && <div style={{ height: 6, background: "#E5E7EB", borderRadius: 3, marginBottom: 10, overflow: "hidden" }}><div style={{ height: "100%", width: `${batchProgress}%`, background: "linear-gradient(90deg, #6366F1, #8B5CF6)", borderRadius: 3, transition: "width 0.3s" }} /></div>}<div style={{ display: "flex", gap: 8 }}><button onClick={onBatchConvert} disabled={isConverting || !isPro} style={{ flex: 1, padding: "12px", background: isPro ? "linear-gradient(135deg, #6366F1, #8B5CF6)" : "#D1D5DB", color: "white", borderRadius: 10, border: "none", cursor: isPro ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{isConverting ? <><Spinner /> Converting...</> : `Convert All (${batchFiles.length})`}</button><button onClick={() => setBatchFiles([])} style={{ padding: "12px 16px", background: "#F3F4F6", color: "#666", borderRadius: 10, border: "none", cursor: "pointer" }}>Clear</button></div></div>}
              </div>
            )}

            {/* Text */}
            {convertSubTab === "text" && (
              <div>
                {!isPro && <div style={{ padding: "12px 14px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, marginBottom: 14, fontSize: 12, color: "#92400E" }}>🔒 Text to frame is <strong>Pro</strong>. <button onClick={() => setActiveTab("pro")} style={{ background: "none", border: "none", color: "#D97706", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>Upgrade →</button></div>}
                {hasTextSelection && <div style={{ padding: "10px 12px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10, marginBottom: 12, fontSize: 12 }}><span style={{ fontWeight: 700, color: "#065F46" }}>✅ Canvas text: </span><span style={{ color: "#047857" }}>"{selectedText}"</span></div>}
                <input type="text" value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="Type text here..." maxLength={50} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "2px solid #E5E7EB", fontSize: 16, fontWeight: 700, outline: "none" }} onFocus={(e) => (e.target.style.borderColor = "#6366F1")} onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")} />

                <div style={{ display: "flex", gap: 6, margin: "10px 0" }}>
                  <button onClick={() => setTextMode("combined")} style={{ flex: 1, padding: "9px", background: textMode === "combined" ? "#6366F1" : "#F3F4F6", color: textMode === "combined" ? "white" : "#666", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>🔗 One Frame</button>
                  <button onClick={() => setTextMode("individual")} style={{ flex: 1, padding: "9px", background: textMode === "individual" ? "#6366F1" : "#F3F4F6", color: textMode === "individual" ? "white" : "#666", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>✂️ Each Letter</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 10 }}>
                  {FONT_OPTIONS.map((f) => <button key={f.id} onClick={() => setTextFontStyle(f.id)} style={{ padding: "7px 8px", background: textFontStyle === f.id ? "#6366F1" : "#F9FAFB", color: textFontStyle === f.id ? "white" : "#666", borderRadius: 6, border: textFontStyle === f.id ? "none" : "1px solid #E5E7EB", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{f.name}</button>)}
                </div>

                <input type="range" min={80} max={400} value={textFontSize} onChange={(e) => setTextFontSize(Number(e.target.value))} style={{ width: "100%", accentColor: "#6366F1" }} />

                <button onClick={onConvertTextToFrame} disabled={!manualText.trim() || isConverting || !isPro} style={{ marginTop: 12, width: "100%", padding: "13px", background: isPro && manualText.trim() ? "linear-gradient(135deg, #6366F1, #8B5CF6)" : "#D1D5DB", color: "white", borderRadius: 10, border: "none", cursor: isPro && manualText.trim() ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{isConverting ? <><Spinner /> Converting...</> : "✦ Convert Text"}</button>
              </div>
            )}

            {/* Shape */}
            {convertSubTab === "shape" && (
              <div>
                {!isPro && <div style={{ padding: "12px 14px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, marginBottom: 14, fontSize: 12, color: "#92400E" }}>🔒 Shape convert is <strong>Pro</strong>. <button onClick={() => setActiveTab("pro")} style={{ background: "none", border: "none", color: "#D97706", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>Upgrade →</button></div>}
                <input type="file" accept="image/png,image/jpeg" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setShapeFile(f); setShapePreview(URL.createObjectURL(f)); } }} style={{ display: "none" }} id="shape-input" />
                <label htmlFor="shape-input" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", background: "#F9FAFB", borderRadius: 14, border: "2px dashed #D1D5DB", cursor: "pointer", gap: 6 }}>
                  <span style={{ fontSize: 28 }}>🔷</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{shapeFile ? shapeFile.name : "Upload shape PNG"}</span>
                </label>
                {shapePreview && <div style={{ marginTop: 12, position: "relative" }}><img src={shapePreview} alt="" style={{ width: "100%", maxHeight: 160, objectFit: "contain", borderRadius: 10, border: "1px solid #E5E7EB" }} /><button onClick={() => { setShapeFile(null); setShapePreview(""); }} style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button></div>}
                <button onClick={onConvertShapeToFrame} disabled={!shapeFile || isConverting || !isPro} style={{ marginTop: 12, width: "100%", padding: "13px", background: isPro && shapeFile ? "linear-gradient(135deg, #6366F1, #8B5CF6)" : "#D1D5DB", color: "white", borderRadius: 10, border: "none", cursor: isPro && shapeFile ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{isConverting ? <><Spinner /> Converting...</> : "✦ Convert Shape"}</button>
              </div>
            )}
          </div>
        )}

        {/* ===== EFFECTS TAB ===== */}
        {activeTab === "effects" && (
          <div>
            {!isPro && <div style={{ padding: "12px 14px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, marginBottom: 14, fontSize: 12, color: "#92400E" }}>🔒 Effects are <strong>Pro</strong>. <button onClick={() => setActiveTab("pro")} style={{ background: "none", border: "none", color: "#D97706", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>Upgrade →</button></div>}

            <div style={{ fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 8 }}>Shape</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 4, marginBottom: 16 }}>
              {(Object.keys(FRAME_PATHS) as Preset[]).map((k) => <button key={k} onClick={() => setSelectedFrameForEffect(k)} style={{ padding: "8px 2px", background: selectedFrameForEffect === k ? "#6366F1" : "#F3F4F6", color: selectedFrameForEffect === k ? "white" : "#666", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>{FRAME_PATHS[k].emoji}</button>)}
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 8 }}>Effect</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 16 }}>
              {(["none","shadow","glow","outline","double"] as FrameEffect[]).map((e) => <button key={e} onClick={() => setSelectedEffect(e)} style={{ padding: "10px 6px", background: selectedEffect === e ? "#6366F1" : "#F3F4F6", color: selectedEffect === e ? "white" : "#666", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{e === "none" ? "None" : e.charAt(0).toUpperCase() + e.slice(1)}</button>)}
            </div>

            {selectedEffect !== "none" && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 8 }}>Color</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {COLOR_PRESETS.map((c) => <button key={c} onClick={() => { setSelectedColor(c); setCustomColor(c); }} style={{ width: 26, height: 26, borderRadius: "50%", background: c, border: selectedColor === c ? "3px solid #333" : "2px solid #E5E7EB", cursor: "pointer", padding: 0 }} />)}
                  <input type="color" value={customColor} onChange={(e) => { setCustomColor(e.target.value); setSelectedColor(e.target.value); }} style={{ width: 26, height: 26, border: "none", cursor: "pointer", padding: 0, borderRadius: "50%" }} />
                </div>
              </div>
            )}

            <button onClick={onAddWithEffect} disabled={isConverting || !isPro} style={{ width: "100%", padding: "13px", background: isPro ? "linear-gradient(135deg, #6366F1, #8B5CF6)" : "#D1D5DB", color: "white", borderRadius: 10, border: "none", cursor: isPro ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isPro ? "0 4px 14px rgba(99,102,241,0.3)" : "none" }}>{isConverting ? <><Spinner /> Adding...</> : `Add ${selectedFrameForEffect}${selectedEffect !== "none" ? ` + ${selectedEffect}` : ""}`}</button>
          </div>
        )}

        {/* ===== PRO TAB ===== */}
        {activeTab === "pro" && (
          <div>
            <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>👑</div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1F2937", letterSpacing: -0.5 }}>Frame Maker Pro</h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6B7280" }}>Unlock all features & unlimited frames</p>
            </div>

            {/* Feature comparison */}
            <div style={{ background: "#F9FAFB", borderRadius: 14, padding: "16px", marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px 12px", fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: "#374151" }}>Feature</div>
                <div style={{ fontWeight: 700, color: "#9CA3AF", textAlign: "center" }}>Free</div>
                <div style={{ fontWeight: 700, color: "#D97706", textAlign: "center" }}>Pro</div>

                <div style={{ color: "#555" }}>Basic frames</div>
                <div style={{ textAlign: "center" }}>4</div>
                <div style={{ textAlign: "center", color: "#059669" }}>10</div>

                <div style={{ color: "#555" }}>PNG → Frame</div>
                <div style={{ textAlign: "center" }}>{FREE_DAILY_LIMIT}/day</div>
                <div style={{ textAlign: "center", color: "#059669" }}>∞</div>

                <div style={{ color: "#555" }}>Batch convert</div>
                <div style={{ textAlign: "center" }}>❌</div>
                <div style={{ textAlign: "center", color: "#059669" }}>✅</div>

                <div style={{ color: "#555" }}>Text → Frame</div>
                <div style={{ textAlign: "center" }}>❌</div>
                <div style={{ textAlign: "center", color: "#059669" }}>✅</div>

                <div style={{ color: "#555" }}>Shape → Frame</div>
                <div style={{ textAlign: "center" }}>❌</div>
                <div style={{ textAlign: "center", color: "#059669" }}>✅</div>

                <div style={{ color: "#555" }}>Frame effects</div>
                <div style={{ textAlign: "center" }}>❌</div>
                <div style={{ textAlign: "center", color: "#059669" }}>✅</div>

                <div style={{ color: "#555" }}>Frame library</div>
                <div style={{ textAlign: "center" }}>❌</div>
                <div style={{ textAlign: "center", color: "#059669" }}>✅</div>

                <div style={{ color: "#555" }}>10 font styles</div>
                <div style={{ textAlign: "center" }}>❌</div>
                <div style={{ textAlign: "center", color: "#059669" }}>✅</div>
              </div>
            </div>

            {/* Pricing */}
            <button onClick={() => { setIsPro(true); showSuccess("🎉 Pro unlocked!"); }} style={{
              width: "100%", padding: "16px",
              background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #EC4899 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 3s linear infinite",
              color: "white", borderRadius: 14, border: "none", cursor: "pointer",
              fontSize: 16, fontWeight: 800, letterSpacing: -0.3,
              boxShadow: "0 6px 20px rgba(239,68,68,0.35)",
            }}>
              ✦ Unlock Pro — $4.99/month
            </button>

            <p style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", marginTop: 10 }}>Cancel anytime • Instant access</p>

            {isPro && (
              <div style={{ marginTop: 16, padding: "12px", background: "#ECFDF5", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#065F46" }}>✅ You're on Pro!</div>
                <div style={{ fontSize: 11, color: "#047857", marginTop: 4 }}>All features unlocked</div>
              </div>
            )}
          </div>
        )}

        {/* Status */}
        {status && <div style={{ marginTop: 14, padding: "10px 14px", background: status.includes("❌") ? "#FEF2F2" : status.includes("🔒") ? "#FFFBEB" : status.includes("🎉") || status.includes("✅") ? "#F0FDF4" : "#EFF6FF", color: status.includes("❌") ? "#DC2626" : status.includes("🔒") ? "#D97706" : status.includes("🎉") || status.includes("✅") ? "#16A34A" : "#2563EB", borderRadius: 10, fontSize: 12, fontWeight: 600, animation: isConverting ? "pulse 1.5s infinite" : "none", border: `1px solid ${status.includes("❌") ? "#FECACA" : status.includes("🔒") ? "#FDE68A" : status.includes("🎉") || status.includes("✅") ? "#BBF7D0" : "#BFDBFE"}` }}>{status}</div>}
      </div>

      {/* Drag overlay */}
      {isDragging && <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}><div style={{ background: "white", padding: "24px 36px", borderRadius: 16, boxShadow: "0 8px 30px rgba(0,0,0,0.12)", fontSize: 16, fontWeight: 700, color: "#6366F1" }}>📂 Drop PNG here</div></div>}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
