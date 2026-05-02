/**
 * Pixel-Art Isometric City Renderer
 * Stardew Valley / classic RPG 2.5D style
 * Draws to a 400×200 offscreen buffer, then scales 2× → 800×400 with no interpolation.
 */

// ── Isometric constants (offscreen coords) ────────────────────────────────────
const OW = 400, OH = 200;   // offscreen resolution
const ISO_TW = 24, ISO_TH = 12;
const ISO_OX = 184, ISO_OY = 24;
const DISPLAY_SCALE = 2;    // upscale factor

function isoX(c, r) { return ((c - r) * (ISO_TW >> 1) + ISO_OX) | 0; }
function isoY(c, r, z) { return ((c + r) * (ISO_TH >> 1) + ISO_OY - (z | 0)) | 0; }

// ── Ground tile (flat diamond) ────────────────────────────────────────────────
function pxTile(ctx, c, r, fill, outline) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(isoX(c,   r),   isoY(c,   r));
  ctx.lineTo(isoX(c+1, r),   isoY(c+1, r));
  ctx.lineTo(isoX(c+1, r+1), isoY(c+1, r+1));
  ctx.lineTo(isoX(c,   r+1), isoY(c,   r+1));
  ctx.closePath();
  ctx.fill();
  if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = 0.5; ctx.stroke(); }
}

// ── Isometric box (building block) with pixel-art outlines ────────────────────
function pxBox(ctx, c, r, cw, rh, bh, topC, leftC, rightC) {
  if (bh <= 0) return;
  const gSW = [isoX(c,    r+rh), isoY(c,    r+rh)];
  const gSE = [isoX(c+cw, r+rh), isoY(c+cw, r+rh)];
  const gNE = [isoX(c+cw, r),    isoY(c+cw, r)   ];
  const tNW = [isoX(c,    r),    isoY(c,    r)    - bh];
  const tNE = [isoX(c+cw, r),    isoY(c+cw, r)   - bh];
  const tSE = [isoX(c+cw, r+rh), isoY(c+cw, r+rh)- bh];
  const tSW = [isoX(c,    r+rh), isoY(c,    r+rh)- bh];

  const stroke = () => { ctx.strokeStyle = "#1a0a04"; ctx.lineWidth = 0.75; ctx.stroke(); };

  // South face (left wall)
  ctx.beginPath();
  ctx.moveTo(...gSW); ctx.lineTo(...gSE); ctx.lineTo(...tSE); ctx.lineTo(...tSW);
  ctx.closePath(); ctx.fillStyle = leftC; ctx.fill(); stroke();

  // East face (right wall)
  ctx.beginPath();
  ctx.moveTo(...gSE); ctx.lineTo(...gNE); ctx.lineTo(...tNE); ctx.lineTo(...tSE);
  ctx.closePath(); ctx.fillStyle = rightC; ctx.fill(); stroke();

  // Top face (roof)
  ctx.beginPath();
  ctx.moveTo(...tNW); ctx.lineTo(...tNE); ctx.lineTo(...tSE); ctx.lineTo(...tSW);
  ctx.closePath(); ctx.fillStyle = topC; ctx.fill(); stroke();

  return { gSW, gSE, gNE, tNW, tNE, tSE, tSW };
}

// Pixel windows on building face (3-4 small rects)
function pxWindows(ctx, p1, p2, p3, p4, rows, cols, winC, frameC) {
  ctx.save();
  ctx.beginPath(); ctx.moveTo(...p1); ctx.lineTo(...p2); ctx.lineTo(...p3); ctx.lineTo(...p4); ctx.closePath(); ctx.clip();
  const ax = p2[0]-p1[0], ay = p2[1]-p1[1]; // along bottom
  const bx = p4[0]-p1[0], by = p4[1]-p1[1]; // along left side (upward)
  for (let wr=0; wr<rows; wr++) {
    const tv = (wr+0.6)/(rows+0.5);
    for (let wc=0; wc<cols; wc++) {
      const tu = (wc+0.3)/(cols+0.4);
      const wx = (p1[0] + ax*tu + bx*(1-tv)) | 0;
      const wy = (p1[1] + ay*tu + by*(1-tv)) | 0;
      ctx.fillStyle = frameC; ctx.fillRect(wx-1, wy-1, 4, 3);
      ctx.fillStyle = winC;   ctx.fillRect(wx, wy-1, 3, 2);
    }
  }
  ctx.restore();
}

// ── Pixel art tree ────────────────────────────────────────────────────────────
function pxTree(ctx, cx, cy, size) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath(); ctx.ellipse(cx, cy+1, size*0.7, size*0.25, 0, 0, Math.PI*2); ctx.fill();
  // Trunk
  ctx.fillStyle = "#5c3818"; ctx.fillRect(cx-1, cy-size+2, 2, size-1);
  ctx.fillStyle = "#3c2010"; ctx.fillRect(cx, cy-size+2, 1, size-1);
  // Canopy layers (dark → mid → light)
  const layers = [["#254a18","#3a6828","#4e8838","#5aa040"]];
  const L = size, tx=cx, ty=cy-size+1;
  [[L*0.9,"#254a18"],[L*0.78,"#3a6828"],[L*0.62,"#4e8838"],[L*0.45,"#5aa040"]].forEach(([r,c])=>{
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(tx, ty-r*0.15, r, 0, Math.PI*2); ctx.fill();
  });
  ctx.strokeStyle = "#1a3010"; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.arc(tx, ty-L*0.45*0.15, L*0.45, 0, Math.PI*2); ctx.stroke();
}

// ── City building definitions (at half scale) ─────────────────────────────────
const CITY_BUILDINGS = [
  // ─ Character house (NW) ─
  { c:0,r:0,cw:2,rh:2,bh:17,type:"house",label:"🏠 บ้าน",
    top:"#d8b870",left:"#b89048",right:"#906828",
    keys:["home","บ้าน","bedroom","living","bathroom","kitchen","ห้องนอน","ห้องน้ำ","ครัว","นั่งเล่น"] },
  // ─ Neighbor houses ─
  { c:3,r:0,cw:2,rh:2,bh:14,type:"house",label:"🏠 บ้านเพื่อนบ้าน",
    top:"#b8d080",left:"#88a858",right:"#688040",keys:[] },
  { c:0,r:3,cw:2,rh:2,bh:13,type:"house",label:"🏠 บ้านเพื่อนบ้าน",
    top:"#e0b8a0",left:"#b88870",right:"#906050",keys:[] },
  { c:3,r:3,cw:2,rh:2,bh:12,type:"house",label:"🏠 บ้านเพื่อนบ้าน",
    top:"#c8b8e0",left:"#9878c0",right:"#7858a0",keys:[] },
  // ─ 7-Eleven (SW) ─
  { c:0,r:8,cw:2,rh:1,bh:11,type:"store",label:"🏪 7-Eleven",
    top:"#206030",left:"#c82020",right:"#901010",
    keys:["7-eleven","convenience store","near office"] },
  // ─ Gas station (SW) ─
  { c:0,r:10,cw:2,rh:1,bh:9,type:"gas",label:"⛽ ปั๊มน้ำมัน",
    top:"#d8b010",left:"#a87808",right:"#785806",
    keys:["gas station","ปั๊มน้ำมัน"] },
  // ─ Cafe (SW) ─
  { c:3,r:8,cw:2,rh:1,bh:11,type:"cafe",label:"☕ คาเฟ่",
    top:"#a87038",left:"#806028",right:"#584018",
    keys:["cafe","คาเฟ่"] },
  // ─ Restaurant (SW lower) ─
  { c:3,r:10,cw:2,rh:2,bh:13,type:"restaurant",label:"🍜 ร้านอาหาร",
    top:"#d84820",left:"#a83010",right:"#802008",
    keys:["restaurant","ร้านอาหาร"] },
  // ─ Office tower (NE) ─
  { c:9,r:0,cw:3,rh:3,bh:45,type:"office",label:"🏢 ตึกทำงาน",
    top:"#5070a0",left:"#384870",right:"#283050",
    keys:["office","ทำงาน","บริษัท"] },
  // ─ Hospital (NE) ─
  { c:9,r:4,cw:2,rh:2,bh:27,type:"hospital",label:"🏥 โรงพยาบาล",
    top:"#d8eef8",left:"#a0c8e0",right:"#7098b0",
    keys:["hospital","โรงพยาบาล"] },
  // ─ Bank (NE) ─
  { c:12,r:1,cw:2,rh:2,bh:25,type:"bank",label:"🏦 ธนาคาร",
    top:"#c8a828",left:"#987818",right:"#685008",
    keys:["bank","ธนาคาร"] },
  // ─ Gym (NE) ─
  { c:12,r:4,cw:2,rh:2,bh:17,type:"gym",label:"🏋 ฟิตเนส",
    top:"#c84818",left:"#982808",right:"#681808",
    keys:["gym","ฟิตเนส"] },
  // ─ Mall (SE) ─
  { c:9,r:9,cw:4,rh:3,bh:29,type:"mall",label:"🛍 ห้างสรรพสินค้า",
    top:"#b0a0d8",left:"#8070b0",right:"#605090",
    keys:["shopping mall","mall","ห้างสรรพสินค้า","ห้าง"] },
  // ─ BTS station ─
  { c:5,r:6,cw:2,rh:1,bh:10,type:"bts",label:"🚉 BTS",
    top:"#3068b0",left:"#204880",right:"#102858",
    keys:["bts","road","ถนน","รถไฟฟ้า"] },
  // ─ Park gazebo (NW row5) ─
  { c:0,r:5,cw:1,rh:1,bh:7,type:"park",label:"🌳 ศาลา",
    top:"#607838",left:"#485828",right:"#303818",
    keys:["park","สวน"] },
];

// ── Road / sidewalk tile sets ─────────────────────────────────────────────────
const ROAD_SET = new Set(), WALK_SET = new Set(), PARK_SET = new Set();
for (let c=0;c<15;c++) ROAD_SET.add(`${c},6`);
for (let r=0;r<13;r++) ROAD_SET.add(`7,${r}`);
for (let c=0;c<15;c++) { WALK_SET.add(`${c},5`); WALK_SET.add(`${c},7`); }
for (let r=0;r<13;r++) { WALK_SET.add(`6,${r}`); WALK_SET.add(`8,${r}`); }
for (let c=1;c<=3;c++) for (let r=4;r<=5;r++) PARK_SET.add(`${c},${r}`);

function tileColor(c, r) {
  if (ROAD_SET.has(`${c},${r}`)) return null;
  if (WALK_SET.has(`${c},${r}`)) return "#b8a878";
  if (PARK_SET.has(`${c},${r}`)) return "#488038";
  return "#488038";
}

// ── Building → location lookup ────────────────────────────────────────────────
function findBuilding(locStr) {
  const l = (locStr || "").toLowerCase();
  for (const b of CITY_BUILDINGS) {
    if (b.keys && b.keys.some(k => l.includes(k))) return b;
  }
  return null;
}

function buildingEntranceOff(b) {
  const c = b.c + b.cw * 0.5, r = b.r + b.rh;
  return { x: isoX(c, r), y: isoY(c, r) - 2 };
}

// ── Cars ──────────────────────────────────────────────────────────────────────
const CAR_COLORS = [
  ["#c83020","#602010"],["#2858a0","#183060"],["#b09018","#504008"],
  ["#308048","#184028"],["#784090","#381848"],["#a04028","#481808"],
];
const INIT_CARS = [
  {t:0.05,dir:1, axis:"h",ci:0},{t:0.55,dir:1, axis:"h",ci:1},
  {t:0.30,dir:-1,axis:"h",ci:2},{t:0.15,dir:1, axis:"v",ci:3},
  {t:0.75,dir:-1,axis:"v",ci:4},{t:0.45,dir:1, axis:"h",ci:5},
];

// ── NPC definitions ───────────────────────────────────────────────────────────
const NPC_DEFS = [
  {name:"แม่ค้า",  shirt:"#d87028",pants:"#484028",hair:"#101008",female:true},
  {name:"พ่อค้า",  shirt:"#3870a0",pants:"#204060",hair:"#080810",female:false},
  {name:"เพื่อนบ้าน",shirt:"#48a060",pants:"#283820",hair:"#180808",female:false},
  {name:"คนเดิน", shirt:"#904898",pants:"#301840",hair:"#080808",female:true},
  {name:"นักเรียน",shirt:"#2898d0",pants:"#102840",hair:"#100808",female:false},
  {name:"คนงาน",  shirt:"#b86018",pants:"#402810",hair:"#080406",female:false},
];
const NPC_WAYPOINTS = [
  [6,1],[6,3],[6,5],[6,8],[6,10],[6,12],
  [8,1],[8,3],[8,5],[8,8],[8,10],[8,12],
  [2,5],[4,5],[5,5],[9,5],[11,5],[13,5],
  [2,7],[4,7],[5,7],[9,7],[11,7],[13,7],
];

// ── Renderer ──────────────────────────────────────────────────────────────────
class Renderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    // Offscreen pixel-art buffer
    this.off  = document.createElement("canvas");
    this.off.width  = OW;
    this.off.height = OH;
    this.oc   = this.off.getContext("2d");
    this.oc.imageSmoothingEnabled = false;

    this.characters = [];
    this.frame  = 0;
    this._animId = null;
    this.simTime = "08:00";
    this._emotionStates = new Map();
    this._bubbles       = new Map();

    this._cars = INIT_CARS.map(c => ({ ...c, speed: 0.0035 + Math.random() * 0.002 }));
    this._npcs = NPC_DEFS.map((def, i) => {
      const wp = NPC_WAYPOINTS[i % NPC_WAYPOINTS.length];
      const px = isoX(wp[0], wp[1]), py = isoY(wp[0], wp[1]);
      return { ...def, px, py, tx: px, ty: py, wait: 40 * i, wpIdx: i, facingRight: true };
    });
  }

  setCharacters(chars) {
    const prev = new Map(this.characters.map(c => [c.id, c]));
    this.characters = chars.map((c, i) => {
      const p  = prev.get(c.id);
      const pt = buildingEntranceOff(CITY_BUILDINGS[0]);
      return { ...c, colorIdx: i,
        px: p?.px ?? pt.x + i * 9, py: p?.py ?? pt.y,
        tx: p?.tx ?? pt.x + i * 9, ty: p?.ty ?? pt.y,
        facingRight: p?.facingRight ?? true,
        currentActivity: p?.currentActivity ?? "sleeping",
        locationStr:     p?.locationStr     ?? "home",
      };
    });
  }

  updateCharacterPosition(charId, locationStr, activity) {
    const char = this.characters.find(c => c.id === charId);
    if (!char) return;
    if (activity) char.currentActivity = activity;
    char.locationStr = locationStr;
    const b = findBuilding(locationStr);
    if (b) {
      const pt  = buildingEntranceOff(b);
      const idx = this.characters.indexOf(char);
      const spread = (idx - (this.characters.length - 1) / 2) * 7;
      if (Math.abs(pt.x + spread - char.px) > 3) char.facingRight = (pt.x + spread) > char.px;
      char.tx = pt.x + spread;
      char.ty = pt.y - idx * 2;
    }
  }

  setSimTime(t) { this.simTime = t || "08:00"; }
  _hour() { return parseInt((this.simTime || "08:00").split(":")[0]); }

  updateEmotionState(charId, emotions) {
    if (emotions) this._emotionStates.set(charId, emotions);
  }

  showCharacterMessage(charId, text) {
    if (!text) return;
    this._bubbles.set(charId, { text: text.substring(0, 44), created: this.frame });
  }

  _getDominantEmotionIcon(charId) {
    const e = this._emotionStates.get(charId);
    if (!e) return null;
    if (e.stress > 72)     return "😰";
    if (e.anxiety > 68)    return "😟";
    if (e.resentment > 55) return "😠";
    if (e.loneliness > 68) return "😔";
    if (e.love > 82)       return "💕";
    if (e.happiness > 80)  return "😊";
    if (e.energy < 25)     return "🥱";
    if (e.security < 30)   return "😨";
    return null;
  }

  start() {
    if (this._animId) return;
    const loop = () => {
      try { this._draw(); } catch(e) { console.error("Renderer:", e); }
      this.frame++;
      this._animId = requestAnimationFrame(loop);
    };
    loop();
  }
  stop() { if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; } }

  // ── Main draw ─────────────────────────────────────────────────────────────
  _draw() {
    // ── 1. Draw scene to offscreen buffer ──
    const oc = this.oc;
    oc.clearRect(0, 0, OW, OH);

    this._drawSky(oc);
    this._drawGround(oc);
    this._drawRoads(oc);
    this._drawBuildings(oc);
    this._drawParkTrees(oc);
    this._updateAndDrawCars(oc);
    this._updateAndDrawNPCs(oc);
    this._drawMainCharactersOff(oc);

    // ── 2. Scale 2× to main canvas (no interpolation) ──
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.off, 0, 0, this.canvas.width, this.canvas.height);

    // ── 3. Overlays at 2× coords on main canvas ──
    this._drawOverlays(ctx);
  }

  // ── Sky ───────────────────────────────────────────────────────────────────
  _drawSky(ctx) {
    const h = this._hour();
    let t, b;
    if      (h>=6  && h<9)  { t="#ff8840"; b="#ffc060"; }
    else if (h>=9  && h<17) { t="#4888c0"; b="#90c8e8"; }
    else if (h>=17 && h<20) { t="#983018"; b="#d87018"; }
    else                     { t="#060814"; b="#101828"; }
    const g = ctx.createLinearGradient(0,0,0,30);
    g.addColorStop(0,t); g.addColorStop(1,b);
    ctx.fillStyle = g; ctx.fillRect(0,0,OW,30);
    // Sun / moon (pixelated 3×3 or 2×2 dot)
    if (h>=6 && h<19) {
      const p=(h-6)/13, sx=(30+p*(OW-60))|0, sy=(16-Math.sin(p*Math.PI)*8)|0;
      ctx.fillStyle="#ffe000"; ctx.fillRect(sx-3,sy-3,7,7);
      ctx.fillStyle="#fff080"; ctx.fillRect(sx-1,sy-1,3,3);
    } else {
      ctx.fillStyle="#d0d8ff"; ctx.fillRect(60,10,5,5);
      ctx.fillStyle="#fff8ff"; ctx.fillRect(61,11,3,3);
    }
    // Pixel stars at night
    if (h<6||h>=20) {
      ctx.fillStyle="#ffffff";
      [[30,5],[80,8],[150,4],[220,9],[300,6],[360,3],[380,12],[250,3],[130,12]].forEach(([x,y])=>ctx.fillRect(x,y,1,1));
    }
    // Silhouette horizon buildings
    ctx.fillStyle = "rgba(20,15,30,0.35)";
    [[40,22,12],[110,20,18],[200,18,25],[280,22,14],[340,19,20],[390,24,10]].forEach(([x,y,w])=>{
      ctx.fillRect(x,30-y+2,w,y);
    });
  }

  // ── Ground tiles ──────────────────────────────────────────────────────────
  _drawGround(ctx) {
    const grassA = "#488038", grassB = "#3a6830";
    const walkA  = "#b8a870", walkB  = "#a09060";
    const parkA  = "#50903a", parkB  = "#3c7028";
    for (let r=0; r<13; r++) {
      for (let c=0; c<15; c++) {
        if (ROAD_SET.has(`${c},${r}`)) continue;
        const isWalk = WALK_SET.has(`${c},${r}`);
        const isPark = PARK_SET.has(`${c},${r}`);
        const checker = (c + r) % 2 === 0;
        const fill = isWalk ? (checker?walkA:walkB) : isPark ? (checker?parkA:parkB) : (checker?grassA:grassB);
        pxTile(ctx, c, r, fill, "rgba(0,0,0,0.12)");
        // Sidewalk brick lines
        if (isWalk) {
          ctx.strokeStyle = "rgba(80,60,20,0.25)"; ctx.lineWidth = 0.5;
          const cx = (isoX(c+0.5, r) + isoX(c+0.5, r+1)) / 2;
          const cy = (isoY(c+0.5, r) + isoY(c+0.5, r+1)) / 2;
          ctx.beginPath(); ctx.moveTo(isoX(c,r+0.5), isoY(c,r+0.5));
          ctx.lineTo(isoX(c+1,r+0.5), isoY(c+1,r+0.5)); ctx.stroke();
        }
      }
    }
  }

  // ── Roads ─────────────────────────────────────────────────────────────────
  _drawRoads(ctx) {
    const roadDark = "#505050", roadMid = "#606060";
    for (const key of ROAD_SET) {
      const [c, r] = key.split(",").map(Number);
      const checker = (c + r) % 2 === 0;
      pxTile(ctx, c, r, checker ? roadMid : roadDark);
    }
    // Intersection
    pxTile(ctx, 7, 6, "#585858");
    // Center dash lines (animated)
    ctx.strokeStyle = "#e8d820"; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    const off = -((this.frame * 0.25) % 7) | 0;
    ctx.lineDashOffset = off;
    // Horizontal dashes at row 6.5
    ctx.beginPath();
    ctx.moveTo(isoX(0,6.5)|0, isoY(0,6.5)|0);
    ctx.lineTo(isoX(15,6.5)|0, isoY(15,6.5)|0);
    ctx.stroke();
    // Vertical dashes at col 7.5
    ctx.lineDashOffset = off;
    ctx.beginPath();
    ctx.moveTo(isoX(7.5,0)|0, isoY(7.5,0)|0);
    ctx.lineTo(isoX(7.5,13)|0, isoY(7.5,13)|0);
    ctx.stroke();
    ctx.setLineDash([]);
    // Road edge highlight
    ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 0.75;
    ctx.beginPath(); ctx.moveTo(isoX(0,6),isoY(0,6)); ctx.lineTo(isoX(15,6),isoY(15,6)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(isoX(0,7),isoY(0,7)); ctx.lineTo(isoX(15,7),isoY(15,7)); ctx.stroke();
  }

  // ── Buildings ─────────────────────────────────────────────────────────────
  _drawBuildings(ctx) {
    const sorted = [...CITY_BUILDINGS].sort((a, b) => (a.c+a.r)-(b.c+b.r));
    for (const b of sorted) {
      // Foundation footprint
      for (let dc=0; dc<b.cw; dc++)
        for (let dr=0; dr<b.rh; dr++)
          pxTile(ctx, b.c+dc, b.r+dr, "#989080");

      const f = pxBox(ctx, b.c, b.r, b.cw, b.rh, b.bh, b.top, b.left, b.right);
      if (!f) continue;

      // Windows on south face
      if (b.bh >= 10) {
        const winC = "rgba(160,220,255,0.7)", frameC = "#1a0a04";
        const wRows = Math.max(1, ((b.bh / 8)|0));
        const wCols = Math.max(1, b.cw);
        pxWindows(ctx, f.gSW, f.gSE, f.tSE, f.tSW, wRows, wCols, winC, frameC);
        pxWindows(ctx, f.gSE, f.gNE, f.tNE, f.tSE, wRows, Math.max(1,b.rh), winC, frameC);
      }

      // Type-specific details
      this._bldgDetails(ctx, b, f);

      // Label above building
      const lx = (isoX(b.c+b.cw*0.5, b.r+b.rh*0.5))|0;
      const ly = (isoY(b.c+b.cw*0.5, b.r+b.rh*0.5) - b.bh - 4)|0;
      this._pxLabel(ctx, b.label, lx, ly);
    }
  }

  _bldgDetails(ctx, b, f) {
    const lx = (isoX(b.c+b.cw*0.5, b.r+b.rh*0.5))|0;
    const ly = (isoY(b.c+b.cw*0.5, b.r+b.rh*0.5) - b.bh)|0;
    if (b.type === "hospital") {
      ctx.fillStyle = "#f03030"; ctx.fillRect(lx-1, ly+1, 3, 1); ctx.fillRect(lx, ly, 1, 3);
    } else if (b.type === "store") {
      ctx.fillStyle = "#f5c020"; ctx.fillRect(lx-1, ly+1, 3, 2);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(lx, ly+1, 1, 2);
    } else if (b.type === "office") {
      // Antenna pixel
      ctx.fillStyle = "#888888"; ctx.fillRect(lx, ly-7, 1, 7);
      ctx.fillStyle = "#e03020"; ctx.fillRect(lx-1, ly-8, 3, 2);
    } else if (b.type === "mall") {
      // Skylight pixels
      ctx.fillStyle = "rgba(180,200,255,0.4)";
      ctx.fillRect(lx-4, ly+2, 9, 3);
      ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(lx-3, ly+2, 7, 1);
    } else if (b.type === "gas") {
      // Canopy
      ctx.fillStyle = "#f0c830"; ctx.fillRect(lx-6, ly-1, 13, 2);
      ctx.fillStyle = "#1a0a04"; ctx.strokeStyle = "#1a0a04"; ctx.lineWidth=0.5;
      ctx.strokeRect(lx-6, ly-1, 13, 2);
    }
  }

  _pxLabel(ctx, label, x, y) {
    if (!label) return;
    ctx.font = "4px 'Courier New'"; ctx.textAlign = "center";
    const w = ctx.measureText(label).width + 4;
    ctx.fillStyle = "rgba(10,5,2,0.7)";
    ctx.fillRect(x-w/2|0, y-5, w|0, 6);
    ctx.fillStyle = "#f0d898"; ctx.fillText(label, x, y);
  }

  // ── Park trees ────────────────────────────────────────────────────────────
  _drawParkTrees(ctx) {
    [[1,5,5],[2,5,4],[1,4,4],[2,4,5],[1,2,5],[2,2,4],[4,5,4],[5,5,5]].forEach(([c,r,sz])=>{
      pxTree(ctx, isoX(c+0.5,r+0.5)|0, isoY(c+0.5,r+0.5)|0, sz);
    });
  }

  // ── Cars ──────────────────────────────────────────────────────────────────
  _updateAndDrawCars(ctx) {
    for (const car of this._cars) {
      car.t = (car.t + car.dir * car.speed + 1) % 1;
      let cx, cy, ax, ay;
      if (car.axis === "h") {
        const col = car.t * 15;
        cx = isoX(col, 6.5)|0; cy = isoY(col, 6.5)|0;
        ax = isoX(col+0.1, 6.5) - cx; ay = isoY(col+0.1, 6.5) - cy;
      } else {
        const row = car.t * 13;
        cx = isoX(7.5, row)|0; cy = isoY(7.5, row)|0;
        ax = isoX(7.5, row+0.1) - cx; ay = isoY(7.5, row+0.1) - cy;
      }
      const [bodyC, shadowC] = CAR_COLORS[car.ci];
      this._pxCar(ctx, cx, cy, bodyC, shadowC, ax, ay);
    }
  }

  _pxCar(ctx, x, y, bodyC, darkC, ax, ay) {
    const angle = Math.atan2(ay, ax);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle);
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(-6,2,12,3);
    // Body
    ctx.fillStyle = bodyC; ctx.fillRect(-6,-3,12,5);
    // Roof
    ctx.fillStyle = darkC; ctx.fillRect(-3,-5,7,3);
    // Windows (pixel dots)
    ctx.fillStyle = "rgba(200,235,255,0.6)"; ctx.fillRect(-3,-5,3,2); ctx.fillRect(1,-5,3,2);
    // Outlines
    ctx.strokeStyle="#0a0502"; ctx.lineWidth=0.5;
    ctx.strokeRect(-6,-3,12,5); ctx.strokeRect(-3,-5,7,3);
    // Headlights
    const h = this._hour();
    ctx.fillStyle = (h<6||h>=19) ? "#fff080" : "rgba(255,240,100,0.3)";
    ctx.fillRect(5, -2, 2, 3);
    ctx.fillStyle = "#e02020"; ctx.fillRect(-7, -2, 2, 3);
    ctx.restore();
  }

  // ── NPCs ──────────────────────────────────────────────────────────────────
  _updateAndDrawNPCs(ctx) {
    for (const npc of this._npcs) {
      if (npc.wait > 0) { npc.wait--; }
      else {
        const dx=npc.tx-npc.px, dy=npc.ty-npc.py, dist=Math.hypot(dx,dy);
        if (dist < 1) {
          npc.wait = 60 + Math.random() * 100 | 0;
          const wp = NPC_WAYPOINTS[Math.random() * NPC_WAYPOINTS.length | 0];
          npc.tx = isoX(wp[0],wp[1]); npc.ty = isoY(wp[0],wp[1]);
        } else {
          const spd = 0.4;
          if (Math.abs(dx)>1) npc.facingRight = dx>0;
          npc.px += (dx/dist)*spd; npc.py += (dy/dist)*spd;
        }
      }
      this._pxSprite(ctx, npc.px|0, npc.py|0, npc.shirt, npc.pants, npc.hair, npc.facingRight, npc.female, false);
    }
  }

  // ── Main characters (offscreen) ───────────────────────────────────────────
  _drawMainCharactersOff(ctx) {
    const SHIRTS = ["#3888e8","#e85890","#38a860","#d8b820","#c03838","#8058d0"];
    const PANTS  = ["#283850","#382850","#182838","#383018","#381818","#281838"];
    const HAIR   = ["#100808","#181008","#7a3810","#080810","#180408","#080808"];
    const sorted = [...this.characters].sort((a,b)=>a.py-b.py);
    for (const char of sorted) {
      const dx=char.tx-char.px, dy=char.ty-char.py;
      if (Math.abs(dx)>1) char.facingRight = dx>0;
      char.px += dx*0.06; char.py += dy*0.06;
      const i = char.colorIdx;
      this._pxSprite(ctx, char.px|0, char.py|0,
        SHIRTS[i%SHIRTS.length], PANTS[i%PANTS.length], HAIR[i%HAIR.length],
        char.facingRight, char.gender==="female", true);
    }
  }

  // ── Pixel art sprite (~10px tall in offscreen = 20px displayed) ───────────
  _pxSprite(ctx, x, y, shirtC, pantsC, hairC, right, female, main) {
    const s = main ? 1 : 0.8; // not used for scaling, just flags
    // Ground shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(x-3,y,6,2);
    // Shoes
    ctx.fillStyle = "#181008"; ctx.fillRect(x-3,y-1,2,2); ctx.fillRect(x+1,y-1,2,2);
    // Legs / pants
    ctx.fillStyle = pantsC; ctx.fillRect(x-3,y-4,2,3); ctx.fillRect(x+1,y-4,2,3);
    // Belt line
    ctx.fillStyle = "#0a0602"; ctx.fillRect(x-3,y-4,6,1);
    // Body / shirt
    ctx.fillStyle = shirtC; ctx.fillRect(x-3,y-8,6,4);
    // Female: skirt overlay
    if (female) { ctx.fillStyle = "#d060a0"; ctx.fillRect(x-3,y-5,6,2); }
    // Arms
    ctx.fillStyle = shirtC; ctx.fillRect(x-5,y-8,2,3); ctx.fillRect(x+3,y-8,2,3);
    // Hands (skin)
    ctx.fillStyle = "#e0b070"; ctx.fillRect(x-5,y-5,2,2); ctx.fillRect(x+3,y-5,2,2);
    // Neck + head
    ctx.fillStyle = "#e0b070"; ctx.fillRect(x-2,y-9,4,1); ctx.fillRect(x-2,y-12,5,4);
    // Hair
    ctx.fillStyle = hairC; ctx.fillRect(x-3,y-13,6,2);
    if (female) { ctx.fillRect(x-3,y-12,2,4); ctx.fillRect(x+3,y-12,1,4); }
    // Eyes (facing direction)
    ctx.fillStyle = "#0a0404";
    if (right) { ctx.fillRect(x+1,y-11,1,1); ctx.fillRect(x-1,y-11,1,1); }
    else        { ctx.fillRect(x-2,y-11,1,1); ctx.fillRect(x,  y-11,1,1); }
    // Mouth smile
    ctx.fillStyle = "#b05040"; ctx.fillRect(x-1,y-9,3,1);
    // Outline rim (1px border for main chars)
    if (main) {
      ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 0.5;
      ctx.strokeRect(x-5, y-13, 12, 14);
    }
  }

  // ── Main canvas overlays (at 2× coords) ───────────────────────────────────
  _drawOverlays(ctx) {
    const S = DISPLAY_SCALE;
    // Interaction hearts between nearby chars
    for (let i=0; i<this.characters.length; i++) {
      for (let j=i+1; j<this.characters.length; j++) {
        const a=this.characters[i], b=this.characters[j];
        const dx=(a.px-b.px)*S, dy=(a.py-b.py)*S;
        if (Math.hypot(dx,dy) > 100) continue;
        const mx=(a.px+b.px)/2*S, my=(a.py+b.py)/2*S-30;
        ctx.font="12px serif"; ctx.textAlign="center";
        [0,8,16].forEach(off=>{
          const t=((this.frame*0.6+off)%24);
          ctx.globalAlpha=Math.max(0,0.8-t/26);
          ctx.fillText("💕",mx+Math.sin(off)*10,my-t*1.8);
        });
        ctx.globalAlpha=1;
      }
    }
    // Per character: name tag, emotion icon, speech bubble
    for (const char of this.characters) {
      const cx = char.px * S | 0, cy = char.py * S | 0;
      this._drawNameTag(ctx, char, cx, cy);
      this._drawEmotionIcon(ctx, char, cx, cy);
      this._drawBubble(ctx, char, cx, cy);
    }
  }

  _drawNameTag(ctx, char, cx, cy) {
    const name = char.nickname || char.name.split(" ")[0];
    ctx.font = "bold 9px 'Courier New'"; ctx.textAlign = "center";
    const w = ctx.measureText(name).width + 8;
    ctx.fillStyle = "rgba(10,5,2,0.72)";
    if (ctx.roundRect) ctx.roundRect(cx-w/2, cy-33, w, 11, 2);
    else ctx.rect(cx-w/2, cy-33, w, 11);
    ctx.fill();
    ctx.fillStyle = "#f0d898"; ctx.fillText(name, cx, cy-24);
  }

  _drawEmotionIcon(ctx, char, cx, cy) {
    const icon = this._getDominantEmotionIcon(char.id);
    if (!icon) return;
    const y = cy - 38 + Math.sin(this.frame * 0.05 + (char.bobOffset||0)) * 3;
    ctx.font = "13px serif"; ctx.textAlign = "center";
    ctx.globalAlpha = 0.92; ctx.fillText(icon, cx, y); ctx.globalAlpha = 1;
  }

  _drawBubble(ctx, char, cx, cy) {
    const bubble = this._bubbles.get(char.id);
    if (!bubble) return;
    const age = this.frame - bubble.created, maxAge = 200;
    if (age > maxAge) { this._bubbles.delete(char.id); return; }
    const alpha = age<20 ? age/20 : age>maxAge-30 ? (maxAge-age)/30 : 1;
    ctx.font = "bold 8px 'Courier New'"; ctx.textAlign = "center";
    const maxW = 110;
    const words = bubble.text.split(" ");
    const lines = []; let cur = "";
    for (const w of words) {
      const t = cur ? cur+" "+w : w;
      if (ctx.measureText(t).width > maxW-14) { if (cur) lines.push(cur); cur=w; }
      else cur=t;
    }
    if (cur) lines.push(cur);
    const lh=10, bh=lines.length*lh+10, bw=Math.min(maxW, Math.max(...lines.map(l=>ctx.measureText(l).width))+14);
    ctx.globalAlpha = alpha;
    const bx=cx-bw/2|0, by=cy-48-bh;
    ctx.fillStyle="#fffcf0";
    if (ctx.roundRect) ctx.roundRect(bx,by,bw,bh,4); else ctx.rect(bx,by,bw,bh);
    ctx.fill();
    ctx.strokeStyle="#5a3a18"; ctx.lineWidth=1;
    if (ctx.roundRect) ctx.roundRect(bx,by,bw,bh,4); else ctx.rect(bx,by,bw,bh);
    ctx.stroke();
    // Tail
    ctx.fillStyle="#fffcf0";
    ctx.beginPath(); ctx.moveTo(cx-4,by+bh); ctx.lineTo(cx+4,by+bh); ctx.lineTo(cx,by+bh+6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle="#5a3a18"; ctx.beginPath(); ctx.moveTo(cx-4,by+bh); ctx.lineTo(cx,by+bh+6); ctx.lineTo(cx+4,by+bh); ctx.stroke();
    ctx.fillStyle="#2a1408";
    lines.forEach((line,i)=>ctx.fillText(line,cx,by+8+i*lh));
    ctx.globalAlpha=1;
  }

  // Legacy HTML bubble
  showSpeechBubble(text) {
    const b = document.getElementById("speech-bubble");
    if (b) { b.textContent=text; b.classList.remove("hidden"); clearTimeout(this._bt); this._bt=setTimeout(()=>b.classList.add("hidden"),5000); }
  }
}

const renderer = new Renderer("world-canvas");
