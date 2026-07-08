class MaRadioCard extends HTMLElement {
  constructor() {
    super();
    this._query = "";
    this._hass = null;
    this._config = {};
    this._loading = false;
    this._initialized = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._render();
      this._initialized = true;
    }
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
    if (!this._config.player_entity) {
      console.warn("MA Radio Card: No player_entity configured");
    }
  }

  _render() {
    this.innerHTML = `
      <ha-card>
        <div class="ma-radio-content">
          <div class="ma-radio-header">
            <ha-icon icon="mdi:radio"></ha-icon>
            <span>${this._escapeHtml(this._config.title)}</span>
          </div>
          <div class="ma-radio-input-row">
            <ha-textfield
              class="ma-radio-query"
              label="Artist, genre, mood, playlist..."
              id="ma-radio-input"
            ></ha-textfield>
            <ha-button id="ma-radio-btn" disabled>
              ▶
            </ha-button>
          </div>
          <div id="ma-radio-status" class="ma-radio-status" style="display:none"></div>
          <div id="ma-radio-error" class="ma-radio-error" style="display:none"></div>
          <div id="ma-radio-log" class="ma-radio-log"></div>
        </div>
      </ha-card>
      <style>
        .ma-radio-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ma-radio-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 4px;
        }
        .ma-radio-input-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .ma-radio-query {
          flex: 1;
          min-width: 0;
        }
        ha-button#ma-radio-btn {
          flex-shrink: 0;
        }
        .ma-radio-status {
          color: var(--primary-color, #03a9f4);
          font-size: 14px;
          padding: 4px 8px;
        }
        .ma-radio-error {
          color: var(--error-color, #db4437);
          font-size: 14px;
          padding: 8px;
          background: rgba(219,68,55,0.08);
          border-radius: 4px;
        }
        .ma-radio-log {
          font-size: 13px;
          color: var(--secondary-text-color, #727272);
          padding: 2px 8px;
          min-height: 0;
        }
        .ma-radio-log .item {
          padding: 2px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ma-radio-log .item img {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          object-fit: cover;
        }
      </style>
    `;

    this._input = this.querySelector("#ma-radio-input");
    this._btn = this.querySelector("#ma-radio-btn");
    this._status = this.querySelector("#ma-radio-status");
    this._error = this.querySelector("#ma-radio-error");
    this._log = this.querySelector("#ma-radio-log");

    this._input.addEventListener("input", () => {
      this._query = this._input.value;
      this._hideError();
      this._updateBtn();
    });
    this._input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this._start();
    });
    this._btn.addEventListener("click", () => this._start());
  }

  _updateBtn() {
    this._btn.disabled = !(
      this._query.trim() &&
      this._config.player_entity &&
      !this._loading
    );
  }

  _showStatus(msg) {
    this._status.textContent = msg;
    this._status.style.display = "";
  }

  _showError(msg) {
    this._error.textContent = msg;
    this._error.style.display = "";
    this._status.style.display = "none";
  }

  _hideError() {
    this._error.style.display = "none";
  }

  _hideMessages() {
    this._status.style.display = "none";
    this._error.style.display = "none";
  }

  _clearLog() {
    this._log.innerHTML = "";
  }

  _addLogItem(html) {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = html;
    this._log.appendChild(div);
  }

  _escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  async _start() {
    const query = this._query.trim();
    if (!query || !this._config.player_entity) return;

    this._loading = true;
    this._btn.disabled = true;
    this._hideMessages();
    this._clearLog();
    this._showStatus("🔍 Searching across all…");

    try {
      const result = await this._hass.callWS({
        type: "call_service",
        domain: "music_assistant",
        service: "search",
        service_data: {
          config_entry_id: this._config.config_entry_id,
          name: query,
          media_type: ["artist", "album", "playlist", "radio"],
        },
        return_response: true,
      });

      const response = result?.response || {};
      const typeOrder = ["artists", "playlists", "albums", "radio"];
      let bestItem = null;
      let bestType = null;

      for (const key of typeOrder) {
        const items = response[key];
        if (items && items.length > 0) {
          bestItem = items[0];
          bestType = key.replace(/s$/, "");
          break;
        }
      }

      if (!bestItem) {
        this._showError(
          `No results found for "${query}". Try a different search term.`
        );
        this._loading = false;
        this._updateBtn();
        return;
      }

      const typeLabel = bestType.charAt(0).toUpperCase() + bestType.slice(1);
      this._addLogItem(
        `<ha-icon icon="mdi:check-circle" style="color:var(--primary-color)"></ha-icon>` +
          `<span>Found: <strong>${this._escapeHtml(
            bestItem.name
          )}</strong> (${typeLabel})</span>`
      );

      this._showStatus(`▶ Starting radio: ${bestItem.name}…`);

      await this._hass.callService(
        "music_assistant",
        "play_media",
        {
          media_id: bestItem.uri,
          media_type: bestType,
          radio_mode: true,
        },
        { entity_id: this._config.player_entity }
      );

      this._showStatus(`🎵 Now playing: ${bestItem.name} radio`);
      this._addLogItem(
        `<ha-icon icon="mdi:radio" style="color:var(--primary-color)"></ha-icon>` +
          `<span>Radio started on ${this._escapeHtml(
            this._config.player_entity
          )}</span>`
      );
    } catch (err) {
      this._showError(`Error: ${err.message || "Something went wrong"}`);
      console.error("MA Radio Card error:", err);
    } finally {
      this._loading = false;
      this._updateBtn();
    }
  }

  getCardSize() {
    return 3;
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
  description: "Search and start Music Assistant radio from any search term",
});
