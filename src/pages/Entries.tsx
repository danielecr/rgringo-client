import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "@/api/client";

export default function Entries() {
  const nav = useNavigate();
  const [entries, setEntries] = useState<api.EntrySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const kaTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    load();
    // keepalive every 20s
    kaTimer.current = setInterval(() => api.keepalive().catch(() => {}), 20_000);
    return () => {
      if (kaTimer.current) clearInterval(kaTimer.current);
    };
  }, []);

  async function load() {
    try {
      setEntries(await api.listEntries());
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleClose() {
    await api.closeSession().catch(() => {});
    nav("/folders");
  }

  return (
    <div className="page entries">
      <div className="toolbar">
        <h2>Entries</h2>
        <button onClick={() => nav("/editor")} className="primary">+ New</button>
        <button onClick={handleClose} className="secondary">Close vault</button>
      </div>
      {error && <p className="error">{error}</p>}
      <ul>
        {entries.map((e) => (
          <li key={e.id}>
            <button className="entry-title" onClick={() => nav(`/editor/${e.id}`)}>
              {e.title}
            </button>
            <button className="danger" onClick={() => handleDelete(e.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
