import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "@/api/client";

export default function Folders() {
  const nav = useNavigate();
  const [folders, setFolders] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    api.listFolders().then(setFolders).catch((e) => setError(String(e)));
  }, []);

  async function handleSelectFolder(folder: string) {
    setSelected(folder);
    setFiles([]);
    setError(null);
    try {
      setFiles(await api.listFolderFiles(folder));
    } catch (e) {
      setError(String(e));
    }
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
          {selected && (
            <>
              <label>
                Passphrase{" "}
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
        </div>
      </div>
    </div>
  );
}
