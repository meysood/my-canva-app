import React from "react";
import { createRoot } from "react-dom/client";
import { addElementAtCursor } from "@canva/design";

function App() {
  const addFrame = async () => {
    await addElementAtCursor({
      type: "shape",
      paths: [
        {
          d: "M 0 0 H 240 V 240 H 0 Z",
          fill: { dropTarget: true },
        },
      ],
      viewBox: { width: 240, height: 240, left: 0, top: 0 },
    });
  };

  return (
    <div style={{ padding: 16 }}>
      <button
        onClick={addFrame}
        style={{
          padding: "12px 16px",
          background: "#7D2AE8",
          color: "white",
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Add frame to design
      </button>

      <p style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
        Tip: Frame add hone ke baad kisi bhi image ko drag & drop karke fill karo.
      </p>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
