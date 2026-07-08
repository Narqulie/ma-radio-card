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
      icon: config.icon || "mdi:radio",
      config_entry_id: config.config_entry_id,
      player_entity: config.player_entity || "",
    };
    if (!this._config.player_entity) {
      console.warn("MA Radio Card: No player_entity configured -- playback will not work until one is set.");
    }
  }

  _render() {
    this.innerHTML = `
      <ha-card>
        <div class="ma-radio-content">
          <div class="ma-radio-state-item">
            <div class="ma-radio-shape-icon" id="ma-radio-shape">
              <ha-icon class="ma-radio-state-icon" icon="${this._config.icon}"></ha-icon>
            </div>
            <div class="ma-radio-state-info">
              <span class="ma-radio-primary">${this._escapeHtml(this._config.title)}</span>
              <span class="ma-radio-secondary" id="ma-radio-subtitle">Search to start a radio (build 2026-07-08.3)</span>
            </div>
          </div>

          <div class="ma-radio-row">
            <div class="ma-radio-input-wrap">
              <ha-icon class="ma-radio-input-icon" icon="mdi:magnify"></ha-icon>
              <input
                type="text"
                id="ma-radio-input"
                class="ma-radio-input"
                placeholder="Artist, genre, mood, playlist..."
                autocomplete="off"
              >
            </div>
            <button id="ma-radio-btn" class="ma-radio-play-btn" disabled>
              <ha-icon icon="mdi:play"></ha-icon>
            </button>
          </div>

          <div id="ma-radio-status" class="ma-radio-chip ma-radio-status"></div>
          <div id="ma-radio-error" class="ma-radio-chip ma-radio-error"></div>
          <div id="ma-radio-log" class="ma-radio-log"></div>
        </div>
      </ha-card>
      <style>
        .ma-radio-content {
          --icon-size: 40px;
          --icon-border-radius: 12px;
          --icon-symbol-size: 22px;
          --spacing: 12px;
          --control-height: 40px;
        }
        ha-card {
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: var(--ha-card-box-shadow, 0 1px 2px rgba(0,0,0,0.08));
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: var(--layout-align, stretch);
        }
        .ma-radio-content {
          padding: var(--spacing) calc(var(--spacing) + 4px);
          display: flex;
          flex-direction: column;
          gap: var(--spacing);
          flex: 1;
        }

        /* Mushroom-style state-item: icon + info row */
        .ma-radio-state-item {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: var(--spacing);
        }

        /* Mushroom-style shape-icon with colored background */
        .ma-radio-shape-icon {
          width: var(--icon-size);
          height: var(--icon-size);
          flex: none;
          border-radius: var(--icon-border-radius);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.15);
          color: rgb(var(--rgb-primary-color, 3, 169, 244));
        }
        .ma-radio-state-icon {
          --mdc-icon-size: var(--icon-symbol-size);
        }

        /* Mushroom-style state-info: primary + secondary column */
        .ma-radio-state-info {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .ma-radio-primary {
          font-weight: 500;
          font-size: 14px;
          line-height: 1.3;
          color: var(--primary-text-color, #212121);
          letter-spacing: 0.1px;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .ma-radio-secondary {
          font-weight: 400;
          font-size: 12px;
          line-height: 1.3;
          color: var(--secondary-text-color, #727272);
          letter-spacing: 0.1px;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }

        /* Input row */
        .ma-radio-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .ma-radio-input-wrap {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          height: var(--control-height);
          padding: 0 var(--spacing);
          border-radius: var(--icon-border-radius);
          background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.05);
          box-sizing: border-box;
          transition: background-color 280ms ease-out;
        }
        .ma-radio-input-wrap:focus-within {
          background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
        }
        .ma-radio-input-icon {
          --mdc-icon-size: 18px;
          color: var(--secondary-text-color, #999);
          flex-shrink: 0;
        }
        .ma-radio-input {
          flex: 1;
          min-width: 0;
          height: 100%;
          border: none;
          background: transparent;
          color: var(--primary-text-color, #000);
          font-size: 14px;
          font-family: var(--paper-font-body_-_font-family, inherit);
          outline: none;
        }
        .ma-radio-input::placeholder {
          color: var(--secondary-text-color, #999);
        }

        /* Play button - using ha-icon-button with icon attribute */
        .ma-radio-play-btn {
          width: var(--control-height);
          height: var(--control-height);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          border-radius: var(--icon-border-radius);
          background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.15);
          color: rgb(var(--rgb-primary-color, 3, 169, 244));
          transition: opacity 280ms ease-out;
          padding: 0;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }
        .ma-radio-play-btn:disabled {
          opacity: 0.4;
          cursor: default;
        }
        .ma-radio-play-btn ha-icon {
          --mdc-icon-size: 20px;
          display: flex;
        }
        .ma-radio-play-btn.loading ha-icon {
          animation: ma-radio-spin 0.8s linear infinite;
        }
        @keyframes ma-radio-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Mushroom-style chip for status/error */
        .ma-radio-chip {
          font-weight: 500;
          font-size: 13px;
          padding: 6px 12px;
          border-radius: 10px;
          display: none;
          width: fit-content;
          box-sizing: border-box;
        }
        .ma-radio-status {
          color: rgb(var(--rgb-primary-color, 3, 169, 244));
          background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.12);
        }
        .ma-radio-error {
          color: var(--error-color, #db4437);
          background: rgba(var(--rgb-error-color, 219, 68, 55), 0.12);
        }

        /* Log */
        .ma-radio-log {
          font-size: 12px;
          color: var(--secondary-text-color, #727272);
          padding: 0 2px;
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
    this._subtitle = this.querySelector("#ma-radio-subtitle");
    this._shape = this.querySelector("#ma-radio-shape");

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
    this._btn.classList.add("loading");
    this._status.style.display = "none";
    this._error.style.display = "none";
    this._clearLog();
    this._status.textContent = "Searching...";
    this._status.style.display = "";
    this._subtitle.textContent = "Searching... (build 2026-07-08.3)";

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
        this._subtitle.textContent = "Search to start a radio (build 2026-07-08.3)";
        this._loading = false;
        this._btn.classList.remove("loading");
        this._updateBtn();
        return;
      }

      const typeLabel = bestType.charAt(0).toUpperCase() + bestType.slice(1);
      this._addLogItem(
        `<span>Found: <strong>${this._escapeHtml(bestItem.name)}</strong> (${typeLabel}) -- starting radio...</span>`
      );

      this._status.textContent = `Starting radio: ${bestItem.name}`;
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

      this._status.textContent = `Now playing: ${bestItem.name}`;
      this._subtitle.textContent = `Now playing: ${bestItem.name}`;
      this._addLogItem(`<span>Playing on ${this._escapeHtml(this._config.player_entity)}</span>`);
    } catch (err) {
      this._error.textContent = `Error: ${err.message || "Something went wrong"}`;
      this._error.style.display = "";
      this._status.style.display = "none";
      this._subtitle.textContent = "Search to start a radio (build 2026-07-08.3)";
      console.error("MA Radio Card error:", err);
    } finally {
      this._loading = false;
      this._btn.classList.remove("loading");
      this._updateBtn();
    }
  }

  getCardSize() {
    return 3;
  }

  static getStubConfig() {
    return {
      title: "MA Radio",
      icon: "mdi:radio",
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