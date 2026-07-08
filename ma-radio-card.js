class MaRadioCard extends HTMLElement {
  constructor() {
    super();
    this._query = "";
    this._mediaType = "artist";
    this._selectedPlayer = "";
    this._loading = false;
    this._error = "";
    this._status = "";
    this._hass = null;
    this._config = {};
    this._initialized = false;
    this.attachShadow({ mode: "open" });
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._render();
      this._initialized = true;
    }
    this._updatePlayerList();
  }

  setConfig(config) {
    if (!config) throw new Error("Configuration is required");
    if (!config.config_entry_id)
      throw new Error(
        "config_entry_id is required. Find it in HA Settings > Devices & Services > Music Assistant > System options."
      );
    this._config = {
      title: config.title || "MA Radio",
      config_entry_id: config.config_entry_id,
      player_entity: config.player_entity || "",
    };
    this._selectedPlayer = this._config.player_entity;
  }

  _getPlayers() {
    if (!this._hass) return [];
    return Object.values(this._hass.states)
      .filter((s) => s.entity_id.startsWith("media_player."))
      .sort((a, b) =>
        (a.attributes.friendly_name || a.entity_id).localeCompare(
          b.attributes.friendly_name || b.entity_id
        )
      );
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="card-content">
          <div class="header">
            <ha-icon icon="mdi:radio"></ha-icon>
            <span id="title">${this._escapeHtml(this._config.title)}</span>
          </div>
          <ha-textfield class="full-width" label="Artist, genre, playlist..." id="query"></ha-textfield>
          <div class="row">
            <ha-select label="Type" id="mediaType" class="flex">
              <ha-list-item value="artist">Artist</ha-list-item>
              <ha-list-item value="album">Album</ha-list-item>
              <ha-list-item value="playlist">Playlist</ha-list-item>
              <ha-list-item value="radio">Radio Station</ha-list-item>
            </ha-select>
            <ha-select label="Player" id="player" class="flex">
              <ha-list-item value="">Select a player…</ha-list-item>
            </ha-select>
          </div>
          <div id="status" class="status-row" style="display:none"></div>
          <div id="error" class="error-row" style="display:none"></div>
          <ha-button id="startBtn" class="full-width" disabled>
            ▶ Start Radio
          </ha-button>
        </div>
      </ha-card>
      <style>
        .card-content { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .header { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 500; }
        .full-width { width: 100%; }
        .row { display: flex; gap: 8px; }
        .flex { flex: 1; min-width: 0; }
        .status-row { color: var(--primary-color, #03a9f4); font-size: 14px; padding: 4px 0; }
        .error-row { color: var(--error-color, #db4437); font-size: 14px; padding: 8px; background: rgba(219,68,55,0.08); border-radius: 4px; }
        ha-button.full-width { width: 100%; }
      </style>
    `;

    this._queryEl = this.shadowRoot.getElementById("query");
    this._typeEl = this.shadowRoot.getElementById("mediaType");
    this._playerEl = this.shadowRoot.getElementById("player");
    this._statusEl = this.shadowRoot.getElementById("status");
    this._errorEl = this.shadowRoot.getElementById("error");
    this._btnEl = this.shadowRoot.getElementById("startBtn");

    this._queryEl.addEventListener("input", () => {
      this._query = this._queryEl.value;
      this._errorEl.style.display = "none";
      this._updateButton();
    });
    this._queryEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this._startRadio();
    });
    this._typeEl.addEventListener("selected", (e) => {
      this._mediaType = e.target.value;
    });
    this._playerEl.addEventListener("selected", (e) => {
      this._selectedPlayer = e.target.value;
      this._updateButton();
    });
    this._btnEl.addEventListener("click", () => this._startRadio());
  }

  _updateButton() {
    this._btnEl.disabled = !(this._query.trim() && this._selectedPlayer);
  }

  _updatePlayerList() {
    if (!this._playerEl || !this._hass) return;
    const players = this._getPlayers();
    const current = this._selectedPlayer;
    this._playerEl.innerHTML =
      `<ha-list-item value="">Select a player…</ha-list-item>` +
      players
        .map(
          (p) =>
            `<ha-list-item value="${p.entity_id}">${
              this._escapeHtml(p.attributes.friendly_name || p.entity_id)
            }${p.state === "unavailable" ? " (offline)" : ""}</ha-list-item>`
        )
        .join("");
    if (current && players.some((p) => p.entity_id === current)) {
      this._playerEl.value = current;
    }
  }

  _showStatus(msg) {
    this._statusEl.textContent = msg;
    this._statusEl.style.display = "";
  }

  _showError(msg) {
    this._errorEl.textContent = msg;
    this._errorEl.style.display = "";
    this._statusEl.style.display = "none";
  }

  _hideMessages() {
    this._statusEl.style.display = "none";
    this._errorEl.style.display = "none";
  }

  _escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async _startRadio() {
    const query = this._query.value.trim();
    if (!query || !this._selectedPlayer) return;

    this._loading = true;
    this._btnEl.disabled = true;
    this._hideMessages();
    this._showStatus("🔍 Searching…");

    try {
      const pluralType = this._mediaType + "s";

      const result = await this._hass.callWS({
        type: "call_service",
        domain: "music_assistant",
        service: "search",
        service_data: {
          config_entry_id: this._config.config_entry_id,
          name: query,
          media_type: [this._mediaType],
        },
        return_response: true,
      });

      const items = result?.response?.[pluralType];

      if (!items || items.length === 0) {
        this._showError(
          `No ${this._mediaType}s found for "${query}". Try a different search or media type.`
        );
        this._loading = false;
        this._updateButton();
        return;
      }

      const item = items[0];
      this._showStatus(`▶ Starting radio: ${item.name}…`);

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

      this._showStatus(`🎵 Now playing: ${item.name} radio`);
    } catch (err) {
      this._showError(`Error: ${err.message || "Something went wrong"}`);
      console.error("MA Radio Card error:", err);
    } finally {
      this._loading = false;
      this._updateButton();
    }
  }

  getCardSize() {
    return 3;
  }
}

customElements.define("ma-radio-card", MaRadioCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ma-radio-card",
  name: "MA Radio Card",
  description: "Search and start Music Assistant radio from artist, genre, or playlist name",
});
