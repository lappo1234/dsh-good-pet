# dsh-good-pet

A personal, patched build of [dsh-pet](https://github.com/PC2005-cloud/dsh-pet) for the
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI.

This repository keeps the upstream pet (animations, desktop mode, balance display, memes,
chat, pet packs) and adds a few workflow-oriented patches used in daily DSH sessions.

## What is different from upstream

- **Session bridge.** The pet chat can forward a message to a selected DSH session and
  return that session's reply, instead of always calling the model directly. The target
  session is stored in `$DSH_HOME/dsh-pet/chat-session.txt`; when no target is set, the
  original model-chat path is used.
- **Session picker.** The right-click menu lists live and cold DSH sessions and lets you
  switch the bridge target without editing configuration files.
- **Cold-session resume.** If the selected session is not live, the bridge can resume it
  before sending the message.
- **Bubble improvements.** Long replies are shown in full; a bubble can be expanded or
  collapsed, and every bubble has a close button. Bridge replies stay visible for
  10 minutes by default.
- **Pet state machine.** The pet stays in `normal` or `sleep`; after 8 minutes without
  interaction it sleeps, and a click wakes it. Click zones (head / body / tail) select
  different reaction animations.
- **Session titles.** The session picker reads the first user message from the session's
  zstd frame, so sessions show a meaningful title instead of a raw id.

The patches are applied to the built bundles (`lib/index.js` and `lib/client.js`). The
upstream TypeScript source is kept under `src/` for reference. See
[PATCHES.md](PATCHES.md) for the patch list and reproduction notes.

## Install

The package name remains `dsh-pet` for compatibility with existing DSH plugin configs;
the repository is named `dsh-good-pet`.

### From the DSH plugin manager

Clone or download this repository, then add the local folder in the DSH plugin manager.
For the CLI:

```sh
git clone https://github.com/lappo1234/dsh-good-pet
dsh plugin --profile web add ./dsh-good-pet
```

Use the command form supported by your DSH version. After installation, restart the
desktop app or `dsh web` so the plugin is loaded.

### Manual replacement

If you already have `dsh-pet` installed, back up the installed package and replace its
`lib/` and `assets/` with the ones from this repository. Do not overwrite
`$DSH_HOME/dsh-pet/memory.json` or `main-config.jsonc`; those are your runtime data and
are intentionally not part of this repository.

## Repository layout

```text
assets/              animations, fonts, memes (about 64 MB)
lib/                 built host/client bundles (the patched runtime)
patches/             patch scripts used to produce this build
runtime/             optional Electron desktop helper
scripts/             upstream build helpers
src/                 upstream TypeScript source (reference)
cordis.patch.yml     DSH bundle patch
package.json         package manifest
PATCHES.md           patch details and reproduction notes
```

## Build / patch notes

`lib/` is the authoritative runtime in this repository. `npm run build` rebuilds from
`src/` and will overwrite the patched bundles; if you rebuild, re-apply the scripts in
`patches/` or restore the `lib/` from this repository. The patch scripts are
string-anchor based and may need adjustment when upstream changes.

## Compatibility

The manifest declares compatibility with DSH `0.2.0-rc.1`, `0.2.0-rc.2`, and
`0.2.1-rc.2`. The patched bundles rely on the DSH `agents` service and session event
shape; test on your DSH version before replacing a working install.

## Credits and license

Upstream project: [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet),
MIT License. The original copyright notice is preserved in [LICENSE](LICENSE); the
modifications in this repository are also released under the MIT License.

This repository contains no credentials, user memory, chat logs, or local configuration.
