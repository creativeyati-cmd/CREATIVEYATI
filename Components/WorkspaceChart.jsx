"use client";
import { useId, useState } from "react";

export default function WorkspaceChart({ series, money = false, title, ranges = false }) {
  const id = useId();
  const [period, setPeriod] = useState("Daily");
  const [currency, setCurrency] = useState(Object.keys(series)[0]);
  const [selected, setSelected] = useState(null);
  const [days, setDays] = useState(30);
  const source = series[currency] || [];
  let data = source.slice(ranges ? -days : money ? -30 : -14);
  if (money && period === "Weekly") {
    data = Array.from({ length: Math.ceil(data.length / 7) }, (_, i) => ({ label: data[i * 7].label, value: data.slice(i * 7, i * 7 + 7).reduce((sum, row) => sum + row.value, 0) }));
  }
  if (money && period === "Monthly") {
    const months = new Map();
    // Exclude the partial first month from the rolling 180-day window.
    const firstMonth = source[0]?.date.slice(0, 7);
    for (const row of source.filter(row => row.date.slice(0, 7) !== firstMonth)) {
      const month = row.date.slice(0, 7);
      months.set(month, (months.get(month) || 0) + row.value);
    }
    data = [...months].map(([label, value]) => ({ label, value }));
  }
  const format = value => money ? new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format(value) : `${value} ${title === "Student Growth" ? "students" : "lessons"}`;
  const max = Math.max(1, ...data.map(row => row.value));
  const points = data.map((row, i) => ({ ...row, x: 12 + i * 576 / Math.max(1, data.length - 1), y: 160 - row.value / max * 140 }));
  const active = Math.min(selected ?? points.length - 1, points.length - 1);
  const line = points.map((point, i) => `${i ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  return <section className="aw-card aw-revenue workspace-chart">
    <div className="aw-section-heading"><div><h2>{title}</h2><p>{money ? "Successful course payments, by payment date." : "Recorded activity · Africa/Lagos time"}</p></div>
      {money && <div className="aw-segmented" role="group" aria-label="Revenue interval">{["Daily", "Weekly", "Monthly"].map(value => <button key={value} aria-pressed={period === value} onClick={() => { setPeriod(value); setSelected(null); }}>{value}</button>)}</div>}
      {ranges && <select aria-label="Growth period" value={days} onChange={event => { setDays(Number(event.target.value)); setSelected(null); }}><option value={30}>Last 30 days</option><option value={60}>Last 60 days</option></select>}
    </div>
    {money && Object.keys(series).length > 1 && <label className="workspace-currency">Currency <select aria-label="Currency" value={currency} onChange={event => { setCurrency(event.target.value); setSelected(null); }}>{Object.keys(series).map(value => <option key={value}>{value}</option>)}</select></label>}
    {!points.length ? <p>No activity yet.</p> : <>
      <div className="aw-chart-legend"><span>{data[0].label} – {data.at(-1).label}</span><span aria-live="polite">{points[active].label}: <strong>{format(points[active].value)}</strong></span></div>
      <div className="aw-chart"><div className="aw-plot"><svg viewBox="0 0 600 180" preserveAspectRatio="none" role="img" aria-label={`${title}: ${format(data.reduce((sum, row) => sum + row.value, 0))} in the displayed period`}><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#65926d" stopOpacity=".25"/><stop offset="100%" stopColor="#65926d" stopOpacity="0"/></linearGradient></defs>{[20, 90, 160].map(y => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="#e5e8df" strokeDasharray="3 5"/>)}<path d={`${line} L ${points.at(-1).x} 170 L 12 170 Z`} fill={`url(#${id})`}/><path d={line} fill="none" stroke="#497853" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg>
        {points.map((point, i) => <button key={`${point.label}-${i}`} className={`aw-point ${active === i ? "is-active" : ""}`} style={{ left: `${point.x / 6}%`, top: `${point.y / 1.8}%` }} onMouseEnter={() => setSelected(i)} onFocus={() => setSelected(i)} onClick={() => setSelected(i)} aria-label={`${point.label}: ${format(point.value)}`}><span/></button>)}
      </div></div>
      <p className="aw-insight">{data.every(row => row.value === 0) ? "No recorded activity in this period yet." : `${format(data.reduce((sum, row) => sum + row.value, 0))} in this period.`}</p>
    </>}
  </section>;
}
