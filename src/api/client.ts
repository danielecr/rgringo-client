import { invoke } from "@tauri-apps/api/core";

export interface EntrySummary {
  id: number;
  title: string;
}

export interface Entry {
  id: number;
  title: string;
  body: string;
}

// --- Connection ---

export const setServerUrl = (url: string) =>
  invoke<void>("set_server_url", { url });

export const getServerUrl = () => invoke<string>("get_server_url");

// --- Tunnel ---

export interface TunnelOptions {
  sshHost: string;
  sshUser?: string;
  sshPort?: number;
  localPort: number;
  remoteHost: string;
  remotePort: number;
}

export const startTunnel = (opts: TunnelOptions) =>
  invoke<void>("start_tunnel", {
    sshHost: opts.sshHost,
    sshUser: opts.sshUser ?? null,
    sshPort: opts.sshPort ?? null,
    localPort: opts.localPort,
    remoteHost: opts.remoteHost,
    remotePort: opts.remotePort,
  });

export const stopTunnel = () => invoke<void>("stop_tunnel");

// --- Session ---

export const openSession = (file: string, passphrase: string) =>
  invoke<void>("open_session", { file, passphrase });

export const closeSession = () => invoke<void>("close_session");

export const keepalive = () => invoke<void>("keepalive");

// --- Folders ---

export const listFolders = () => invoke<string[]>("list_folders");

export const listFolderFiles = (folder: string) =>
  invoke<string[]>("list_folder_files", { folder });

// --- Entries ---

export const listEntries = () => invoke<EntrySummary[]>("list_entries");

export const getEntry = (id: number) => invoke<Entry>("get_entry", { id });

export const createEntry = (title: string, body: string) =>
  invoke<Entry>("create_entry", { title, body });

export const updateEntry = (id: number, title: string, body: string) =>
  invoke<Entry>("update_entry", { id, title, body });

export const deleteEntry = (id: number) =>
  invoke<void>("delete_entry", { id });
