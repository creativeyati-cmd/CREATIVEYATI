"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { reorderVideos } from "@/app/admin/actions";

export default function ReorderProjects({ videos }) {
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState(videos);
  const [dragged, setDragged] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const dirty = items.map((item) => item.id).join("|") !== videos.map((item) => item.id).join("|");

  useEffect(() => {
    const warn = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function move(index, destination) {
    const next = [...items]; const [item] = next.splice(index, 1); next.splice(Math.max(0, Math.min(destination, next.length)), 0, item); setItems(next); setMessage("");
  }
  async function save() {
    setSaving(true); setMessage(""); const result = await reorderVideos(items.map((item) => item.id)); setSaving(false);
    if (!result.ok) return setMessage(result.error);
    setEditing(false); setMessage("Project order saved."); router.refresh();
  }
  function cancel() { setItems(videos); setEditing(false); setMessage(""); }

  if (!editing) return <section className="reorder-projects"><button type="button" onClick={() => setEditing(true)}>Reorder projects</button>{message && <p className="success-note">{message}</p>}</section>;
  return <section className="reorder-projects"><div className="reorder-toolbar"><strong>Reorder mode</strong><span>Drag a row or use the keyboard controls.</span><button className="button" type="button" disabled={!dirty || saving} onClick={save}>{saving ? "Saving…" : "Save order"}</button><button type="button" onClick={cancel}>Cancel</button></div>
    <ol className="reorder-list">{items.map((video, index) => <li key={video.id} draggable onDragStart={() => setDragged(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged !== null && dragged !== index) move(dragged, index); setDragged(null); }}><span><b>{index + 1}</b>{video.title}<small>{video.status}</small></span><div><button type="button" aria-label={`Move ${video.title} to top`} disabled={index === 0} onClick={() => move(index, 0)}>Top</button><button type="button" aria-label={`Move ${video.title} up`} disabled={index === 0} onClick={() => move(index, index - 1)}>Up</button><button type="button" aria-label={`Move ${video.title} down`} disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>Down</button><button type="button" aria-label={`Move ${video.title} to bottom`} disabled={index === items.length - 1} onClick={() => move(index, items.length - 1)}>Bottom</button></div></li>)}</ol>
    {message && <p className="form-error">{message}</p>}
  </section>;
}
