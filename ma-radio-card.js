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
          <div class="ma-radio-row">
            <input
              type="text"
              id="ma-radio-input"
              class="ma-radio-input"
              placeholder="Artist, genre, mood, playlist…"
              autocomplete="off"
            >
            <ha-button id="ma-radio-btn" disabled>▶</ha-button>
          </div>
          <div id="ma-radio-status" class="ma-radio-msg ma-radio-status"></div>
          <div id="ma-radio-error" class="ma-radio-msg ma-radio-error"></div>
          <div id="ma-radio-log" class="ma-radio-log"></div>
        </div>
      </ha-card>
      <style>
        .ma-radio-content {
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ma-radio-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .ma-radio-input {
          flex: 1;
          min-width: 0;
          height: 40px;
          padding: 0 12px;
          border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
          border-radius: 8px;
          background: var(--input-fill, var(--card-background-color, #fff));
          color: var(--primary-text-color, #000);
          font-size: 15px;
          font-family: var(--paper-font-body_-_font-family, inherit);
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .ma-radio-input:focus {
          border-color: var(--primary-color, #03a9f4);
        }
        .ma-radio-input::placeholder {
          color: var(--secondary-text-color, #999);
        }
        .ma-radio-msg {
          font-size: 14px;
          padding: 4px 0;
          display: none;
        }
        .ma-radio-status {
          color: var(--primary-color, #03a9f4);
        }
        .ma-radio-error {
          color: var(--error-color, #db4437);
        }
        .ma-radio-log {
          font-size: 13px;
          color: var(--secondary-text-color, #727272);
          padding: 2px 0;
          min-height: 0;
        }
        .ma-radio-log .item {
          padding: 3px 0;
          display: flex;
          align-items: center;
          gap: 6px;
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
      this._error.style.display = "none";
      this._updateBtn();
    });
    this._input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this._start();
    });
    this._btn.addEventListener("click", () => this._start());

    this._updateBtn();
  }

  _updateBtn() {
    this._btn.disabled = !(
      this._query.trim() &&
      this._config.player_entity &&
      !this._loading
    );
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
    const query = this._input.value.trim();
    if (!query || !this._config.player_entity) return;

    this._loading = true;
    this._btn.disabled = true;
    this._status.style.display = "none";
    this._error.style.display = "none";
    this._clearLog();
    this._status.textContent = "🔍 Searching…";
    this._status.style.display = "";

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
        if (response[key] && response[key].length > 0) {
          bestItem = response[key][0];
          bestType = key.replace(/s$/, "");
          break;
        }
      }

      if (!bestItem) {
        this._error.textContent = `No results for "${query}". Try a different search term.`;
        this._error.style.display = "";
        this._status.style.display = "none";
        this._loading = false;
        this._updateBtn();
        return;
      }

      const typeLabel = bestType.charAt(0).toUpperCase() + bestType.slice(1);
      this._addLogItem(
        `<span>✅ <strong>${this._escapeHtml(bestItem.name)}</strong> (${typeLabel}) · starting radio…</span>`
      );

      this._status.textContent = `▶ Playing: ${bestItem.name} radio`;
      this._status.style.display = "";

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

      this._status.textContent = `🎵 Radio: ${bestItem.name}`;
      this._addLogItem(`<span>📻 Playing on ${this._escapeHtml(this._config.player_entity)}</span>`);
    } catch (err) {
      this._error.textContent = `Error: ${err.message || "Something went wrong"}`;
      this._error.style.display = "";
      this._status.style.display = "none";
      console.error("MA Radio Card error:", err);
    } finally {
      this._loading = false;
      this._updateBtn();
    }
  }

  getCardSize() {
    return 2;
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
  description: "Start Music Assistant radio from any search term",
});
