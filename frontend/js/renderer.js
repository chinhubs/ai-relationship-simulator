/**
 * Pixel art renderer — 8-bit style Thai neighborhood scene.
 * Draws background, location indicators, and character sprites on canvas.
 */

const LOCATIONS = {
  "home":                { x: 60,  y: 200, label: "🏠 Home",       color: "#4a9eff" },
  "home (bedroom)":      { x: 60,  y: 200, label: "🛏 Bedroom",    color: "#9b7dff" },
  "office":              { x: 400, y: 180, label: "🏢 Office",      color: "#f5c518" },
  "7-eleven":            { x: 200, y: 250, label: "🏪 7-Eleven",   color: "#e85454" },
  "near office / 7-eleven": { x: 220, y: 240, label: "🏪 7-Eleven", color: "#e85454" },
  "bts / road":          { x: 300, y: 300, label: "🚇 BTS",        color: "#27ae60" },
  "restaurant":          { x: 350, y: 260, label: "🍜 Restaurant", color: "#f39c12" },
  "cafe":                { x: 280, y: 230, label: "☕ Café",       color: "#795548" },
  "shopping mall":       { x: 450, y: 220, label: "🛍 Mall",       color: "#e91e63" },
  "park":                { x: 500, y: 300, label: "🌳 Park",       color: "#4caf78" },
  "default":             { x: 300, y: 250, label: "📍 Location",   color: "#7c6af7" },
};

function getLocationData(locationStr) {
  const lower = locationStr.toLowerCase();
  for (const [key, data] of Object.entries(LOCATIONS)) {
    if (lower.includes(key)) return data;
  }
  return LOCATIONS.default;
}

const CHAR_COLORS = ["#f76ab7", "#4a9eff", "#4caf78", "#f5c518", "#e85454"];

class Renderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.characters = [];
    this.frame = 0;
    this._animId = null;
  }

  setCharacters(chars) {
    this.characters = chars.map((c, i) => ({
      ...c,
      color: CHAR_COLORS[i % CHAR_COLORS.length],
      px: LOCATIONS.default.x + i * 40,
      py: LOCATIONS.default.y,
      targetX: LOCATIONS.default.x + i * 40,
      targetY: LOCATIONS.default.y,
      bobOffset: i * 0.5,
    }));
  }

  updateCharacterPosition(charId, locationStr) {
    const char = this.characters.find(c => c.id === charId);
    if (!char) return;
    const loc = getLocationData(locationStr);
    const idx = this.characters.indexOf(char);
    char.targetX = loc.x + idx * 24;
    char.targetY = loc.y;
  }

  start() {
    if (this._animId) return;
    const loop = () => {
      this._draw();
      this.frame++;
      this._animId = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
  }

  _draw() {
    const { ctx, canvas, frame } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this._drawBackground();
    this._drawBuildings();

    for (const char of this.characters) {
      char.px += (char.targetX - char.px) * 0.05;
      char.py += (char.targetY - char.py) * 0.05;
      this._drawCharacter(char, frame);
    }
  }

  _drawBackground() {
    const { ctx, canvas } = this;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#0a0a1e");
    gradient.addColorStop(1, "#141428");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ground
    ctx.fillStyle = "#1a1a30";
    ctx.fillRect(0, 320, canvas.width, canvas.height - 320);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    const stars = [[50,20],[120,40],[200,15],[350,30],[480,10],[560,45]];
    for (const [sx, sy] of stars) {
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  _drawBuildings() {
    const { ctx } = this;
    const buildings = [
      { x: 20,  y: 200, w: 70,  h: 120, color: "#1c1c38", label: "🏠 Home" },
      { x: 160, y: 220, w: 55,  h: 100, color: "#1c2838", label: "🏪 7-11" },
      { x: 350, y: 160, w: 100, h: 160, color: "#1c2820", label: "🏢 Office" },
      { x: 480, y: 190, w: 90,  h: 130, color: "#28201c", label: "🛍 Mall" },
    ];

    for (const b of buildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = "#2a2a50";
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      // Windows
      ctx.fillStyle = "rgba(255,240,100,0.15)";
      for (let wy = b.y + 10; wy < b.y + b.h - 20; wy += 20) {
        for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += 16) {
          ctx.fillRect(wx, wy, 8, 10);
        }
      }
    }

    // Road
    ctx.fillStyle = "#111120";
    ctx.fillRect(0, 315, this.canvas.width, 10);
    ctx.strokeStyle = "rgba(255,255,0,0.2)";
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(0, 320);
    ctx.lineTo(this.canvas.width, 320);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _drawCharacter(char, frame) {
    const { ctx } = this;
    const x = Math.round(char.px);
    const y = Math.round(char.py);
    const bob = Math.sin((frame * 0.05) + char.bobOffset) * 2;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = char.color;
    ctx.fillRect(x - 6, y - 16 + bob, 12, 16);

    // Head
    ctx.fillStyle = "#f5d5a0";
    ctx.fillRect(x - 5, y - 26 + bob, 10, 10);

    // Eyes
    ctx.fillStyle = "#111";
    ctx.fillRect(x - 3, y - 23 + bob, 2, 2);
    ctx.fillRect(x + 1, y - 23 + bob, 2, 2);

    // Name
    ctx.fillStyle = char.color;
    ctx.font = "8px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText(char.nickname || char.name, x, y - 30 + bob);
  }

  showSpeechBubble(text) {
    const bubble = document.getElementById("speech-bubble");
    bubble.textContent = text;
    bubble.classList.remove("hidden");
    clearTimeout(this._bubbleTimeout);
    this._bubbleTimeout = setTimeout(() => bubble.classList.add("hidden"), 4000);
  }
}

const renderer = new Renderer("world-canvas");
