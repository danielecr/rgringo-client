import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "@/api/client";

export default function Connect() {
  const nav = useNavigate();
  const [url, setUrl] = useState("http://127.0.0.1:7979");
  const [useTunnel, setUseTunnel] = useState(false);
  const [sshHost, setSshHost] = useState("");
  const [sshUser, setSshUser] = useState("");
  const [sshPort, setSshPort] = useState("22");
  const [localPort, setLocalPort] = useState("7979");
  const [remotePort, setRemotePort] = useState("7979");
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConnecting(true);
    try {
      if (useTunnel) {
        await api.startTunnel({
          sshHost,
          sshUser: sshUser || undefined,
          sshPort: parseInt(sshPort),
          localPort: parseInt(localPort),
          remoteHost: "127.0.0.1",
          remotePort: parseInt(remotePort),
        });
        const tunnelUrl = `http://127.0.0.1:${localPort}`;
        await api.setServerUrl(tunnelUrl);
        setUrl(tunnelUrl);
      } else {
        await api.setServerUrl(url);
      }
      const folders = await api.listFolders();
      nav("/folders", { state: { folders } });
    } catch (err) {
      setError(String(err));
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="page connect">
      <h1>Gringotts Vault</h1>
      <form onSubmit={handleConnect}>
        <label>
          <input
            type="checkbox"
            checked={useTunnel}
            onChange={(e) => setUseTunnel(e.target.checked)}
          />
          {" "}Use SSH tunnel
        </label>

        {useTunnel ? (
          <fieldset>
            <legend>SSH Tunnel</legend>
            <label>Host <input value={sshHost} onChange={(e) => setSshHost(e.target.value)} required /></label>
            <label>User <input value={sshUser} onChange={(e) => setSshUser(e.target.value)} placeholder="(current user)" /></label>
            <label>SSH Port <input type="number" value={sshPort} onChange={(e) => setSshPort(e.target.value)} /></label>
            <label>Local Port <input type="number" value={localPort} onChange={(e) => setLocalPort(e.target.value)} /></label>
            <label>Remote Port <input type="number" value={remotePort} onChange={(e) => setRemotePort(e.target.value)} /></label>
          </fieldset>
        ) : (
          <label>
            Server URL{" "}
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://127.0.0.1:7979"
              required
            />
          </label>
        )}

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={connecting}>
          {connecting ? "Connecting…" : "Connect"}
        </button>
      </form>
    </div>
  );
}
