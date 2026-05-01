/**
 * App entry point — wires everything together.
 */

const app = {
  characters: [],

  async init() {
    renderer.start();
    this.bindButtons();
    await this.loadCharacters();
    ui.log("AI Relationship Simulator ready", "event");
  },

  async loadCharacters() {
    try {
      this.characters = await API.listCharacters();
      ui.renderCharacterList(this.characters);
      renderer.setCharacters(this.characters);
    } catch (e) {
      ui.log(`Failed to load characters: ${e.message}`, "error");
    }
  },

  bindButtons() {
    document.getElementById("btn-start").addEventListener("click", () => sim.start());
    document.getElementById("btn-pause").addEventListener("click", () => sim.pause());
    document.getElementById("btn-stop").addEventListener("click",  () => sim.stop());
    document.getElementById("btn-tick").addEventListener("click",  () => sim.tick());
    document.getElementById("btn-add-character").addEventListener("click", () => ui.showAddCharacterForm());
    document.getElementById("modal-close").addEventListener("click", () => ui.closeModal());

    document.getElementById("event-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const targetId = parseInt(document.getElementById("event-target").value);
      if (!targetId) { ui.log("Select a target character", "error"); return; }
      try {
        const event = await API.injectEvent({
          target_character_id: targetId,
          event_type: document.getElementById("event-type").value,
          category: document.getElementById("event-type").value,
          title: document.getElementById("event-title").value,
          description: document.getElementById("event-description").value,
          severity: document.getElementById("event-severity").value,
        });
        ui.log(`Event injected: "${event.title}" → ${event.severity}`, "event");
        document.getElementById("event-title").value = "";
        document.getElementById("event-description").value = "";
      } catch (err) {
        ui.log(`Event injection failed: ${err.message}`, "error");
      }
    });
  },
};

document.addEventListener("DOMContentLoaded", () => app.init());
