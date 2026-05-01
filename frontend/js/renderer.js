/**
 * Thai Neighborhood Renderer — outdoor + indoor dollhouse scenes.
 */

// ── Location → outdoor coordinates ──────────────────────────────────────────
const LOCATIONS = {
  "home":                    { x: 330, y: 345 },
  "home (bedroom)":          { x: 330, y: 345 },
  "home (living room)":      { x: 310, y: 345 },
  "office":                  { x: 650, y: 345 },
  "7-eleven":                { x: 100, y: 345 },
  "convenience store":       { x: 100, y: 345 },
  "near office / 7-eleven":  { x: 100, y: 345 },
  "bts / road":              { x: 430, y: 395 },
  "road":                    { x: 430, y: 395 },
  "restaurant":              { x: 500, y: 345 },
  "cafe":                    { x: 420, y: 345 },
  "shopping mall":           { x: 720, y: 345 },
  "mall":                    { x: 720, y: 345 },
  "park":                    { x: 220, y: 345 },
  "hospital":                { x: 620, y: 345 },
  "gym":                     { x: 560, y: 345 },
  "default":                 { x: 400, y: 345 },
};

// ── Indoor room center positions (character feet) ────────────────────────────
const INDOOR_POS = {
  bedroom:  { x: 239, y: 312 },
  bathroom: { x: 327, y: 312 },
  living:   { x: 415, y: 312 },
  kitchen:  { x: 503, y: 312 },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function isIndoorHome(loc) {
  const l = (loc || "").toLowerCase();
  return l.includes("home") || l.includes("บ้าน") ||
         l.includes("ห้องนอน") || l.includes("ห้องน้ำ") ||
         l.includes("ห้องครัว") || l.includes("นั่งเล่น");
}

function getIndoorRoom(loc, actType) {
  const l = (loc || "").toLowerCase();
  if (l.includes("bedroom") || l.includes("ห้องนอน"))   return "bedroom";
  if (l.includes("bathroom") || l.includes("ห้องน้ำ"))  return "bathroom";
  if (l.includes("kitchen")  || l.includes("ครัว"))     return "kitchen";
  if (l.includes("living")   || l.includes("นั่งเล่น")) return "living";
  if (actType === "sleep")                               return "bedroom";
  if (actType === "shower")                              return "bathroom";
  if (actType === "eat")                                 return "kitchen";
  return "living";
}

function getActivityType(activity, isMoving) {
  if (isMoving) return "walk";
  const a = (activity || "").toLowerCase();
  if (/นอน|หลับ|sleep|rest/.test(a))                    return "sleep";
  if (/อาบน้ำ|shower|แปรง|freshen|bath/.test(a))        return "shower";
  if (/กิน|ทาน|อาหาร|eat|drink|ดื่ม|cook|ทำอาหาร/.test(a)) return "eat";
  if (/โทร|phone|call|line|chat/.test(a))               return "phone";
  if (/ทำงาน|work|คอม|พิมพ์|type|office/.test(a))       return "work";
  if (/ดูทีวี|ดู|watch|netflix|series/.test(a))         return "watch";
  if (/วิ่ง|ออกกำลัง|exercise|run|yoga/.test(a))        return "run";
  return "idle";
}

function getLocationData(str) {
  const lower = (str || "").toLowerCase();
  for (const [key, data] of Object.entries(LOCATIONS)) {
    if (lower.includes(key)) return data;
  }
  return LOCATIONS.default;
}

const CHAR_SHIRTS = ["#4a9eff","#f76ab7","#4caf78","#f5c518","#e85454","#9b7dff","#ff9944"];
const CHAR_PANTS  = ["#2c3e50","#5d4e37","#1a4a2e","#4a3728","#3d1515","#2d1b5e","#3d3020"];
const CHAR_HAIR   = ["#1a1008","#2d1a08","#8b4513","#0a0a18","#1e0808","#0a0a0a","#3d2008"];
const CHAR_SKIN   = ["#f5d0a0","#e8b880","#f0c890","#fad8a8","#e0b070","#f5d8b0","#ebb878"];

// ── Renderer ─────────────────────────────────────────────────────────────────
class Renderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext("2d");
    this.characters = [];
    this.frame  = 0;
    this._animId = null;
    this.simTime = "08:00";
  }

  setCharacters(chars) {
    const prev = new Map(this.characters.map(c => [c.id, c]));
    this.characters = chars.map((c, i) => {
      const p = prev.get(c.id);
      return {
        ...c,
        shirtColor:      CHAR_SHIRTS[i % CHAR_SHIRTS.length],
        pantsColor:      CHAR_PANTS [i % CHAR_PANTS.length],
        hairColor:       CHAR_HAIR  [i % CHAR_HAIR.length],
        skinColor:       CHAR_SKIN  [i % CHAR_SKIN.length],
        px:              p ? p.px : 300 + i * 55,
        py:              p ? p.py : 345,
        targetX:         p ? p.targetX : 300 + i * 55,
        targetY:         p ? p.targetY : 345,
        bobOffset:       i * 0.9,
        isFemale:        c.gender === "female",
        currentActivity: p ? p.currentActivity : "sleeping",
        locationStr:     p ? p.locationStr : "home",
        isIndoor:        p ? p.isIndoor : false,
        facingRight:     p ? p.facingRight : true,
      };
    });
  }

  updateCharacterPosition(charId, locationStr, activity) {
    const char = this.characters.find(c => c.id === charId);
    if (!char) return;
    if (activity) char.currentActivity = activity;
    char.locationStr = locationStr;

    if (isIndoorHome(locationStr)) {
      char.isIndoor = true;
      const actType = getActivityType(activity, false);
      const room    = getIndoorRoom(locationStr, actType);
      const pos     = INDOOR_POS[room];
      const idx     = this.characters.indexOf(char);
      // Stagger if multiple chars in same room
      const sameRoom = this.characters.filter(c =>
        c.isIndoor && getIndoorRoom(c.locationStr, getActivityType(c.currentActivity, false)) === room
      ).length;
      char.targetX = pos.x + (sameRoom > 1 ? (idx === 0 ? -16 : 16) : 0);
      char.targetY = pos.y;
    } else {
      char.isIndoor = false;
      const loc  = getLocationData(locationStr);
      const idx  = this.characters.indexOf(char);
      const newX = loc.x + idx * 38 - (this.characters.length - 1) * 19;
      if (Math.abs(newX - char.px) > 10) char.facingRight = newX > char.px;
      char.targetX = newX;
      char.targetY = loc.y;
    }
  }

  setSimTime(t) { this.simTime = t || "08:00"; }
  _hour() { return parseInt((this.simTime || "08:00").split(":")[0]); }

  start() {
    if (this._animId) return;
    const loop = () => { this._draw(); this.frame++; this._animId = requestAnimationFrame(loop); };
    loop();
  }
  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
  }

  // ── Main draw ────────────────────────────────────────────────────────────
  _draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const h = this._hour();
    this._drawSky(h);
    this._drawBackgroundTrees();
    this._drawGround();
    this._drawBuildings();

    const anyIndoor = this.characters.some(c => c.isIndoor);
    if (anyIndoor) this._drawIndoorPanel();

    this._drawForeground();

    for (const c of [...this.characters].sort((a, b) => a.py - b.py)) {
      const prevX = c.px;
      c.px += (c.targetX - c.px) * 0.05;
      c.py += (c.targetY - c.py) * 0.05;
      const isMoving = Math.abs(c.targetX - c.px) > 6;
      if (isMoving && c.px !== prevX) c.facingRight = c.targetX > c.px;
      const actType = getActivityType(c.currentActivity, isMoving);
      this._drawCharacter(c, actType);
    }
  }

  // ── Sky ──────────────────────────────────────────────────────────────────
  _drawSky(h) {
    const { ctx, canvas } = this;
    let t, b;
    if      (h >= 6  && h < 9)  { t = "#ff9955"; b = "#ffd080"; }
    else if (h >= 9  && h < 17) { t = "#5ba8d4"; b = "#a8d8f0"; }
    else if (h >= 17 && h < 20) { t = "#b03020"; b = "#f09020"; }
    else                         { t = "#08081a"; b = "#181838"; }
    const g = ctx.createLinearGradient(0, 0, 0, 215);
    g.addColorStop(0, t); g.addColorStop(1, b);
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, 215);
    if (h >= 6 && h < 19) {
      const p = (h - 6) / 13, sx = 60 + p * (canvas.width - 120), sy = 55 - Math.sin(p * Math.PI) * 30;
      ctx.fillStyle = "rgba(255,220,0,0.25)"; ctx.beginPath(); ctx.arc(sx, sy, 30, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#FFD700";              ctx.beginPath(); ctx.arc(sx, sy, 18, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle = "#fffde7"; ctx.beginPath(); ctx.arc(120, 50, 13, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      [[60,20],[230,15],[400,28],[570,12],[720,35],[780,50],[160,48]].forEach(([x,y])=>ctx.fillRect(x,y,2,2));
    }
    if (h >= 6 && h < 20) {
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      const off = (this.frame * 0.12) % canvas.width;
      [[140,50,80,28],[370,38,100,32],[630,58,65,24]].forEach(([cx,cy,w,ht])=>
        this._cloud(ctx, (cx + off) % canvas.width - 50, cy, w, ht));
    }
  }

  _cloud(ctx, x, y, w, h) {
    [[0.5,0.5,0.5,0.4],[0.28,0.55,0.32,0.52],[0.72,0.55,0.28,0.46]].forEach(([rx,ry,rw,rh])=>{
      ctx.beginPath(); ctx.ellipse(x+w*rx, y+h*ry, w*rw, h*rh, 0, 0, Math.PI*2); ctx.fill();
    });
  }

  _drawBackgroundTrees() {
    const { ctx } = this;
    [[0,215,45,80,"#1e3d12"],[50,215,35,65,"#2a4f18"],[740,215,48,85,"#1e3d12"],[775,215,36,68,"#2a4f18"]].forEach(([x,y,w,h,c])=>{
      ctx.fillStyle = c; ctx.fillRect(x, y-h, w, h);
    });
  }

  _drawGround() {
    const { ctx, canvas, frame } = this;
    ctx.fillStyle = "#6ab568"; ctx.fillRect(0, 210, canvas.width, 115);
    ctx.fillStyle = "#5ca05a"; ctx.fillRect(0, 240, canvas.width, 6);
    ctx.fillStyle = "#d4c4a8"; ctx.fillRect(0, 318, canvas.width, 68);
    ctx.strokeStyle = "#bfad90"; ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += 40) { ctx.beginPath(); ctx.moveTo(x,318); ctx.lineTo(x,386); ctx.stroke(); }
    for (let y = 318; y < 386; y += 32)         { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
    ctx.fillStyle = "#7a7464"; ctx.fillRect(0, 386, canvas.width, 55);
    ctx.strokeStyle = "#f0e040"; ctx.lineWidth = 2; ctx.setLineDash([22,14]);
    ctx.beginPath(); ctx.moveTo(0,413); ctx.lineTo(canvas.width,413); ctx.stroke();
    ctx.setLineDash([]);
    const wg = ctx.createLinearGradient(0,441,0,canvas.height);
    wg.addColorStop(0,"#4a8fc0"); wg.addColorStop(1,"#3a6f99");
    ctx.fillStyle = wg; ctx.fillRect(0,441,canvas.width,canvas.height-441);
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
    for (let x = 40; x < canvas.width; x += 90) {
      const ry = 452 + Math.sin(frame*0.03+x*0.05)*2;
      ctx.beginPath(); ctx.ellipse(x,ry,22,3,0,0,Math.PI*2); ctx.stroke();
    }
  }

  _drawBuildings() {
    this._draw7Eleven(22, 218);
    this._drawThaiHouse(192, 148);
    this._drawOfficeBuilding(568, 212);
    this._drawTree(175, 316); this._drawTree(548, 312); this._drawTree(768, 318);
    this._drawBush(150, 322); this._drawBush(520, 318);
  }

  _draw7Eleven(x, y) {
    const { ctx } = this;
    const W = 145, H = 112;
    ctx.fillStyle="#f0ece0"; ctx.fillRect(x,y+22,W,H);
    ctx.fillStyle="#1a6e2e"; ctx.fillRect(x,y,W,26);
    ctx.fillStyle="#cc2828"; ctx.fillRect(x+28,y,26,26);
    ctx.fillStyle="#fff"; ctx.font="bold 18px 'Courier New'"; ctx.textAlign="center";
    ctx.fillText("7",x+41,y+20);
    ctx.fillStyle="#cc2828"; ctx.font="bold 7px 'Courier New'"; ctx.fillText("ELEVEN",x+95,y+15);
    ctx.fillStyle="#f5a020"; ctx.fillRect(x,y+26,W,8);
    [[x+44,62],[x+68,62]].forEach(([dx,dy])=>{
      ctx.fillStyle="#c8e8f8"; ctx.fillRect(dx,y+dy,22,42);
      ctx.strokeStyle="#88b0c0"; ctx.lineWidth=1; ctx.strokeRect(dx,y+dy,22,42);
    });
    ctx.fillStyle="#888"; ctx.fillRect(x+64,y+82,3,7); ctx.fillRect(x+69,y+82,3,7);
    [[x+8,50,28,32],[x+98,50,28,32]].forEach(([wx,wy,ww,wh])=>{
      ctx.fillStyle="#c8e8f8"; ctx.fillRect(wx,y+wy,ww,wh);
      ctx.strokeStyle="#88b0c0"; ctx.lineWidth=0.5; ctx.strokeRect(wx,y+wy,ww,wh);
    });
    ctx.fillStyle="#2c5282"; ctx.fillRect(x+W-1,y+42,18,42);
    ctx.fillStyle="#4a7cc8"; ctx.fillRect(x+W+1,y+50,13,13);
    ctx.fillStyle="#e03030"; ctx.fillRect(x-20,y+42,17,52);
    ctx.fillStyle="#fff"; ctx.fillRect(x-17,y+50,10,22);
    ctx.fillStyle="#d4c4a0"; ctx.fillRect(x+36,y+H+18,72,8);
    ctx.fillStyle="#c8b890"; ctx.fillRect(x+40,y+H+13,64,8);
  }

  _drawThaiHouse(x, y) {
    const { ctx } = this;
    const W = 358, H = 170;
    // Garden / base
    ctx.fillStyle="#5a8c40"; ctx.fillRect(x-10, y+H, W+20, 50);
    // Roof
    ctx.fillStyle="#5c3d1e";
    ctx.beginPath(); ctx.moveTo(x-8,y+14); ctx.lineTo(x+W/2,y-18); ctx.lineTo(x+W+8,y+14); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#3d280e"; ctx.fillRect(x-8, y+14, W+16, 8);
    // Chimney
    ctx.fillStyle="#4a3020"; ctx.fillRect(x+W-60,y-10,12,14);
    // Side wall depth
    ctx.fillStyle="#dcd5c0"; ctx.fillRect(x+W, y+20, 14, H-10);
    // Front wall (will be mostly covered by indoor panel or windows)
    ctx.fillStyle="#f8f4ea"; ctx.fillRect(x, y+22, W, H-22);
    // Fence
    ctx.fillStyle="#f0e8d0";
    for (let fx = x-10; fx < x+W+12; fx += 13) { ctx.fillRect(fx, y+H+4, 7, 20); }
    ctx.fillRect(x-10, y+H+8, W+22, 4);
    // Flowers
    [[x-5,"#e85454"],[x+W-10,"#f76ab7"],[x+W+5,"#f5c518"]].forEach(([fx,fc])=>{
      ctx.fillStyle="#4a8c3a"; ctx.fillRect(fx+3, y+H+10, 2, 14);
      ctx.fillStyle=fc; ctx.beginPath(); ctx.arc(fx+4, y+H+8, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle="#fff176"; ctx.beginPath(); ctx.arc(fx+4, y+H+8, 2, 0, Math.PI*2); ctx.fill();
    });
    // Door
    ctx.fillStyle="#8b5e3c"; ctx.fillRect(x+W/2-16, y+H-50, 32, 50);
    ctx.fillStyle="#6b4425"; ctx.fillRect(x+W/2-14, y+H-48, 12, 24); ctx.fillRect(x+W/2+2, y+H-48, 12, 24);
    ctx.fillStyle="#f5c518"; ctx.beginPath(); ctx.arc(x+W/2+12, y+H-28, 3, 0, Math.PI*2); ctx.fill();
    // Garden sign
    ctx.fillStyle="#8b6b45"; ctx.fillRect(x+6, y+H+4, 4, 20);
    ctx.fillStyle="#f5efe0"; ctx.fillRect(x-8, y+H+2, 34, 14);
    ctx.strokeStyle="#c4a882"; ctx.lineWidth=1; ctx.strokeRect(x-8, y+H+2, 34, 14);
    ctx.fillStyle="#5c3d1e"; ctx.font="5px 'Courier New'"; ctx.textAlign="center";
    ctx.fillText("หมู่บ้าน",x+9, y+H+9); ctx.fillText("ชวนชื่น",x+9, y+H+15);
  }

  _drawOfficeBuilding(x, y) {
    const { ctx } = this;
    const W = 175, H = 112;
    ctx.fillStyle="#e8e0d0"; ctx.fillRect(x,y,W,H);
    ctx.fillStyle="#c8a888"; ctx.fillRect(x-6,y-10,W+12,14);
    ctx.fillStyle="#a8d4e8";
    for (let wy=y+18; wy<y+H-22; wy+=24)
      for (let wx=x+14; wx<x+W-14; wx+=30) {
        ctx.fillRect(wx,wy,20,15); ctx.strokeStyle="#88afc4"; ctx.lineWidth=0.5; ctx.strokeRect(wx,wy,20,15);
      }
    ctx.fillStyle="#4a7c90"; ctx.fillRect(x+65,y+78,44,34);
    ctx.fillStyle="#2c4a6e"; ctx.fillRect(x+18,y+6,W-36,15);
    ctx.fillStyle="#fff"; ctx.font="6px 'Courier New'"; ctx.textAlign="center";
    ctx.fillText("OFFICE BUILDING",x+W/2,y+16);
  }

  _drawTree(x, y) {
    const { ctx } = this;
    ctx.fillStyle="#6b4423"; ctx.fillRect(x-5,y-42,10,42);
    [[28,"#2a5e18"],[22,"#388028"],[17,"#48a035"]].forEach(([r,c],i)=>{
      ctx.fillStyle=c; ctx.beginPath(); ctx.arc(x+(i-1)*5,y-55-i*8,r,0,Math.PI*2); ctx.fill();
    });
  }

  _drawBush(x, y) {
    const { ctx } = this;
    [[0,0,13,"#3a7828"],[-8,3,10,"#4a9835"],[8,3,10,"#4a9835"]].forEach(([dx,dy,r,c])=>{
      ctx.fillStyle=c; ctx.beginPath(); ctx.arc(x+dx,y+dy,r,0,Math.PI*2); ctx.fill();
    });
  }

  _drawForeground() {
    this._drawCar(this.ctx, 680, 358);
    this._drawMailbox(this.ctx, 560, 348);
  }

  _drawCar(ctx, x, y) {
    ctx.fillStyle="#8898a8"; ctx.fillRect(x,y,72,22);
    ctx.fillStyle="#6a7a8a"; ctx.fillRect(x+10,y-15,48,17);
    ctx.fillStyle="#b8d8e8"; ctx.fillRect(x+13,y-13,20,13); ctx.fillRect(x+34,y-13,20,13);
    ctx.fillStyle="#1a1a1a";
    ctx.beginPath(); ctx.arc(x+16,y+22,8,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+56,y+22,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#555";
    ctx.beginPath(); ctx.arc(x+16,y+22,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+56,y+22,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#ffe870"; ctx.fillRect(x,y+5,5,8); ctx.fillRect(x+67,y+5,5,8);
  }

  _drawMailbox(ctx, x, y) {
    ctx.fillStyle="#e04040"; ctx.fillRect(x-3,y,6,30);
    ctx.fillStyle="#cc2828"; ctx.fillRect(x-11,y-9,22,15);
    ctx.fillStyle="#aa1818"; ctx.beginPath(); ctx.ellipse(x,y-9,11,4,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#fff"; ctx.font="5px 'Courier New'"; ctx.textAlign="center";
    ctx.fillText("ไปรษณีย์",x,y-3);
  }

  // ── Indoor Panel (dollhouse cross-section) ───────────────────────────────
  _drawIndoorPanel() {
    const { ctx, frame } = this;
    const PX=192, PY=162, PW=358, PH=156;

    // Panel background
    ctx.fillStyle = "#f5ede0"; ctx.fillRect(PX, PY, PW, PH);

    // Room floors (different colors per room)
    const floors = [
      [PX,    PY, 88, "#c8a870", "#b89050"],  // bedroom wood
      [PX+88, PY, 88, "#d8eaf0", "#b8d0dc"],  // bathroom tile
      [PX+176,PY, 88, "#e0d8c0", "#c8c0a8"],  // living beige
      [PX+264,PY, 88, "#d8c898", "#c0b080"],  // kitchen tile
    ];
    floors.forEach(([rx, ry, rw, fc, lc]) => {
      ctx.fillStyle = fc; ctx.fillRect(rx, PY+PH-14, rw, 14);
      ctx.strokeStyle = lc; ctx.lineWidth = 0.5;
      for (let tx = rx; tx < rx+rw; tx += 14) {
        ctx.beginPath(); ctx.moveTo(tx, PY+PH-14); ctx.lineTo(tx, PY+PH); ctx.stroke();
      }
    });

    // Ceiling
    ctx.fillStyle = "#e8dcc8"; ctx.fillRect(PX, PY, PW, 18);
    ctx.fillStyle = "#d0c4b0"; ctx.fillRect(PX, PY+16, PW, 2);

    // Wall color
    ctx.fillStyle = "#f5ede0"; ctx.fillRect(PX, PY+18, PW, PH-32);

    // Room divider walls
    ctx.fillStyle = "#c8b898";
    [PX+88, PX+176, PX+264].forEach(dx => ctx.fillRect(dx, PY+18, 4, PH-32));

    // Room labels on ceiling
    ctx.fillStyle = "rgba(100,70,30,0.6)"; ctx.font = "7px 'Courier New'"; ctx.textAlign = "center";
    [["ห้องนอน", PX+44],["ห้องน้ำ", PX+132],["ห้องนั่งเล่น", PX+220],["ห้องครัว", PX+308]].forEach(([lbl,cx])=>{
      ctx.fillText(lbl, cx, PY+12);
    });

    // Draw furniture in each room
    const chars = this.characters;
    const roomOf = c => getIndoorRoom(c.locationStr, getActivityType(c.currentActivity, false));
    const inRoom = room => chars.filter(c => c.isIndoor && roomOf(c) === room);

    this._drawBedroom (PX,     PY, PH, inRoom("bedroom"));
    this._drawBathroom(PX+88,  PY, PH, inRoom("bathroom"));
    this._drawLiving  (PX+176, PY, PH, inRoom("living"));
    this._drawKitchen (PX+264, PY, PH, inRoom("kitchen"));

    // Panel border (matches house trim)
    ctx.strokeStyle = "#5c3d1e"; ctx.lineWidth = 2; ctx.strokeRect(PX, PY, PW, PH);
  }

  // ── Bedroom furniture ────────────────────────────────────────────────────
  _drawBedroom(rx, py, ph, chars) {
    const { ctx, frame } = this;
    const fl = py + ph - 14;  // floor top

    // Back-wall window
    ctx.fillStyle = "#c8e8f8"; ctx.fillRect(rx+12, py+28, 30, 26);
    ctx.fillStyle = "#8b6b45"; ctx.fillRect(rx+9,  py+26, 4, 28); ctx.fillRect(rx+42, py+26, 4, 28);
    ctx.strokeStyle="#7a9cb0"; ctx.lineWidth=0.5; ctx.strokeRect(rx+12, py+28, 30, 26);
    ctx.beginPath(); ctx.moveTo(rx+27, py+28); ctx.lineTo(rx+27, py+54); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx+12, py+41); ctx.lineTo(rx+42, py+41); ctx.stroke();
    // Curtain
    ctx.fillStyle="rgba(200,150,120,0.55)"; ctx.fillRect(rx+9,py+26,8,28); ctx.fillRect(rx+40,py+26,6,28);

    // Nightstand lamp glow (warm light when anyone sleeping)
    if (chars.length > 0 && getActivityType(chars[0]?.currentActivity,false) === "sleep") {
      const gx = rx+14, gy = fl-28;
      const lg = ctx.createRadialGradient(gx,gy,2,gx,gy,22);
      lg.addColorStop(0,"rgba(255,220,120,0.45)"); lg.addColorStop(1,"rgba(255,220,120,0)");
      ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(gx,gy,22,0,Math.PI*2); ctx.fill();
    }

    // Nightstand
    ctx.fillStyle="#9b7040"; ctx.fillRect(rx+6, fl-24, 18, 24);
    ctx.fillStyle="#7a5830"; ctx.fillRect(rx+8, fl-16, 14, 10);
    // Lamp
    ctx.fillStyle="#c8a060"; ctx.fillRect(rx+11, fl-35, 6, 12);
    ctx.fillStyle="#ffe090"; ctx.beginPath(); ctx.ellipse(rx+14,fl-36,7,4,0,0,Math.PI*2); ctx.fill();

    // Bed frame
    ctx.fillStyle="#8b5e3c"; ctx.fillRect(rx+26, fl-28, 54, 28);
    ctx.fillStyle="#6b4025"; ctx.fillRect(rx+26, fl-35, 54, 10); // headboard
    // Mattress
    ctx.fillStyle="#e8e4f0"; ctx.fillRect(rx+27, fl-26, 52, 24);
    // Blanket
    ctx.fillStyle="#6080c0"; ctx.fillRect(rx+27, fl-20, 52, 18);
    ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.fillRect(rx+27, fl-20, 52, 4);
    // Pillow
    ctx.fillStyle="#f0f0e8"; ctx.fillRect(rx+32, fl-24, 18, 12);
    ctx.fillStyle="#dde"; ctx.fillRect(rx+34, fl-22, 14, 8);
  }

  // ── Bathroom furniture ───────────────────────────────────────────────────
  _drawBathroom(rx, py, ph, chars) {
    const { ctx, frame } = this;
    const fl = py + ph - 14;

    // Wall tiles (grid pattern)
    ctx.strokeStyle="#c8dce8"; ctx.lineWidth=0.4;
    for (let ty=py+18; ty<fl; ty+=10) { ctx.beginPath(); ctx.moveTo(rx,ty); ctx.lineTo(rx+84,ty); ctx.stroke(); }
    for (let tx=rx; tx<rx+84; tx+=10) { ctx.beginPath(); ctx.moveTo(tx,py+18); ctx.lineTo(tx,fl); ctx.stroke(); }

    // Mirror
    ctx.fillStyle="#c8eef8"; ctx.fillRect(rx+28, py+22, 38, 28);
    ctx.strokeStyle="#8ab0c0"; ctx.lineWidth=1; ctx.strokeRect(rx+28, py+22, 38, 28);
    ctx.fillStyle="rgba(255,255,255,0.35)"; ctx.fillRect(rx+30, py+24, 12, 18);

    // Shower area (left)
    ctx.fillStyle="#d0e8f0"; ctx.fillRect(rx+2, fl-38, 28, 38);
    ctx.strokeStyle="#9abccc"; ctx.lineWidth=0.8; ctx.strokeRect(rx+2, fl-38, 28, 38);
    // Shower head & pipe
    ctx.fillStyle="#aaa"; ctx.fillRect(rx+20, py+30, 4, 28);
    ctx.fillStyle="#ccc"; ctx.beginPath(); ctx.arc(rx+22, py+30, 8, Math.PI, 0); ctx.fill();
    // Shower spray (animated when active)
    if (chars.length > 0) {
      ctx.fillStyle="rgba(160,210,240,0.6)";
      for (let d=0; d<5; d++) {
        const dy = ((frame*2+d*8) % 30) + 2;
        const dx = (d%3 - 1) * 3;
        ctx.fillRect(rx+20+dx, py+38+dy, 2, 3);
      }
      // Steam
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#fff";
      [0,7,14].forEach(off=>{
        const sOff = ((frame*0.5+off)%18);
        ctx.beginPath(); ctx.ellipse(rx+10, py+36-sOff, 5+sOff*0.3, 3, 0, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    // Toilet (right)
    ctx.fillStyle="#f0f0e8"; ctx.fillRect(rx+56, fl-28, 24, 28);
    ctx.fillStyle="#e8e8e0"; ctx.fillRect(rx+54, fl-32, 28, 8);
    ctx.fillStyle="#d8d8d0"; ctx.beginPath(); ctx.ellipse(rx+68, fl-28, 13, 6, 0, 0, Math.PI*2); ctx.fill();

    // Towel rail
    ctx.fillStyle="#c8a060"; ctx.fillRect(rx+40, py+40, 3, 30);
    ctx.fillStyle="#e88070"; ctx.fillRect(rx+38, py+42, 7, 12); // towel
  }

  // ── Living room furniture ────────────────────────────────────────────────
  _drawLiving(rx, py, ph, chars) {
    const { ctx, frame } = this;
    const fl = py + ph - 14;
    const hasWorker = chars.some(c => getActivityType(c.currentActivity,false) === "work");

    if (hasWorker) {
      // Study mode: desk + monitor
      ctx.fillStyle="#b08040"; ctx.fillRect(rx+6, fl-18, 76, 10);
      ctx.fillStyle="#8b6020"; ctx.fillRect(rx+8, fl-14, 4, 14); ctx.fillRect(rx+78, fl-14, 4, 14);
      // Monitor
      ctx.fillStyle="#1a2a38"; ctx.fillRect(rx+24, fl-46, 36, 28);
      const sc = `rgba(${100+Math.round(Math.sin(frame*0.08)*30)},200,255,0.9)`;
      ctx.fillStyle=sc; ctx.fillRect(rx+26, fl-44, 32, 22);
      // Blinking text lines
      if ((frame>>4)%2===0) { ctx.fillStyle="rgba(0,0,0,0.4)"; [0,1,2].forEach(i=> ctx.fillRect(rx+28,fl-42+i*6,20+i*4,2)); }
      ctx.fillStyle="#1a2a38"; ctx.fillRect(rx+38, fl-18, 4, 10); // stand
      // Chair
      ctx.fillStyle="#5a3820"; ctx.fillRect(rx+30, fl-28, 20, 12); // seat
      ctx.fillStyle="#4a2810"; ctx.fillRect(rx+30, fl-40, 20, 14); // back
    } else {
      // TV / lounge mode
      // TV stand
      ctx.fillStyle="#6a4a28"; ctx.fillRect(rx+50, fl-44, 8, 44);
      // TV
      ctx.fillStyle="#0a1828"; ctx.fillRect(rx+30, fl-72, 46, 32);
      const tv = `rgba(${50+Math.round(Math.sin(frame*0.06)*30)},${100+Math.round(Math.cos(frame*0.05)*40)},180,0.85)`;
      ctx.fillStyle=tv; ctx.fillRect(rx+32, fl-70, 42, 26);
      // TV content (simple animated bar)
      ctx.fillStyle="rgba(255,255,255,0.2)";
      ctx.fillRect(rx+32, fl-70+Math.round(Math.sin(frame*0.05)*10+10), 42, 2);

      // Sofa
      ctx.fillStyle="#c87840"; ctx.fillRect(rx+4, fl-28, 76, 18);  // seat
      ctx.fillStyle="#b06030"; ctx.fillRect(rx+4, fl-44, 76, 18);  // back
      ctx.fillStyle="#a05020"; ctx.fillRect(rx+4,  fl-28, 8, 28);  // left arm
      ctx.fillStyle="#a05020"; ctx.fillRect(rx+72, fl-28, 8, 28);  // right arm
      ctx.fillStyle="#d09050"; ctx.fillRect(rx+8,  fl-42, 22, 14); // left cushion
      ctx.fillStyle="#d09050"; ctx.fillRect(rx+54, fl-42, 22, 14); // right cushion

      // Coffee table
      ctx.fillStyle="#9a7040"; ctx.fillRect(rx+22, fl-14, 40, 8);
      ctx.fillStyle="#7a5828"; ctx.fillRect(rx+23, fl-6,  4, 6); ctx.fillRect(rx+57, fl-6, 4, 6);
    }

    // Back wall window
    ctx.fillStyle="#c8e8f8"; ctx.fillRect(rx+6, py+26, 28, 22);
    ctx.strokeStyle="#7a9cb0"; ctx.lineWidth=0.5; ctx.strokeRect(rx+6, py+26, 28, 22);
    ctx.beginPath(); ctx.moveTo(rx+20, py+26); ctx.lineTo(rx+20, py+48); ctx.stroke();
  }

  // ── Kitchen furniture ────────────────────────────────────────────────────
  _drawKitchen(rx, py, ph, chars) {
    const { ctx, frame } = this;
    const fl = py + ph - 14;

    // Wall shelf
    ctx.fillStyle="#8b6040"; ctx.fillRect(rx+4, py+28, 76, 7);
    // Pots on shelf
    [[rx+10,"#c04820"],[rx+28,"#4a6a28"],[rx+46,"#2868a0"]].forEach(([px,pc])=>{
      ctx.fillStyle=pc; ctx.beginPath(); ctx.arc(px+7,py+26,7,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.fillRect(px+3,py+22,8,2);
    });

    // Counter / stove top
    ctx.fillStyle="#d0b880"; ctx.fillRect(rx+4, fl-50, 76, 14);
    ctx.strokeStyle="#b89860"; ctx.lineWidth=0.5; ctx.strokeRect(rx+4, fl-50, 76, 14);
    // Burner circles
    [[rx+15, fl-44],[rx+35, fl-44]].forEach(([bx,by])=>{
      ctx.strokeStyle="#808080"; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.arc(bx,by,5,0,Math.PI*2); ctx.stroke();
    });
    // Pan (if eating)
    if (chars.length > 0) {
      ctx.fillStyle="#555"; ctx.fillRect(rx+8, fl-50, 16, 4);
      ctx.strokeStyle="#888"; ctx.lineWidth=1; ctx.strokeRect(rx+8, fl-50, 16, 4);
      // Steam from pan
      ctx.globalAlpha=0.4; ctx.fillStyle="#fff";
      [0,5].forEach(off=>{
        const s=(frame*0.6+off)%15;
        ctx.beginPath(); ctx.ellipse(rx+16,fl-52-s,3,2,0,0,Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha=1;
    }

    // Dining table
    ctx.fillStyle="#c89850"; ctx.fillRect(rx+8, fl-22, 64, 10);
    ctx.fillStyle="#a07838"; ctx.fillRect(rx+10, fl-12, 4, 12); ctx.fillRect(rx+70, fl-12, 4, 12);
    // Plate + food
    ctx.fillStyle="#f0f0e0"; ctx.beginPath(); ctx.arc(rx+28, fl-18, 8, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle="#d0d0c0"; ctx.lineWidth=0.5; ctx.stroke();
    ctx.fillStyle="#f0a030"; ctx.beginPath(); ctx.arc(rx+28, fl-18, 5, 0, Math.PI*2); ctx.fill();
    // Second plate
    ctx.fillStyle="#f0f0e0"; ctx.beginPath(); ctx.arc(rx+52, fl-18, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle="#e06040"; ctx.beginPath(); ctx.arc(rx+52, fl-18, 5, 0, Math.PI*2); ctx.fill();
    // Chopsticks
    ctx.strokeStyle="#8b5e3c"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(rx+20,fl-28); ctx.lineTo(rx+22,fl-10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx+24,fl-28); ctx.lineTo(rx+26,fl-10); ctx.stroke();
    // Chair near-side
    ctx.fillStyle="#8b5e3c"; ctx.fillRect(rx+18, fl-10, 20, 8);
    ctx.fillStyle="#6b4025"; ctx.fillRect(rx+19, fl-2,  4,  8); ctx.fillRect(rx+34, fl-2, 4, 8);

    // Back window
    ctx.fillStyle="#c8e8f8"; ctx.fillRect(rx+52, py+26, 26, 22);
    ctx.strokeStyle="#7a9cb0"; ctx.lineWidth=0.5; ctx.strokeRect(rx+52, py+26, 26, 22);
    ctx.beginPath(); ctx.moveTo(rx+65, py+26); ctx.lineTo(rx+65, py+48); ctx.stroke();
  }

  // ── Character dispatch ───────────────────────────────────────────────────
  _drawCharacter(char, actType) {
    if (actType === "sleep") { this._drawSleeping(char); return; }
    if (actType === "shower"){ this._drawShower(char);   return; }
    if (char.isFemale)        this._drawFemale(char, actType);
    else                      this._drawMale  (char, actType);
  }

  // ── Walk-cycle helpers ───────────────────────────────────────────────────
  _walkLegs(frame, bobOffset, actType) {
    const speed = actType === "run" ? 0.42 : 0.20;
    const swing = actType === "run" ? 6 : 4;
    const p = frame * speed + bobOffset;
    return {
      leftY:  Math.round(Math.sin(p)          * swing),
      rightY: Math.round(Math.sin(p + Math.PI) * swing),
      leftX:  Math.round(Math.cos(p)          * swing * 0.35),
      rightX: Math.round(Math.cos(p + Math.PI)* swing * 0.35),
    };
  }

  // ── Male ─────────────────────────────────────────────────────────────────
  _drawMale(char, actType) {
    const { ctx, frame } = this;
    const x=Math.round(char.px), y=Math.round(char.py);
    const sk=char.skinColor||"#f5d0a0", sh=char.shirtColor||"#4a9eff";
    const pa=char.pantsColor||"#2c3e50", ha=char.hairColor||"#1a1008";
    const isWalk = actType==="walk"||actType==="run";
    const b = isWalk ? 0 : Math.round(Math.sin(frame*0.07+char.bobOffset)*1.5);
    const L = isWalk ? this._walkLegs(frame,char.bobOffset,actType) : {leftY:0,rightY:0,leftX:0,rightX:0};

    // Sit pose for eat/watch/work
    const sit = actType==="eat"||actType==="watch"||actType==="work";

    const flip = !char.facingRight;
    if (flip){ ctx.save(); ctx.scale(-1,1); ctx.translate(-2*x,0); }

    // Shadow
    ctx.fillStyle="rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.ellipse(x,y+4,sit?9:11,3,0,0,Math.PI*2); ctx.fill();

    if (sit) {
      // Seated: legs folded forward
      ctx.fillStyle=pa; ctx.fillRect(x-7,y-6,14,8);   // thighs horizontal
      ctx.fillStyle="#111"; ctx.fillRect(x-8,y+2,7,4); ctx.fillRect(x+1,y+2,7,4); // feet
      ctx.fillStyle=pa; ctx.fillRect(x-7,y-12,14,7);  // torso lower
      ctx.fillStyle=sh; ctx.fillRect(x-7,y-24,14,13);
      ctx.fillStyle="#f5e8d8"; ctx.fillRect(x-2,y-24,4,4);
      // Arms resting on table (eat) or on keyboard (work/watch)
      ctx.fillStyle=sh; ctx.fillRect(x-10,y-20,4,6); ctx.fillRect(x+6,y-20,4,6);
      ctx.fillStyle=sk; ctx.fillRect(x-10,y-15,4,4); ctx.fillRect(x+6,y-15,4,4);
      if (actType==="eat") {
        // Chopstick in right hand
        ctx.strokeStyle="#8b5e3c"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(x+8,y-18); ctx.lineTo(x+6,y-8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+11,y-18); ctx.lineTo(x+9,y-8); ctx.stroke();
      }
    } else {
      // Standing / walking
      ctx.fillStyle="#111";
      ctx.fillRect(x-8+L.leftX, y-1+b+L.leftY, 7,4);
      ctx.fillRect(x+1+L.rightX,y-1+b+L.rightY,7,4);
      ctx.fillStyle=pa;
      ctx.fillRect(x-7+L.leftX, y-11+b+L.leftY, 5,11);
      ctx.fillRect(x+2+L.rightX,y-11+b+L.rightY,5,11);
      ctx.fillStyle="#4a3020"; ctx.fillRect(x-7,y-12+b,14,3);
      ctx.fillStyle="#f5c040"; ctx.fillRect(x-1,y-12+b,2,3);
      ctx.fillStyle=sh; ctx.fillRect(x-7,y-25+b,14,14);
      ctx.fillStyle="#f5e8d8"; ctx.fillRect(x-2,y-25+b,4,4);
      ctx.fillStyle="rgba(0,0,0,0.15)"; ctx.fillRect(x+2,y-22+b,4,4);
      const aSwing = isWalk ? L.leftY*0.7 : 0;
      ctx.fillStyle=sh;
      ctx.fillRect(x-11,y-24+b-aSwing,4,10); ctx.fillRect(x+7,y-24+b+aSwing,4,10);
      ctx.fillStyle=sk;
      ctx.fillRect(x-11,y-15+b-aSwing,4,6);  ctx.fillRect(x+7,y-15+b+aSwing,4,6);
      if (actType==="phone") {
        ctx.fillStyle="#333"; ctx.fillRect(x+7,y-22+b,4,6);
        ctx.fillStyle="#7ae"; ctx.fillRect(x+8,y-21+b,2,4);
      }
    }

    // Head
    ctx.fillStyle=sk; ctx.fillRect(x-6,y-(sit?32:37)+b,12,13);
    ctx.fillStyle=ha; ctx.fillRect(x-7,y-(sit?35:40)+b,14,6);
    ctx.fillStyle=ha; ctx.fillRect(x-7,y-(sit?33:38)+b,3,8); ctx.fillRect(x+4,y-(sit?33:38)+b,3,5);
    ctx.fillStyle="#1a1a1a";
    ctx.fillRect(x-4,y-(sit?27:32)+b,2,2); ctx.fillRect(x+2,y-(sit?27:32)+b,2,2);
    ctx.fillStyle="#fff";
    ctx.fillRect(x-4,y-(sit?28:33)+b,1,1); ctx.fillRect(x+2,y-(sit?28:33)+b,1,1);
    ctx.fillStyle=ha;
    ctx.fillRect(x-5,y-(sit?30:35)+b,4,1); ctx.fillRect(x+1,y-(sit?30:35)+b,4,1);
    ctx.fillStyle="#b06040"; ctx.fillRect(x-2,y-(sit?22:27)+b,4,1);

    if (flip) ctx.restore();
    const headOff = sit ? 32 : 37;
    this._drawNameTag(ctx, char, x, y-(headOff-b)-10, 0);
  }

  // ── Female ───────────────────────────────────────────────────────────────
  _drawFemale(char, actType) {
    const { ctx, frame } = this;
    const x=Math.round(char.px), y=Math.round(char.py);
    const sk=char.skinColor||"#f5d0a0", sh=char.shirtColor||"#f76ab7";
    const pa=char.pantsColor||"#9b7dff", ha=char.hairColor||"#1a1008";
    const isWalk = actType==="walk"||actType==="run";
    const b = isWalk ? 0 : Math.round(Math.sin(frame*0.07+char.bobOffset)*1.5);
    const L = isWalk ? this._walkLegs(frame,char.bobOffset,actType) : {leftY:0,rightY:0,leftX:0,rightX:0};
    const sit = actType==="eat"||actType==="watch"||actType==="work";

    const flip = !char.facingRight;
    if (flip){ ctx.save(); ctx.scale(-1,1); ctx.translate(-2*x,0); }

    ctx.fillStyle="rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.ellipse(x,y+4,sit?9:11,3,0,0,Math.PI*2); ctx.fill();

    if (sit) {
      // Seated skirt + legs
      ctx.fillStyle=pa;
      ctx.beginPath(); ctx.moveTo(x-8,y-18); ctx.lineTo(x+8,y-18); ctx.lineTo(x+10,y-2); ctx.lineTo(x-10,y-2); ctx.closePath(); ctx.fill();
      ctx.fillStyle=sk; ctx.fillRect(x-5,y-8,4,10); ctx.fillRect(x+1,y-8,4,10);
      ctx.fillStyle="#cc3060"; ctx.fillRect(x-6,y+2,5,4); ctx.fillRect(x+1,y+2,5,4);
      ctx.fillStyle=sh; ctx.fillRect(x-6,y-24,12,7);
      ctx.fillStyle="rgba(255,255,255,0.3)"; ctx.fillRect(x-6,y-18,12,2);
      ctx.fillStyle=sh; ctx.fillRect(x-8,y-22,3,6); ctx.fillRect(x+5,y-22,3,6);
      ctx.fillStyle=sk; ctx.fillRect(x-8,y-17,3,5); ctx.fillRect(x+5,y-17,3,5);
      if (actType==="eat") {
        ctx.strokeStyle="#8b5e3c"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(x+7,y-18); ctx.lineTo(x+5,y-8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+10,y-18); ctx.lineTo(x+8,y-8); ctx.stroke();
      }
    } else {
      ctx.fillStyle="#cc3060";
      ctx.fillRect(x-7+L.leftX, y-1+b+L.leftY, 6,4);
      ctx.fillRect(x+1+L.rightX,y-1+b+L.rightY,6,4);
      ctx.fillStyle=sk;
      ctx.fillRect(x-5+L.leftX, y-8+b+L.leftY, 4,8);
      ctx.fillRect(x+1+L.rightX,y-8+b+L.rightY,4,8);
      ctx.fillStyle=pa;
      ctx.beginPath();
      ctx.moveTo(x-7,y-20+b); ctx.lineTo(x+7,y-20+b); ctx.lineTo(x+10,y-8+b); ctx.lineTo(x-10,y-8+b);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle="rgba(255,255,255,0.25)"; ctx.fillRect(x-10,y-10+b,20,2);
      ctx.fillStyle=sh; ctx.fillRect(x-6,y-25+b,12,6);
      ctx.fillStyle="rgba(255,255,255,0.3)"; ctx.fillRect(x-6,y-20+b,12,2);
      const aSwing = isWalk ? L.leftY*0.7 : 0;
      ctx.fillStyle=sh;
      ctx.fillRect(x-9,y-24+b-aSwing,3,8); ctx.fillRect(x+6,y-24+b+aSwing,3,8);
      ctx.fillStyle=sk;
      ctx.fillRect(x-9,y-17+b-aSwing,3,6); ctx.fillRect(x+6,y-17+b+aSwing,3,6);
      if (actType==="phone") {
        ctx.fillStyle="#333"; ctx.fillRect(x+6,y-22+b,3,6);
        ctx.fillStyle="#f9a"; ctx.fillRect(x+7,y-21+b,1,4);
      }
    }

    ctx.fillStyle=sk; ctx.fillRect(x-6,y-(sit?35:38)+b,12,14);
    ctx.fillStyle=ha;
    ctx.fillRect(x-7,y-(sit?38:42)+b,14,7);
    ctx.fillRect(x-8,y-(sit?34:38)+b,3,18);
    ctx.fillRect(x+5,y-(sit?34:38)+b,3,18);
    ctx.fillRect(x-7,y-(sit?34:38)+b,2,10);
    ctx.fillStyle="rgba(255,255,255,0.15)"; ctx.fillRect(x-3,y-(sit?37:41)+b,5,3);
    ctx.fillStyle="#1a1a1a";
    ctx.fillRect(x-5,y-(sit?30:33)+b,3,3); ctx.fillRect(x+2,y-(sit?30:33)+b,3,3);
    ctx.fillRect(x-6,y-(sit?31:34)+b,1,2); ctx.fillRect(x+5,y-(sit?31:34)+b,1,2);
    ctx.fillStyle="#5a3090";
    ctx.fillRect(x-4,y-(sit?30:33)+b,2,2); ctx.fillRect(x+2,y-(sit?30:33)+b,2,2);
    ctx.fillStyle="#fff";
    ctx.fillRect(x-4,y-(sit?31:34)+b,1,1); ctx.fillRect(x+3,y-(sit?31:34)+b,1,1);
    ctx.fillStyle=ha;
    ctx.fillRect(x-5,y-(sit?34:37)+b,3,1); ctx.fillRect(x+1,y-(sit?34:37)+b,3,1);
    ctx.fillStyle="rgba(255,130,150,0.55)";
    ctx.fillRect(x-6,y-(sit?27:30)+b,3,2); ctx.fillRect(x+3,y-(sit?27:30)+b,3,2);
    ctx.fillStyle="#d05060"; ctx.fillRect(x-2,y-(sit?25:28)+b,4,2);
    ctx.fillStyle="#e07080"; ctx.fillRect(x-1,y-(sit?25:28)+b,2,1);

    if (flip) ctx.restore();
    const headOff = sit ? 35 : 38;
    this._drawNameTag(ctx, char, x, y-(headOff-b)-10, 0);
  }

  // ── Sleeping pose ────────────────────────────────────────────────────────
  _drawSleeping(char) {
    const { ctx, frame } = this;
    const x=Math.round(char.px), y=Math.round(char.py)-6;
    const sk=char.skinColor||"#f5d0a0", sh=char.shirtColor||"#4a9eff";
    const pa=char.pantsColor||"#2c3e50", ha=char.hairColor||"#1a1008";

    // When on bed, character is on top of blanket
    ctx.fillStyle="rgba(0,0,0,0.12)";
    ctx.beginPath(); ctx.ellipse(x,y+5,22,4,0,0,Math.PI*2); ctx.fill();

    // Blanket cover
    ctx.fillStyle="#6080c0"; ctx.fillRect(x-20,y-5,34,12);
    ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.fillRect(x-20,y-5,34,3);

    // Body under blanket
    ctx.fillStyle=sh; ctx.fillRect(x-18,y-2,24,8);
    ctx.fillStyle=pa; ctx.fillRect(x+6, y-2,10,6);

    // Head on pillow
    ctx.fillStyle="#f0f0e8"; ctx.fillRect(x-28,y-10,18,10); // pillow
    ctx.fillStyle="#dde"; ctx.fillRect(x-26,y-8,14,6);
    ctx.fillStyle=sk; ctx.fillRect(x-28,y-14,12,11);
    ctx.fillStyle=ha; ctx.fillRect(x-29,y-16,14,5);
    if (char.isFemale) { ctx.fillStyle=ha; ctx.fillRect(x-29,y-13,3,10); }
    // Closed eyes
    ctx.fillStyle="#1a1a1a";
    ctx.fillRect(x-26,y-11,3,1); ctx.fillRect(x-22,y-11,3,1);
    ctx.fillStyle="#b06040"; ctx.fillRect(x-25,y-9,4,1);

    // ZZZ
    ctx.font="bold 8px 'Courier New'"; ctx.textAlign="center";
    [0,7,14].forEach(off=>{
      const s=((frame*0.4+off)%20);
      ctx.globalAlpha = Math.max(0, 0.85 - s/22);
      ctx.fillStyle="#7080d0";
      const sz = 6+s*0.3;
      ctx.font=`bold ${Math.round(sz)}px 'Courier New'`;
      ctx.fillText("z", x+2+s*0.4, y-16-s);
    });
    ctx.globalAlpha=1;
    this._drawNameTag(ctx, char, x-16, y-18, 0);
  }

  // ── Shower pose ──────────────────────────────────────────────────────────
  _drawShower(char) {
    const { ctx, frame } = this;
    const x=Math.round(char.px), y=Math.round(char.py);
    const sk=char.skinColor||"#f5d0a0", ha=char.hairColor||"#1a1008";

    // Shadow
    ctx.fillStyle="rgba(0,0,0,0.12)";
    ctx.beginPath(); ctx.ellipse(x,y+4,9,3,0,0,Math.PI*2); ctx.fill();

    // Towel wrap
    ctx.fillStyle="#e8f0f8"; ctx.fillRect(x-6,y-18,12,20);
    ctx.fillStyle="rgba(160,200,230,0.4)"; ctx.fillRect(x-6,y-18,12,3);

    // Feet
    ctx.fillStyle=sk; ctx.fillRect(x-5,y-2,4,5); ctx.fillRect(x+1,y-2,4,5);

    // Arms up (washing hair)
    ctx.fillStyle=sk;
    ctx.fillRect(x-12,y-28,4,12); // left arm up
    ctx.fillRect(x+8, y-28,4,12); // right arm up

    // Head
    ctx.fillStyle=sk; ctx.fillRect(x-6,y-38,12,13);
    // Wet hair (darker, slightly dripping)
    const wetHair = char.hairColor || "#1a1008";
    ctx.fillStyle=wetHair;
    ctx.fillRect(x-7,y-42,14,7);
    ctx.fillRect(x-8,y-38,3,16); ctx.fillRect(x+5,y-38,3,16);
    // Eyes closed (like relaxing)
    ctx.fillStyle="#1a1a1a"; ctx.fillRect(x-4,y-32,3,1); ctx.fillRect(x+1,y-32,3,1);
    ctx.fillStyle="#d05060"; ctx.fillRect(x-2,y-28,4,1);

    // Water droplets animated
    ctx.fillStyle="rgba(160,210,240,0.7)";
    for (let d=0; d<6; d++) {
      const dx=(d%3-1)*6, dy=((frame*3+d*12)%30);
      ctx.fillRect(x+dx, y-42+dy, 2, 3);
    }

    this._drawNameTag(ctx, char, x, y-48, 0);
  }

  // ── Name tag ─────────────────────────────────────────────────────────────
  _drawNameTag(ctx, char, x, y, _b) {
    const name = char.nickname || char.name.split(" ")[0];
    ctx.font="9px 'Courier New'"; ctx.textAlign="center";
    const nw = ctx.measureText(name).width + 10;
    ctx.fillStyle="rgba(30,15,5,0.65)";
    if (ctx.roundRect) ctx.roundRect(x-nw/2, y-13, nw, 13, 3);
    else               ctx.rect     (x-nw/2, y-13, nw, 13);
    ctx.fill();
    ctx.fillStyle="#fff"; ctx.fillText(name, x, y-3);
  }

  showSpeechBubble(text) {
    const bubble = document.getElementById("speech-bubble");
    bubble.textContent = text;
    bubble.classList.remove("hidden");
    clearTimeout(this._bubbleTimeout);
    this._bubbleTimeout = setTimeout(() => bubble.classList.add("hidden"), 5000);
  }
}

const renderer = new Renderer("world-canvas");
