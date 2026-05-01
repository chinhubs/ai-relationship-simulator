/**
 * UI helpers — DOM manipulation and rendering.
 */

const RELATIONSHIP_STATUS_LABEL = {
  single:      "โสด 💚",
  dating:      "คบอยู่ 💕",
  married:     "แต่งงานแล้ว 💍",
  complicated: "ซับซ้อน 🌀",
  divorced:    "หย่าแล้ว 💔",
  widowed:     "ม่าย 🖤",
};

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
      const statusLabel = RELATIONSHIP_STATUS_LABEL[char.relationship_status] || "โสด 💚";
      const partner = char.partner_id ? characters.find(c => c.id === char.partner_id) : null;
      const partnerLine = partner
        ? `<div class="char-partner-line">❤️ กับ ${partner.nickname || partner.name}</div>`
        : "";
      card.innerHTML = `
        <span class="char-avatar">${char.avatar_emoji || (char.gender === "female" ? "👩" : char.gender === "male" ? "👨" : "👤")}</span>
        <div class="char-info">
          <div class="char-name">${char.name}${char.nickname ? ` (${char.nickname})` : ""}</div>
          <div class="char-status muted">${char.occupation || ""}</div>
          <div class="char-rel-status">${statusLabel}${partnerLine}</div>
        </div>
        <div class="char-actions">
          <button class="btn-char-action btn-edit" title="แก้ไข" data-id="${char.id}">✏️</button>
          <button class="btn-char-action btn-del"  title="ลบ"    data-id="${char.id}">🗑️</button>
        </div>
      `;
      card.addEventListener("click", (e) => {
        if (e.target.closest(".char-actions")) return;
        ui.selectCharacter(char.id, characters);
      });
      card.querySelector(".btn-edit").addEventListener("click", (e) => {
        e.stopPropagation();
        ui.showEditCharacterForm(char);
      });
      card.querySelector(".btn-del").addEventListener("click", (e) => {
        e.stopPropagation();
        ui.confirmDeleteCharacter(char);
      });
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

  renderCharacterStateInfo(state, char) {
    const panel = document.getElementById("selected-char-info");
    const relLabel = char ? (RELATIONSHIP_STATUS_LABEL[char.relationship_status] || "โสด 💚") : "";
    const partner = char?.partner_id ? (app.characters || []).find(c => c.id === char.partner_id) : null;
    const partnerRow = partner
      ? `<div class="state-row"><span class="state-label">❤️ คู่รัก</span><span class="state-val" style="color:var(--heart)">${partner.nickname || partner.name}</span></div>`
      : "";
    panel.innerHTML = `
      <div class="state-row"><span class="state-label">สถานะความรัก</span><span class="state-val rel-badge">${relLabel}</span></div>
      ${partnerRow}
      <div class="state-row"><span class="state-label">วันที่ ${state.sim_day}</span><span class="state-val">${state.current_sim_time}</span></div>
      <div class="state-row"><span class="state-label">📍</span><span class="state-val">${state.current_location}</span></div>
      <div class="state-row"><span class="state-label">💼</span><span class="state-val">${state.current_activity}</span></div>
    `;
  },

  renderRelationships(rels, characters) {
    let panel = document.getElementById("relationships-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "relationships-panel";
      document.getElementById("character-state-panel").appendChild(panel);
    }
    if (!rels || rels.length === 0) {
      panel.innerHTML = `<h2 class="panel-title" style="margin-top:10px">ความสัมพันธ์</h2><p class="muted">ยังไม่มีปฏิสัมพันธ์กับใคร</p>`;
      return;
    }
    const rows = rels.map(r => {
      const other = characters.find(c => c.id === r.other_character_id);
      const name  = other ? (other.nickname || other.name) : `#${r.other_character_id}`;
      const heart = r.closeness >= 80 ? "❤️" : r.closeness >= 60 ? "🧡" : r.closeness >= 40 ? "💛" : r.closeness >= 20 ? "🩶" : "🤍";
      const trust = Math.round(r.trust_level);
      const conflict = r.conflict_level > 30 ? `⚔️${Math.round(r.conflict_level)}` : "";
      return `
        <div class="rel-row">
          <span class="rel-name">${name}</span>
          <span class="rel-label">${r.dynamic_label}</span>
          <span class="rel-hearts">${heart} ${Math.round(r.closeness)} ${conflict}</span>
        </div>`;
    }).join("");
    panel.innerHTML = `<h2 class="panel-title" style="margin-top:10px">ความสัมพันธ์กับคนอื่น</h2>${rows}`;
  },

  showModal(html) {
    document.getElementById("modal-content").innerHTML = html;
    document.getElementById("modal-overlay").classList.remove("hidden");
  },

  closeModal() {
    document.getElementById("modal-overlay").classList.add("hidden");
  },

  showEditCharacterForm(char) {
    const others = (app.characters || []).filter(c => c.id !== char.id);
    const partnerOptions = `<option value="">— ไม่มี —</option>` +
      others.map(c => `<option value="${c.id}" ${char.partner_id===c.id?"selected":""}>${c.nickname||c.name}</option>`).join("");

    this.showModal(`
      <h2 style="color:var(--accent);margin-bottom:12px">✏️ แก้ไขตัวละคร</h2>
      <form id="form-edit-char">
        <input class="input-field" id="e-name"       value="${char.name}"                placeholder="ชื่อเต็ม" required />
        <input class="input-field" id="e-nickname"   value="${char.nickname || ""}"      placeholder="ชื่อเล่น" />
        <input class="input-field" id="e-age"        value="${char.age || ""}"           placeholder="อายุ" type="number" min="18" max="60" />
        <input class="input-field" id="e-occupation" value="${char.occupation || ""}"    placeholder="อาชีพ" />
        <select class="input-field" id="e-gender">
          <option value="unspecified" ${char.gender==="unspecified"?"selected":""}>เพศ (ไม่ระบุ)</option>
          <option value="male"        ${char.gender==="male"       ?"selected":""}>ชาย 👨</option>
          <option value="female"      ${char.gender==="female"     ?"selected":""}>หญิง 👩</option>
        </select>
        <select class="input-field" id="e-rel-status">
          <option value="single"      ${char.relationship_status==="single"     ?"selected":""}>โสด 💚</option>
          <option value="dating"      ${char.relationship_status==="dating"     ?"selected":""}>คบอยู่ 💕</option>
          <option value="married"     ${char.relationship_status==="married"    ?"selected":""}>แต่งงานแล้ว 💍</option>
          <option value="complicated" ${char.relationship_status==="complicated"?"selected":""}>ซับซ้อน 🌀</option>
          <option value="divorced"    ${char.relationship_status==="divorced"   ?"selected":""}>หย่าแล้ว 💔</option>
          <option value="widowed"     ${char.relationship_status==="widowed"    ?"selected":""}>ม่าย 🖤</option>
        </select>
        <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:2px">❤️ คู่รัก / แฟน</label>
        <select class="input-field" id="e-partner">${partnerOptions}</select>
        <input class="input-field" id="e-emoji" value="${char.avatar_emoji || ""}" placeholder="Avatar emoji เช่น 👩" maxlength="2" />
        <button type="submit" class="btn-primary btn-full" style="margin-top:8px">💾 บันทึก</button>
      </form>
    `);
    document.getElementById("form-edit-char").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const partnerVal = document.getElementById("e-partner").value;
        const payload = {
          name:                document.getElementById("e-name").value,
          nickname:            document.getElementById("e-nickname").value   || null,
          age:                 parseInt(document.getElementById("e-age").value) || null,
          occupation:          document.getElementById("e-occupation").value || null,
          gender:              document.getElementById("e-gender").value,
          relationship_status: document.getElementById("e-rel-status").value,
          avatar_emoji:        document.getElementById("e-emoji").value      || null,
        };
        if (partnerVal) {
          payload.partner_id = parseInt(partnerVal);
        } else if (char.partner_id) {
          payload.clear_partner = true;
        }
        await API.updateCharacter(char.id, payload);
        ui.closeModal();
        ui.log(`แก้ไขตัวละคร: ${char.name}`, "event");
        await app.loadCharacters();
      } catch (err) {
        ui.log(`Error: ${err.message}`, "error");
      }
    });
  },

  confirmDeleteCharacter(char) {
    const name = char.nickname || char.name;
    this.showModal(`
      <h2 style="color:var(--red);margin-bottom:12px">🗑️ ลบตัวละคร</h2>
      <p style="margin-bottom:16px">ต้องการลบ <strong>${name}</strong> ออกจากการจำลองใช่ไหม?<br>
      <span class="muted">(ข้อมูลทั้งหมดของตัวละครนี้จะถูกปิดใช้งาน)</span></p>
      <div style="display:flex;gap:8px">
        <button id="btn-confirm-del" class="btn-sim btn-red btn-full">🗑️ ลบ</button>
        <button id="btn-cancel-del"  class="btn-primary btn-full">ยกเลิก</button>
      </div>
    `);
    document.getElementById("btn-confirm-del").addEventListener("click", async () => {
      try {
        await API.deleteCharacter(char.id);
        ui.closeModal();
        ui.log(`ลบตัวละคร: ${name}`, "event");
        await app.loadCharacters();
      } catch (err) {
        ui.log(`Error: ${err.message}`, "error");
      }
    });
    document.getElementById("btn-cancel-del").addEventListener("click", () => ui.closeModal());
  },

  showAddCharacterForm() {
    this.showModal(`
      <h2 style="color:var(--accent);margin-bottom:12px">เพิ่มตัวละคร</h2>
      <form id="form-add-char">
        <input class="input-field" id="f-name" placeholder="ชื่อเต็ม" required />
        <input class="input-field" id="f-nickname" placeholder="ชื่อเล่น (ถ้ามี)" />
        <input class="input-field" id="f-age" placeholder="อายุ" type="number" min="18" max="60" />
        <input class="input-field" id="f-occupation" placeholder="อาชีพ" />
        <select class="input-field" id="f-gender">
          <option value="unspecified">เพศ (ไม่ระบุ)</option>
          <option value="male">ชาย 👨</option>
          <option value="female">หญิง 👩</option>
        </select>
        <select class="input-field" id="f-rel-status">
          <option value="single">โสด 💚</option>
          <option value="dating">คบอยู่ 💕</option>
          <option value="married">แต่งงานแล้ว 💍</option>
          <option value="complicated">ซับซ้อน 🌀</option>
          <option value="divorced">หย่าแล้ว 💔</option>
          <option value="widowed">ม่าย 🖤</option>
        </select>
        <input class="input-field" id="f-emoji" placeholder="Avatar emoji เช่น 👩" maxlength="2" />
        <button type="submit" class="btn-primary btn-full" style="margin-top:8px">สร้างตัวละคร</button>
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
          gender: document.getElementById("f-gender").value,
          relationship_status: document.getElementById("f-rel-status").value,
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
