import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "@/api/client";

export default function Folders() {
  const nav = useNavigate();
  const [folders, setFolders] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newFilename, setNewFilename] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.listFolders().then(setFolders).catch((e) => setError(String(e)));
  }, []);

  async function loadFiles(folder: string) {
    setLoadingFiles(true);
    setFiles([]);
    setError(null);
    try {
      setFiles(await api.listFolderFiles(folder));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingFiles(false);
    }
  }

  async function handleSelectFolder(folder: string) {
    setSelected(folder);
    setShowCreate(false);
    setNewFilename("");
    setNewPassphrase("");
    setPassphrase("");
    await loadFiles(folder);
  }

  async function handleOpenFile(filename: string) {
    if (!selected) return;
    setError(null);
    setOpening(true);
    try {
      const fileSpec = `${selected}:///${filename}`;
      await api.openSession(fileSpec, passphrase);
      setPassphrase("");
      nav("/entries");
    } catch (e) {
      setError(String(e));
    } finally {
      setOpening(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setCreating(true);
    setError(null);
    try {
      await api.createVaultFile(selected, newFilename, newPassphrase);
      setNewFilename("");
      setNewPassphrase("");
      setShowCreate(false);
      await loadFiles(selected);
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page folders">
      <h2>Vaults</h2>
      {error && <p className="error">{error}</p>}

      <div className="columns">
        <div className="folder-list">
          {folders.map((f) => (
            <button
              key={f}
              className={f === selected ? "active" : ""}
              onClick={() => handleSelectFolder(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="file-list">
          {selected ? (
            <>
              <div className="toolbar">
                <span className="muted" style={{ flex: 1, fontSize: "0.85rem" }}>{selected}/</span>
                <button
                  className={showCreate ? "secondary" : "primary"}
                  onClick={() => { setShowCreate((v) => !v); setError(null); }}
                >
                  {showCreate ? "Cancel" : "+ New vault"}
                </button>
              </div>

              {showCreate ? (
                <form onSubmit={handleCreate}>
                  <label>
                    Filename
                    <input
                      value={newFilename}
                      onChange={(e) => setNewFilename(e.target.value)}
                      placeholder="myvault"
                      required
                      autoFocus
                    />
                  </label>
                  <label>
                    Passphrase
                    <input
                      type="password"
                      value={newPassphrase}
                      onChange={(e) => setNewPassphrase(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </label>
                  <button type="submit" className="primary" disabled={creating}>
                    {creating ? "Creating…" : "Create"}
                  </button>
                </form>
              ) : loadingFiles ? (
                <p className="muted">Loading…</p>
              ) : files.length === 0 ? (
                <p className="muted">No vault files found. Use "+ New vault" to create one.</p>
              ) : (
                <>
                  <label>
                    Passphrase
                    <input
                      type="password"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      autoComplete="current-password"
                    />
                  </label>
                  {files.map((f) => (
                    <button
                      key={f}
                      disabled={opening || !passphrase}
                      onClick={() => handleOpenFile(f)}
                    >
                      {f}
                    </button>
                  ))}
                </>
              )}
            </>
          ) : (
            folders.length > 0 && <p className="muted">Select a folder on the left.</p>
          )}
        </div>
      </div>
    </div>
  );
}

