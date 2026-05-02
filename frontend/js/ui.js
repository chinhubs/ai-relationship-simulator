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

const CHAR_TYPE_CONFIG = {
  human:       { emoji: "👤", label: "บุคคลทั่วไป",     minAge: 15, maxAge: 80  },
  partner:     { emoji: "💕", label: "แฟน/คู่รัก",      minAge: 18, maxAge: 60  },
  parent:      { emoji: "👩‍👧", label: "พ่อ/แม่",         minAge: 30, maxAge: 75  },
  grandparent: { emoji: "👴", label: "ปู่/ย่า/ตา/ยาย",  minAge: 55, maxAge: 95  },
  teacher:     { emoji: "📚", label: "ครู/อาจารย์",      minAge: 25, maxAge: 65  },
  boss:        { emoji: "💼", label: "หัวหน้า",          minAge: 28, maxAge: 65  },
  coworker:    { emoji: "🏢", label: "เพื่อนร่วมงาน",   minAge: 20, maxAge: 55  },
  friend:      { emoji: "😊", label: "เพื่อน",           minAge: 10, maxAge: 70  },
  pet:         { emoji: "🐾", label: "สัตว์เลี้ยง",     minAge: 0,  maxAge: 20, isPet: true },
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

const BUILDING_ROOMS = {
  house:      [
    { label: '🛏 ห้องนอน',         kw: ['นอน','sleep','rest','bedroom','ตื่น','ฝัน','หลับ'] },
    { label: '🛋 ห้องนั่งเล่น',    kw: ['ดูทีวี','นั่งเล่น','อ่าน','ผ่อน','tv','living','relax'] },
    { label: '🚿 ห้องน้ำ',         kw: ['อาบน้ำ','ห้องน้ำ','shower','bath','แปรง'] },
    { label: '🍳 ห้องครัว',        kw: ['ทำอาหาร','กินข้าว','ทานข้าว','ครัว','cook','kitchen','eat','กิน','ทาน'] },
  ],
  office:     [
    { label: '💻 โต๊ะทำงาน',       kw: ['ทำงาน','work','email','พิมพ์','code','โค้ด','computer'] },
    { label: '📊 ห้องประชุม',      kw: ['ประชุม','meeting','present','นำเสนอ','discuss'] },
    { label: '☕ ห้องพัก',         kw: ['พัก','กาแฟ','coffee','break','lunch','กินข้าว'] },
    { label: '🏢 ล็อบบี้',         kw: ['ล็อบบี้','lobby','รอ','wait','arrive'] },
  ],
  hospital:   [
    { label: '🏥 ห้องตรวจ',        kw: ['ตรวจ','check','consult','หมอ','doctor','นพ'] },
    { label: '💊 ฉุกเฉิน',         kw: ['ฉุกเฉิน','emergency','urgent','acute'] },
    { label: '🛏 พักฟื้น',         kw: ['พัก','นอน','rest','recover','ward'] },
    { label: '⚗️ ห้องแล็บ',        kw: ['เลือด','lab','test','เอกซเรย์','xray','scan'] },
  ],
  mall:       [
    { label: '🛍 ร้านค้า',         kw: ['ซื้อ','buy','shop','เดินห้าง','ช้อปปิ้ง','เลือก'] },
    { label: '🍽 ฟู้ดคอร์ท',       kw: ['กิน','ทาน','food','court','อาหาร','eat'] },
    { label: '🎬 โรงหนัง',         kw: ['หนัง','movie','cinema','ภาพยนตร์'] },
    { label: '🧴 ซูเปอร์มาร์เก็ต', kw: ['super','market','ซุปเปอร์','ของชำ','grocery'] },
  ],
  cafe:       [
    { label: '☕ บาร์กาแฟ',        kw: ['กาแฟ','coffee','ชา','tea','สั่ง','order'] },
    { label: '🪑 โซนนั่ง',         kw: ['นั่ง','sit','ทำงาน','อ่าน','meet','study'] },
  ],
  restaurant: [
    { label: '🍜 โซนอาหาร',        kw: ['กิน','ทาน','eat','food','สั่ง','order','อาหาร'] },
    { label: '🧑‍🍳 ครัว',          kw: ['ครัว','cook','prepare','เตรียม'] },
    { label: '🏮 ห้อง VIP',        kw: ['vip','private','ส่วนตัว','จอง'] },
  ],
  gym:        [
    { label: '🏋 ยกน้ำหนัก',       kw: ['ยก','lift','weight','กล้าม','strength'] },
    { label: '🏃 ลู่วิ่ง',         kw: ['วิ่ง','run','cardio','เดิน','treadmill'] },
    { label: '🧘 โยคะ/ยืดเส้น',    kw: ['โยคะ','yoga','stretch','pilates','ยืด'] },
    { label: '🚿 ห้องอาบน้ำ',      kw: ['อาบ','shower','locker'] },
  ],
  bank:       [
    { label: '💰 เคาน์เตอร์',      kw: ['ฝาก','ถอน','โอน','deposit','withdraw','transfer'] },
    { label: '🏧 ATM',             kw: ['atm','กด','เครื่อง','machine'] },
    { label: '📋 ห้องผู้จัดการ',   kw: ['ผู้จัดการ','สินเชื่อ','loan','manager','apply'] },
  ],
  store:      [
    { label: '🛒 ร้านค้า',         kw: [] },
    { label: '🧾 แคชเชียร์',       kw: ['จ่าย','pay','ชำระ','checkout'] },
  ],
  gas:        [
    { label: '⛽ หัวจ่ายน้ำมัน',   kw: ['เติม','น้ำมัน','fuel','fill','gasoline'] },
    { label: '🏪 มินิมาร์ท',       kw: ['ซื้อ','buy','ร้าน','สะดวก'] },
  ],
  bts:        [
    { label: '🚉 ชานชาลา',         kw: ['รอ','รถไฟ','train','wait','platform'] },
    { label: '🎫 จุดตั๋ว',         kw: ['ตั๋ว','ticket','บัตร','card','top-up'] },
  ],
  park:       [
    { label: '🌳 สวนหย่อม',        kw: [] },
    { label: '🪑 ม้านั่ง',         kw: ['นั่ง','sit','พัก','rest','relax'] },
  ],
};

const ui = {
  _dailyLog: [],         // [{simDay, simTime, charId, charName, avatar, activity, location, decision, isNotable, notableReason, events, actionType}]
  _activeCharFilter: null, // null = all characters
  _followId: null,

  addDailyLogEntry(entry) {
    this._dailyLog.unshift(entry); // newest first
    if (this._dailyLog.length > 400) this._dailyLog.pop();
    this._renderDailyTimeline();
  },

  renderCharacterTabs(characters) {
    const container = document.getElementById("tl-filter-tabs");
    if (!container) return;
    const tabs = [
      { id: null, label: "ทั้งหมด", avatar: "👥" },
      ...characters.map(c => {
        const typeCfg = CHAR_TYPE_CONFIG[c.character_type] || CHAR_TYPE_CONFIG.human;
        const defaultAvatar = typeCfg.isPet ? "🐾" : (c.gender === "female" ? "👩" : c.gender === "male" ? "👨" : "👤");
        return {
          id:     c.id,
          label:  c.nickname || c.name,
          avatar: c.avatar_emoji || defaultAvatar,
        };
      }),
    ];
    container.innerHTML = tabs.map(t =>
      `<button class="tl-tab${this._activeCharFilter === t.id ? " active" : ""}" data-char="${t.id ?? ""}">${t.avatar} ${t.label}</button>`
    ).join("");
    container.querySelectorAll(".tl-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        const raw = btn.dataset.char;
        this._activeCharFilter = raw ? parseInt(raw) : null;
        container.querySelectorAll(".tl-tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this._renderDailyTimeline();
      });
    });
  },

  _renderDailyTimeline() {
    const container = document.getElementById("daily-timeline");
    if (!container) return;

    const data = this._activeCharFilter !== null
      ? this._dailyLog.filter(e => e.charId === this._activeCharFilter)
      : this._dailyLog;

    const byDay = {};
    for (const e of data) {
      if (!byDay[e.simDay]) byDay[e.simDay] = [];
      byDay[e.simDay].push(e);
    }
    const days = Object.keys(byDay).sort((a, b) => b - a);
    const DOW_FULL = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"];

    if (days.length === 0) {
      container.innerHTML = `<p class="muted" style="padding:6px 0">ยังไม่มีข้อมูล</p>`;
      return;
    }

    container.innerHTML = days.map(day => {
      const sorted = [...byDay[day]].sort((a, b) => a.simTime.localeCompare(b.simTime));
      const notableCount = sorted.filter(e => e.isNotable).length;
      const dowFull = DOW_FULL[(parseInt(day) - 1) % 7];
      const notablePill = notableCount > 0
        ? `<span class="tl-day-notable">${notableCount} เหตุการณ์</span>`
        : "";

      const rows = sorted.map(e => {
        const notableClass = e.isNotable ? " notable" : "";
        const notableBadge = e.isNotable
          ? `<span class="tl-notable-badge">${e.notableReason || "⭐"}</span>`
          : "";
        const decisionRow = (e.isNotable && e.decision)
          ? `<div class="tl-decision">➤ ${e.decision}</div>`
          : "";
        const eventsRow = (e.events && e.events.length > 0)
          ? `<div class="tl-events">⚡ ${e.events.join(" · ")}</div>`
          : "";
        return `
          <div class="tl-entry${notableClass}">
            <span class="tl-time">${e.simTime}</span>
            <span class="tl-avatar">${e.avatar}</span>
            <span class="tl-name">${e.charName}</span>
            <span class="tl-act">${e.activity}<span class="tl-loc"> @ ${e.location}</span></span>
            ${notableBadge}
          </div>
          ${decisionRow}${eventsRow}
        `;
      }).join("");

      return `<div class="tl-day-group">
        <div class="tl-day-header">วันที่ ${day} · ${dowFull} ${notablePill}</div>
        ${rows}
      </div>`;
    }).join("");
  },

  _DOW: ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."],

  _simPeriod(h) {
    if (h >= 5  && h < 12) return "🌅";
    if (h >= 12 && h < 18) return "☀️";
    if (h >= 18 && h < 22) return "🌆";
    return "🌙";
  },

  log(message, type = "default", simDay = null, simTime = null) {
    const container = document.getElementById("log-entries");
    const entry = document.createElement("div");
    entry.className = `log-entry ${type}`;
    let tsHtml;
    if (simDay != null && simTime) {
      const dow    = this._DOW[(simDay - 1) % 7];
      const h      = parseInt(simTime.split(":")[0], 10);
      const period = this._simPeriod(h);
      tsHtml = `<span class="ts sim-ts">${period}D${simDay}·${dow} ${simTime}</span>`;
    } else {
      const ts = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
      tsHtml = `<span class="ts real-ts">${ts}</span>`;
    }
    entry.innerHTML = `${tsHtml}${message}`;
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
      const typeCfg = CHAR_TYPE_CONFIG[char.character_type] || CHAR_TYPE_CONFIG.human;
      const typeBadge = char.character_type && char.character_type !== "human"
        ? `<span class="char-type-badge">${typeCfg.emoji} ${typeCfg.label}</span>`
        : "";
      const defaultAvatar = typeCfg.isPet ? "🐾" : (char.gender === "female" ? "👩" : char.gender === "male" ? "👨" : "👤");
      card.innerHTML = `
        <span class="char-avatar">${char.avatar_emoji || defaultAvatar}</span>
        <div class="char-info">
          <div class="char-name">${char.name}${char.nickname ? ` (${char.nickname})` : ""} ${typeBadge}</div>
          <div class="char-status muted">${char.occupation || ""}</div>
          <div class="char-rel-status">${typeCfg.isPet ? "" : statusLabel}${partnerLine}</div>
        </div>
        <div class="char-actions">
          <button class="btn-char-action btn-quiz"   title="ทดสอบบุคลิก" data-id="${char.id}">📋</button>
          <button class="btn-char-action btn-follow${this._followId===char.id?' following':''}" title="Follow" data-id="${char.id}">🎯</button>
          <button class="btn-char-action btn-edit"   title="แก้ไข"       data-id="${char.id}">✏️</button>
          <button class="btn-char-action btn-del"    title="ลบ"          data-id="${char.id}">🗑️</button>
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
      card.querySelector(".btn-follow").addEventListener("click", (e) => {
        e.stopPropagation();
        ui.followCharacter(char.id);
      });
      container.appendChild(card);

      const opt = document.createElement("option");
      opt.value = char.id;
      opt.textContent = char.nickname || char.name;
      eventSelect.appendChild(opt);
    }
    this.renderCharacterTabs(characters);
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

  followCharacter(charId) {
    const chars = app.characters || [];
    const char = chars.find(c => c.id === charId);
    if (!char) return;
    if (this._followId === charId) {
      // unfollow
      this._followId = null;
      renderer.unfollowCharacter();
      document.querySelectorAll('.btn-follow').forEach(b => b.classList.remove('following'));
      ui.log(`หยุด Follow`, 'tick');
    } else {
      this._followId = charId;
      renderer.followCharacter(charId);
      ui.selectCharacter(charId, chars);
      document.querySelectorAll('.btn-follow').forEach(b => {
        b.classList.toggle('following', parseInt(b.dataset.id) === charId);
      });
      ui.log(`🎯 Follow: ${char.nickname || char.name}`, 'event');
    }
  },

  _dominantEmoIcon(e) {
    if (!e) return '😐';
    if (e.stress > 72)     return '😰';
    if (e.anxiety > 68)    return '😟';
    if (e.resentment > 55) return '😠';
    if (e.loneliness > 68) return '😔';
    if (e.love > 82)       return '💕';
    if (e.happiness > 80)  return '😊';
    if (e.energy < 25)     return '🥱';
    if (e.security < 30)   return '😨';
    return '😐';
  },

  showLocationDetail(building, chars) {
    const rooms = BUILDING_ROOMS[building.type] || [{ label: '📍 ภายใน', kw: [] }];

    // Assign each character to the best matching room by activity keywords
    const buckets = rooms.map(() => []);
    for (const ch of chars) {
      const act = (ch.activity || '').toLowerCase();
      let placed = false;
      for (let ri = 1; ri < rooms.length; ri++) {
        if (rooms[ri].kw.some(k => act.includes(k))) {
          buckets[ri].push(ch); placed = true; break;
        }
      }
      if (!placed) buckets[0].push(ch);
    }

    const roomCards = rooms.map((room, ri) => {
      const occupants = buckets[ri];
      const charHtml = occupants.map(ch => {
        const emoIcon = this._dominantEmoIcon(ch.emotions);
        const name = ch.nickname || ch.name;
        const avatar = ch.avatar_emoji || (ch.character_type==='pet' ? '🐾' : (ch.gender==='female'?'👩':'👨'));
        return `<div class="room-char">
          <span class="room-char-avatar">${avatar}</span>
          <div class="room-char-info">
            <div class="room-char-name">${name} ${emoIcon}</div>
            <div class="room-char-act muted">${ch.activity}</div>
          </div>
          <button class="btn-sim btn-blue" style="padding:2px 7px;font-size:9px;min-width:0;flex-shrink:0" onclick="ui.followCharacter(${ch.id});ui.closeModal()">🎯</button>
        </div>`;
      }).join('');
      return `<div class="indoor-room${occupants.length ? ' occupied' : ''}">
        <div class="indoor-room-label">${room.label}${occupants.length ? ` <span class="room-count">${occupants.length}</span>` : ''}</div>
        ${charHtml || '<div class="muted" style="font-size:10px;padding:3px 0">ว่าง</div>'}
      </div>`;
    }).join('');

    this.showModal(`
      <h2 style="color:var(--accent);margin-bottom:4px">${building.label}</h2>
      <p class="muted" style="margin-bottom:10px;font-size:11px">ภายในสถานที่ (${chars.length} คน)</p>
      <div class="indoor-grid">${roomCards}</div>
    `);
  },

  showModal(html) {
    document.getElementById("modal-content").innerHTML = html;
    const overlay = document.getElementById("modal-overlay");
    overlay.classList.remove("hidden");
    // Delegate likert button clicks — attach once only to avoid listener accumulation
    if (!overlay._likertBound) {
      overlay._likertBound = true;
      overlay.addEventListener("click", (e) => {
        const btn = e.target.closest(".q-likert-btn");
        if (!btn) return;
        const group = btn.closest(".q-likert");
        group.querySelectorAll(".q-likert-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    }
  },

  closeModal() {
    document.getElementById("modal-overlay").classList.add("hidden");
  },

  showEditCharacterForm(char) {
    const others = (app.characters || []).filter(c => c.id !== char.id);
    const partnerOptions = `<option value="">— ไม่มี —</option>` +
      others.map(c => `<option value="${c.id}" ${char.partner_id===c.id?"selected":""}>${c.nickname||c.name}</option>`).join("");

    const charType = char.character_type || "human";
    this.showModal(`
      <h2 style="color:var(--accent);margin-bottom:12px">✏️ แก้ไขตัวละคร</h2>
      <form id="form-edit-char">
        <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:2px">ประเภทตัวละคร</label>
        <select class="input-field" id="e-char-type">${this._charTypeOptions(charType)}</select>
        <input class="input-field" id="e-name"       value="${char.name}"                placeholder="ชื่อเต็ม" required />
        <input class="input-field" id="e-nickname"   value="${char.nickname || ""}"      placeholder="ชื่อเล่น" />
        <input class="input-field" id="e-age"        value="${char.age || ""}"           placeholder="อายุ" type="number" min="0" max="95" />
        <input class="input-field" id="e-occupation" value="${char.occupation || ""}"    placeholder="อาชีพ" />
        <div id="e-gender-row"><select class="input-field" id="e-gender">
          <option value="unspecified" ${char.gender==="unspecified"?"selected":""}>เพศ (ไม่ระบุ)</option>
          <option value="male"        ${char.gender==="male"       ?"selected":""}>ชาย 👨</option>
          <option value="female"      ${char.gender==="female"     ?"selected":""}>หญิง 👩</option>
        </select></div>
        <div id="e-rel-row"><select class="input-field" id="e-rel-status">
          <option value="single"      ${char.relationship_status==="single"     ?"selected":""}>โสด 💚</option>
          <option value="dating"      ${char.relationship_status==="dating"     ?"selected":""}>คบอยู่ 💕</option>
          <option value="married"     ${char.relationship_status==="married"    ?"selected":""}>แต่งงานแล้ว 💍</option>
          <option value="complicated" ${char.relationship_status==="complicated"?"selected":""}>ซับซ้อน 🌀</option>
          <option value="divorced"    ${char.relationship_status==="divorced"   ?"selected":""}>หย่าแล้ว 💔</option>
          <option value="widowed"     ${char.relationship_status==="widowed"    ?"selected":""}>ม่าย 🖤</option>
        </select></div>
        <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:2px">❤️ คู่รัก / แฟน</label>
        <select class="input-field" id="e-partner">${partnerOptions}</select>
        <input class="input-field" id="e-emoji" value="${char.avatar_emoji || ""}" placeholder="Avatar emoji เช่น 👩 🐶" maxlength="2" />
        ${this._profileExtraFields("e", char.profile_extra || {})}
        <button type="submit" class="btn-primary btn-full" style="margin-top:8px">💾 บันทึก</button>
      </form>
    `);
    this._setupCharTypeForm("e");
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
          relationship_status: document.getElementById("e-rel-status")?.value || "single",
          avatar_emoji:        document.getElementById("e-emoji").value      || null,
          character_type:      document.getElementById("e-char-type").value,
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
    if (char.character_type === 'pet') { return this.showPetProfileForm(char); }
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

  showPetProfileForm(char) {
    const name = char.nickname || char.name;
    const pe = char.profile_extra || {};
    this.showModal(`
      <h2 style="color:var(--accent);margin-bottom:8px">🐾 โปรไฟล์สัตว์เลี้ยง: ${name}</h2>
      <p class="muted" style="margin-bottom:12px;font-size:11px">กรอกข้อมูลเกี่ยวกับ${name} เพื่อให้ AI เข้าใจบุคลิกและพฤติกรรม</p>
      <form id="form-pet-profile">
        ${this._petProfileFields('pp', pe)}
        <button type="submit" class="btn-primary btn-full" style="margin-top:8px">🐾 บันทึกโปรไฟล์</button>
      </form>
    `);
    document.getElementById('form-pet-profile').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('[type=submit]');
      btn.disabled = true; btn.textContent = '⏳ กำลังบันทึก...';
      try {
        const extra = this._collectPetExtra('pp');
        await API.updateCharacter(char.id, { profile_extra: extra });
        ui.closeModal();
        ui.log(`🐾 บันทึกโปรไฟล์ ${name} สำเร็จ`, 'event');
      } catch (err) {
        btn.disabled = false; btn.textContent = '🐾 บันทึกโปรไฟล์';
        ui.log(`Error: ${err.message}`, 'error');
      }
    });
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

  _petProfileFields(prefix, pe = {}) {
    return `
      <div style="border-top:1px solid var(--border);margin:6px 0;padding-top:8px">
        <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🐾 ข้อมูลสัตว์เลี้ยง</div>
        <input  class="input-field" id="${prefix}-breed"        value="${pe.breed||''}"       placeholder="สายพันธุ์ เช่น ไทย, เปอร์เซีย, โกลเด้น, มิกซ์" />
        <select class="input-field" id="${prefix}-pet-species">
          <option value=""              ${!pe.species?"selected":""}>ประเภทสัตว์</option>
          <option value="แมว"          ${pe.species==="แมว"?"selected":""}>🐱 แมว</option>
          <option value="หมา"          ${pe.species==="หมา"?"selected":""}>🐶 หมา</option>
          <option value="กระต่าย"      ${pe.species==="กระต่าย"?"selected":""}>🐰 กระต่าย</option>
          <option value="นก"           ${pe.species==="นก"?"selected":""}>🐦 นก</option>
          <option value="ปลา"          ${pe.species==="ปลา"?"selected":""}>🐠 ปลา</option>
          <option value="หนูแฮมสเตอร์" ${pe.species==="หนูแฮมสเตอร์"?"selected":""}>🐹 หนูแฮมสเตอร์</option>
          <option value="อื่นๆ"        ${pe.species==="อื่นๆ"?"selected":""}>🐾 อื่นๆ</option>
        </select>
        <select class="input-field" id="${prefix}-energy">
          <option value=""          ${!pe.energy_level?"selected":""}>ระดับพลังงาน</option>
          <option value="สูงมาก"    ${pe.energy_level==="สูงมาก"?"selected":""}>⚡ สูงมาก — วิ่งเล่นตลอดเวลา</option>
          <option value="สูง"       ${pe.energy_level==="สูง"?"selected":""}>🏃 สูง — ชอบออกกำลัง</option>
          <option value="ปานกลาง"   ${pe.energy_level==="ปานกลาง"?"selected":""}>🚶 ปานกลาง — สมดุล</option>
          <option value="ต่ำ"       ${pe.energy_level==="ต่ำ"?"selected":""}>🛋️ ต่ำ — ชอบนอนพัก</option>
        </select>
        <select class="input-field" id="${prefix}-temperament">
          <option value=""                        ${!pe.temperament?"selected":""}>นิสัยหลัก</option>
          <option value="ร่าเริงขี้เล่น"          ${pe.temperament==="ร่าเริงขี้เล่น"?"selected":""}>😄 ร่าเริงขี้เล่น</option>
          <option value="อ่อนโยนรักสงบ"           ${pe.temperament==="อ่อนโยนรักสงบ"?"selected":""}>😌 อ่อนโยนรักสงบ</option>
          <option value="กล้าหาญชอบผจญภัย"        ${pe.temperament==="กล้าหาญชอบผจญภัย"?"selected":""}>🦁 กล้าหาญชอบผจญภัย</option>
          <option value="ขี้กลัวระวังตัว"          ${pe.temperament==="ขี้กลัวระวังตัว"?"selected":""}>😨 ขี้กลัวระวังตัว</option>
          <option value="เจ้าอารมณ์ซน"            ${pe.temperament==="เจ้าอารมณ์ซน"?"selected":""}>😈 เจ้าอารมณ์ซน</option>
          <option value="เงียบขรึมอิสระ"           ${pe.temperament==="เงียบขรึมอิสระ"?"selected":""}>🐱 เงียบขรึมอิสระ</option>
          <option value="ชอบคนชอบสังคม"           ${pe.temperament==="ชอบคนชอบสังคม"?"selected":""}>🐶 ชอบคนชอบสังคม</option>
        </select>
        <textarea class="input-field" id="${prefix}-likes"    rows="2" placeholder="ชอบอะไร: เช่น ชอบบอลยาง, ชอบนอนตักเจ้าของ, ชอบข้าวกับปลา, ชอบวิ่งเล่นกลางแจ้ง">${pe.likes||''}</textarea>
        <textarea class="input-field" id="${prefix}-fears"    rows="2" placeholder="กลัวอะไร: เช่น กลัวเสียงดัง, กลัวคนแปลกหน้า, กลัวรถยนต์, กลัวฝนฟ้าคะนอง">${pe.fears||''}</textarea>
        <select class="input-field" id="${prefix}-training">
          <option value=""             ${!pe.training_level?"selected":""}>ระดับการฝึก</option>
          <option value="ดีมาก"        ${pe.training_level==="ดีมาก"?"selected":""}>⭐⭐⭐ ดีมาก — เชื่อฟังคำสั่ง</option>
          <option value="ปานกลาง"      ${pe.training_level==="ปานกลาง"?"selected":""}>⭐⭐ ปานกลาง — รู้บ้างไม่รู้บ้าง</option>
          <option value="ยังไม่ได้ฝึก" ${pe.training_level==="ยังไม่ได้ฝึก"?"selected":""}>⭐ ยังไม่ได้ฝึก — ทำตามใจ</option>
        </select>
        <select class="input-field" id="${prefix}-bond">
          <option value=""                          ${!pe.owner_bond?"selected":""}>ความผูกพันกับเจ้าของ</option>
          <option value="ผูกพันแนบแน่นมาก"         ${pe.owner_bond==="ผูกพันแนบแน่นมาก"?"selected":""}>❤️ ผูกพันแนบแน่นมาก</option>
          <option value="รักและไว้ใจ"               ${pe.owner_bond==="รักและไว้ใจ"?"selected":""}>🧡 รักและไว้ใจ</option>
          <option value="เป็นอิสระแต่รักกัน"        ${pe.owner_bond==="เป็นอิสระแต่รักกัน"?"selected":""}>💛 เป็นอิสระแต่รักกัน</option>
          <option value="มีระยะห่าง"                ${pe.owner_bond==="มีระยะห่าง"?"selected":""}>🤍 มีระยะห่าง</option>
        </select>
        <textarea class="input-field" id="${prefix}-pet-notes" rows="2" placeholder="พฤติกรรมพิเศษ: เช่น ชอบนอนบนหมอน, เห่าเวลามีคนมา, ชอบซุกหัวใต้ผ้าห่ม, ขโมยอาหาร">${pe.personality_notes||''}</textarea>
      </div>
    `;
  },

  _collectPetExtra(prefix) {
    const g = id => document.getElementById(id)?.value?.trim() || null;
    return {
      breed:             g(`${prefix}-breed`)        || undefined,
      species:           g(`${prefix}-pet-species`)  || undefined,
      energy_level:      g(`${prefix}-energy`)       || undefined,
      temperament:       g(`${prefix}-temperament`)  || undefined,
      likes:             g(`${prefix}-likes`)        || undefined,
      fears:             g(`${prefix}-fears`)        || undefined,
      training_level:    g(`${prefix}-training`)     || undefined,
      owner_bond:        g(`${prefix}-bond`)         || undefined,
      personality_notes: g(`${prefix}-pet-notes`)    || undefined,
    };
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

  _charTypeOptions(selected = "human") {
    return Object.entries(CHAR_TYPE_CONFIG).map(([k, v]) =>
      `<option value="${k}" ${selected === k ? "selected" : ""}>${v.emoji} ${v.label}</option>`
    ).join("");
  },

  _setupCharTypeForm(prefix) {
    const typeEl = document.getElementById(`${prefix}-char-type`);
    if (!typeEl) return;
    const apply = () => {
      const cfg = CHAR_TYPE_CONFIG[typeEl.value] || CHAR_TYPE_CONFIG.human;
      const ageEl = document.getElementById(`${prefix}-age`);
      if (ageEl) { ageEl.min = cfg.minAge; ageEl.max = cfg.maxAge; ageEl.placeholder = cfg.isPet ? "อายุ (ปี)" : `อายุ (${cfg.minAge}–${cfg.maxAge})`; }
      const occEl = document.getElementById(`${prefix}-occupation`);
      if (occEl) occEl.placeholder = cfg.isPet ? "ประเภท/สายพันธุ์ เช่น หมาไทย, แมวเปอร์เซีย" : "อาชีพ";
      const relRow = document.getElementById(`${prefix}-rel-row`);
      if (relRow) relRow.style.display = cfg.isPet ? "none" : "";
      const genderRow = document.getElementById(`${prefix}-gender-row`);
      if (genderRow) genderRow.innerHTML = cfg.isPet
        ? `<select class="input-field" id="${prefix}-gender"><option value="male">เพศผู้ ♂</option><option value="female">เพศเมีย ♀</option><option value="unspecified">ไม่ทราบเพศ</option></select>`
        : `<select class="input-field" id="${prefix}-gender"><option value="unspecified">เพศ (ไม่ระบุ)</option><option value="male">ชาย 👨</option><option value="female">หญิง 👩</option></select>`;
    };
    typeEl.addEventListener("change", apply);
    apply();
  },

  showAddCharacterForm() {
    this.showModal(`
      <h2 style="color:var(--accent);margin-bottom:12px">เพิ่มตัวละคร</h2>
      <form id="form-add-char">
        <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:2px">ประเภทตัวละคร</label>
        <select class="input-field" id="f-char-type">${this._charTypeOptions("human")}</select>
        <input class="input-field" id="f-name" placeholder="ชื่อเต็ม" required />
        <input class="input-field" id="f-nickname" placeholder="ชื่อเล่น (ถ้ามี)" />
        <input class="input-field" id="f-age" placeholder="อายุ (15–80)" type="number" min="15" max="80" />
        <input class="input-field" id="f-occupation" placeholder="อาชีพ" />
        <div id="f-gender-row"><select class="input-field" id="f-gender">
          <option value="unspecified">เพศ (ไม่ระบุ)</option>
          <option value="male">ชาย 👨</option>
          <option value="female">หญิง 👩</option>
        </select></div>
        <div id="f-rel-row"><select class="input-field" id="f-rel-status">
          <option value="single">โสด 💚</option>
          <option value="dating">คบอยู่ 💕</option>
          <option value="married">แต่งงานแล้ว 💍</option>
          <option value="complicated">ซับซ้อน 🌀</option>
          <option value="divorced">หย่าแล้ว 💔</option>
          <option value="widowed">ม่าย 🖤</option>
        </select></div>
        <input class="input-field" id="f-emoji" placeholder="Avatar emoji เช่น 👩 🐶" maxlength="2" />
        ${this._profileExtraFields("f")}
        <button type="submit" class="btn-primary btn-full" style="margin-top:8px">สร้างตัวละคร</button>
      </form>
    `);
    this._setupCharTypeForm("f");
    document.getElementById("form-add-char").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const char = await API.createCharacter({
          name:                document.getElementById("f-name").value,
          nickname:            document.getElementById("f-nickname").value || null,
          age:                 parseInt(document.getElementById("f-age").value) || null,
          occupation:          document.getElementById("f-occupation").value || null,
          gender:              document.getElementById("f-gender").value,
          relationship_status: document.getElementById("f-rel-status")?.value || "single",
          avatar_emoji:        document.getElementById("f-emoji").value || null,
          character_type:      document.getElementById("f-char-type").value,
          profile_extra:       this._collectProfileExtra("f"),
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
