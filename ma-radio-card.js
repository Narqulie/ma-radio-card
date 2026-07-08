import { LitElement, html, css } from "lit";

const MEDIA_TYPES = [
  { value: "artist", label: "Artist" },
  { value: "album", label: "Album" },
  { value: "playlist", label: "Playlist" },
  { value: "radio", label: "Radio Station" },
];

class MaRadioCard extends LitElement {
  static get properties() {
    return {
      _hass: { type: Object },
      config: { type: Object },
      _query: { type: String },
      _mediaType: { type: String },
      _selectedPlayer: { type: String },
      _loading: { type: Boolean },
      _error: { type: String },
      _status: { type: String },
    };
  }

  constructor() {
    super();
    this._query = "";
    this._mediaType = "artist";
    this._selectedPlayer = "";
    this._loading = false;
    this._error = "";
    this._status = "";
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Configuration is required");
    }
    if (!config.config_entry_id) {
      throw new Error(
        "config_entry_id is required. Find it in Home Assistant → Settings → " +
        "Devices & Services → Music Assistant → ⋮ → System options → Config Entry ID."
      );
    }
    this.config = {
      title: config.title || "MA Radio",
      config_entry_id: config.config_entry_id,
      player_entity: config.player_entity || "",
    };
    this._selectedPlayer = this.config.player_entity;
  }

  get _players() {
    if (!this._hass) return [];
    return Object.values(this._hass.states)
      .filter((s) => s.entity_id.startsWith("media_player."))
      .sort((a, b) =>
        (a.attributes.friendly_name || a.entity_id).localeCompare(
          b.attributes.friendly_name || b.entity_id
        )
      );
  }

  render() {
    const players = this._players;
    const canStart = this._query.trim() && this._selectedPlayer && !this._loading;

    return html`
      <ha-card>
        <div class="card-content">
          <div class="header">
            <ha-icon icon="mdi:radio"></ha-icon>
            <span>${this.config.title}</span>
          </div>

          <ha-textfield
            class="full-width"
            label="Artist, genre, playlist..."
            .value=${this._query}
            @input=${this._onQueryInput}
            @keydown=${this._onKeydown}
            ?disabled=${this._loading}
          ></ha-textfield>

          <div class="row">
            <ha-select
              label="Type"
              .value=${this._mediaType}
              @selected=${this._onMediaTypeChange}
              ?disabled=${this._loading}
              class="flex"
            >
              ${MEDIA_TYPES.map(
                (t) => html`
                  <ha-list-item value=${t.value}>${t.label}</ha-list-item>
                `
              )}
            </ha-select>

            ${players.length
              ? html`
                  <ha-select
                    label="Player"
                    .value=${this._selectedPlayer}
                    @selected=${this._onPlayerChange}
                    ?disabled=${this._loading}
                    class="flex"
                  >
                    ${players.map(
                      (p) => html`
                        <ha-list-item .value=${p.entity_id}>
                          ${p.attributes.friendly_name || p.entity_id}
                          ${p.state === "unavailable" ? " (offline)" : ""}
                        </ha-list-item>
                      `
                    )}
                  </ha-select>
                `
              : html`
                  <ha-select
                    label="No players found"
                    disabled
                    class="flex"
                  >
                    <ha-list-item value="">
                      No media players available
                    </ha-list-item>
                  </ha-select>
                `}
          </div>

          ${this._status
            ? html`<div class="status-row">${this._status}</div>`
            : ""}
          ${this._error
            ? html`<div class="error-row">${this._error}</div>`
            : ""}

          <ha-button
            @click=${this._startRadio}
            ?disabled=${!canStart}
            class="full-width"
          >
            ${this._loading
              ? html`
                  <ha-circular-progress
                    size="small"
                    indeterminate
                  ></ha-circular-progress>
                  &nbsp;Searching…
                `
              : html`▶ Start Radio`}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      .card-content {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 18px;
        font-weight: 500;
      }
      .full-width {
        width: 100%;
      }
      .row {
        display: flex;
        gap: 8px;
      }
      .flex {
        flex: 1;
        min-width: 0;
      }
      .status-row {
        color: var(--primary-color, #03a9f4);
        font-size: 14px;
        padding: 4px 0;
      }
      .error-row {
        color: var(--error-color, #db4437);
        font-size: 14px;
        padding: 8px;
        background: rgba(219, 68, 55, 0.08);
        border-radius: 4px;
      }
      ha-button.full-width {
        width: 100%;
      }
      ha-circular-progress {
        --md-circular-progress-size: 18px;
        vertical-align: middle;
      }
    `;
  }

  _onQueryInput(e) {
    this._query = e.target.value;
    if (this._error) this._error = "";
  }

  _onKeydown(e) {
    if (e.key === "Enter") {
      this._startRadio();
    }
  }

  _onMediaTypeChange(e) {
    this._mediaType = e.target.value;
  }

  _onPlayerChange(e) {
    this._selectedPlayer = e.target.value;
  }

  async _startRadio() {
    const query = this._query.trim();
    if (!query || !this._selectedPlayer) return;

    this._loading = true;
    this._error = "";
    this._status = "🔍 Searching…";

    try {
      const pluralType = this._mediaType + "s";

      const result = await this._hass.callWS({
        type: "call_service",
        domain: "music_assistant",
        service: "search",
        service_data: {
          config_entry_id: this.config.config_entry_id,
          name: query,
          media_type: [this._mediaType],
        },
        return_response: true,
      });

      const items = result?.response?.[pluralType];

      if (!items || items.length === 0) {
        this._error = `No ${this._mediaType}s found for "${query}". Try a different search term or media type.`;
        this._loading = false;
        this._status = "";
        return;
      }

      const item = items[0];
      this._status = `▶ Starting radio: ${item.name}…`;

      await this._hass.callService(
        "music_assistant",
        "play_media",
        {
          media_id: item.uri,
          media_type: this._mediaType,
          radio_mode: true,
        },
        { entity_id: this._selectedPlayer }
      );

      this._status = `🎵 Now playing: ${item.name} radio`;
    } catch (err) {
      this._error = `Error: ${err.message || "Something went wrong"}`;
      console.error("MA Radio Card error:", err);
    } finally {
      this._loading = false;
    }
  }

  getCardSize() {
    return 3;
  }

  static getConfigElement() {
    return document.createElement("ma-radio-card-editor");
  }

  static getStubConfig() {
    return {
      title: "MA Radio",
      config_entry_id: "",
      player_entity: "",
    };
  }
}

customElements.define("ma-radio-card", MaRadioCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ma-radio-card",
  name: "MA Radio Card",
  description:
    "Search and play Music Assistant radio from artist, genre, or playlist name",
  preview: false,
});

console.info(
  "%c🎵 MA Radio Card loaded",
  "font-weight: bold; color: #03a9f4;"
);
