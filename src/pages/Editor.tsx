import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as api from "@/api/client";

export default function Editor() {
  const { id } = useParams<{ id?: string }>();
  const nav = useNavigate();
  const isNew = !id;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      api.getEntry(parseInt(id)).then((e) => {
        setTitle(e.title);
        setBody(e.body);
      }).catch((e) => setError(String(e)));
    }
  }, [id, isNew]);

  // Keep the server session alive while the user is editing.
  useEffect(() => {
    const id = setInterval(() => { api.keepAlive().catch(() => {}); }, 20_000);
    return () => clearInterval(id);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        await api.createEntry(title, body);
      } else {
        await api.updateEntry(parseInt(id), title, body);
      }
      nav("/entries");
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page editor">
      <h2>{isNew ? "New Entry" : "Edit Entry"}</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSave}>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          Body
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
          />
        </label>
        <div className="actions">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => nav(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
