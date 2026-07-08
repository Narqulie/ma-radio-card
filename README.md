# 🎵 MA Radio Card

A custom Lovelace card for **Home Assistant + Music Assistant** that lets you type an artist, genre, or playlist name and instantly start a **Music Assistant radio** — without navigating away from your dashboard.

## Features

- **Text search** — type any artist, genre, mood, or playlist name
- **Media type selector** — search as Artist, Album, Playlist, or Radio Station
- **Player picker** — auto-detects all your MA-compatible media players
- **One-tap radio** — starts Music Assistant's built-in radio mode (auto-mixes similar tracks)
- **Keyboard support** — press Enter to search
- **Live feedback** — shows status and error messages inline
- **Works with any MA provider** — Spotify, Tidal, Qobuz, local files, etc.

## Screenshots

*(Add screenshots here after installation)*

## Requirements

- Home Assistant 2025.1.0 or newer
- Music Assistant integration installed and configured in Home Assistant
- At least one Music Assistant media player (Sonos, Chromecast, etc.)

## Installation

### Via HACS (recommended)

1. Open HACS in Home Assistant
2. Go to **Frontend** → click **⋮** (three dots) → **Custom repositories**
3. Add this repository URL with category **Lovelace**
4. Click **Install** on the MA Radio Card
5. Refresh your browser (hard refresh: Ctrl+Shift+R / Cmd+Shift+R)

### Manual installation

1. Download `ma-radio-card.js` from the [latest release](https://github.com/Narqulie/ma-radio-card/releases)
2. Copy it to your Home Assistant `config/www/` directory
3. Add a Lovelace resource:
   - **URL:** `/local/ma-radio-card.js`
   - **Resource type:** JavaScript Module
4. Refresh your browser

## Configuration

### Card options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `type` | string | yes | — | Must be `"custom:ma-radio-card"` |
| `title` | string | no | `"MA Radio"` | Card header title |
| `config_entry_id` | string | **yes** | — | Music Assistant integration config entry ID |
| `player_entity` | string | no | — | Default media player entity ID |

### Finding your config_entry_id

1. Go to **Settings → Devices & Services**
2. Find **Music Assistant** in the integrations list
3. Click the **⋮** (three dots) → **System options**
4. The **Config Entry ID** is displayed at the top

### YAML example

```yaml
type: custom:ma-radio-card
title: "🎵 Start Radio"
config_entry_id: "01JXXXXXXX..."
player_entity: "media_player.kitchen_sonos_music_assistant"
```

### UI editor

After adding the card to your dashboard, open the card editor and fill in:

- **config_entry_id** — your MA integration's Config Entry ID
- **player_entity** — (optional) default player to pre-select

## Usage

1. Type an artist name, genre, mood, or playlist name into the search field
2. Select the media type (Artist / Album / Playlist / Radio Station)
3. Choose which player to play on (or keep the default)
4. Tap **Start Radio** (or press Enter)
5. Music Assistant searches, picks the best match, and starts a radio stream of similar tracks

### Genre search

For genres or moods (e.g. "lo-fi", "chill", "jazz"), select **Artist** or **Playlist** as the media type — Spotify's search handles free-text queries well and returns genre-relevant results.

## How it works

1. The card calls `music_assistant.search` with `return_response: true` via HA's WebSocket API
2. It picks the first result matching the chosen media type
3. It calls `music_assistant.play_media` with `radio_mode: true` on the selected player
4. Music Assistant automatically queues similar tracks — a true "radio" experience

## Development

```bash
git clone https://github.com/Narqulie/ma-radio-card.git
cd ma-radio-card
```

Edit `ma-radio-card.js` and reload your HA frontend to test changes.

## Support

- [GitHub Issues](https://github.com/Narqulie/ma-radio-card/issues)
- [Home Assistant Community](https://community.home-assistant.io/)

## License

MIT
