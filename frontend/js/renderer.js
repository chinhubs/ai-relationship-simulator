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
// PX=192, RW=89, dividers=2px each: rooms at 192, 283, 374, 465
const INDOOR_POS = {
  bedroom:  { x: 236, y: 308 },
  bathroom: { x: 327, y: 308 },
  living:   { x: 418, y: 308 },
  kitchen:  { x: 509, y: 308 },
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
      // Default: home / sleeping in bedroom
      const defAct  = "sleeping";
      const defLoc  = "home";
      const defRoom = INDOOR_POS.bedroom;
      const defX    = defRoom.x + (i === 0 ? -18 : 18);
      const defY    = defRoom.y;
      return {
        ...c,
        shirtColor:      CHAR_SHIRTS[i % CHAR_SHIRTS.length],
        pantsColor:      CHAR_PANTS [i % CHAR_PANTS.length],
        hairColor:       CHAR_HAIR  [i % CHAR_HAIR.length],
        skinColor:       CHAR_SKIN  [i % CHAR_SKIN.length],
        px:              p ? p.px      : defX,
        py:              p ? p.py      : defY,
        targetX:         p ? p.targetX : defX,
        targetY:         p ? p.targetY : defY,
        bobOffset:       i * 0.9,
        isFemale:        c.gender === "female",
        currentActivity: p ? p.currentActivity : defAct,
        locationStr:     p ? p.locationStr     : defLoc,
        isIndoor:        p ? p.isIndoor         : true,
        facingRight:     p ? p.facingRight      : true,
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
    const loop = () => {
      try { this._draw(); } catch(e) { console.error("Renderer draw error:", e); }
      this.frame++;
      this._animId = requestAnimationFrame(loop);
    };
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

    this._drawIndoorPanel(); // Always show house interior (dollhouse view)

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
    const RW = 89; // room width (4 rooms = 356px + 2px dividers)

    // Room wall backgrounds (distinct colours per room)
    const wallColors = ["#f0e8dc","#e8f4f8","#f5f0e8","#fef6e0"];
    const floorColors = ["#c8a060","#c8dce8","#c0b488","#d4b870"];
    for (let r=0; r<4; r++) {
      const rx = PX + r*RW + (r>0?r*2:0);
      ctx.fillStyle = wallColors[r]; ctx.fillRect(rx, PY+18, RW, PH-32);
      // Floor
      ctx.fillStyle = floorColors[r]; ctx.fillRect(rx, PY+PH-16, RW, 16);
      // Floor boards / tiles
      ctx.strokeStyle = "rgba(0,0,0,0.10)"; ctx.lineWidth = 0.5;
      if (r===1) { // bathroom tiles
        for (let tx=rx; tx<rx+RW; tx+=11) { ctx.beginPath(); ctx.moveTo(tx,PY+PH-16); ctx.lineTo(tx,PY+PH); ctx.stroke(); }
        for (let ty=PY+PH-16; ty<PY+PH; ty+=11) { ctx.beginPath(); ctx.moveTo(rx,ty); ctx.lineTo(rx+RW,ty); ctx.stroke(); }
      } else {
        for (let tx=rx; tx<rx+RW; tx+=18) { ctx.beginPath(); ctx.moveTo(tx,PY+PH-16); ctx.lineTo(tx,PY+PH); ctx.stroke(); }
      }
    }

    // Ceiling strip
    ctx.fillStyle = "#d8cbb8"; ctx.fillRect(PX, PY, PW+2, 20);
    ctx.fillStyle = "#c8b8a0"; ctx.fillRect(PX, PY+18, PW+2, 2);

    // Divider walls (thicker, visible)
    ctx.fillStyle = "#8b6b45";
    [PX+RW, PX+RW*2+2, PX+RW*3+4].forEach(dx => {
      ctx.fillRect(dx, PY+18, 4, PH-18);
    });

    // Room labels in ceiling
    ctx.font = "bold 7px 'Courier New'"; ctx.textAlign = "center";
    const labels = [["🛏ห้องนอน",PX+44],["🚿ห้องน้ำ",PX+132],["🛋ห้องนั่งเล่น",PX+221],["🍽ครัว",PX+311]];
    labels.forEach(([lbl,cx]) => {
      ctx.fillStyle = "rgba(80,50,20,0.75)"; ctx.fillText(lbl, cx, PY+13);
    });

    // Furniture per room
    const chars = this.characters;
    const roomOf = c => getIndoorRoom(c.locationStr, getActivityType(c.currentActivity, false));
    const inRoom = room => chars.filter(c => c.isIndoor && roomOf(c) === room);

    this._drawBedroom (PX,        PY, PH, inRoom("bedroom"));
    this._drawBathroom(PX+RW+2,   PY, PH, inRoom("bathroom"));
    this._drawLiving  (PX+RW*2+4, PY, PH, inRoom("living"));
    this._drawKitchen (PX+RW*3+6, PY, PH, inRoom("kitchen"));

    // Outer border
    ctx.strokeStyle = "#5c3d1e"; ctx.lineWidth = 3; ctx.strokeRect(PX, PY, PW+2, PH);
  }

  // ── Bedroom furniture ────────────────────────────────────────────────────
  _drawBedroom(rx, py, ph, chars) {
    const { ctx, frame } = this;
    const fl = py + ph - 16;
    const sleeping = chars.some(c => getActivityType(c.currentActivity,false) === "sleep");

    // Window
    const h = this._hour();
    const skyCol = (h>=6&&h<19) ? "#a8d8f8" : "#1a1840";
    ctx.fillStyle=skyCol; ctx.fillRect(rx+8, py+22, 36, 28);
    ctx.fillStyle="#8b6b45"; ctx.fillRect(rx+6,py+20,4,32); ctx.fillRect(rx+44,py+20,4,32);
    ctx.strokeStyle="#6a9cb8"; ctx.lineWidth=1; ctx.strokeRect(rx+8,py+22,36,28);
    ctx.beginPath(); ctx.moveTo(rx+26,py+22); ctx.lineTo(rx+26,py+50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx+8,py+36); ctx.lineTo(rx+44,py+36); ctx.stroke();
    // Sun/moon in window
    if (h>=6&&h<19) { ctx.fillStyle="#ffe060"; ctx.beginPath(); ctx.arc(rx+36,py+28,5,0,Math.PI*2); ctx.fill(); }
    else { ctx.fillStyle="#e0e8ff"; ctx.beginPath(); ctx.arc(rx+36,py+28,4,0,Math.PI*2); ctx.fill(); }
    // Curtains
    ctx.fillStyle="rgba(180,120,100,0.6)"; ctx.fillRect(rx+6,py+20,9,32); ctx.fillRect(rx+43,py+20,5,32);

    // Lamp glow when sleeping
    if (sleeping) {
      const lg = ctx.createRadialGradient(rx+10,fl-30,1,rx+10,fl-30,28);
      lg.addColorStop(0,"rgba(255,220,100,0.5)"); lg.addColorStop(1,"rgba(255,220,100,0)");
      ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(rx+10,fl-30,28,0,Math.PI*2); ctx.fill();
    }

    // Nightstand
    ctx.fillStyle="#a07840"; ctx.fillRect(rx+2,fl-26,20,26);
    ctx.fillStyle="#7a5830"; ctx.fillRect(rx+4,fl-18,16,10);
    // Lamp
    ctx.fillStyle="#c09050"; ctx.fillRect(rx+7,fl-38,6,14);
    ctx.fillStyle= sleeping ? "#ffe080" : "#c8b880";
    ctx.beginPath(); ctx.ellipse(rx+10,fl-39,9,5,0,0,Math.PI*2); ctx.fill();

    // Bed frame (headboard + body)
    ctx.fillStyle="#7b4e28"; ctx.fillRect(rx+24,fl-38,60,38);
    ctx.fillStyle="#5a3418"; ctx.fillRect(rx+24,fl-38,60,12); // headboard
    // Mattress + bedding
    ctx.fillStyle="#ece8f8"; ctx.fillRect(rx+26,fl-26,56,26);
    ctx.fillStyle= sleeping ? "#7090d0" : "#8898c8";
    ctx.fillRect(rx+26,fl-20,56,20); // blanket
    ctx.fillStyle="rgba(255,255,255,0.25)"; ctx.fillRect(rx+26,fl-20,56,5);
    // Pillow
    ctx.fillStyle="#f4f0e8"; ctx.fillRect(rx+30,fl-24,22,13);
    ctx.fillStyle="#e8e4f4"; ctx.fillRect(rx+32,fl-22,18,9);
    ctx.fillStyle="#d0cce8"; ctx.fillRect(rx+55,fl-24,20,13); // second pillow
  }

  // ── Bathroom furniture ───────────────────────────────────────────────────
  _drawBathroom(rx, py, ph, chars) {
    const { ctx, frame } = this;
    const fl = py + ph - 16;
    const showering = chars.some(c => getActivityType(c.currentActivity,false) === "shower");

    // Tile accents
    ctx.fillStyle="#ddf0f8"; ctx.fillRect(rx+2,py+20,85,28);
    ctx.strokeStyle="#b8d4e0"; ctx.lineWidth=0.5;
    for (let ty=py+20; ty<py+48; ty+=14) { ctx.beginPath(); ctx.moveTo(rx+2,ty); ctx.lineTo(rx+87,ty); ctx.stroke(); }
    for (let tx=rx+2; tx<rx+87; tx+=18) { ctx.beginPath(); ctx.moveTo(tx,py+20); ctx.lineTo(tx,py+48); ctx.stroke(); }

    // Mirror with frame
    ctx.fillStyle="#a0c8d8"; ctx.fillRect(rx+30,py+22,42,30);
    ctx.fillStyle="#c8eef8"; ctx.fillRect(rx+31,py+23,40,28);
    ctx.strokeStyle="#6898a8"; ctx.lineWidth=1.5; ctx.strokeRect(rx+30,py+22,42,30);
    ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.fillRect(rx+33,py+25,10,18);

    // Shower stall (left)
    ctx.fillStyle="#c8e8f4"; ctx.fillRect(rx+2,fl-44,30,44);
    ctx.strokeStyle="#88b8cc"; ctx.lineWidth=1; ctx.strokeRect(rx+2,fl-44,30,44);
    // Shower head
    ctx.fillStyle="#bbb"; ctx.fillRect(rx+22,py+32,4,24);
    ctx.fillStyle="#d0d0d0"; ctx.beginPath(); ctx.arc(rx+24,py+32,7,Math.PI,0); ctx.fill();
    // Water drops (when showering)
    if (showering) {
      ctx.fillStyle="rgba(140,200,240,0.7)";
      for (let d=0; d<6; d++) {
        const dy=((frame*3+d*9)%36)+2, dx=(d%3-1)*4;
        ctx.fillRect(rx+22+dx,py+42+dy,2,4);
      }
      ctx.globalAlpha=0.35; ctx.fillStyle="#ddf";
      [0,9,18].forEach(off=>{ const s=((frame*0.5+off)%18); ctx.beginPath(); ctx.ellipse(rx+14,py+40-s,4+s*0.2,2,0,0,Math.PI*2); ctx.fill(); });
      ctx.globalAlpha=1;
    }

    // Sink
    ctx.fillStyle="#e8f0f4"; ctx.fillRect(rx+36,fl-26,26,18);
    ctx.strokeStyle="#98b8c4"; ctx.lineWidth=0.8; ctx.strokeRect(rx+36,fl-26,26,18);
    ctx.fillStyle="#a8c8d8"; ctx.beginPath(); ctx.ellipse(rx+49,fl-18,8,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#c8c8c8"; ctx.fillRect(rx+47,fl-28,4,4);

    // Toilet
    ctx.fillStyle="#f2f2ea"; ctx.fillRect(rx+60,fl-30,26,30);
    ctx.fillStyle="#e4e4dc"; ctx.fillRect(rx+58,fl-35,30,8);
    ctx.fillStyle="#ccc8c0"; ctx.beginPath(); ctx.ellipse(rx+73,fl-30,12,6,0,0,Math.PI*2); ctx.fill();

    // Towel rail + towel
    ctx.fillStyle="#b09050"; ctx.fillRect(rx+34,py+52,3,26);
    ctx.fillStyle="#e06858"; ctx.fillRect(rx+32,py+54,7,14);
    ctx.fillStyle="#f08878"; ctx.fillRect(rx+33,py+55,5,4);
  }

  // ── Living room furniture ────────────────────────────────────────────────
  _drawLiving(rx, py, ph, chars) {
    const { ctx, frame } = this;
    const fl = py + ph - 16;
    const isWork = chars.some(c => getActivityType(c.currentActivity,false) === "work");

    // Wall window
    ctx.fillStyle="#a8d4f0"; ctx.fillRect(rx+4,py+22,30,24);
    ctx.strokeStyle="#6898b4"; ctx.lineWidth=0.8; ctx.strokeRect(rx+4,py+22,30,24);
    ctx.beginPath(); ctx.moveTo(rx+19,py+22); ctx.lineTo(rx+19,py+46); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx+4,py+34); ctx.lineTo(rx+34,py+34); ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.fillRect(rx+6,py+24,10,8);

    if (isWork) {
      // Study/work mode
      ctx.fillStyle="#a07030"; ctx.fillRect(rx+4,fl-20,80,12); // desk
      ctx.fillStyle="#784e18"; ctx.fillRect(rx+6,fl-8,4,8); ctx.fillRect(rx+78,fl-8,4,8);
      // Monitor frame
      ctx.fillStyle="#1a2838"; ctx.fillRect(rx+22,fl-50,40,30);
      // Screen glow
      const sc=`rgba(${80+Math.round(Math.sin(frame*0.09)*40)},190,255,0.9)`;
      ctx.fillStyle=sc; ctx.fillRect(rx+24,fl-48,36,24);
      ctx.fillStyle="rgba(255,255,255,0.15)"; ctx.fillRect(rx+24,fl-48,36,3);
      if ((frame>>4)%2===0) { ctx.fillStyle="rgba(0,0,0,0.3)"; [0,1,2].forEach(i=>ctx.fillRect(rx+26,fl-44+i*7,16+i*4,2)); }
      ctx.fillStyle="#222"; ctx.fillRect(rx+39,fl-20,4,10); // stand
      // Office chair
      ctx.fillStyle="#4a3018"; ctx.fillRect(rx+30,fl-32,22,14);
      ctx.fillStyle="#3a2010"; ctx.fillRect(rx+30,fl-46,22,16);
      ctx.fillStyle="#2a180c"; ctx.fillRect(rx+30,fl-32,4,20); ctx.fillRect(rx+48,fl-32,4,20);
    } else {
      // TV / lounge mode
      // TV on stand
      ctx.fillStyle="#555"; ctx.fillRect(rx+44,fl-18,6,18); // stand leg
      ctx.fillStyle="#111"; ctx.fillRect(rx+24,fl-68,50,52); // TV body
      const tv=`rgba(${40+Math.round(Math.sin(frame*0.07)*35)},${90+Math.round(Math.cos(frame*0.05)*45)},200,0.9)`;
      ctx.fillStyle=tv; ctx.fillRect(rx+26,fl-66,46,46); // screen
      ctx.fillStyle="rgba(255,255,255,0.12)"; ctx.fillRect(rx+26,fl-66,46,4);
      // Animated content bar
      ctx.fillStyle="rgba(255,255,255,0.18)";
      ctx.fillRect(rx+26,fl-66+Math.round(Math.sin(frame*0.06)*18+18),46,3);

      // Sofa
      ctx.fillStyle="#d0893c"; ctx.fillRect(rx+2,fl-30,83,20); // seat
      ctx.fillStyle="#b87028"; ctx.fillRect(rx+2,fl-48,83,20); // backrest
      ctx.fillStyle="#a06020"; ctx.fillRect(rx+2,fl-30,9,30); ctx.fillRect(rx+76,fl-30,9,30); // arms
      ctx.fillStyle="#e8a050"; ctx.fillRect(rx+6,fl-46,26,16); ctx.fillRect(rx+56,fl-46,26,16); // cushions
      // Coffee table
      ctx.fillStyle="#8a6030"; ctx.fillRect(rx+20,fl-12,46,8);
      ctx.fillStyle="#6a4820"; ctx.fillRect(rx+22,fl-4,4,4); ctx.fillRect(rx+60,fl-4,4,4);
      // Remote / cup on table
      ctx.fillStyle="#444"; ctx.fillRect(rx+28,fl-12,8,4);
      ctx.fillStyle="#d4804a"; ctx.beginPath(); ctx.arc(rx+52,fl-10,4,0,Math.PI*2); ctx.fill();
    }
  }

  // ── Kitchen furniture ────────────────────────────────────────────────────
  _drawKitchen(rx, py, ph, chars) {
    const { ctx, frame } = this;
    const fl = py + ph - 16;
    const eating = chars.some(c => getActivityType(c.currentActivity,false) === "eat");

    // Wall shelf with pots
    ctx.fillStyle="#8b6040"; ctx.fillRect(rx+2,py+24,82,7);
    ctx.fillStyle="#c04820"; ctx.beginPath(); ctx.arc(rx+16,py+22,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#4a6a28"; ctx.beginPath(); ctx.arc(rx+36,py+22,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#2868a0"; ctx.beginPath(); ctx.arc(rx+56,py+22,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(0,0,0,0.18)";
    [rx+12,rx+32,rx+52].forEach(bx=>ctx.fillRect(bx,py+18,8,2));

    // Cabinet above counter
    ctx.fillStyle="#b08858"; ctx.fillRect(rx+2,py+32,82,20);
    ctx.fillStyle="#987040"; ctx.fillRect(rx+4,py+34,36,16); ctx.fillRect(rx+44,py+34,36,16);
    ctx.fillStyle="#7a5828"; ctx.fillRect(rx+4,py+34,36,2); ctx.fillRect(rx+44,py+34,36,2);
    ctx.fillStyle="#c8a870"; ctx.fillRect(rx+19,py+40,6,4); ctx.fillRect(rx+59,py+40,6,4);

    // Counter top
    ctx.fillStyle="#d8c080"; ctx.fillRect(rx+2,fl-52,82,14);
    ctx.strokeStyle="#b8a060"; ctx.lineWidth=0.8; ctx.strokeRect(rx+2,fl-52,82,14);
    // Stove burners
    ctx.strokeStyle="#888"; ctx.lineWidth=1.5;
    [[rx+16,fl-46],[rx+38,fl-46]].forEach(([bx,by])=>{
      ctx.beginPath(); ctx.arc(bx,by,6,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx,by,3,0,Math.PI*2); ctx.stroke();
    });
    // Pan + steam
    ctx.fillStyle="#484"; ctx.beginPath(); ctx.arc(rx+16,fl-47,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#5a5a"; ctx.fillRect(rx+5,fl-49,10,4); // handle
    if (eating || chars.length > 0) {
      ctx.globalAlpha=0.45; ctx.fillStyle="#eee";
      [0,6,12].forEach(off=>{ const s=(frame*0.7+off)%16; ctx.beginPath(); ctx.ellipse(rx+16,fl-55-s,3+s*0.15,2,0,0,Math.PI*2); ctx.fill(); });
      ctx.globalAlpha=1;
    }

    // Dining table
    ctx.fillStyle="#c09050"; ctx.fillRect(rx+4,fl-24,78,12);
    ctx.fillStyle="#9a7038"; ctx.fillRect(rx+6,fl-12,5,12); ctx.fillRect(rx+75,fl-12,5,12);
    // Plates and food
    ctx.fillStyle="#f5f0e0"; ctx.beginPath(); ctx.arc(rx+24,fl-18,9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#f0b040"; ctx.beginPath(); ctx.arc(rx+24,fl-18,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#c84030"; ctx.beginPath(); ctx.arc(rx+24,fl-18,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#f5f0e0"; ctx.beginPath(); ctx.arc(rx+56,fl-18,9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#e06040"; ctx.beginPath(); ctx.arc(rx+56,fl-18,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#b83020"; ctx.beginPath(); ctx.arc(rx+56,fl-18,3,0,Math.PI*2); ctx.fill();
    // Chopsticks
    ctx.strokeStyle="#7a5030"; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(rx+14,fl-28); ctx.lineTo(rx+17,fl-10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx+18,fl-28); ctx.lineTo(rx+21,fl-10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx+46,fl-28); ctx.lineTo(rx+49,fl-10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx+50,fl-28); ctx.lineTo(rx+53,fl-10); ctx.stroke();
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
