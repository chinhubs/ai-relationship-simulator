/**
 * Simulation controller — manages tick loop and state sync.
 */

class SimulationController {
  constructor() {
    this.activeCharId = null;
    this.relatedCharId = null;
    this.isRunning = false;
    this.autoTickInterval = null;
    this.AUTO_TICK_MS = 5000;
  }

  setActiveCharacter(charId) {
    this.activeCharId = charId;
  }

  setRelatedCharacter(charId) {
    this.relatedCharId = charId;
  }

  async start() {
    if (!this.activeCharId) { ui.log("Select a character first", "error"); return; }
    try {
      const res = await API.controlSim(this.activeCharId, "start");
      this.isRunning = true;
      ui.log(`Simulation started — Day ${res.sim_day} ${res.sim_time}`, "event");
      ui.updateSimButtons(true);
      await this.refreshState();
    } catch (e) { ui.log(`Start failed: ${e.message}`, "error"); }
  }

  async pause() {
    if (!this.activeCharId) return;
    try {
      await API.controlSim(this.activeCharId, "pause");
      this.isRunning = false;
      this._stopAutoTick();
      ui.log("Simulation paused", "tick");
      ui.updateSimButtons(false);
    } catch (e) { ui.log(`Pause failed: ${e.message}`, "error"); }
  }

  async stop() {
    if (!this.activeCharId) return;
    try {
      await API.controlSim(this.activeCharId, "stop");
      this.isRunning = false;
      this._stopAutoTick();
      ui.log("Simulation stopped", "tick");
      ui.updateSimButtons(false);
    } catch (e) { ui.log(`Stop failed: ${e.message}`, "error"); }
  }

  async tick() {
    if (!this.activeCharId) { ui.log("Select a character first", "error"); return; }
    try {
      const result = await API.runTick(this.activeCharId, this.relatedCharId);
      this._handleTickResult(result);
      await this.refreshState();
      return result;
    } catch (e) {
      ui.log(`Tick error: ${e.message}`, "error");
      throw e;
    }
  }

  _handleTickResult(result) {
    const time = `Day ${result.sim_day} ${result.sim_time}`;
    ui.updateClock(time);
    ui.log(`[${time}] ${result.activity} @ ${result.location}`, "tick");

    if (result.decision) {
      ui.log(`  ➤ ${result.decision}`, "tick");
    }
    if (result.message_to_send) {
      renderer.showSpeechBubble(result.message_to_send);
      ui.log(`  💬 "${result.message_to_send}"`, "event");
    }
    if (result.events_processed?.length) {
      for (const ev of result.events_processed) {
        ui.log(`  ⚡ EVENT: ${ev.substring(0, 80)}`, "event");
      }
    }

    renderer.updateCharacterPosition(this.activeCharId, result.location);
    renderer.setSimTime(result.next_sim_time);
  }

  startAutoTick() {
    this._stopAutoTick();
    this.autoTickInterval = setInterval(async () => {
      if (this.isRunning) {
        try { await this.tick(); }
        catch (e) { this._stopAutoTick(); }
      }
    }, this.AUTO_TICK_MS);
  }

  _stopAutoTick() {
    if (this.autoTickInterval) {
      clearInterval(this.autoTickInterval);
      this.autoTickInterval = null;
    }
  }

  async refreshState() {
    if (!this.activeCharId) return;
    try {
      const state = await API.getState(this.activeCharId);
      ui.renderEmotions(state.emotions);
      ui.renderCharacterStateInfo(state);
    } catch (e) { /* state panel not critical */ }
  }
}

const sim = new SimulationController();
