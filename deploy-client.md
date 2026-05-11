# Gringotts Vault — Client Build & Deploy Plan

Product name: **Gringotts Vault** · identifier: `com.rgringotts.vault`  
Tauri 2, React + TypeScript, Vite

---

## 1. Overview of target artefacts

| Platform | Artefact | Runner |
|---|---|---|
| macOS Apple Silicon | `.dmg` (aarch64) | `macos-latest` (arm64) |
| macOS Intel | `.dmg` (x86_64) | `macos-13` |
| macOS universal | `.dmg` (fat binary, optional) | `macos-latest` |
| Linux x86_64 | `.AppImage`, `.deb` | `ubuntu-22.04` |
| Windows x86_64 | `.exe` (NSIS), `.msi` | `windows-latest` |
| Android (tentative) | `.apk` / `.aab` | `ubuntu-22.04` |
| iOS (tentative) | `.ipa` | `macos-latest` |

---

## 2. GitHub Actions workflow structure

### 2.1 `ci.yml` — PR / branch build check
- Trigger: `push` to any branch, `pull_request`
- Matrix: `[macos-latest, macos-13, ubuntu-22.04, windows-latest]`
- Steps: `npm ci` → `npm run build` → `cargo tauri build`
- No code signing, no artefact upload
- Goal: catch compile/type errors before merge

### 2.2 `release.yml` — Tag release + GitHub Release
- Trigger: `push` to tags matching `v[0-9]+.*`
- Uses `tauri-apps/tauri-action@v0` (official action)
- Same platform matrix as CI but **with** artefact upload
- Creates a GitHub Release (draft) attaching all artefacts
- Auto-extracts changelog from tag body
- Requires secrets: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`,
  `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`,
  `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`

### 2.3 `publish-brew.yml` — Homebrew tap update
- Trigger: `workflow_run` on `release.yml` success
- Computes SHA-256 of both macOS DMGs from the GitHub Release assets
- Opens a PR on `rgringotts/homebrew-gringotts-vault` updating the cask formula
- Requires secret: `TAP_GITHUB_TOKEN` (PAT with write access to the tap repo)

### 2.4 `publish-chocolatey.yml` — Chocolatey community push
- Trigger: same as above
- Downloads the Windows `.exe` / `.msi` from the release, packs and pushes `.nupkg`
- Requires secret: `CHOCOLATEY_API_KEY`

### 2.5 `publish-winget.yml` — Winget manifest PR
- Trigger: same as above
- Uses `vedantmgoyal9/winget-releaser@v2` to open a PR to `microsoft/winget-pkgs`
- Requires secret: `WINGET_TOKEN`

### 2.6 `publish-flatpak.yml` — Flathub (Linux, tentative)
- Trigger: same as above
- Builds Flatpak bundle; submits PR to `flathub/io.github.rgringotts.GringottsVault`
- Requires Flathub maintainer review on first submission (manual)

### 2.7 `build-android.yml` (tentative)
- Trigger: manual `workflow_dispatch` or tag
- Runner: `ubuntu-22.04`; setup: Android SDK + NDK
- `cargo tauri android build --apk`
- Signs APK with upload keystore (`ANDROID_KEYSTORE`, `ANDROID_KEY_ALIAS`, …)
- Uploads `.apk` / `.aab` to GitHub Release

### 2.8 `build-ios.yml` (tentative)
- Trigger: manual `workflow_dispatch` or tag
- Runner: `macos-latest`; setup: Xcode + iOS Rust target
- `cargo tauri ios build`
- Uploads `.ipa` to GitHub Release and/or TestFlight via `xcrun notarytool`

---

## 3. Code signing prerequisites

### macOS
1. Enroll in **Apple Developer Program** ($99/yr)
2. Export a *Developer ID Application* certificate as `.p12`
3. Store as `APPLE_CERTIFICATE` (base64) + `APPLE_CERTIFICATE_PASSWORD`
4. Notarization: `APPLE_ID`, `APPLE_PASSWORD` (app-specific), `APPLE_TEAM_ID`
5. `tauri-action` handles signing + notarization automatically when secrets are present

### Windows
1. Obtain a code signing certificate (OV or EV — EV removes SmartScreen warning)
2. Store as `WINDOWS_CERTIFICATE` (base64 PKCS#12) + `WINDOWS_CERTIFICATE_PASSWORD`
3. `tauri-action` calls `signtool.exe` automatically when secrets are present

### Android
- Generate keystore: `keytool -genkey -v -keystore upload-key.jks …`
- Store as `ANDROID_KEYSTORE` (base64) + alias + passwords

---

## 4. Registry setup

### Homebrew (macOS)
- Create repo `rgringotts/homebrew-gringotts-vault` (tap)
- Cask formula `Casks/gringotts-vault.rb`
- `brew install --cask rgringotts/gringotts-vault/gringotts-vault`
- Eventually submit to `homebrew/homebrew-cask` when notarized + notable user base

### Chocolatey (Windows)
- Package at `https://community.chocolatey.org/packages/gringotts-vault`
- `.nuspec` + `chocolateyInstall.ps1` downloading the NSIS installer
- First submission requires moderation review (a few days)

### Winget (Windows)
- Manifests under `manifests/r/Rgringotts/GringottsVault/` in `microsoft/winget-pkgs`
- First PR requires human review; subsequent updates can be automated

### Flathub (Linux)
- Repo `flathub/io.github.rgringotts.GringottsVault`
- Manifest `io.github.rgringotts.GringottsVault.yaml`
- Requires Flathub linter + human review on first submission

### Snap (Linux, alternative)
- `snapcraft.yaml` at repo root; publish to Snapcraft store
- `snap install gringotts-vault`
- No human review required after initial account verification

### AUR (Arch Linux)
- `gringotts-vault-bin` package pointing to `.AppImage` from GitHub Releases
- Low maintenance; community-driven

---

## 5. Version management
- Single source of truth: `package.json` → `"version": "x.y.z"`
- Set `tauri.conf.json` to `"version": "package.json"` (Tauri 2 supports this)
- Tag format: `v1.2.3`; all registry packages derive version from the tag
- Release checklist: bump `package.json` → commit → tag → push tag

---

## 6. Proposed GitHub Issues

### Issue 1 — CI: desktop build matrix
**Labels:** `ci`, `desktop`  
Set up `ci.yml` with matrix build for macOS arm64/x86_64, Linux x86_64, Windows x86_64.
No signing, no upload. Goal: green check on every PR.

### Issue 2 — Release: GitHub Release automation
**Labels:** `ci`, `release`  
Set up `release.yml` using `tauri-apps/tauri-action@v0`.
Trigger on `v*` tag. Upload all artefacts. Create GitHub Release (draft).
Dependency: Issue 1.

### Issue 3 — macOS code signing & notarization
**Labels:** `release`, `macos`, `codesign`  
Obtain Apple Developer ID certificate. Add secrets. Verify `tauri-action` notarizes correctly.
Dependency: Issue 2.

### Issue 4 — Windows code signing
**Labels:** `release`, `windows`, `codesign`  
Obtain OV/EV certificate. Add secrets. Verify SmartScreen trust.
Dependency: Issue 2.

### Issue 5 — Homebrew tap
**Labels:** `distribution`, `macos`  
Create `rgringotts/homebrew-gringotts-vault` tap repo.
Write `Casks/gringotts-vault.rb`. Add `publish-brew.yml` workflow.
Dependency: Issue 3.

### Issue 6 — Chocolatey package
**Labels:** `distribution`, `windows`  
Write `.nuspec` + `chocolateyInstall.ps1`. Add `publish-chocolatey.yml`.
Submit initial package to Chocolatey community.
Dependency: Issue 4.

### Issue 7 — Winget manifest
**Labels:** `distribution`, `windows`  
Create initial manifests in `microsoft/winget-pkgs`. Add `publish-winget.yml`.
Dependency: Issue 4.

### Issue 8 — Linux: Flatpak on Flathub
**Labels:** `distribution`, `linux`  
Write Flatpak manifest. Submit to Flathub. Add `publish-flatpak.yml`.
Dependency: Issue 2.

### Issue 9 — Linux: Snap
**Labels:** `distribution`, `linux`  
Write `snapcraft.yaml`. Publish to Snapcraft store. Add snapcraft GitHub action.
Dependency: Issue 2.

### Issue 10 — Linux: AUR package
**Labels:** `distribution`, `linux`  
Create `gringotts-vault-bin` on AUR. Write `PKGBUILD` + `.SRCINFO`.
Add workflow to update pkgver/checksums on release.
Dependency: Issue 2.

### Issue 11 — Android build (tentative)
**Labels:** `mobile`, `android`  
Configure Tauri Android target. Set up `build-android.yml` with Android SDK + signing.
Dependency: Issues 2, 13.

### Issue 12 — iOS build (tentative)
**Labels:** `mobile`, `ios`  
Configure Tauri iOS target. Set up `build-ios.yml` with Xcode + provisioning profile.
Dependency: Issues 2, 3, 13.

### Issue 13 — Mobile: Tauri Android/iOS project init (tentative)
**Labels:** `mobile`  
Run `cargo tauri android init` + `cargo tauri ios init`. Commit `gen/` directories.
Adjust `tauri.conf.json` mobile capabilities.
Prerequisite for Issues 11 and 12.

### Issue 14 — Version source-of-truth
**Labels:** `ci`, `release`  
Set `tauri.conf.json` to read version from `package.json`. Document release checklist.

---

## 7. Recommended sequencing

Issue 1 → Issue 2 → Issue 3 → Issue 5 (macOS path)
→ Issue 4 → Issue 6 → Issue 7 (Windows path)
→ Issue 8 / 9 / 10 (Linux path)
→ Issue 13 → Issue 11 / 12 (Mobile, deferred)
Issue 14 (anytime, low risk)

---

## Key notes:

* tauri-apps/tauri-action@v0 is the official action and handles the entire build + signing + upload loop — it's the core of Issues 1 & 2.
* macOS notarization is a hard requirement before Homebrew cask or any public distribution; without it Gatekeeper blocks the app for all users.
* Windows EV cert is the expensive part (~$200–500/yr) but eliminates the SmartScreen "unknown publisher" warning on first run.
* Mobile (Issues 11–13) should be treated as a separate milestone; Tauri 2 mobile support is still stabilizing.
* For Linux, Snap is the fastest path (no human review, automated), AUR has the lowest upkeep, Flathub has the widest reach but slowest first submission.