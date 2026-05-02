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
  _dailyLog: [], // [{simDay, simTime, charId, charName, avatar, activity, location, decision}]

  addDailyLogEntry(entry) {
    this._dailyLog.unshift(entry); // newest first
    if (this._dailyLog.length > 200) this._dailyLog.pop();
    this._renderDailyTimeline();
  },

  _renderDailyTimeline() {
    const container = document.getElementById("daily-timeline");
    if (!container) return;
    const byDay = {};
    for (const e of this._dailyLog) {
      if (!byDay[e.simDay]) byDay[e.simDay] = [];
      byDay[e.simDay].push(e);
    }
    const days = Object.keys(byDay).sort((a, b) => b - a);
    container.innerHTML = days.map(day => {
      const rows = byDay[day].map(e => `
        <div class="tl-entry">
          <span class="tl-time">${e.simTime}</span>
          <span class="tl-avatar">${e.avatar}</span>
          <span class="tl-name">${e.charName}</span>
          <span class="tl-dot">·</span>
          <span class="tl-act">${e.activity} @ ${e.location}</span>
        </div>
        ${e.decision ? `<div class="tl-decision">➤ ${e.decision}</div>` : ""}
      `).join("");
      return `<div class="tl-day-group"><div class="tl-day-header">วันที่ ${day}</div>${rows}</div>`;
    }).join("");
  },

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
      const hasPersona = char._hasPersona;
      card.innerHTML = `
        <span class="char-avatar">${char.avatar_emoji || (char.gender === "female" ? "👩" : char.gender === "male" ? "👨" : "👤")}</span>
        <div class="char-info">
          <div class="char-name">${char.name}${char.nickname ? ` (${char.nickname})` : ""}</div>
          <div class="char-status muted">${char.occupation || ""}</div>
          <div class="char-rel-status">${statusLabel}${partnerLine}</div>
        </div>
        <div class="char-actions">
          <button class="btn-char-action btn-quiz" title="ทดสอบบุคลิก" data-id="${char.id}">📋</button>
          <button class="btn-char-action btn-edit" title="แก้ไข"       data-id="${char.id}">✏️</button>
          <button class="btn-char-action btn-del"  title="ลบ"          data-id="${char.id}">🗑️</button>
        </div>
      `;
      card.addEventListener("click", (e) => {
        if (e.target.closest(".char-actions")) return;
        ui.selectCharacter(char.id, characters);
      });
      card.querySelector(".btn-quiz").addEventListener("click", (e) => {
        e.stopPropagation();
        ui.showQuestionnaireForm(char);
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
    const overlay = document.getElementById("modal-overlay");
    overlay.classList.remove("hidden");
    // Delegate likert button clicks
    overlay.addEventListener("click", (e) => {
      const btn = e.target.closest(".q-likert-btn");
      if (!btn) return;
      const group = btn.closest(".q-likert");
      group.querySelectorAll(".q-likert-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
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
        ${this._profileExtraFields("e", char.profile_extra || {})}
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
          profile_extra:       this._collectProfileExtra("e"),
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

  // ── Questionnaire ────────────────────────────────────────────────────────

  async showQuestionnaireForm(char) {
    const name = char.nickname || char.name;
    this.showModal(`
      <h2 style="color:var(--accent);margin-bottom:8px">📋 ทดสอบบุคลิกของ ${name}</h2>
      <p class="muted" style="margin-bottom:14px">เลือกระดับความละเอียด:</p>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <button id="btn-q-quick" class="btn-primary btn-full">⚡ ด่วน (10 ข้อ)</button>
        <button id="btn-q-full"  class="btn-sim btn-blue btn-full">📖 ครบ (35 ข้อ)</button>
      </div>
      <p class="muted" style="font-size:10px">AI จะวิเคราะห์บุคลิกและสร้าง Persona Profile ให้อัตโนมัติ</p>
    `);
    document.getElementById("btn-q-quick").addEventListener("click", () => this._loadQuestionnaire(char, 1));
    document.getElementById("btn-q-full").addEventListener("click",  () => this._loadQuestionnaire(char, 2));
  },

  async _loadQuestionnaire(char, level) {
    const name = char.nickname || char.name;
    document.getElementById("modal-content").innerHTML = `<p class="muted">กำลังโหลดคำถาม...</p>`;
    try {
      const data = await API.getQuestionnaire(char.id, level);
      const qs = data.questions;
      const html = qs.map((q, i) => this._renderQuestion(q, i + 1, qs.length)).join("");
      document.getElementById("modal-content").innerHTML = `
        <h2 style="color:var(--accent);margin-bottom:4px">📋 ${name}</h2>
        <p class="muted" style="margin-bottom:12px">${qs.length} คำถาม · ตอบให้ครบแล้วกด วิเคราะห์</p>
        <form id="form-questionnaire">${html}
          <button type="submit" class="btn-primary btn-full" style="margin-top:14px">🧠 วิเคราะห์บุคลิก</button>
        </form>
      `;
      document.getElementById("form-questionnaire").addEventListener("submit", async (e) => {
        e.preventDefault();
        await this._submitQuestionnaire(char, level, qs);
      });
    } catch (err) {
      ui.log(`Error loading questionnaire: ${err.message}`, "error");
      ui.closeModal();
    }
  },

  _renderQuestion(q, idx, total) {
    const label = `<div class="q-num">${idx}/${total}</div><div class="q-text">${q.thai_text || q.text}</div>`;
    let input = "";
    if (q.question_type === "likert") {
      input = `<div class="q-likert" data-qid="${q.id}">
        ${[1,2,3,4,5].map(n => `<button type="button" class="q-likert-btn" data-val="${n}">${n}</button>`).join("")}
        <div class="q-likert-labels"><span>น้อยมาก</span><span>มากมาย</span></div>
      </div>`;
    } else if (q.question_type === "forced_choice" || q.question_type === "scenario") {
      input = `<div class="q-options" data-qid="${q.id}">
        ${q.options.map((o, i) => `
          <label class="q-option">
            <input type="radio" name="q_${q.id}" value="${i}" required />
            <span>${o}</span>
          </label>`).join("")}
      </div>`;
    } else if (q.question_type === "open_ended") {
      input = `<textarea class="input-field q-open" data-qid="${q.id}" rows="2" placeholder="พิมพ์คำตอบ..." required></textarea>`;
    } else if (q.question_type === "multi_select") {
      input = `<div class="q-options" data-qid="${q.id}">
        ${q.options.map((o, i) => `
          <label class="q-option">
            <input type="checkbox" name="q_${q.id}" value="${i}" />
            <span>${o}</span>
          </label>`).join("")}
      </div>`;
    }
    return `<div class="q-block">${label}${input}</div>`;
  },

  async _submitQuestionnaire(char, level, questions) {
    const btn = document.querySelector("#form-questionnaire button[type=submit]");
    btn.disabled = true;
    btn.textContent = "⏳ AI กำลังวิเคราะห์...";

    const answers = {};
    for (const q of questions) {
      if (q.question_type === "likert") {
        const sel = document.querySelector(`.q-likert[data-qid="${q.id}"] .q-likert-btn.selected`);
        answers[q.id] = sel ? parseInt(sel.dataset.val) : 3;
      } else if (q.question_type === "forced_choice" || q.question_type === "scenario") {
        const sel = document.querySelector(`input[name="q_${q.id}"]:checked`);
        answers[q.id] = sel ? q.options[parseInt(sel.value)] : q.options[0];
      } else if (q.question_type === "open_ended") {
        const el = document.querySelector(`.q-open[data-qid="${q.id}"]`);
        answers[q.id] = el ? el.value : "";
      } else if (q.question_type === "multi_select") {
        const checked = document.querySelectorAll(`input[name="q_${q.id}"]:checked`);
        answers[q.id] = Array.from(checked).map(c => q.options[parseInt(c.value)]);
      }
    }

    try {
      await API.submitQuestionnaire(char.id, { character_id: char.id, level, answers });
      ui.closeModal();
      ui.log(`🧠 สร้าง Persona Profile ให้ ${char.nickname || char.name} สำเร็จ!`, "event");
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "🧠 วิเคราะห์บุคลิก";
      ui.log(`Error: ${err.message}`, "error");
    }
  },

  _profileExtraFields(prefix, pe = {}) {
    return `
      <div style="border-top:1px solid var(--border);margin:10px 0 6px;padding-top:8px">
        <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">โปรไฟล์เพิ่มเติม</div>
        <input  class="input-field" id="${prefix}-hometown"   value="${pe.hometown||""}"   placeholder="บ้านเกิด / จังหวัด" />
        <input  class="input-field" id="${prefix}-education"  value="${pe.education||""}"  placeholder="การศึกษา เช่น ป.ตรี วิศวะ มหิดล" />
        <select class="input-field" id="${prefix}-living">
          <option value="" ${!pe.living_situation?"selected":""}>การอยู่อาศัย (ไม่ระบุ)</option>
          <option value="อยู่คนเดียว" ${pe.living_situation==="อยู่คนเดียว"?"selected":""}>อยู่คนเดียว 🏠</option>
          <option value="อยู่กับครอบครัว" ${pe.living_situation==="อยู่กับครอบครัว"?"selected":""}>อยู่กับครอบครัว 👨‍👩‍👧</option>
          <option value="อยู่กับแฟน" ${pe.living_situation==="อยู่กับแฟน"?"selected":""}>อยู่กับแฟน 💑</option>
          <option value="อยู่หอพัก" ${pe.living_situation==="อยู่หอพัก"?"selected":""}>อยู่หอพัก 🏢</option>
          <option value="อยู่กับเพื่อน" ${pe.living_situation==="อยู่กับเพื่อน"?"selected":""}>อยู่กับเพื่อน 👯</option>
        </select>
        <textarea class="input-field" id="${prefix}-work"     rows="2" placeholder="รายละเอียดงาน: สถานที่ทำงาน, เวลาทำงาน, สไตล์การทำงาน...">${pe.work_details||""}</textarea>
        <textarea class="input-field" id="${prefix}-routine"  rows="2" placeholder="กิจวัตรประจำวัน: ตื่น ออกกำลัง ทำอะไรช่วงเช้า/เย็น/ดึก...">${pe.daily_routine||""}</textarea>
        <textarea class="input-field" id="${prefix}-hobbies"  rows="2" placeholder="งานอดิเรก / ความสนใจ: ดนตรี กีฬา ทำอาหาร ฯลฯ">${pe.hobbies||""}</textarea>
        <textarea class="input-field" id="${prefix}-leisure"  rows="2" placeholder="กิจกรรมยามว่าง: ชอบทำอะไรเพื่อผ่อนคลาย?">${pe.leisure||""}</textarea>
        <textarea class="input-field" id="${prefix}-notes"    rows="2" placeholder="หมายเหตุเพิ่มเติม: นิสัย ความเชื่อ จุดเด่น ที่ต้องรู้...">${pe.personality_notes||""}</textarea>
      </div>
    `;
  },

  _collectProfileExtra(prefix) {
    const g = id => document.getElementById(id)?.value?.trim() || null;
    return {
      hometown:          g(`${prefix}-hometown`)  || undefined,
      education:         g(`${prefix}-education`) || undefined,
      living_situation:  g(`${prefix}-living`)    || undefined,
      work_details:      g(`${prefix}-work`)      || undefined,
      daily_routine:     g(`${prefix}-routine`)   || undefined,
      hobbies:           g(`${prefix}-hobbies`)   || undefined,
      leisure:           g(`${prefix}-leisure`)   || undefined,
      personality_notes: g(`${prefix}-notes`)     || undefined,
    };
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
        ${this._profileExtraFields("f")}
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
          profile_extra: this._collectProfileExtra("f"),
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
