# rgringo-client

Desktop client for [rgringotts](https://github.com/danielecr/rgringotts), the encrypted-vault REST server.  
Built with [Tauri 2](https://tauri.app/) (Rust backend) + React + TypeScript frontend.

## Features

- Connect to a local or remote rgringotts server
- Optional SSH tunnel setup (no third-party tools needed beyond `ssh`)
- Browse vault folders and files
- Open / close vault sessions (passphrase entered locally, never stored)
- Full CRUD on entries with an integrated editor
- 20-second keepalive so the session does not expire while you work

## Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Rust + Cargo | stable (≥ 1.80) | `rustup update stable` |
| Node.js | 20 LTS | |
| npm | 10 | bundled with Node 20 |
| Tauri CLI v2 | 2.x | installed via `npm` (dev dep) |
| **macOS** | Xcode CLT | `xcode-select --install` |
| **Linux** | webkit2gtk-4.1, libssl | see [Tauri Linux deps](https://tauri.app/start/prerequisites/#linux) |
| **Windows** | WebView2 runtime | pre-installed on Win 11 |

## Setup

```bash
# 1 — clone the parent repo (includes this submodule)
git clone --recurse-submodules https://github.com/danielecr/rgringotts
cd rgringotts/client

# 2 — install JS dependencies
npm install
```

## Development

```bash
# start Vite dev server (port 1420) + Tauri hot-reload window
npm run tauri dev
```

The frontend is served by Vite; changes to `src/` hot-reload automatically.  
Rust changes in `src-tauri/` trigger a full Rust rebuild.

## Production build

```bash
npm run tauri build
```

Produces a platform-native installer (`.dmg` / `.AppImage` / `.msi`) under  
`src-tauri/target/release/bundle/`.

To build just the frontend without Tauri (e.g. for inspection):

```bash
npm run build   # output: dist/
```

## Configuration

The client has no configuration file.  Settings are entered at runtime on the
**Connect** screen:

| Setting | Default | Description |
|---------|---------|-------------|
| Server URL | `http://127.0.0.1:7979` | Base URL of the rgringotts server |
| SSH tunnel | off | Spawns `ssh -N -L` to forward a remote server port locally |

Settings are held in memory for the lifetime of the window and are not
persisted between launches (by design — no credentials on disk).

## Project structure

```
client/
├── index.html              # HTML entry point
├── vite.config.ts          # Vite / build config
├── tsconfig.json
├── package.json
├── src/                    # React + TypeScript frontend
│   ├── main.tsx            # ReactDOM root
│   ├── App.tsx             # Router (Connect → Folders → Entries → Editor)
│   ├── index.css           # Global styles
│   ├── api/
│   │   └── client.ts       # Typed invoke() wrappers for every Tauri command
│   └── pages/
│       ├── Connect.tsx     # Server URL / SSH tunnel form
│       ├── Folders.tsx     # Vault folder & file browser
│       ├── Entries.tsx     # Entry list with keepalive
│       └── Editor.tsx      # Create / edit entry
└── src-tauri/              # Rust / Tauri backend
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json
    └── src/
        ├── main.rs         # Binary entry point
        ├── lib.rs          # Tauri builder + command registration
        ├── state.rs        # Shared AppState (server URL, token, tunnel PID)
        ├── error.rs        # AppError (serialisable for Tauri commands)
        ├── http.rs         # Thin reqwest helpers (get/post/put/delete)
        └── commands.rs     # All #[tauri::command] handlers
```

## Relation to rgringotts server

This repo is a git submodule of [rgringotts](https://github.com/danielecr/rgringotts).
The client talks to the server exclusively over HTTP using the rgringotts REST API.
No library code is shared; the server can run on any host reachable from the desktop.
