/**
 * UI helpers — DOM manipulation and rendering.
 */

const EMOTION_CONFIG = [
  { key: "happiness",  label: "Happiness 😊",  cls: "bar-happiness" },
  { key: "stress",     label: "Stress 😰",     cls: "bar-stress" },
  { key: "anxiety",    label: "Anxiety 😟",    cls: "bar-anxiety" },
  { key: "loneliness", label: "Loneliness 😔", cls: "bar-loneliness" },
  { key: "trust",      label: "Trust 🤝",      cls: "bar-trust" },
  { key: "love",       label: "Love 💕",       cls: "bar-love" },
  { key: "resentment", label: "Resentment 😒", cls: "bar-resentment" },
  { key: "security",   label: "Security 🛡",   cls: "bar-security" },
  { key: "energy",     label: "Energy ⚡",     cls: "bar-energy" },
];

const ui = {
  log(message, type = "default") {
    const container = document.getElementById("log-entries");
    const entry = document.createElement("div");
    entry.className = `log-entry ${type}`;
    const ts = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    entry.innerHTML = `<span class="ts">${ts}</span>${message}`;
    container.prepend(entry);
    if (container.children.length > 100) container.lastChild.remove();
  },

  updateClock(text) {
    document.getElementById("sim-clock").textContent = text;
  },

  updateSimButtons(running) {
    document.getElementById("btn-start").disabled = running;
    document.getElementById("btn-pause").disabled = !running;
    document.getElementById("btn-stop").disabled = !running;
  },

  renderCharacterList(characters) {
    const container = document.getElementById("character-list");
    container.innerHTML = "";
    const eventSelect = document.getElementById("event-target");
    eventSelect.innerHTML = "";

    for (const char of characters) {
      const card = document.createElement("div");
      card.className = "char-card";
      card.dataset.id = char.id;
      card.innerHTML = `
        <span class="char-avatar">${char.avatar_emoji || "👤"}</span>
        <div class="char-info">
          <div class="char-name">${char.name}${char.nickname ? ` (${char.nickname})` : ""}</div>
          <div class="char-status muted">${char.occupation || "Unknown"}</div>
        </div>
      `;
      card.addEventListener("click", () => ui.selectCharacter(char.id, characters));
      container.appendChild(card);

      const opt = document.createElement("option");
      opt.value = char.id;
      opt.textContent = char.nickname || char.name;
      eventSelect.appendChild(opt);
    }
  },

  selectCharacter(charId, characters) {
    document.querySelectorAll(".char-card").forEach(c => c.classList.remove("selected"));
    const card = document.querySelector(`.char-card[data-id="${charId}"]`);
    if (card) card.classList.add("selected");

    sim.setActiveCharacter(charId);
    sim.refreshState();

    const char = characters.find(c => c.id === charId);
    if (char) {
      this.log(`Selected: ${char.name}`, "tick");
    }
  },

  renderEmotions(emotions) {
    const container = document.getElementById("emotion-bars");
    container.innerHTML = "";
    for (const { key, label, cls } of EMOTION_CONFIG) {
      const val = emotions[key] ?? 0;
      const row = document.createElement("div");
      row.className = "emotion-row";
      row.innerHTML = `
        <div class="emotion-label"><span>${label}</span><span>${Math.round(val)}</span></div>
        <div class="emotion-bar-bg">
          <div class="emotion-bar-fill ${cls}" style="width:${val}%"></div>
        </div>
      `;
      container.appendChild(row);
    }
  },

  renderCharacterStateInfo(state) {
    const panel = document.getElementById("selected-char-info");
    panel.innerHTML = `
      <p><strong>Status:</strong> ${state.simulation_status}</p>
      <p><strong>Day ${state.sim_day}</strong> · ${state.current_sim_time}</p>
      <p><strong>📍</strong> ${state.current_location}</p>
      <p><strong>💼</strong> ${state.current_activity}</p>
    `;
  },

  showModal(html) {
    document.getElementById("modal-content").innerHTML = html;
    document.getElementById("modal-overlay").classList.remove("hidden");
  },

  closeModal() {
    document.getElementById("modal-overlay").classList.add("hidden");
  },

  showAddCharacterForm() {
    this.showModal(`
      <h2 style="color:var(--accent);margin-bottom:12px">Add Character</h2>
      <form id="form-add-char">
        <input class="input-field" id="f-name" placeholder="Full name" required />
        <input class="input-field" id="f-nickname" placeholder="Nickname (optional)" />
        <input class="input-field" id="f-age" placeholder="Age" type="number" min="18" max="60" />
        <input class="input-field" id="f-occupation" placeholder="Occupation" />
        <input class="input-field" id="f-emoji" placeholder="Avatar emoji (e.g. 👩)" maxlength="2" />
        <button type="submit" class="btn-primary btn-full" style="margin-top:8px">Create Character</button>
      </form>
    `);
    document.getElementById("form-add-char").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const char = await API.createCharacter({
          name: document.getElementById("f-name").value,
          nickname: document.getElementById("f-nickname").value || null,
          age: parseInt(document.getElementById("f-age").value) || null,
          occupation: document.getElementById("f-occupation").value || null,
          avatar_emoji: document.getElementById("f-emoji").value || null,
        });
        ui.closeModal();
        ui.log(`Created character: ${char.name}`, "event");
        await app.loadCharacters();
      } catch (err) {
        ui.log(`Error: ${err.message}`, "error");
      }
    });
  },
};
