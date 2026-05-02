/**
 * Simulation controller — manages tick loop and state sync.
 */

class SimulationController {
  constructor() {
    this.activeCharId = null;
    this.isRunning = false;
    this.autoTickInterval = null;
    this.tickIdx = 0;
    this.AUTO_TICK_MS = 8000; // 8 วิ = 1 ชั่วโมง sim
    this._clockAnim = null;
    this._loggedChars = new Set();
  }

  // ── Clock helpers ─────────────────────────────────────────────────────────

  _simTimeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  }

  _minutesToSimTime(min) {
    const h = Math.floor(min / 60) % 24;
    const m = Math.floor(min % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  _formatClockText(day, totalMin) {
    const h   = Math.floor(totalMin / 60) % 24;
    const m   = Math.floor(totalMin % 60);
    const t   = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")} น.`;
    const DOW = ["อา.","จ.","อ.","พ.","พฤ.","ศ.","ส."];
    const dow = DOW[(day - 1) % 7];
    const period = (h >= 5 && h < 12) ? "🌅 เช้า"
                 : (h >= 12 && h < 18) ? "☀️ บ่าย"
                 : (h >= 18 && h < 22) ? "🌆 เย็น"
                 : "🌙 ดึก";
    return `วันที่ ${day} · ${dow} · ${period} · ${t}`;
  }

  _startClockAnim(simDay, nextSimTime) {
    if (this._clockAnim) clearInterval(this._clockAnim);
    const startReal   = Date.now();
    const startMin    = this._simTimeToMinutes(nextSimTime);
    const simMinPerMs = 60 / this.AUTO_TICK_MS;
    this._clockAnim = setInterval(() => {
      const elapsed = Date.now() - startReal;
      let totalMin  = startMin + elapsed * simMinPerMs;
      let day       = simDay;
      if (totalMin >= 1440) { totalMin -= 1440; day++; }
      ui.updateClock(this._formatClockText(day, totalMin));
    }, 1000);
    // Show immediately without waiting 1s
    ui.updateClock(this._formatClockText(simDay, startMin));
  }

  setActiveCharacter(charId) {
    this.activeCharId = charId;
  }

  // ── World controls (affect all characters) ────────────────────────────────

  async startWorld() {
    const chars = app.characters || [];
    if (chars.length === 0) { ui.log("ยังไม่มีตัวละคร", "error"); return; }
    try {
      await Promise.all(chars.map(c => API.controlSim(c.id, "start").catch(() => {})));
      this.isRunning = true;
      ui.updateSimButtons(true);
      ui.log(`▶ โลกเริ่มทำงาน — ตัวละคร ${chars.length} คน`, "event");
      this._startWorldTick();
      if (this.activeCharId) await this.refreshState();
    } catch (e) { ui.log(`Start failed: ${e.message}`, "error"); }
  }

  async pauseWorld() {
    const chars = app.characters || [];
    await Promise.all(chars.map(c => API.controlSim(c.id, "pause").catch(() => {})));
    this.isRunning = false;
    this._stopTick();
    ui.log("⏸ หยุดชั่วคราว", "tick");
    ui.updateSimButtons(false);
  }

  async stopWorld() {
    const chars = app.characters || [];
    await Promise.all(chars.map(c => API.controlSim(c.id, "stop").catch(() => {})));
    this.isRunning = false;
    this._stopTick();
    ui.log("■ จบการจำลอง", "tick");
    ui.updateSimButtons(false);
  }

  // ── Manual single tick for active character ───────────────────────────────

  async tick() {
    const charId = this.activeCharId || (app.characters?.length > 0 ? app.characters[0].id : null);
    if (!charId) { ui.log("ยังไม่มีตัวละคร", "error"); return; }
    if (!this.activeCharId) {
      this.activeCharId = charId;
      ui.selectCharacter(charId, app.characters);
    }
    try {
      const result = await API.runTick(charId);
      this._applyTickResult(charId, result);
      await this.refreshState();
    } catch (e) {
      if (e.message?.toLowerCase().includes("not running")) {
        try {
          await API.controlSim(charId, "start");
          const result = await API.runTick(charId);
          this._applyTickResult(charId, result);
          await this.refreshState();
        } catch (e2) { ui.log(`Tick error: ${e2.message}`, "error"); }
      } else {
        ui.log(`Tick error: ${e.message}`, "error");
      }
    }
  }

  // ── Auto world tick — cycles through all characters ───────────────────────

  _startWorldTick() {
    this._stopTick();
    this.autoTickInterval = setInterval(async () => {
      if (!this.isRunning) return;
      const chars = app.characters || [];
      if (chars.length === 0) return;

      const char = chars[this.tickIdx % chars.length];
      this.tickIdx++;

      try {
        const result = await API.runTick(char.id);
        this._applyTickResult(char.id, result);
        if (char.id === this.activeCharId) await this.refreshState();
      } catch (e) {
        if (e.message && e.message.toLowerCase().includes("not running")) {
          try { await API.controlSim(char.id, "start"); } catch {}
        }
      }
    }, this.AUTO_TICK_MS);
  }

  _stopTick() {
    if (this.autoTickInterval) {
      clearInterval(this.autoTickInterval);
      this.autoTickInterval = null;
    }
    if (this._clockAnim) {
      clearInterval(this._clockAnim);
      this._clockAnim = null;
    }
  }

  _applyTickResult(charId, result) {
    const chars  = app.characters || [];
    const char   = chars.find(c => c.id === charId);
    const label  = char ? (char.nickname || char.name) : `#${charId}`;
    const avatar = char ? (char.avatar_emoji || (char.gender === "female" ? "👩" : char.gender === "male" ? "👨" : "👤")) : "👤";
    const sd     = result.sim_day;
    const st     = result.sim_time;

    this._startClockAnim(sd, result.next_sim_time);

    renderer.updateCharacterPosition(charId, result.location, result.activity);
    renderer.setSimTime(result.next_sim_time);

    ui.log(`${avatar} ${label}  ${result.activity} @ ${result.location}`, "tick", sd, st);

    ui.addDailyLogEntry({
      simDay:        sd,
      simTime:       st,
      charId,
      charName:      label,
      avatar,
      activity:      result.activity,
      location:      result.location,
      decision:      result.decision || null,
      isNotable:     !!(result.events_processed?.length || (result.action_type && ["respond_message","initiate_contact","confront","seek_comfort","vent","withdraw"].includes(result.action_type))),
      notableReason: null,
      events:        result.events_processed || [],
      actionType:    result.action_type || null,
    });

    if (result.message_to_send) {
      renderer.showSpeechBubble(result.message_to_send);
      ui.log(`  💬 "${result.message_to_send}"`, "event", sd, st);
    }
    if (result.decision) {
      ui.log(`  ➤ ${result.decision}`, "tick", sd, st);
    }
    if (result.events_processed?.length) {
      for (const ev of result.events_processed) {
        ui.log(`  ⚡ ${ev.substring(0, 80)}`, "event", sd, st);
      }
    }
  }

  // ── Load historical daily log from DB for a character (first time only) ──

  async refreshDailyLog(charId) {
    try {
      const days = await API.getDailyLog(charId);
      const chars = app.characters || [];
      const char = chars.find(c => c.id === charId);
      const label = char ? (char.nickname || char.name) : `#${charId}`;
      const avatar = char
        ? (char.avatar_emoji || (char.gender === "female" ? "👩" : char.gender === "male" ? "👨" : "👤"))
        : "👤";

      // Deduplicate: collect existing keys from _dailyLog
      const existing = new Set(
        ui._dailyLog.map(e => `${e.charId}:${e.simDay}:${e.simTime}`)
      );

      // days are newest-first; iterate reversed so oldest goes in first (unshift keeps newest first)
      const reversed = [...days].reverse();
      for (const day of reversed) {
        for (const tick of day.ticks) {
          const key = `${charId}:${day.sim_day}:${tick.sim_time}`;
          if (existing.has(key)) continue;
          existing.add(key);
          ui.addDailyLogEntry({
            simDay:        day.sim_day,
            simTime:       tick.sim_time,
            charId,
            charName:      label,
            avatar,
            activity:      tick.activity,
            location:      tick.location,
            decision:      tick.decision_made || null,
            isNotable:     tick.is_notable,
            notableReason: tick.notable_reason || null,
            events:        tick.events_processed || [],
            actionType:    tick.action_type || null,
          });
        }
      }
    } catch (e) { /* not critical — historical log is best-effort */ }
  }

  // ── State refresh for the selected character ──────────────────────────────

  async refreshState() {
    if (!this.activeCharId) return;
    try {
      const [state, rels] = await Promise.all([
        API.getState(this.activeCharId),
        API.listRelationships(this.activeCharId),
      ]);
      const char = (app.characters || []).find(c => c.id === this.activeCharId);
      ui.renderEmotions(state.emotions);
      ui.renderCharacterStateInfo(state, char);
      ui.renderRelationships(rels, app.characters || []);
    } catch (e) { /* not critical */ }

    // Load historical log on first select of this character
    if (!this._loggedChars.has(this.activeCharId)) {
      this._loggedChars.add(this.activeCharId);
      await this.refreshDailyLog(this.activeCharId);
    }
  }

  // ── Called after characters load — auto-start world if not yet running ────

  async ensureRunning() {
    if (this.isRunning || (app.characters || []).length === 0) return;
    await this.startWorld();
  }
}

const sim = new SimulationController();
