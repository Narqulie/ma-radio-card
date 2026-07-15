class MaRadioCard extends HTMLElement {
  constructor() {
    super();
    this._query = "";
    this._hass = null;
    this._config = {};
    this._loading = false;
    this._initialized = false;
    this._mediaType = "auto";
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
      throw new Error("config_entry_id is required. Find it in HA Settings > Devices & Services > Music Assistant > System options.");
    this._config = {
      title: config.title || "MA Radio",
      icon: config.icon || "mdi:radio",
      config_entry_id: config.config_entry_id,
      player_entity: config.player_entity || "",
      default_type: config.default_type || "auto",
    };
    if (!this._config.player_entity) {
      console.warn("MA Radio Card: No player_entity configured -- playback will not work until one is set.");
    }
    this._mediaType = this._config.default_type;
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
              <span class="ma-radio-secondary" id="ma-radio-subtitle">Search to start a radio</span>
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

          <div id="ma-radio-type-chips" class="ma-radio-type-chips">
            <button class="ma-radio-type-chip${this._mediaType === "auto" ? " active" : ""}" data-value="auto">Auto</button>
            <button class="ma-radio-type-chip${this._mediaType === "artist" ? " active" : ""}" data-value="artist">Artist</button>
            <button class="ma-radio-type-chip${this._mediaType === "album" ? " active" : ""}" data-value="album">Album</button>
            <button class="ma-radio-type-chip${this._mediaType === "playlist" ? " active" : ""}" data-value="playlist">Playlist</button>
            <button class="ma-radio-type-chip${this._mediaType === "radio" ? " active" : ""}" data-value="radio">Radio</button>
          </div>

          <div id="ma-radio-status" class="ma-radio-chip ma-radio-status"></div>
          <div id="ma-radio-error" class="ma-radio-chip ma-radio-error"></div>
          <div id="ma-radio-log" class="ma-radio-log"></div>
        </div>
      </ha-card>
      <style>
        .ma-radio-content{--icon-size:40px;--icon-border-radius:12px;--icon-symbol-size:22px;--spacing:12px;--control-height:40px}ha-card{border-radius:var(--ha-card-border-radius,12px);box-shadow:var(--ha-card-box-shadow,0 1px 2px rgba(0,0,0,.08));height:100%;display:flex;flex-direction:column;justify-content:var(--layout-align,stretch)}.ma-radio-content{padding:var(--spacing) calc(var(--spacing) + 4px);display:flex;flex-direction:column;gap:var(--spacing);flex:1}.ma-radio-state-item{display:flex;flex-direction:row;align-items:center;gap:var(--spacing)}.ma-radio-shape-icon{width:var(--icon-size);height:var(--icon-size);flex:none;border-radius:var(--icon-border-radius);display:flex;align-items:center;justify-content:center;background:rgba(var(--rgb-primary-color,3,169,244),0.15);color:rgb(var(--rgb-primary-color,3,169,244))}.ma-radio-state-icon{--mdc-icon-size:var(--icon-symbol-size)}.ma-radio-state-info{min-width:0;flex:1;display:flex;flex-direction:column}.ma-radio-primary{font-weight:500;font-size:14px;line-height:1.3;color:var(--primary-text-color,#212121);letter-spacing:.1px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}.ma-radio-secondary{font-weight:400;font-size:12px;line-height:1.3;color:var(--secondary-text-color,#727272);letter-spacing:.1px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}.ma-radio-row{display:flex;gap:8px;align-items:center}.ma-radio-input-wrap{flex:1;min-width:0;display:flex;align-items:center;gap:8px;height:var(--control-height);padding:0 var(--spacing);border-radius:var(--icon-border-radius);background:rgba(var(--rgb-primary-text-color,0,0,0),0.05);box-sizing:border-box;transition:background-color 280ms ease-out}.ma-radio-input-wrap:focus-within{background:rgba(var(--rgb-primary-text-color,0,0,0),0.08)}.ma-radio-input-icon{--mdc-icon-size:18px;color:var(--secondary-text-color,#999);flex-shrink:0}.ma-radio-input{flex:1;min-width:0;height:100%;border:none;background:transparent;color:var(--primary-text-color,#000);font-size:14px;font-family:var(--paper-font-body_-_font-family,inherit);outline:none}.ma-radio-input::placeholder{color:var(--secondary-text-color,#999)}.ma-radio-play-btn{width:var(--control-height);height:var(--control-height);flex-shrink:0;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;border-radius:var(--icon-border-radius);background:rgba(var(--rgb-primary-color,3,169,244),0.15);color:rgb(var(--rgb-primary-color,3,169,244));transition:opacity 280ms ease-out;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}.ma-radio-play-btn:disabled{opacity:.4;cursor:default}.ma-radio-play-btn ha-icon{--mdc-icon-size:20px;display:flex}.ma-radio-play-btn.loading ha-icon{animation:ma-radio-spin .8s linear infinite}@keyframes ma-radio-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.ma-radio-type-chips{display:flex;flex-wrap:wrap;gap:6px}.ma-radio-type-chip{border:none;cursor:pointer;font-weight:500;font-size:12px;line-height:1.4;padding:4px 12px;border-radius:12px;background:rgba(var(--rgb-primary-text-color,0,0,0),0.08);color:var(--secondary-text-color,#727272);font-family:var(--paper-font-body_-_font-family,inherit);transition:background 180ms ease,color 180ms ease;-webkit-tap-highlight-color:transparent}.ma-radio-type-chip.active{background:rgba(var(--rgb-primary-color,3,169,244),0.15);color:rgb(var(--rgb-primary-color,3,169,244))}.ma-radio-type-chip:hover:not(.active){background:rgba(var(--rgb-primary-text-color,0,0,0),0.12)}.ma-radio-chip{font-weight:500;font-size:13px;padding:6px 12px;border-radius:10px;display:none;width:fit-content;box-sizing:border-box}.ma-radio-status{color:rgb(var(--rgb-primary-color,3,169,244));background:rgba(var(--rgb-primary-color,3,169,244),0.12)}.ma-radio-error{color:var(--error-color,#db4437);background:rgba(var(--rgb-error-color,219,68,55),0.12)}.ma-radio-log{font-size:12px;color:var(--secondary-text-color,#727272);padding:0 2px;min-height:0}.ma-radio-log .item{padding:3px 0;display:flex;align-items:center;gap:6px}
      </style>
    `;

    this._input = this.querySelector("#ma-radio-input");
    this._btn = this.querySelector("#ma-radio-btn");
    this._status = this.querySelector("#ma-radio-status");
    this._error = this.querySelector("#ma-radio-error");
    this._log = this.querySelector("#ma-radio-log");
    this._subtitle = this.querySelector("#ma-radio-subtitle");
    this._shape = this.querySelector("#ma-radio-shape");
    this._typeChips = this.querySelector("#ma-radio-type-chips");

    this._typeChips.addEventListener("click", (e) => {
      const chip = e.target.closest(".ma-radio-type-chip");
      if (!chip || chip.dataset.value === this._mediaType) return;
      this._mediaType = chip.dataset.value;
      this._typeChips.querySelectorAll(".ma-radio-type-chip").forEach((c) => {
        c.classList.toggle("active", c.dataset.value === this._mediaType);
      });
    });

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
    this._btn.disabled = !(this._query.trim() && this._config.player_entity && !this._loading);
  }

  _clearLog() { this._log.innerHTML = ""; }

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
    this._subtitle.textContent = "Searching...";

    try {
      const typeToPlural = { artist: "artists", album: "albums", playlist: "playlists", radio: "radio" };
      const mediaTypes = this._mediaType === "auto" ? ["artist", "album", "playlist", "radio"] : [this._mediaType];

      const result = await this._hass.callWS({
        type: "call_service", domain: "music_assistant", service: "search",
        service_data: { config_entry_id: this._config.config_entry_id, name: query, media_type: mediaTypes },
        return_response: true,
      });

      const response = result?.response || {};
      const typeOrder = this._mediaType === "auto" ? ["artists", "playlists", "albums", "radio"] : [typeToPlural[this._mediaType]];
      let bestItem = null, bestType = null;

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
        this._subtitle.textContent = "Search to start a radio";
        this._loading = false;
        this._btn.classList.remove("loading");
        this._updateBtn();
        return;
      }

      if (!bestItem.uri) throw new Error(`Search result "${bestItem.name}" has no playable URI`);

      const typeLabel = bestType.charAt(0).toUpperCase() + bestType.slice(1);
      this._addLogItem(`<span>Found: <strong>${this._escapeHtml(bestItem.name)}</strong> (${typeLabel}) -- starting radio...</span>`);
      this._status.textContent = `Starting radio: ${bestItem.name}`;
      this._status.style.display = "";

      await this._hass.callService("music_assistant", "play_media", { media_id: bestItem.uri, media_type: bestType, radio_mode: true }, { entity_id: this._config.player_entity });

      this._status.textContent = `Now playing: ${bestItem.name}`;
      this._subtitle.textContent = `Now playing: ${bestItem.name}`;
      this._addLogItem(`<span>Playing on ${this._escapeHtml(this._config.player_entity)}</span>`);
    } catch (err) {
      this._error.textContent = `Error: ${err.message || "Something went wrong"}`;
      this._error.style.display = "";
      this._status.style.display = "none";
      this._subtitle.textContent = "Search to start a radio";
      console.error("MA Radio Card error:", err);
    } finally {
      this._loading = false;
      this._btn.classList.remove("loading");
      this._updateBtn();
    }
  }

  getCardSize() { return 3; }

  static getStubConfig() {
    return { title: "MA Radio", icon: "mdi:radio", config_entry_id: "", player_entity: "", default_type: "auto" };
  }

  static getConfigElement() { return document.createElement("ma-radio-card-editor"); }
}

customElements.define("ma-radio-card", MaRadioCard);

class MaRadioCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
    this._maConfigs = [];
    this._maPlayers = [];
    this._loadingData = false;
    this._errorMsg = "";
    this._rendered = false;
  }

  setConfig(config) {
    this._config = Object.assign({ title: "MA Radio", icon: "mdi:radio", default_type: "auto" }, config || {});
    if (this._rendered) this._syncValues();
  }

  get value() { return this._config; }

  set hass(hass) {
    this._hass = hass;
    if (hass) this._fetchData();
  }

  async _fetchData() {
    if (!this._hass || this._loadingData) return;
    this._loadingData = true;
    this._errorMsg = "";
    try {
      const [entries, entities] = await Promise.all([
        this._hass.callWS({ type: "config_entries/get" }).catch(() => []),
        this._hass.callWS({ type: "config/entity_registry/list" }).catch(() => []),
      ]);

      this._maConfigs = entries.filter(e => e.domain === "music_assistant").map(e => ({ entry_id: e.entry_id, title: e.title || "Music Assistant" }));
      this._maPlayers = entities.filter(e => e.platform === "music_assistant" && e.entity_id.startsWith("media_player.")).map(e => ({ entity_id: e.entity_id, name: e.name || e.original_name || e.entity_id, config_entry_id: e.config_entry_id }));

      if (this._maConfigs.length === 0) this._errorMsg = "No Music Assistant integration found. Install and configure Music Assistant first.";
      else if (this._maPlayers.length === 0) this._errorMsg = "No Music Assistant media players found. Add a player in Music Assistant first.";
    } catch (err) {
      this._errorMsg = "Failed to load integration data. Check browser console.";
      console.error("MA Radio Card editor error:", err);
    } finally {
      this._loadingData = false;
      this._render();
    }
  }

  _render() {
    const config = this._config;
    const entryMap = {};
    this._maConfigs.forEach(c => { entryMap[c.entry_id] = c.title; });

    this.innerHTML = `
      <style>
        .ma-editor{padding:16px 8px;display:flex;flex-direction:column;gap:16px}
        .ma-editor ha-textfield,.ma-editor ha-select{width:100%}
        .ma-editor-error{padding:12px;border-radius:8px;background:rgba(var(--rgb-error-color,219,68,55),0.12);color:var(--error-color,#db4437);font-size:13px;line-height:1.4}
        .ma-editor-loading{color:var(--secondary-text-color,#727272);font-size:13px;padding:12px 0}
        .ma-editor-section-label{font-weight:500;font-size:12px;color:var(--secondary-text-color,#727272);text-transform:uppercase;letter-spacing:.5px;margin-bottom:-8px}
        .ma-editor-icon-row{display:flex;align-items:center;gap:12px}
        .ma-editor-icon-row ha-icon-picker{flex:1}
        .ma-editor-chip-row{display:flex;flex-wrap:wrap;gap:6px}
        .ma-editor-chip{border:none;cursor:pointer;font-weight:500;font-size:12px;line-height:1.4;padding:4px 12px;border-radius:12px;background:rgba(var(--rgb-primary-text-color,0,0,0),0.08);color:var(--secondary-text-color,#727272);font-family:var(--paper-font-body_-_font-family,inherit);transition:background 180ms ease,color 180ms ease;-webkit-tap-highlight-color:transparent}
        .ma-editor-chip.active{background:rgba(var(--rgb-primary-color,3,169,244),0.15);color:rgb(var(--rgb-primary-color,3,169,244))}
      </style>
      <div class="ma-editor">
        ${this._errorMsg ? `<div class="ma-editor-error">${this._escapeHtml(this._errorMsg)}</div>` : ""}
        ${this._loadingData && this._maConfigs.length === 0 && !this._rendered ? `<div class="ma-editor-loading">Loading Music Assistant data...</div>` : ""}
        <ha-textfield id="ma-editor-title" label="Title" value="${this._escapeHtml(config.title || "")}"></ha-textfield>
        <div class="ma-editor-icon-row">
          <ha-icon-picker id="ma-editor-icon" label="Icon" value="${config.icon || "mdi:radio"}"></ha-icon-picker>
        </div>
        <div class="ma-editor-section-label">Music Assistant</div>
        <ha-select id="ma-editor-entry" label="Config Entry" value="${config.config_entry_id || ""}" naturalMenuWidth>
          <ha-list-item value="">-- Select config entry --</ha-list-item>
          ${this._maConfigs.map(c => `<ha-list-item value="${this._escapeHtml(c.entry_id)}">${this._escapeHtml(c.title)}</ha-list-item>`).join("")}
        </ha-select>
        <ha-select id="ma-editor-player" label="Player Entity" value="${config.player_entity || ""}" naturalMenuWidth>
          <ha-list-item value="">-- Select player --</ha-list-item>
          ${this._maPlayers.map(p => `<ha-list-item value="${this._escapeHtml(p.entity_id)}">${this._escapeHtml(p.name)} ${this._escapeHtml(p.entity_id)} [${this._escapeHtml(entryMap[p.config_entry_id] || p.config_entry_id)}]</ha-list-item>`).join("")}
        </ha-select>
        <div class="ma-editor-section-label">Default Search Type</div>
        <div id="ma-editor-type-chips" class="ma-editor-chip-row">
          <button class="ma-editor-chip${config.default_type === "auto" ? " active" : ""}" data-value="auto">Auto</button>
          <button class="ma-editor-chip${config.default_type === "artist" ? " active" : ""}" data-value="artist">Artist</button>
          <button class="ma-editor-chip${config.default_type === "album" ? " active" : ""}" data-value="album">Album</button>
          <button class="ma-editor-chip${config.default_type === "playlist" ? " active" : ""}" data-value="playlist">Playlist</button>
          <button class="ma-editor-chip${config.default_type === "radio" ? " active" : ""}" data-value="radio">Radio</button>
        </div>
      </div>
    `;
    this._rendered = true;
    this._wireEvents();
  }

  _syncValues() {
    const titleField = this.querySelector("#ma-editor-title");
    const iconPicker = this.querySelector("#ma-editor-icon");
    const entrySelect = this.querySelector("#ma-editor-entry");
    const playerSelect = this.querySelector("#ma-editor-player");
    if (titleField) titleField.value = this._config.title || "";
    if (iconPicker) iconPicker.value = this._config.icon || "mdi:radio";
    if (entrySelect) entrySelect.value = this._config.config_entry_id || "";
    if (playerSelect) playerSelect.value = this._config.player_entity || "";
  }

  _wireEvents() {
    const titleField = this.querySelector("#ma-editor-title");
    const iconPicker = this.querySelector("#ma-editor-icon");
    const entrySelect = this.querySelector("#ma-editor-entry");
    const playerSelect = this.querySelector("#ma-editor-player");

    titleField.addEventListener("change", () => { this._config.title = titleField.value; this._dispatchChange(); });
    iconPicker.addEventListener("value-changed", (e) => { this._config.icon = e.detail.value; this._dispatchChange(); });
    entrySelect.addEventListener("change", () => {
      this._config.config_entry_id = entrySelect.value;
      this._config.player_entity = "";
      if (playerSelect) playerSelect.value = "";
      this._dispatchChange();
    });
    playerSelect.addEventListener("change", () => { this._config.player_entity = playerSelect.value; this._dispatchChange(); });

    const typeChips = this.querySelector("#ma-editor-type-chips");
    typeChips.addEventListener("click", (e) => {
      const chip = e.target.closest(".ma-editor-chip");
      if (!chip || chip.dataset.value === this._config.default_type) return;
      this._config.default_type = chip.dataset.value;
      typeChips.querySelectorAll(".ma-editor-chip").forEach(c => c.classList.toggle("active", c.dataset.value === this._config.default_type));
      this._dispatchChange();
    });
  }

  _dispatchChange() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  _escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }
}

customElements.define("ma-radio-card-editor", MaRadioCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({ type: "ma-radio-card", name: "MA Radio Card", description: "Start Music Assistant radio from any search term" });
