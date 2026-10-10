"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reorderVideos } from "@/app/admin/actions";

export default function ReorderProjects({ videos }) {
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState(videos);
  const [dragged, setDragged] = useState(null);
  const [saving, startTransition] = useTransition();
  const [savedOrder, setSavedOrder] = useState(videos.map((item) => item.id).join("|"));
  const [message, setMessage] = useState("");
  const router = useRouter();
  const dirty = editing && items.map((item) => item.id).join("|") !== savedOrder;

  useEffect(() => {
    const warn = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function move(index, destination) {
    if (saving) return;
    const next = [...items]; const [item] = next.splice(index, 1); next.splice(Math.max(0, Math.min(destination, next.length)), 0, item); setItems(next); setMessage("");
  }
  function save() {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await reorderVideos(items.map((item) => item.id));
        if (!result.ok) return setMessage(result.error);
        setSavedOrder(items.map((item) => item.id).join("|"));
        setEditing(false); setMessage("Portfolio order saved. Published projects now follow this order on your website."); router.refresh();
      } catch {
        setMessage("The order could not be saved. Your changes are still here; please try again.");
      }
    });
  }
  function cancel() { setItems(videos); setEditing(false); setMessage(""); }

  if (!editing) return <section className="reorder-projects"><button type="button" disabled={videos.length < 2} onClick={() => { setItems(videos); setSavedOrder(videos.map((item) => item.id).join("|")); setMessage(""); setEditing(true); }}>Rearrange portfolio</button><p className="portfolio-order-help">Choose the order projects appear on your homepage and portfolio. Drafts stay hidden from visitors.</p>{message && <p className="success-note" role="status">{message}</p>}</section>;
  return <section className="reorder-projects" aria-label="Rearrange portfolio" aria-busy={saving}><div className="reorder-toolbar"><strong>Arrange your portfolio</strong><span>Drag a row, use the move buttons, or choose a position. Save to publish the new order.</span><button className="button" type="button" disabled={!dirty || saving} onClick={save}>{saving ? "Saving…" : "Save order"}</button><button type="button" disabled={saving} onClick={cancel}>Cancel</button></div>
    <ol className="reorder-list">{items.map((video, index) => <li key={video.id} draggable={!saving} className={dragged === index ? "is-dragging" : undefined} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", video.id); setDragged(index); }} onDragEnd={() => setDragged(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (dragged !== null && dragged !== index) move(dragged, index); setDragged(null); }}><span><b>{index + 1}</b>{video.title}<small>{video.status}</small></span><div><label className="portfolio-position">Position<select aria-label={`Move ${video.title} to position`} value={index} disabled={saving} onChange={(event) => move(index, Number(event.target.value))}>{items.map((item, position) => <option key={item.id} value={position}>{position + 1}</option>)}</select></label><button type="button" aria-label={`Move ${video.title} to top`} disabled={saving || index === 0} onClick={() => move(index, 0)}>Top</button><button type="button" aria-label={`Move ${video.title} up`} disabled={saving || index === 0} onClick={() => move(index, index - 1)}>Up</button><button type="button" aria-label={`Move ${video.title} down`} disabled={saving || index === items.length - 1} onClick={() => move(index, index + 1)}>Down</button><button type="button" aria-label={`Move ${video.title} to bottom`} disabled={saving || index === items.length - 1} onClick={() => move(index, items.length - 1)}>Bottom</button></div></li>)}</ol>
    <p className="portfolio-order-help" role="status">{dirty ? "You have unsaved order changes." : "Move a project to change the order."}</p>
    {message && <p className="form-error" role="alert">{message}</p>}
  </section>;
}
