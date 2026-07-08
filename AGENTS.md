# AGENTS.md

## ma-radio-card

Custom Lovelace card for Home Assistant that provides a text-input-to-radio UI for Music Assistant.

## Architecture (1 file)

```
ma-radio-card.js  — single-file HTMLElement class, no build step
hacs.json          — HACS metadata (category: plugin/lovelace)
README.md          — install, configure, usage docs
```

## Key design decisions

- **Vanilla HTMLElement** (no Lit, no imports) — works as an inline Lovelace resource or via HACS.
  The first version used `import { LitElement } from "lit"` but inline resources served through
  Nabu Casa's Cloudflare proxy can't resolve bare module specifiers like `"lit"`. HACS-installed
  files work because they're served from the same origin. For dev iteration, inline is easier.
- **No shadow DOM** — HA components (`ha-card`, `ha-icon`, `ha-button`, `ha-select`) break
  inside shadow roots because their internal styling depends on being in HA's light DOM scope.
  Render via `this.innerHTML = ...` directly.
- **Native `<button>` for play, not `ha-icon-button`** — `ha-icon-button` puts its icon in its
  own shadow DOM which can't be styled or animated from outside. A plain `<button>` with a child
  `<ha-icon>` keeps the icon in the light DOM where CSS works.
- **No `:host` CSS selector** — only works with shadow DOM. Use scoped class names instead.

## Card configuration (card config, set per-instance in Lovelace)

| Key | Required | Description |
|-----|----------|-------------|
| `config_entry_id` | yes | Music Assistant integration Config Entry ID |
| `player_entity` | yes | Default MA media player to play on |
| `title` | no | Header title (default: "MA Radio") |
| `icon` | no | Header icon (default: "mdi:radio") |

## How the card works

1. User types a query and hits Enter or the play button
2. `_start()` calls `music_assistant.search` via `hass.callWS()` with `return_response: true`
   and `media_type: ["artist", "album", "playlist", "radio"]`
3. Picks the first result in priority order: artists → playlists → albums → radio
4. Calls `music_assistant.play_media` with `radio_mode: true`
5. Shows status chips, log entries, and updates the subtitle dynamically

## Known gotchas

- **Inline resource** for HA dashboard resources has a ~24KB limit. Card is ~12KB, well within.
- **Nabu Casa CDN caching** aggressively caches `/hacsfiles/` URLs. The hacstag parameter changes
  on HACS re-download but the content might be stale. Using inline resources avoids this.
- **`hass.callService()` doesn't return responses** — use `hass.callWS({ type: "call_service", ..., return_response: true })` for search results.

## Development workflow

```bash
# Edit local file
vim ma-radio-card.js

# Delete old inline resource
ha_config_delete_dashboard_resource(resource_id="...")

# Re-register
ha_config_set_dashboard_resource(content="$(cat ma-radio-card.js)", resource_type="module")

# Hard refresh browser to test
```

For final release: push to GitHub → HACS re-download via `ha_manage_hacs(action="download", repository_id="Narqulie/ma-radio-card")`.

## HACS

- Repository: `Narqulie/ma-radio-card`
- Category: lovelace
- Requires `hacs.json` with `"content_in_root": true, "filename": "ma-radio-card.js"`
