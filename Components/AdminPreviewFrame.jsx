"use client";

import Link from "next/link";
import { useState } from "react";

const devices = [["desktop", "Desktop"], ["tablet", "Tablet"], ["mobile", "Mobile"]];

export default function AdminPreviewFrame({ courseTitle = "", exitHref, onExit, children }) {
  const [device, setDevice] = useState("desktop");
  return <div className="preview-mode">
    <div className="preview-mode-bar">
      <div className="preview-mode-label"><strong>Student preview</strong><span>{courseTitle}</span></div>
      <div className="preview-devices" role="group" aria-label="Preview device width">
        {devices.map(([key, label]) => <button key={key} type="button" aria-pressed={device === key} onClick={() => setDevice(key)}>{label}</button>)}
      </div>
      {onExit ? <button type="button" className="button preview-exit" onClick={onExit}>Exit preview</button> : <Link className="button preview-exit" href={exitHref}>Exit preview</Link>}
    </div>
    <div className={`preview-viewport is-${device}`}>
      <div className="preview-frame">{children}</div>
    </div>
  </div>;
}
