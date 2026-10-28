# Patches in this build

**Base:** [`dsh-pet` 0.3.8](https://github.com/PC2005-cloud/dsh-pet) by PC2005-cloud (MIT).
**This build:** `0.3.9` (`dsh-good-pet` repository, package name kept as `dsh-pet`).

The runtime in `lib/` is the authoritative patched build. `src/` is the upstream
TypeScript source and is not modified by these scripts. The patch scripts in
`patches/` are kept for reference and for reapplication after an upstream rebuild;
they operate on the built JavaScript with string anchors, not on the TypeScript source.

## Applied changes

1. **Session bridge** (`patch-pet.mjs`, `patch-pet2.mjs`, `patch-pet3.mjs`, `patch-pet4.mjs`)
   - Adds `relayToSession()` and sends pet-chat input to a DSH session when a target is set.
   - Reads the target from `$DSH_HOME/dsh-pet/chat-session.txt`.
   - Injects the `agents` service and extracts the assistant reply from session events.
   - Falls back to the original model chat when no target is configured or the relay fails.

2. **Session list and picker** (`patch-sessions.mjs`, `patch-cold.mjs`, `patch-cold2.mjs`,
   `patch-titles.mjs`)
   - Adds `/dsh-pet-7340/sessions` and `/dsh-pet-7340/session` routes.
   - Lists live sessions and cold sessions found under `$DSH_HOME/sessions`.
   - Adds a right-click submenu to select the bridge target.
   - Resumes a cold session before relaying.
   - Reads session titles from the first user message in the zstd session frame.

3. **Bubble behavior** (`patch-buttons.mjs`, `patch-close.mjs`, `patch-summary.mjs`)
   - Keeps the full reply text in the bubble instead of truncating it in the host.
   - Adds expand/collapse for long text and a close button on every bubble.
   - Extends bridge replies to 10 minutes by default.

4. **Pet state machine** (`patch-state.mjs`)
   - Adds `normal` / `sleep` states, an idle timeout, wake-on-click, and click-zone
     animation selection (head / body / tail).

## Patch scripts

| Script | Main target(s) | Purpose |
|---|---|---|
| `patch-pet.mjs` | `lib/index.js` | Session relay function and chat routing |
| `patch-pet2.mjs` | `lib/index.js` | Read bridge target from `chat-session.txt` |
| `patch-pet3.mjs` | `lib/index.js` | Inject the `agents` service |
| `patch-pet4.mjs` | `lib/index.js` | Extract assistant text from session events |
| `patch-buttons.mjs` | `lib/index.js`, `lib/client.js` | Full text, expand/collapse, duration |
| `patch-close.mjs` | `lib/client.js`, `lib/index.js` | Close button on every bubble |
| `patch-cold.mjs` | `lib/index.js`, `lib/client.js` | Cold session scan and resume |
| `patch-cold2.mjs` | `lib/index.js`, `lib/client.js` | Alternative cold-session scan |
| `patch-sessions.mjs` | `lib/index.js`, `lib/client.js` | Session list, switch route, picker |
| `patch-state.mjs` | `lib/client.js` | Pet state machine and click zones |
| `patch-summary.mjs` | `lib/client.js` | Summary/expand rendering |
| `patch-titles.mjs` | `lib/index.js`, `lib/client.js` | Session title extraction |

## Reproducing

1. Install upstream `dsh-pet` 0.3.8 and run its build (`npm run build`) if you need a
   fresh `lib/`.
2. Back up `lib/index.js` and `lib/client.js`.
3. Apply the scripts in the order above, passing the target files as arguments. For
   example:

   ```sh
   node patches/patch-pet.mjs lib/index.js
   node patches/patch-pet2.mjs lib/index.js
   node patches/patch-pet3.mjs lib/index.js
   node patches/patch-pet4.mjs lib/index.js
   node patches/patch-buttons.mjs lib/index.js lib/client.js
   ```

   The exact arguments differ per script; check the `process.argv` use at the top of each
   file. Several scripts are idempotent and exit early if their anchor is already patched.
4. Restart DSH and test the pet chat, session picker, cold-session resume, and bubble
   controls.

## Notes

- `npm run build` rebuilds `lib/` from `src/` and overwrites these patches. Either do not
  rebuild, or re-apply the scripts and re-test.
- The patches depend on DSH session event shapes (`agents.get`, `agents.resume`,
  `session.events`, zstd session frames). Upstream changes may require anchor updates.
- No user data is included: `memory.json`, `main-config.jsonc`, `chat-session.txt`,
  `say.log`, and other runtime files are intentionally excluded.
