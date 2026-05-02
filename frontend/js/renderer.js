/**
 * Phaser 3 — Isometric Pixel-Art City Renderer
 * AI Relationship Simulator
 * Tiles: 64×32  |  Scene: 800×450  |  pixelArt: true
 */

// ─── Shared state bridge (renderer public API → Phaser scene) ─────────────────
const _rs = {
  simHour:   8,
  chars:     [],           // [{id, name, nickname, gender, avatar_emoji, character_type, colorIdx}]
  moves:     new Map(),    // charId → {locStr, activity}
  emotions:  new Map(),    // charId → {happiness, stress, …}
  emoBursts: new Map(),    // charId → {icon, born, duration} — timed emotion pop
  bubbles:   new Map(),    // charId → {text, born}
  _scene:    null,
};

// ─── Isometric projection (48×24 tiles — fits 15×13 grid in 800×450) ─────────
const TW = 48, TH = 24;
const OX = 380, OY = 100;  // grid origin: X range≈92–716, Y range≈100–412

function isoX(c, r)      { return OX + (c - r) * (TW / 2); }
function isoY(c, r, z=0) { return OY + (c + r) * (TH / 2) - z; }
function isoDepth(c, r, z=0) { return (c + r) * 1000 + z; }

// ─── City buildings ───────────────────────────────────────────────────────────
const BUILDINGS = [
  { c:0,  r:0,  cw:2, rh:2, bh:44,  type:"house",      label:"🏠 บ้าน",            top:0xd8b870, left:0xb89048, right:0x906828,
    keys:["home","บ้าน","ที่บ้าน","บ้านของ","นอน","bedroom","ห้องนอน","kitchen","ครัว","living","bathroom","ห้องน้ำ","house","ที่พัก","อยู่บ้าน"] },
  { c:3,  r:0,  cw:2, rh:2, bh:36,  type:"house",      label:"🏠 บ้านเพื่อนบ้าน",  top:0xb8d080, left:0x88a858, right:0x688040, keys:[] },
  { c:0,  r:3,  cw:2, rh:2, bh:34,  type:"house",      label:"🏠 บ้านเพื่อนบ้าน",  top:0xe0b8a0, left:0xb88870, right:0x906050, keys:[] },
  { c:3,  r:3,  cw:2, rh:2, bh:32,  type:"house",      label:"🏠 บ้านเพื่อนบ้าน",  top:0xc8b8e0, left:0x9878c0, right:0x7858a0, keys:[] },
  { c:0,  r:8,  cw:2, rh:1, bh:28,  type:"store",      label:"🏪 7-Eleven",         top:0x206030, left:0xc82020, right:0x901010,
    keys:["7-eleven","convenience store","near office","ร้านสะดวก","minimart"] },
  { c:0,  r:10, cw:2, rh:1, bh:24,  type:"gas",        label:"⛽ ปั๊มน้ำมัน",      top:0xd8b010, left:0xa87808, right:0x785806,
    keys:["gas station","ปั๊มน้ำมัน","ปั๊ม","gas"] },
  { c:3,  r:8,  cw:2, rh:1, bh:28,  type:"cafe",       label:"☕ คาเฟ่",            top:0xa87038, left:0x806028, right:0x584018,
    keys:["cafe","คาเฟ่","coffee","กาแฟ","ร้านกาแฟ","ชา","ชานม"] },
  { c:3,  r:10, cw:2, rh:2, bh:34,  type:"restaurant", label:"🍜 ร้านอาหาร",        top:0xd84820, left:0xa83010, right:0x802008,
    keys:["restaurant","ร้านอาหาร","food court","ทานข้าว","กินข้าว","อาหาร","lunch","dinner","breakfast","มื้อ","ข้าว","food"] },
  { c:9,  r:0,  cw:3, rh:3, bh:120, type:"office",     label:"🏢 ตึกทำงาน",         top:0x5878b8, left:0x3850a0, right:0x283880,
    keys:["office","ทำงาน","ที่ทำงาน","บริษัท","work","สำนักงาน","ออฟฟิศ","ตึก","at work","working"] },
  { c:9,  r:4,  cw:2, rh:2, bh:70,  type:"hospital",   label:"🏥 โรงพยาบาล",       top:0xd8eef8, left:0xa0c8e0, right:0x7098b0,
    keys:["hospital","โรงพยาบาล","clinic","หมอ","doctor","พยาบาล","คลินิก","นพ"] },
  { c:12, r:1,  cw:2, rh:2, bh:65,  type:"bank",       label:"🏦 ธนาคาร",           top:0xd8b830, left:0xa88818, right:0x785808,
    keys:["bank","ธนาคาร","atm","ธนาคาร","ถอนเงิน","โอนเงิน"] },
  { c:12, r:4,  cw:2, rh:2, bh:44,  type:"gym",        label:"🏋 ฟิตเนส",           top:0xc84818, left:0x982808, right:0x681808,
    keys:["gym","ฟิตเนส","sport","สนามกีฬา","exercise","ออกกำลัง","วิ่ง","fitness","กีฬา","yoga"] },
  { c:9,  r:9,  cw:4, rh:3, bh:75,  type:"mall",       label:"🛍 ห้างสรรพสินค้า",   top:0xc0b0e8, left:0x9080c8, right:0x705098,
    keys:["shopping mall","mall","ห้างสรรพสินค้า","ห้าง","ซื้อของ","shopping","เดินห้าง","ตลาด"] },
  { c:5,  r:6,  cw:2, rh:1, bh:26,  type:"bts",        label:"🚉 BTS",              top:0x3878c0, left:0x205890, right:0x103870,
    keys:["bts","รถไฟฟ้า","station","สถานี","subway","mrt","รถไฟ","transit"] },
  { c:0,  r:5,  cw:1, rh:1, bh:18,  type:"park",       label:"🌳 ศาลา",             top:0x607838, left:0x485828, right:0x303818,
    keys:["park","สวน","garden","สวนสาธารณะ","outdoor","ข้างนอก","นั่งเล่น","ทางเดิน"] },
];

// ─── Tile classification ──────────────────────────────────────────────────────
const ROAD_SET = new Set(), WALK_SET = new Set(), PARK_SET = new Set();
for (let c = 0; c < 15; c++) ROAD_SET.add(`${c},6`);
for (let r = 0; r < 13; r++) ROAD_SET.add(`7,${r}`);
for (let c = 0; c < 15; c++) { WALK_SET.add(`${c},5`); WALK_SET.add(`${c},7`); }
for (let r = 0; r < 13; r++) { WALK_SET.add(`6,${r}`); WALK_SET.add(`8,${r}`); }
for (let c = 1; c <= 3; c++) for (let r = 4; r <= 5; r++) PARK_SET.add(`${c},${r}`);

function findBuilding(loc) {
  const l = (loc || "").toLowerCase();
  return BUILDINGS.find(b => b.keys && b.keys.some(k => l.includes(k))) || null;
}
function bldgEntrance(b) { return { c: b.c + b.cw * 0.5, r: b.r + b.rh }; }

// Sidewalk waypoints for characters with outdoor/transit locations
const OUTDOOR_SPOTS = [
  {c:6,r:3},{c:8,r:3},{c:6,r:9},{c:8,r:9},
  {c:6,r:1},{c:8,r:1},{c:6,r:11},{c:8,r:11},
];

// ─── NPC definitions ──────────────────────────────────────────────────────────
const NPC_DEFS = [
  { shirt:0xd87028, pants:0x484028, hair:0x100808, female:true  },
  { shirt:0x3870a0, pants:0x204060, hair:0x080810, female:false },
  { shirt:0x48a060, pants:0x283820, hair:0x180808, female:false },
  { shirt:0x904898, pants:0x301840, hair:0x080808, female:true  },
  { shirt:0x2898d0, pants:0x102840, hair:0x100808, female:false },
  { shirt:0xb86018, pants:0x402810, hair:0x080406, female:false },
];
const NPC_WPS = [
  [6,1],[6,3],[6,5],[6,8],[6,10],[6,12],
  [8,1],[8,3],[8,5],[8,8],[8,10],[8,12],
  [2,5],[4,5],[9,5],[11,5],[13,5],[2,7],[4,7],[9,7],
];

// Indoor waypoints: each has the building interior point and a safe sidewalk approach node
const NPC_INDOOR_WPS = [
  { wp:[1,1],   app:[6,1]  },   // house[0]
  { wp:[4,4],   app:[6,5]  },   // house[3]
  { wp:[10,1],  app:[8,1]  },   // office
  { wp:[4,9],   app:[6,8]  },   // cafe
  { wp:[4,11],  app:[6,10] },   // restaurant
  { wp:[11,10], app:[8,10] },   // mall
  { wp:[10,5],  app:[8,5]  },   // hospital
];

// ─── NPC path routing — route through sidewalk corridors to avoid clipping buildings ───
function _npcCorr(wp) {
  if (!wp) return null;
  if (wp[0] === 6) return 'c6';
  if (wp[0] === 8) return 'c8';
  if (wp[1] === 5) return 'r5';
  if (wp[1] === 7) return 'r7';
  return null;
}
const _NPC_JUNCTIONS = {
  'c6,r5':[6,5],'r5,c6':[6,5],'c6,r7':[6,7],'r7,c6':[6,7],
  'c8,r5':[8,5],'r5,c8':[8,5],'c8,r7':[8,7],'r7,c8':[8,7],
  'c6,c8':[6,5],'c8,c6':[8,5],'r5,r7':[6,5],'r7,r5':[6,7],
};
function _npcPathTo(fromWp, toWp) {
  const fc = _npcCorr(fromWp), tc = _npcCorr(toWp);
  if (!fc || !tc || fc === tc) return [toWp];
  const j = _NPC_JUNCTIONS[`${fc},${tc}`];
  return j ? [j, toWp] : [toWp];
}

// ─── Car definitions ──────────────────────────────────────────────────────────
const CAR_COLORS = [
  [0xc83020,0x601008],[0x2858a0,0x183060],[0xb09018,0x504008],
  [0x308048,0x184028],[0x784090,0x381848],[0xa04028,0x481808],
];
const INIT_CARS = [
  {t:0.05,dir:1, axis:"h",ci:0},{t:0.55,dir:1, axis:"h",ci:1},
  {t:0.30,dir:-1,axis:"h",ci:2},{t:0.15,dir:1, axis:"v",ci:3},
  {t:0.75,dir:-1,axis:"v",ci:4},{t:0.45,dir:1, axis:"h",ci:5},
];

// ─── Character / Pet sprite palettes ─────────────────────────────────────────
const CHAR_PALETTE = [
  { shirt:0x3888e8,pants:0x283860,hair:0x100808 },
  { shirt:0xe85890,pants:0x382850,hair:0x181008 },
  { shirt:0x38a860,pants:0x182838,hair:0x7a3810 },
  { shirt:0xd8b820,pants:0x383018,hair:0x080810 },
  { shirt:0xc03838,pants:0x381818,hair:0x180408 },
  { shirt:0x8058d0,pants:0x281838,hair:0x080808 },
];

const PET_PALETTE = [
  { body:0xd09050, dark:0x805028, eye:0x20c030 }, // orange tabby
  { body:0x303030, dark:0x181818, eye:0xf0d820 }, // black
  { body:0xe0d8c8, dark:0xb09870, eye:0x20a8d8 }, // cream/white
  { body:0x808070, dark:0x504840, eye:0x30d050 }, // gray
  { body:0xa07040, dark:0x604020, eye:0xd0a020 }, // brown
  { body:0xd0c088, dark:0xa08050, eye:0x38b828 }, // golden
];

// ─── Colour helpers ───────────────────────────────────────────────────────────
function lighten(hex, amt)  {
  const r=Math.min(255,((hex>>16)&0xff)+amt), g=Math.min(255,((hex>>8)&0xff)+amt), b=Math.min(255,(hex&0xff)+amt);
  return (r<<16)|(g<<8)|b;
}
function darken(hex, amt) { return lighten(hex, -amt); }
function _parseColor(s) {
  if (typeof s === 'number') return s;
  if (typeof s === 'string' && s.startsWith('#')) return parseInt(s.slice(1), 16);
  return null;
}
function hexToRgba(hex, a) {
  return `rgba(${(hex>>16)&0xff},${(hex>>8)&0xff},${hex&0xff},${a})`;
}

// ─── Shared camera: wheel zoom + drag pan + pinch-to-zoom (desktop & mobile) ──
function _bindCameraControls(scene, minZ, maxZ, zoomFactor) {
  scene._dragPan = null;
  scene._didDrag = false;
  scene._lastTap = 0;
  scene._pinchDist = null;
  scene.input.addPointer(1); // ensure pointer2 slot for pinch gesture

  scene.input.on('wheel', (_ptr, _objs, _dx, dy) => {
    const cam = scene.cameras.main;
    cam.zoom = Phaser.Math.Clamp(cam.zoom - dy * zoomFactor, minZ, maxZ);
  });

  scene.input.on('pointerdown', (ptr) => {
    const p2 = scene.input.pointer2;
    if (p2 && p2.isDown) {
      scene._pinchDist = Math.hypot(scene.input.pointer1.x - p2.x, scene.input.pointer1.y - p2.y);
      scene._dragPan = null;
      return;
    }
    const now = Date.now();
    if (now - scene._lastTap < 280 && !scene._didDrag) {
      scene.cameras.main.zoom = 1; scene.cameras.main.setScroll(0, 0);
    }
    scene._dragPan = { sx: scene.cameras.main.scrollX, sy: scene.cameras.main.scrollY, px: ptr.x, py: ptr.y };
    scene._didDrag = false;
  });

  scene.input.on('pointermove', (ptr) => {
    const p2 = scene.input.pointer2;
    if (p2 && p2.isDown && scene.input.pointer1.isDown) {
      const dist = Math.hypot(scene.input.pointer1.x - p2.x, scene.input.pointer1.y - p2.y);
      if (scene._pinchDist !== null) {
        const cam = scene.cameras.main;
        cam.zoom = Phaser.Math.Clamp(cam.zoom + (dist - scene._pinchDist) * 0.006, minZ, maxZ);
      }
      scene._pinchDist = dist;
      return;
    }
    scene._pinchDist = null;
    if (!scene._dragPan || !ptr.isDown) return;
    const dx = ptr.x - scene._dragPan.px, dy = ptr.y - scene._dragPan.py;
    if (Math.hypot(dx, dy) > 8 || scene._didDrag) {
      scene._didDrag = true;
      const cam = scene.cameras.main;
      cam.scrollX = scene._dragPan.sx - dx / cam.zoom;
      cam.scrollY = scene._dragPan.sy - dy / cam.zoom;
    }
  });

  scene.input.on('pointerup', () => {
    const wasPinching = scene._pinchDist !== null;
    scene._pinchDist = null;
    scene._dragPan = null;
    if (!scene._didDrag && !wasPinching) scene._lastTap = Date.now();
    scene.time.delayedCall(50, () => { scene._didDrag = false; });
  });
}

// ─── Main Phaser Scene ────────────────────────────────────────────────────────
class IsoScene extends Phaser.Scene {
  constructor() { super({ key: 'IsoScene' }); }

  preload() { /* all textures generated programmatically */ }

  create() {
    this._tick = 0;
    this._charObjs = new Map(); // charId → { sprite: Graphics, label: Text, emoBubble: Text }
    this._npcs = [];
    this._cars = [];
    this._depthLayer = 0;
    this._followId = null;

    this._makeTileTextures();
    this._makeCharTextures();
    this._makeCarTexture();
    this._buildSky();
    this._buildTerrain();
    this._buildBuildings();
    this._buildTrees();
    this._buildRoadMarkings();
    this._spawnNPCs();
    this._spawnCars();

    // Overlay graphics drawn on top of everything
    this._overlayGfx = this.add.graphics().setDepth(500000);
    // Text pool for speech bubbles
    this._bubbleTexts = new Map();

    _rs._scene = this;

    // Camera: wheel zoom + drag pan + pinch-to-zoom (mobile)
    _bindCameraControls(this, 0.75, 2.5, 0.0007);

    // Chars may have been set before Phaser finished loading
    if (_rs.chars.length > 0) this.updateChars(_rs.chars);
    // Apply any pending moves
    for (const [id, m] of _rs.moves) this.moveTo(id, m.locStr);
  }

  update(time, delta) {
    this._tick++;
    this._updateSky();
    this._updateCars(delta);
    this._updateNPCs(delta);
    this._updateMainChars(delta);
    this._updateOverlays();
  }

  // ── Tile texture generation ─────────────────────────────────────────────────
  _makeTileTextures() {
    const defs = [
      { key:'grass_a', base:0x3a7428, hi:0x4e9038, sh:0x284e18 },
      { key:'grass_b', base:0x346820, hi:0x488030, sh:0x223c10 },
      { key:'walk_a',  base:0xc8b880, hi:0xdccc94, sh:0xa89860 },
      { key:'walk_b',  base:0xb8a870, hi:0xccbc84, sh:0x988850 },
      { key:'road',    base:0x525252, hi:0x646464, sh:0x383838 },
      { key:'road_d',  base:0x484848, hi:0x5a5a5a, sh:0x303030 },
      { key:'park_g',  base:0x489038, hi:0x5aaa48, sh:0x306428 },
    ];

    for (const d of defs) {
      const g = this.make.graphics({ x:0, y:0, add:false });
      // Base diamond
      g.fillStyle(d.base);
      g.fillPoints([{x:TW/2,y:0},{x:TW,y:TH/2},{x:TW/2,y:TH},{x:0,y:TH/2}], true);

      // Top-left edge highlight
      g.lineStyle(1.5, d.hi, 0.7);
      g.beginPath(); g.moveTo(0,TH/2); g.lineTo(TW/2,0); g.lineTo(TW,TH/2); g.strokePath();

      // Bottom edge shadow
      g.lineStyle(1.5, d.sh, 0.7);
      g.beginPath(); g.moveTo(0,TH/2); g.lineTo(TW/2,TH); g.lineTo(TW,TH/2); g.strokePath();

      // Texture details
      if (d.key.startsWith('grass')) {
        // Pixel grass dots
        const dots = [[TW/2-10,TH/2-2],[TW/2+8,TH/2-4],[TW/2-4,TH/2+4],[TW/2+12,TH/2+1],[TW/2-14,TH/2+2],[TW/2+2,TH/2-6],[TW/2-6,TH/2+6]];
        g.fillStyle(d.sh, 0.5);
        dots.forEach(([x,y]) => g.fillRect(x,y,2,2));
        // Bright highlight spots
        g.fillStyle(d.hi, 0.35);
        [[TW/2-2,TH/2-5],[TW/2+6,TH/2+3]].forEach(([x,y]) => g.fillRect(x,y,3,2));
      } else if (d.key.startsWith('walk')) {
        // Brick/tile pattern
        g.lineStyle(1, d.sh, 0.35);
        g.beginPath();
        g.moveTo(TW/4,   TH/4);   g.lineTo(3*TW/4, TH/4);
        g.moveTo(TW/4,   3*TH/4); g.lineTo(3*TW/4, 3*TH/4);
        g.moveTo(TW/2,   TH/4);   g.lineTo(TW/2,   3*TH/4);
        g.strokePath();
      } else if (d.key.startsWith('road')) {
        // Road surface micro-texture
        g.fillStyle(0x404040, 0.3);
        for (let i = 0; i < 6; i++) g.fillRect(TW/2-10+i*4, TH/2-1, 2, 1);
      } else if (d.key.startsWith('park')) {
        // Grass + small flower dots
        g.fillStyle(0xffd020, 0.6);
        [[TW/2-8,TH/2],[TW/2+4,TH/2-3],[TW/2,TH/2+4]].forEach(([x,y])=>g.fillCircle(x,y,1.5));
      }

      g.generateTexture(d.key, TW, TH);
      g.destroy();
    }
  }

  // ── Character + NPC sprite textures (16×24 each, 4 variants) ──────────────
  _makeCharTextures() {
    for (let ci = 0; ci < 6; ci++) {
      for (const dir of ['l','r']) {
        for (const gender of ['m','f']) {
          const { shirt, pants, hair } = CHAR_PALETTE[ci];
          this._genSprite(`char_${ci}_${dir}_${gender}`, shirt, pants, hair, dir==='r', gender==='f');
        }
      }
    }
    // NPC textures
    for (let ni = 0; ni < NPC_DEFS.length; ni++) {
      const d = NPC_DEFS[ni];
      this._genSprite(`npc_${ni}_r`, d.shirt, d.pants, d.hair, true,  d.female);
      this._genSprite(`npc_${ni}_l`, d.shirt, d.pants, d.hair, false, d.female);
    }
    // Pet textures
    for (let ci = 0; ci < 6; ci++) {
      const { body, dark, eye } = PET_PALETTE[ci];
      this._genPetSprite(`pet_${ci}_r`, body, dark, eye, true);
      this._genPetSprite(`pet_${ci}_l`, body, dark, eye, false);
    }
  }

  _ensureCharTextures(chars) {
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const ci = ch.colorIdx ?? (i % 6);
      const app = ch.profile_extra?.appearance || {};
      const isPet = ch.character_type === 'pet';
      if (isPet) {
        const pal  = PET_PALETTE[ci % 6];
        const body = _parseColor(app.body_color) ?? pal.body;
        const dark = _parseColor(app.dark_color)  ?? darken(body, 40);
        const eye  = _parseColor(app.eye_color)   ?? pal.eye;
        this._genPetSprite(`pet_${ch.id}_r`, body, dark, eye, true);
        this._genPetSprite(`pet_${ch.id}_l`, body, dark, eye, false);
      } else {
        const pal      = CHAR_PALETTE[ci % 6];
        const shirt    = _parseColor(app.shirt)      ?? pal.shirt;
        const pants    = _parseColor(app.pants)      ?? pal.pants;
        const hairCol  = _parseColor(app.hair_color) ?? pal.hair;
        const hairStyle = app.hair_style || null;
        for (const dir of ['r', 'l']) {
          for (const gender of ['m', 'f']) {
            this._genSprite(`char_${ch.id}_${dir}_${gender}`, shirt, pants, hairCol, dir==='r', gender==='f', hairStyle);
          }
        }
      }
    }
  }

  _genSprite(key, shirt, pants, hair, right, female, hairStyle) {
    const W=16, H=24;
    const g = this.make.graphics({x:0,y:0,add:false});
    const skin = 0xe8b870;
    // Ground shadow
    g.fillStyle(0x000000, 0.18); g.fillEllipse(W/2,H-1,10,4);
    // Shoes
    g.fillStyle(0x181008); g.fillRect(right?2:4,H-5,3,2); g.fillRect(right?7:9,H-5,3,2);
    // Legs
    g.fillStyle(pants); g.fillRect(right?2:4,H-10,3,5); g.fillRect(right?7:9,H-10,3,5);
    // Belt
    g.fillStyle(darken(pants,20)); g.fillRect(right?1:3,H-10,10,2);
    // Body
    g.fillStyle(shirt);
    if (female) {
      g.fillRect(right?1:3,H-17,10,7);
      g.fillStyle(0xe060a8); g.fillRect(right?2:4,H-11,8,3);
    } else {
      g.fillRect(right?1:3,H-17,10,7);
    }
    // Arms
    g.fillStyle(shirt);
    g.fillRect(right?-1:1,H-17,2,5); g.fillRect(right?11:13,H-17,2,5);
    // Hands
    g.fillStyle(skin); g.fillRect(right?-1:1,H-13,2,2); g.fillRect(right?11:13,H-13,2,2);
    // Neck + head
    g.fillStyle(skin); g.fillRect(right?5:7,H-18,2,1); g.fillRect(right?4:6,H-23,6,5);
    // Hair
    g.fillStyle(hair); g.fillRect(right?3:5,H-24,8,2);
    const _hs = hairStyle || (female ? 'long' : 'short');
    if (_hs === 'long') { g.fillRect(right?3:5,H-23,2,5); g.fillRect(right?9:11,H-23,2,5); }
    else if (_hs === 'bun') { g.fillRect(right?5:7,H-26,4,2); g.fillRect(right?6:8,H-27,2,1); }
    // Eyes
    g.fillStyle(0x080404);
    if (right) { g.fillRect(7,H-21,1,1); g.fillRect(9,H-21,1,1); }
    else        { g.fillRect(4,H-21,1,1); g.fillRect(6,H-21,1,1); }
    // Mouth
    g.fillStyle(0xb05040); g.fillRect(right?6:8,H-18,2,1);
    // Outline
    g.lineStyle(1, 0x000000, 0.4);
    g.strokeRect(right?1:3, H-17, 10, 12);

    g.generateTexture(key, W, H);
    g.destroy();
  }

  _genPetSprite(key, body, dark, eyeColor, isRight) {
    const W = 16, H = 24;
    const g = this.make.graphics({ x:0, y:0, add:false });
    const light = lighten(body, 40);
    // Shadow
    g.fillStyle(0x000000, 0.12); g.fillEllipse(8, 23, 12, 3);
    // Tail (back of animal)
    g.fillStyle(body);
    if (isRight) { g.fillRect(0, 10, 3, 2); g.fillRect(0, 8, 2, 3); g.fillRect(1, 7, 2, 2); }
    else         { g.fillRect(13, 10, 3, 2); g.fillRect(14, 8, 2, 3); g.fillRect(13, 7, 2, 2); }
    // Body
    g.fillStyle(body);  g.fillRect(3, 11, 10, 7);
    g.fillStyle(light); g.fillRect(5, 12, 6, 5); // tummy
    // Head (on the side the animal is facing)
    const hx = isRight ? 7 : 1;
    g.fillStyle(body); g.fillRect(hx, 3, 8, 8);
    // Pointed ears
    g.fillStyle(dark);
    g.fillTriangle(hx, 3, hx+2, 3, hx+1, 0);
    g.fillTriangle(hx+5, 3, hx+7, 3, hx+6, 0);
    g.fillStyle(lighten(dark, 60));
    g.fillRect(hx, 1, 1, 2); g.fillRect(hx+5, 1, 1, 2);
    // Eyes
    g.fillStyle(eyeColor); g.fillRect(hx+2, 6, 1, 2); g.fillRect(hx+5, 6, 1, 2);
    g.fillStyle(0x060404);  g.fillRect(hx+2, 7, 1, 1); g.fillRect(hx+5, 7, 1, 1);
    // Nose
    g.fillStyle(0xd07878); g.fillRect(hx+3, 9, 2, 1);
    // Whiskers
    g.lineStyle(0.5, lighten(body, 60), 0.6);
    if (isRight) {
      g.beginPath(); g.moveTo(hx, 9); g.lineTo(hx-3, 8); g.strokePath();
      g.beginPath(); g.moveTo(hx, 10); g.lineTo(hx-3, 11); g.strokePath();
    } else {
      g.beginPath(); g.moveTo(hx+8, 9); g.lineTo(hx+11, 8); g.strokePath();
      g.beginPath(); g.moveTo(hx+8, 10); g.lineTo(hx+11, 11); g.strokePath();
    }
    // Legs (4 stubby legs)
    g.fillStyle(body);
    g.fillRect(3, 18, 2, 5); g.fillRect(6, 18, 2, 5);
    g.fillRect(9, 18, 2, 5); g.fillRect(12, 18, 2, 5);
    // Paws
    g.fillStyle(dark);
    g.fillRect(3, 22, 3, 2); g.fillRect(6, 22, 3, 2);
    g.fillRect(9, 22, 3, 2); g.fillRect(12, 22, 3, 2);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // ── Car texture ─────────────────────────────────────────────────────────────
  _makeCarTexture() {
    for (let ci = 0; ci < CAR_COLORS.length; ci++) {
      const [body, dark] = CAR_COLORS[ci];
      const g = this.make.graphics({x:0,y:0,add:false});
      // Shadow
      g.fillStyle(0x000000,0.2); g.fillEllipse(14,14,28,8);
      // Body
      g.fillStyle(body); g.fillRect(2,8,24,10);
      // Roof
      g.fillStyle(dark); g.fillRect(6,4,16,6);
      // Windows
      g.fillStyle(0x90d0f0,0.7); g.fillRect(7,5,6,4); g.fillRect(15,5,6,4);
      // Outlines
      g.lineStyle(1,0x000000,0.5); g.strokeRect(2,8,24,10); g.strokeRect(6,4,16,6);
      // Headlights
      g.fillStyle(0xffffaa); g.fillRect(24,9,3,3);
      // Taillights
      g.fillStyle(0xe02020); g.fillRect(1,9,3,3);
      g.generateTexture(`car_${ci}`, 28, 18);
      g.destroy();
    }
  }

  // ── Sky ─────────────────────────────────────────────────────────────────────
  _buildSky() {
    this._skyGfx = this.add.graphics().setDepth(-100000);
    this._sunMoon = this.add.graphics().setDepth(-99999);
    this._starGfx = this.add.graphics().setDepth(-99998);
    this._updateSky();
  }

  _updateSky() {
    const h = _rs.simHour;
    this._skyGfx.clear();
    let c1, c2;
    if      (h>=6  && h<9)  { c1=0xff8840; c2=0xffc060; }
    else if (h>=9  && h<17) { c1=0x3878c8; c2=0x88c8f0; }
    else if (h>=17 && h<20) { c1=0x882810; c2=0xd86010; }
    else                     { c1=0x060814; c2=0x101828; }

    // Sky gradient (manual 2-colour blend)
    this._skyGfx.fillGradientStyle(c1,c1,c2,c2,1);
    this._skyGfx.fillRect(0, 0, 800, 80);
    // Horizon silhouette
    this._skyGfx.fillStyle(0x141020, 0.3);
    [[40,20,16],[110,18,22],[200,16,28],[290,20,18],[360,17,24],[420,22,14],[520,16,18],[640,20,16],[720,18,12]].forEach(([x,yh,w]) => {
      this._skyGfx.fillRect(x, 78-yh, w, yh);
    });

    // Sun / moon
    this._sunMoon.clear();
    if (h>=6 && h<19) {
      const p=(h-6)/13, sx=30+p*740, sy=55-Math.sin(p*Math.PI)*35;
      this._sunMoon.fillStyle(0xffe840); this._sunMoon.fillCircle(sx,sy,10);
      this._sunMoon.fillStyle(0xffffa0,0.4); this._sunMoon.fillCircle(sx,sy,16);
    } else {
      this._sunMoon.fillStyle(0xd8e8ff); this._sunMoon.fillCircle(80,24,7);
      this._sunMoon.fillStyle(0x000000,1); this._sunMoon.fillCircle(84,22,6);
    }
    // Stars
    this._starGfx.clear();
    if (h<6 || h>=20) {
      this._starGfx.fillStyle(0xffffff);
      [[30,8],[90,12],[160,6],[240,14],[320,9],[400,5],[480,13],[560,7],[650,11],[730,8]].forEach(([x,y])=>{
        this._starGfx.fillRect(x,y,2,2);
      });
    }
  }

  // ── Terrain tiles ────────────────────────────────────────────────────────────
  _buildTerrain() {
    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 15; c++) {
        const key = `${c},${r}`;
        let tex;
        if      (ROAD_SET.has(key)) tex = (c+r)%2===0 ? 'road' : 'road_d';
        else if (WALK_SET.has(key)) tex = (c+r)%2===0 ? 'walk_a' : 'walk_b';
        else if (PARK_SET.has(key)) tex = 'park_g';
        else                        tex = (c+r)%2===0 ? 'grass_a' : 'grass_b';

        const img = this.add.image(isoX(c,r), isoY(c,r), tex)
          .setOrigin(0.5, 0)
          .setDepth(isoDepth(c, r));
        // Slight brightness variation for non-road tiles
        if (!ROAD_SET.has(key)) {
          const v = 0.88 + ((c*7+r*3) % 12) * 0.01;
          img.setTint(Phaser.Display.Color.GetColor(
            Math.round(255*v), Math.round(255*v), Math.round(255*v)
          ));
        }
      }
    }
  }

  // ── Road markings (dashes) ───────────────────────────────────────────────────
  _buildRoadMarkings() {
    const g = this.add.graphics().setDepth(100);
    g.lineStyle(1.5, 0xe8d020, 0.65);
    g.setLineDashOffset = () => {};
    // Horizontal road dashes at r=6
    for (let c = 0; c < 15; c += 2) {
      const x1 = isoX(c+0.3, 6.5), y1 = isoY(c+0.3, 6.5);
      const x2 = isoX(c+0.8, 6.5), y2 = isoY(c+0.8, 6.5);
      g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.strokePath();
    }
    // Vertical road dashes at c=7
    for (let r = 0; r < 13; r += 2) {
      const x1 = isoX(7.5, r+0.3), y1 = isoY(7.5, r+0.3);
      const x2 = isoX(7.5, r+0.8), y2 = isoY(7.5, r+0.8);
      g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.strokePath();
    }
  }

  // ── Buildings ────────────────────────────────────────────────────────────────
  _buildBuildings() {
    // Sort back-to-front
    const sorted = [...BUILDINGS].sort((a,b) => (a.c+a.r) - (b.c+b.r));
    for (const b of sorted) {
      this._drawBuilding(b);
    }
  }

  _drawBuilding(b) {
    const { c, r, cw, rh, bh, top, left, right: rightC, type, label } = b;
    const baseD = isoDepth(c+cw, r+rh, 0);

    // Ground footprint highlight (foundation)
    const fg = this.add.graphics().setDepth(baseD - 1);
    fg.fillStyle(0x989080, 0.6);
    const pts = [
      {x:isoX(c,r),      y:isoY(c,r)},
      {x:isoX(c+cw,r),   y:isoY(c+cw,r)},
      {x:isoX(c+cw,r+rh),y:isoY(c+cw,r+rh)},
      {x:isoX(c,r+rh),   y:isoY(c,r+rh)},
    ];
    fg.fillPoints(pts, true);

    // South face (left wall, bigger/brighter)
    const sg = this.add.graphics().setDepth(baseD + 5);
    sg.fillStyle(left);
    sg.fillPoints([
      {x:isoX(c,r+rh),   y:isoY(c,r+rh)},
      {x:isoX(c+cw,r+rh),y:isoY(c+cw,r+rh)},
      {x:isoX(c+cw,r+rh),y:isoY(c+cw,r+rh)-bh},
      {x:isoX(c,r+rh),   y:isoY(c,r+rh)-bh},
    ], true);
    sg.lineStyle(1, 0x000000, 0.35);
    sg.strokePoints([
      {x:isoX(c,r+rh),   y:isoY(c,r+rh)},
      {x:isoX(c+cw,r+rh),y:isoY(c+cw,r+rh)},
      {x:isoX(c+cw,r+rh),y:isoY(c+cw,r+rh)-bh},
      {x:isoX(c,r+rh),   y:isoY(c,r+rh)-bh},
    ], true);

    // East face (right wall, darker)
    const eg = this.add.graphics().setDepth(baseD + 5);
    eg.fillStyle(rightC);
    eg.fillPoints([
      {x:isoX(c+cw,r+rh),y:isoY(c+cw,r+rh)},
      {x:isoX(c+cw,r),   y:isoY(c+cw,r)},
      {x:isoX(c+cw,r),   y:isoY(c+cw,r)-bh},
      {x:isoX(c+cw,r+rh),y:isoY(c+cw,r+rh)-bh},
    ], true);
    eg.lineStyle(1, 0x000000, 0.35);
    eg.strokePoints([
      {x:isoX(c+cw,r+rh),y:isoY(c+cw,r+rh)},
      {x:isoX(c+cw,r),   y:isoY(c+cw,r)},
      {x:isoX(c+cw,r),   y:isoY(c+cw,r)-bh},
      {x:isoX(c+cw,r+rh),y:isoY(c+cw,r+rh)-bh},
    ], true);

    // Top face (roof)
    const tg = this.add.graphics().setDepth(baseD + 10);
    tg.fillStyle(top);
    tg.fillPoints([
      {x:isoX(c,r),      y:isoY(c,r)-bh},
      {x:isoX(c+cw,r),   y:isoY(c+cw,r)-bh},
      {x:isoX(c+cw,r+rh),y:isoY(c+cw,r+rh)-bh},
      {x:isoX(c,r+rh),   y:isoY(c,r+rh)-bh},
    ], true);
    tg.lineStyle(1, 0x000000, 0.3);
    tg.strokePoints([
      {x:isoX(c,r),      y:isoY(c,r)-bh},
      {x:isoX(c+cw,r),   y:isoY(c+cw,r)-bh},
      {x:isoX(c+cw,r+rh),y:isoY(c+cw,r+rh)-bh},
      {x:isoX(c,r+rh),   y:isoY(c,r+rh)-bh},
    ], true);
    // Roof highlight edge
    tg.lineStyle(1.5, lighten(top,50), 0.5);
    tg.beginPath();
    tg.moveTo(isoX(c,r)-0, isoY(c,r)-bh);
    tg.lineTo(isoX(c+cw,r), isoY(c+cw,r)-bh);
    tg.lineTo(isoX(c+cw,r+rh), isoY(c+cw,r+rh)-bh);
    tg.strokePath();

    // Windows on south face
    if (bh >= 20) {
      const wg = this.add.graphics().setDepth(baseD + 6);
      const rows = Math.max(1, Math.floor(bh / 18));
      const cols = Math.max(1, cw);
      for (let wr = 0; wr < rows; wr++) {
        for (let wc = 0; wc < cols; wc++) {
          const tv = (wr + 0.65) / (rows + 0.3);
          const tu = (wc + 0.2) / (cols + 0.0);
          // South-face window position
          const bx = isoX(c,r+rh) + (isoX(c+cw,r+rh)-isoX(c,r+rh))*tu;
          const by = isoY(c,r+rh) + (isoY(c+cw,r+rh)-isoY(c,r+rh))*tu - bh*(1-tv);
          // Window frame
          wg.fillStyle(darken(left,20));
          wg.fillRect(bx-3, by-5, 7, 6);
          // Window glass
          wg.fillStyle(this._winGlass(bh));
          wg.fillRect(bx-2, by-4, 5, 4);
        }
      }
      // East face windows
      const wg2 = this.add.graphics().setDepth(baseD + 6);
      for (let wr = 0; wr < rows; wr++) {
        for (let wc2 = 0; wc2 < rh; wc2++) {
          const tv = (wr + 0.65) / (rows + 0.3);
          const tu = (wc2 + 0.5) / (rh + 0.0);
          const bx = isoX(c+cw,r) + (isoX(c+cw,r+rh)-isoX(c+cw,r))*tu;
          const by = isoY(c+cw,r) + (isoY(c+cw,r+rh)-isoY(c+cw,r))*tu - bh*(1-tv);
          wg2.fillStyle(darken(rightC,20));
          wg2.fillRect(bx-3, by-5, 7, 6);
          wg2.fillStyle(this._winGlass(bh));
          wg2.fillRect(bx-2, by-4, 5, 4);
        }
      }
    }

    // Type-specific roof details
    this._bldgDetails(b, baseD);

    // Label
    const lx = isoX(c + cw*0.5, r + rh*0.5);
    const ly = isoY(c + cw*0.5, r + rh*0.5) - bh - 6;
    const txt = this.add.text(lx, ly, label, {
      fontFamily: 'monospace', fontSize: '8px',
      color: '#f8e8b0', stroke: '#1a0806', strokeThickness: 2,
      resolution: 2,
    }).setOrigin(0.5, 1).setDepth(baseD + 50)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => txt.setStyle({ color: '#ffe060' }))
      .on('pointerout',  () => txt.setStyle({ color: '#f8e8b0' }))
      .on('pointerup', () => {
        if (this._didDrag) return;
        if (renderer._modalOpen || Date.now() - (renderer._modalJustClosed || 0) < 200) return;
        const charsHere = _rs.chars.filter(ch => {
          const m = _rs.moves.get(ch.id);
          if (!m || !m.locStr) return false;
          return findBuilding(m.locStr) === b;
        }).map(ch => ({
          ...ch,
          activity: _rs.moves.get(ch.id)?.activity || '—',
          locStr:   _rs.moves.get(ch.id)?.locStr   || '',
          emotions: _rs.emotions.get(ch.id) || null,
        }));
        if (renderer.onBuildingClick) renderer.onBuildingClick(b, charsHere);
      });
  }

  _winGlass(bh) {
    const h = _rs.simHour;
    if (h >= 19 || h < 6) return 0xffef88; // lit at night
    return 0x90d8f8;                        // sky reflection by day
  }

  _bldgDetails(b, baseD) {
    const { c, r, cw, rh, bh, type } = b;
    const lx = isoX(c+cw*0.5, r+rh*0.5);
    const ly = isoY(c+cw*0.5, r+rh*0.5) - bh;
    const g = this.add.graphics().setDepth(baseD + 20);

    if (type === 'hospital') {
      g.fillStyle(0xff2020); g.fillRect(lx-1, ly+2, 5, 2); g.fillRect(lx+1, ly, 2, 6);
    } else if (type === 'office') {
      g.fillStyle(0x888888); g.fillRect(lx, ly-12, 2, 12);
      g.fillStyle(0xe03020); g.fillRect(lx-2, ly-14, 6, 3);
    } else if (type === 'mall') {
      g.fillStyle(0xc0d8ff, 0.5); g.fillRect(lx-8, ly+3, 18, 5);
      g.lineStyle(1, 0xffffff, 0.4); g.strokeRect(lx-8, ly+3, 18, 5);
    } else if (type === 'gas') {
      g.fillStyle(0xf0c830); g.fillRect(lx-10, ly-2, 22, 3);
      g.lineStyle(1, 0x1a0a04); g.strokeRect(lx-10, ly-2, 22, 3);
    } else if (type === 'store') {
      g.fillStyle(0xf8d020); g.fillRect(lx-3, ly+1, 8, 4);
      g.fillStyle(0xffffff); g.fillRect(lx-1, ly+2, 3, 2);
    } else if (type === 'bank') {
      // Columns
      g.fillStyle(0xf0d890);
      for (let i=0;i<3;i++) g.fillRect(lx-6+i*6, ly, 2, 8);
    }
  }

  // ── Trees ────────────────────────────────────────────────────────────────────
  _buildTrees() {
    const spots = [[1,5,28],[2,5,22],[1,4,24],[2,4,28],[1,2,26],[2,2,22],[4,5,22],[5,5,26]];
    for (const [c, r, sz] of spots) {
      const x = isoX(c+0.5, r+0.5), y = isoY(c+0.5, r+0.5);
      const d = isoDepth(c+1, r+1, sz);
      const g = this.add.graphics().setDepth(d);
      // Shadow
      g.fillStyle(0x000000,0.15); g.fillEllipse(x, y+2, sz*1.4, sz*0.4);
      // Trunk
      g.fillStyle(0x4c2e0e); g.fillRect(x-2,y-sz+4,4,sz-2);
      g.fillStyle(0x2c1a06); g.fillRect(x,y-sz+4,2,sz-2);
      // Canopy layers
      [[sz*0.9,0x254818],[sz*0.75,0x3a6828],[sz*0.6,0x4e8838],[sz*0.42,0x5aa040]].forEach(([rad,col])=>{
        g.fillStyle(col); g.fillCircle(x, y-sz+4, rad);
      });
      g.lineStyle(1, 0x1a3010, 0.4);
      g.strokeCircle(x, y-sz+4, sz*0.42);
    }
  }

  // ── NPCs ─────────────────────────────────────────────────────────────────────
  _spawnNPCs() {
    for (let i = 0; i < NPC_DEFS.length; i++) {
      const wp = NPC_WPS[i % NPC_WPS.length];
      const px = isoX(wp[0], wp[1]), py = isoY(wp[0], wp[1]);
      const sprite = this.add.image(px, py, `npc_${i}_r`).setOrigin(0.5, 0.95);
      sprite.setDepth(isoDepth(wp[0], wp[1], 50));
      this._npcs.push({
        sprite, px, py, tx:px, ty:py, wait:40*i, facingRight:true,
        def:NPC_DEFS[i], wpIdx:i, isIndoor:false, _alpha:1,
        path:[], lastWp:wp, destIsIndoor:false,
      });
    }
  }

  _updateNPCs(delta) {
    const spd = 0.8;
    for (const npc of this._npcs) {
      if (npc.wait > 0) { npc.wait -= delta/16; continue; }
      const dx=npc.tx-npc.px, dy=npc.ty-npc.py, dist=Math.hypot(dx,dy);
      if (dist < 2) {
        if (npc.path.length > 0) {
          // Continue along queued path waypoints
          const next = npc.path[0];
          npc.path = npc.path.slice(1);
          npc.tx = isoX(next[0], next[1]); npc.ty = isoY(next[0], next[1]);
          npc.lastWp = next;
          if (npc.path.length === 0 && npc.destIsIndoor) npc.isIndoor = true;
        } else {
          // Pick a new destination
          npc.wait = 80 + Math.random() * 120;
          let route;
          if (Math.random() < 0.25) {
            // Head to a building interior (fade out on arrival)
            const entry = NPC_INDOOR_WPS[Math.random() * NPC_INDOOR_WPS.length | 0];
            const via = _npcPathTo(npc.lastWp, entry.app);
            route = [...via, entry.wp];
            npc.destIsIndoor = true;
            npc.isIndoor = false;
          } else {
            const wp = NPC_WPS[Math.random() * NPC_WPS.length | 0];
            route = _npcPathTo(npc.lastWp, wp);
            npc.destIsIndoor = false;
            npc.isIndoor = false;
          }
          const first = route[0];
          npc.path = route.slice(1);
          npc.tx = isoX(first[0], first[1]); npc.ty = isoY(first[0], first[1]);
          npc.lastWp = first;
          if (npc.path.length === 0 && npc.destIsIndoor) npc.isIndoor = true;
        }
      } else {
        if (Math.abs(dx)>1) npc.facingRight = dx>0;
        npc.px += (dx/dist)*spd; npc.py += (dy/dist)*spd;
        const i = this._npcs.indexOf(npc);
        npc.sprite.setTexture(`npc_${i}_${npc.facingRight?'r':'l'}`);
      }
      npc.sprite.setPosition(npc.px, npc.py);
      npc.sprite.setDepth(Math.round((npc.py - OY) * 2000 / TH) + 50);
      // Fade in/out for indoor/outdoor transitions
      const tA = npc.isIndoor ? 0 : 1;
      npc._alpha = npc._alpha + (tA - npc._alpha) * 0.07;
      npc.sprite.setAlpha(Math.max(0, Math.min(1, npc._alpha)));
    }
  }

  // ── Cars ─────────────────────────────────────────────────────────────────────
  _spawnCars() {
    for (let i = 0; i < INIT_CARS.length; i++) {
      const def = INIT_CARS[i];
      const sprite = this.add.image(0, 0, `car_${def.ci}`).setOrigin(0.5, 0.5);
      sprite.setDepth(200000);
      this._cars.push({ ...def, speed: 0.0025+Math.random()*0.002, sprite });
    }
  }

  _updateCars(delta) {
    for (const car of this._cars) {
      car.t = ((car.t + car.dir*car.speed*(delta/16)) + 1) % 1;
      let x, y, angle;
      if (car.axis === 'h') {
        const col = car.t * 15;
        const x0 = isoX(col,     6.5), y0 = isoY(col,     6.5);
        const x1 = isoX(col+0.1, 6.5), y1 = isoY(col+0.1, 6.5);
        x=x0; y=y0; angle=Math.atan2(y1-y0, x1-x0)*180/Math.PI;
      } else {
        const row = car.t * 13;
        const x0 = isoX(7.5, row),     y0 = isoY(7.5, row);
        const x1 = isoX(7.5, row+0.1), y1 = isoY(7.5, row+0.1);
        x=x0; y=y0; angle=Math.atan2(y1-y0, x1-x0)*180/Math.PI;
      }
      car.sprite.setPosition(x, y).setAngle(angle);
      car.sprite.setDepth(Math.round((y - OY) * 2000 / TH) + 300);
    }
  }

  // ── Main characters ───────────────────────────────────────────────────────────
  updateChars(chars) {
    // Remove obsolete
    for (const [id, obj] of this._charObjs) {
      if (!chars.find(c=>c.id===id)) { obj.sprite.destroy(); obj.label.destroy(); this._charObjs.delete(id); }
    }
    const entry = bldgEntrance(BUILDINGS[0]);
    const startX = isoX(entry.c, entry.r);
    const startY = isoY(entry.c, entry.r);

    this._ensureCharTextures(chars);
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (!this._charObjs.has(ch.id)) {
        const ci = ch.colorIdx ?? (i % 6);
        const g  = ch.gender==='female' ? 'f' : 'm';
        const isPet = ch.character_type === 'pet';
        const texKey = isPet ? `pet_${ch.id}_r` : `char_${ch.id}_r_${g}`;
        const spr= this.add.image(startX + i*10, startY, texKey).setOrigin(0.5, 0.95);
        spr.setDepth(Math.round((startY - OY) * 2000 / TH) + 200);
        spr.setInteractive({ useHandCursor: true })
          .on('pointerup', () => {
            if (this._didDrag || renderer._modalOpen || Date.now() - (renderer._modalJustClosed || 0) < 200) return;
            if (renderer.onCharacterClick) renderer.onCharacterClick(ch.id);
          });
        const _ava = ch.avatar_emoji || (isPet ? '🐾' : '👤');
        const _dname = ch.nickname || ch.name.split(' ')[0];
        const lbl = this.add.text(startX+i*10, startY-38, `${_ava} ${_dname}`, {
          fontFamily:'monospace', fontSize:'11px', color:'#f8f0d0',
          stroke:'#1a0804', strokeThickness:4,
          backgroundColor:'#1a100aaa', padding:{x:5,y:3},
          resolution:2,
        }).setOrigin(0.5,1).setDepth(Math.round((startY - OY) * 2000 / TH) + 201);
        this._charObjs.set(ch.id, {
          sprite:spr, label:lbl, px:startX+i*10, py:startY,
          tx:startX+i*10, ty:startY, ci, g,
          facingRight:true,
          isIndoor: false, indoorBuilding: null, _alpha: 1,
          isOnCar: false, carIdx: 0,
        });
      }
    }
  }

  moveTo(charId, locStr) {
    const obj = this._charObjs.get(charId);
    if (!obj) return;
    const activity = (_rs.moves.get(charId)?.activity || '').toLowerCase();
    const loc = (locStr || '').toLowerCase();
    const idx = [...this._charObjs.keys()].indexOf(charId);
    const spread = (idx - (_rs.chars.length - 1) / 2) * 10;

    const CAR_KW = ['ขับรถ','นั่งรถ','ในรถ','driving','in a car','in car','taxi','grab','แท็กซี่','อูเบอร์','by car','commut'];
    const isOnCar = CAR_KW.some(k => activity.includes(k) || loc.includes(k));

    if (isOnCar) {
      // Character is in/driving a car — sprite fades, name tag rides the car
      obj.isOnCar = true;
      obj.isIndoor = false;
      obj.indoorBuilding = null;
      obj.carIdx = idx % Math.max(1, this._cars.length);
    } else {
      obj.isOnCar = false;
      const b = findBuilding(locStr);
      if (b) {
        // Indoor: walk to building entrance, then sprite fades out
        obj.isIndoor = true;
        obj.indoorBuilding = b;
        const ent = bldgEntrance(b);
        obj.tx = isoX(ent.c, ent.r) + spread;
        obj.ty = isoY(ent.c, ent.r) - idx * 3;
      } else {
        // Outdoor: visible on a sidewalk tile
        obj.isIndoor = false;
        obj.indoorBuilding = null;
        const spot = OUTDOOR_SPOTS[idx % OUTDOOR_SPOTS.length];
        obj.tx = isoX(spot.c, spot.r) + spread * 0.4;
        obj.ty = isoY(spot.c, spot.r);
      }
    }
  }

  _updateMainChars(delta) {
    const LERP = 0.055;
    for (const [id, obj] of this._charObjs) {
      // Car-riding characters track the car's live position
      if (obj.isOnCar) {
        const car = this._cars[obj.carIdx ?? 0];
        if (car) { obj.tx = car.sprite.x; obj.ty = car.sprite.y; }
      }
      const dx=obj.tx-obj.px, dy=obj.ty-obj.py;
      if (Math.abs(dx)>1) obj.facingRight = dx>0;
      obj.px += dx*LERP; obj.py += dy*LERP;
      obj.sprite.setPosition(obj.px, obj.py);
      obj.label.setPosition(obj.px, obj.py-38);
      obj.sprite.setDepth(Math.round((obj.py - OY) * 2000 / TH) + 200);
      obj.label.setDepth(Math.round((obj.py - OY) * 2000 / TH) + 201);
      // Facing
      const ch = _rs.chars.find(c=>c.id===id);
      const isPet = ch?.character_type === 'pet';
      if (isPet) {
        obj.sprite.setTexture(`pet_${id}_${obj.facingRight?'r':'l'}`);
      } else {
        const g = (ch?.gender==='female')?'f':'m';
        obj.sprite.setTexture(`char_${id}_${obj.facingRight?'r':'l'}_${g}`);
      }
      // Smooth fade: invisible when fully indoors, visible when outdoors
      const targetAlpha = (obj.isIndoor || obj.isOnCar) ? 0 : 1;
      obj._alpha = (obj._alpha ?? 1) + (targetAlpha - (obj._alpha ?? 1)) * 0.07;
      const a = Math.max(0, Math.min(1, obj._alpha));
      obj.sprite.setAlpha(a);
      obj.label.setAlpha(a);
    }
  }

  // ── Overlays (emotion icons, speech bubbles, hearts) ─────────────────────────
  _updateOverlays() {
    const g = this._overlayGfx;
    g.clear();
    // Hide all pooled overlays; show only those still active
    if (this._emoPool)    for (const t of this._emoPool.values())    t.setVisible(false);
    if (this._bubblePool) for (const t of this._bubblePool.values()) t.setVisible(false);

    // Interaction hearts between close outdoor characters
    const chars = [...this._charObjs.values()];
    for (let i=0; i<chars.length; i++) {
      for (let j=i+1; j<chars.length; j++) {
        const a=chars[i], b=chars[j];
        if ((a._alpha??1) < 0.4 || (b._alpha??1) < 0.4) continue; // skip indoor chars
        if (Math.hypot(a.px-b.px, a.py-b.py) < 60) {
          // Draw hearts as colored dots animated upward
          for (let k=0; k<3; k++) {
            const t = ((this._tick*0.5 + k*18) % 50) / 50;
            const hx = (a.px+b.px)/2 + Math.sin(k*2.1)*8;
            const hy = (a.py+b.py)/2 - t*45 - 15;
            const alpha = t<0.3 ? t/0.3 : t>0.7 ? (1-t)/0.3 : 1;
            g.fillStyle(0xff4080, alpha*0.8);
            g.fillCircle(hx, hy, 4);
            g.fillStyle(0xff80a0, alpha*0.5);
            g.fillCircle(hx-1, hy-1, 2);
          }
        }
      }
    }

    // Indoor name tags — shown above buildings for characters inside
    if (!this._indoorTagPool) this._indoorTagPool = new Map();
    for (const [, t] of this._indoorTagPool) t.setVisible(false);

    // Group indoor (faded) chars by building
    const byBuilding = new Map();
    for (const [id, obj] of this._charObjs) {
      if (!obj.isIndoor || !obj.indoorBuilding || (obj._alpha ?? 1) > 0.35) continue;
      const key = obj.indoorBuilding.label;
      if (!byBuilding.has(key)) byBuilding.set(key, { b: obj.indoorBuilding, ids: [] });
      byBuilding.get(key).ids.push(id);
    }
    for (const [, { b, ids }] of byBuilding) {
      const bx  = isoX(b.c + b.cw * 0.5, b.r + b.rh * 0.5);
      const byTop = isoY(b.c + b.cw * 0.5, b.r + b.rh * 0.5) - b.bh - 10;
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const ch = _rs.chars.find(c => c.id === id);
        if (!ch) continue;
        const avatar = ch.avatar_emoji || (ch.character_type === 'pet' ? '🐾' : '👤');
        const name   = ch.nickname || ch.name.split(' ')[0];
        const tagY   = byTop - i * 12 + Math.sin(this._tick * 0.025 + id * 0.7) * 1.5;
        let tag = this._indoorTagPool.get(id);
        if (!tag) {
          tag = this.add.text(0, 0, '', {
            fontFamily:'monospace', fontSize:'7px', color:'#f0e0b8',
            backgroundColor:'#2a140899', padding:{x:3,y:2}, resolution:2,
          }).setOrigin(0.5, 1).setDepth(510000);
          this._indoorTagPool.set(id, tag);
        }
        tag.setPosition(bx, tagY).setText(`${avatar} ${name}`).setVisible(true);
      }
    }

    // Car name tags — float on car sprite for characters riding/driving
    for (const [id, obj] of this._charObjs) {
      if (!obj.isOnCar) continue;
      const car = this._cars[obj.carIdx ?? 0];
      if (!car) continue;
      const ch = _rs.chars.find(c => c.id === id);
      if (!ch) continue;
      const avatar = ch.avatar_emoji || (ch.character_type === 'pet' ? '🐾' : '👤');
      const name   = ch.nickname || ch.name.split(' ')[0];
      const tagY   = car.sprite.y - 22 + Math.sin(this._tick * 0.025 + id * 0.7) * 1.5;
      const poolKey = `car_${id}`;
      let tag = this._indoorTagPool.get(poolKey);
      if (!tag) {
        tag = this.add.text(0, 0, '', {
          fontFamily:'monospace', fontSize:'7px', color:'#e8f8ff',
          backgroundColor:'#182848bb', padding:{x:3,y:2}, resolution:2,
        }).setOrigin(0.5, 1).setDepth(510000);
        this._indoorTagPool.set(poolKey, tag);
      }
      tag.setPosition(car.sprite.x, tagY).setText(`🚗 ${avatar}${name}`).setVisible(true);
    }

    // Follow ring around selected character
    if (this._followId) {
      const fo = this._charObjs.get(this._followId);
      if (fo) {
        const pulse = 0.55 + Math.sin(this._tick * 0.06) * 0.2;
        const rad   = 14  + Math.sin(this._tick * 0.04) * 2;
        g.lineStyle(2.5, 0xffe040, pulse);
        g.strokeCircle(fo.px, fo.py - 8, rad);
        g.lineStyle(1.5, 0xffa000, pulse * 0.5);
        g.strokeCircle(fo.px, fo.py - 8, rad + 5);
      }
    }

    // Per-character: emotion icon + speech bubble (only when visible outdoors)
    for (const [id, obj] of this._charObjs) {
      const visibility = obj._alpha ?? 1;
      if (visibility < 0.3) continue; // skip fully-indoor chars
      // Emotion burst (timed pop — triggered by tick, fades out)
      const burst = _rs.emoBursts.get(id);
      if (burst) {
        const age = this._tick - burst.born;
        if (age >= burst.duration) {
          _rs.emoBursts.delete(id);
        } else {
          const fadeIn  = Math.min(1, age / 12);
          const fadeOut = age > burst.duration * 0.65
            ? Math.max(0, (burst.duration - age) / (burst.duration * 0.35))
            : 1;
          const alpha = fadeIn * fadeOut * visibility;
          const ey = obj.py - 68 + Math.sin(this._tick * 0.04 + id) * 3;
          this._drawEmojiAt(id, burst.icon, obj.px, ey, alpha);
        }
      }
      // Speech bubble
      const bubble = _rs.bubbles.get(id);
      if (bubble) {
        const age = this._tick - bubble.born;
        if (age > 250) { _rs.bubbles.delete(id); continue; }
        const alpha = (age<20 ? age/20 : age>220 ? (250-age)/30 : 1) * visibility;
        this._drawBubble(id, g, bubble.text, obj.px, obj.py-90, alpha);
      }
    }
  }

  _dominantEmoIcon(e) {
    if (!e) return '😐';
    // Strong negative states (high priority)
    if (e.stress      > 58) return '😰';
    if (e.anxiety     > 55) return '😟';
    if (e.resentment  > 48) return '😠';
    if (e.loneliness  > 58) return '😔';
    // Strong positive states
    if (e.love        > 68) return '💕';
    if (e.happiness   > 68) return '😊';
    // Low energy / low security
    if (e.energy      < 32) return '🥱';
    if (e.security    < 38) return '😨';
    // Moderate states — always show something meaningful
    if (e.happiness   > 55) return '🙂';
    if (e.love        > 55) return '💗';
    if (e.stress      > 45) return '😓';
    if (e.loneliness  > 45) return '🙁';
    if (e.energy      < 45) return '😴';
    return '😐';
  }

  _drawEmojiAt(charId, emoji, x, y, alpha = 1) {
    if (!this._emoPool) this._emoPool = new Map();
    let t = this._emoPool.get(charId);
    if (!t) {
      t = this.add.text(x, y, emoji, {
        fontSize: '20px', resolution: 2,
        backgroundColor: '#00000066', padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 0.5).setDepth(500010);
      this._emoPool.set(charId, t);
    }
    t.setText(emoji).setPosition(x, y).setAlpha(alpha).setVisible(alpha > 0.02);
  }

  _drawBubble(charId, g, text, x, y, alpha) {
    const lines = this._wrapText(text, 18);
    const bw = 110, lh = 12;
    const bh = lines.length * lh + 10;
    const bx = x - bw/2, by = y - bh;
    // Bubble background
    g.fillStyle(0xfffcf0, alpha);
    g.fillRoundedRect(bx, by, bw, bh, 5);
    g.lineStyle(1.5, 0x5a3818, alpha);
    g.strokeRoundedRect(bx, by, bw, bh, 5);
    // Tail
    g.fillStyle(0xfffcf0, alpha);
    g.fillTriangle(x-5, by+bh, x+5, by+bh, x, by+bh+8);
    g.lineStyle(1, 0x5a3818, alpha*0.7);
    g.strokeTriangle(x-5, by+bh, x+5, by+bh, x, by+bh+8);

    // Text (use Phaser Text object)
    if (!this._bubblePool) this._bubblePool = new Map();
    let bt = this._bubblePool.get(charId);
    if (!bt) {
      bt = this.add.text(x, by+5, '', {
        fontFamily:'monospace', fontSize:'9px', color:'#2a1408',
        wordWrap:{width:100}, align:'center', resolution:2,
      }).setOrigin(0.5,0).setDepth(500020);
      this._bubblePool.set(charId, bt);
    }
    bt.setPosition(x, by+5).setText(lines.join('\n')).setAlpha(alpha).setVisible(true);
  }

  _wrapText(text, maxChars) {
    const words = text.split(' ');
    const lines = []; let cur = '';
    for (const w of words) {
      if ((cur+w).length > maxChars) { if(cur) lines.push(cur.trim()); cur=w+' '; }
      else cur += w+' ';
    }
    if (cur.trim()) lines.push(cur.trim());
    return lines.slice(0, 4);
  }

  setFollow(charId) { this._followId = charId; }
  clearFollow()     { this._followId = null;   }
}

// ─── Indoor Scene room layouts (top-down 2D, canvas 800×450) ─────────────────
const INDOOR_LAYOUTS = {
  house:      { title:'🏠 ภายในบ้าน',          bg:0x2a1a0a, rooms:[
    { id:'bed',  x:5,   y:45, w:255, h:190, fl:0xf0e4cc, wl:0xc4a878, label:'🛏 ห้องนอน',
      kw:['นอน','sleep','rest','bedroom','ตื่น','หลับ','waking','getting ready','winding'] },
    { id:'bath', x:264, y:45, w:155, h:190, fl:0xd8eef8, wl:0x80b8d0, label:'🚿 ห้องน้ำ',
      kw:['อาบน้ำ','shower','bath','toilet','ห้องน้ำ','แปรงฟัน'] },
    { id:'dflt', x:423, y:45, w:372, h:190, fl:0xe8e0d0, wl:0xa09878, label:'🚪 ทางเดิน', kw:[], def:true },
    { id:'live', x:5,   y:239,w:255, h:206, fl:0xeee8d8, wl:0xb8a880, label:'📺 ห้องนั่งเล่น',
      kw:['ดูทีวี','watch','tv','relax','พักผ่อน','นั่งเล่น','sofa','living'] },
    { id:'cook', x:264, y:239,w:155, h:206, fl:0xf0ece0, wl:0xc0b090, label:'🍳 ครัว',
      kw:['กิน','ทาน','ครัว','cook','eat','breakfast','อาหาร','ข้าว','kitchen','coffee','กาแฟ'] },
    { id:'grdn', x:423, y:239,w:372, h:206, fl:0x88c048, wl:0x4a8028, label:'🌿 สวน',
      kw:['garden','สวน','outdoor','outside','yard'] },
  ]},
  office:     { title:'🏢 ภายในออฟฟิศ',        bg:0x101820, rooms:[
    { id:'work', x:5,   y:45, w:490, h:400, fl:0xe0e8f0, wl:0x7090b8, label:'💻 พื้นที่ทำงาน',
      kw:['ทำงาน','work','desk','computer','office','สำนักงาน','ออฟฟิศ','at work','working'], def:true },
    { id:'conf', x:499, y:45, w:296, h:195, fl:0xd0d8e8, wl:0x5878a8, label:'📋 ห้องประชุม',
      kw:['ประชุม','meeting','conference','present'] },
    { id:'lobb', x:499, y:244,w:296, h:201, fl:0xd8e0e8, wl:0x6888a8, label:'🚪 ล็อบบี้', kw:[] },
  ]},
  cafe:       { title:'☕ ภายในคาเฟ่',          bg:0x1e1208, rooms:[
    { id:'seat', x:5,   y:45, w:490, h:400, fl:0xf0e8d8, wl:0xa07840, label:'🪑 โซนนั่ง',
      kw:['นั่ง','sit','coffee','กาแฟ','ชา','tea','relax','คาเฟ่'], def:true },
    { id:'cbar', x:499, y:45, w:296, h:400, fl:0xe8dcc8, wl:0x906830, label:'☕ เคาน์เตอร์',
      kw:['order','สั่ง','barista','brew','counter','bar'] },
  ]},
  restaurant: { title:'🍜 ภายในร้านอาหาร',      bg:0x1a0a04, rooms:[
    { id:'dine', x:5,   y:45, w:490, h:400, fl:0xf0e4d0, wl:0xa87050, label:'🍽 โต๊ะอาหาร',
      kw:['กิน','ทาน','eat','food','lunch','dinner','อาหาร','ข้าว','restaurant'], def:true },
    { id:'kchi', x:499, y:45, w:296, h:400, fl:0xf0ece0, wl:0xb08040, label:'🍳 ครัว',
      kw:['ครัว','cook','chef','kitchen','prepare'] },
  ]},
  mall:       { title:'🛍 ภายในห้าง',            bg:0x201828, rooms:[
    { id:'fash', x:5,   y:45, w:244, h:195, fl:0xe8e0f0, wl:0x9878c0, label:'👗 แฟชั่น',
      kw:['shopping','ซื้อของ','shop','clothes','fashion','แฟชั่น','เดินห้าง'] },
    { id:'food', x:253, y:45, w:244, h:195, fl:0xf0e8e0, wl:0xc09878, label:'🍔 ฟู้ดคอร์ท',
      kw:['food court','กิน','ทาน','eat','ข้าว','อาหาร'] },
    { id:'ent',  x:501, y:45, w:294, h:195, fl:0xe8f0e0, wl:0x78a870, label:'🎮 บันเทิง',
      kw:['cinema','movie','ภาพยนตร์','game','entertainment'] },
    { id:'hall', x:5,   y:244,w:790, h:201, fl:0xf0ece8, wl:0xb0a898, label:'🚶 โซนกลาง', kw:[], def:true },
  ]},
  hospital:   { title:'🏥 ภายในโรงพยาบาล',      bg:0x101820, rooms:[
    { id:'ward', x:5,   y:45, w:490, h:400, fl:0xecf8f8, wl:0x70b0c0, label:'🛏 ห้องตรวจ',
      kw:['ตรวจ','check','doctor','หมอ','nurse','ward','พยาบาล','treatment'], def:true },
    { id:'wait', x:499, y:45, w:296, h:400, fl:0xe8f0f8, wl:0x8098b8, label:'⏳ ห้องรอ',
      kw:['รอ','wait','reception','ล็อบบี้'] },
  ]},
  bank:       { title:'🏦 ภายในธนาคาร',          bg:0x181408, rooms:[
    { id:'bnkc', x:5,   y:45, w:490, h:400, fl:0xf8f0d8, wl:0xc8a838, label:'💰 เคาน์เตอร์',
      kw:['ธนาคาร','bank','โอนเงิน','ถอนเงิน','atm','ฝาก','ถอน'], def:true },
    { id:'vlt',  x:499, y:45, w:296, h:400, fl:0xf0e8c8, wl:0xb09028, label:'🔒 ห้องจัดการ', kw:[] },
  ]},
  gym:        { title:'🏋 ภายในฟิตเนส',          bg:0x1a0808, rooms:[
    { id:'flor', x:5,   y:45, w:490, h:400, fl:0xf0e8e0, wl:0xb08070, label:'💪 โซนออกกำลัง',
      kw:['gym','ออกกำลัง','exercise','fitness','workout','วิ่ง','yoga','กีฬา'], def:true },
    { id:'lckr', x:499, y:45, w:296, h:400, fl:0xe8e0d8, wl:0xa07868, label:'🚿 ล็อกเกอร์',
      kw:['locker','shower','change','อาบน้ำ'] },
  ]},
  park:       { title:'🌳 ภายในสวน',             bg:0x1a2810, rooms:[
    { id:'grdn', x:5, y:45, w:790, h:400, fl:0x70b840, wl:0x3a7020, label:'🌳 พื้นที่สีเขียว',
      kw:['park','สวน','นั่งเล่น','outdoor','garden','เดิน','relax'], def:true },
  ]},
  bts:        { title:'🚉 ภายใน BTS',            bg:0x101820, rooms:[
    { id:'plat', x:5, y:45, w:790, h:400, fl:0xe0e8f0, wl:0x6080a8, label:'🚇 ชานชาลา',
      kw:['bts','รถไฟฟ้า','station','สถานี','รอรถ'], def:true },
  ]},
  store:      { title:'🏪 ภายในร้านสะดวก',       bg:0x0a1008, rooms:[
    { id:'stor', x:5, y:45, w:790, h:400, fl:0xeeeee8, wl:0xa0a090, label:'🛒 พื้นที่ขาย',
      kw:['store','ร้านสะดวก','shopping','ซื้อ','convenience','7-eleven'], def:true },
  ]},
  gas:        { title:'⛽ ปั๊มน้ำมัน',           bg:0x181408, rooms:[
    { id:'pump', x:5, y:45, w:790, h:400, fl:0xf0e8c8, wl:0xb0a040, label:'⛽ จุดเติมน้ำมัน',
      kw:['gas','ปั๊ม','น้ำมัน','fill','refuel'], def:true },
  ]},
};

// ─── Ambient NPC definitions per building type ────────────────────────────────
// ni = npc texture index (0-5), roomId = room.id to place them in
// color = role label colour (staff blue / manager gold / visitor gray)
const INDOOR_NPCS = {
  // house: no ambient NPCs — private space, only user-created characters appear
  office: [
    { role:'💼 พนักงาน',   roomId:'work', ni:1, color:'#a8d8f8' },
    { role:'💼 พนักงาน',   roomId:'work', ni:3, color:'#a8d8f8' },
    { role:'💼 พนักงาน',   roomId:'work', ni:5, color:'#a8d8f8' },
    { role:'📋 หัวหน้า',   roomId:'conf', ni:0, color:'#f8e090' },
    { role:'📋 ผู้จัดการ',  roomId:'conf', ni:4, color:'#f8e090' },
    { role:'🗂 เลขา',     roomId:'lobb', ni:2, color:'#a8d8f8' },
  ],
  cafe: [
    { role:'☕ บาริสต้า',  roomId:'cbar', ni:0, color:'#f8e090' },
    { role:'☕ บาริสต้า',  roomId:'cbar', ni:4, color:'#f8e090' },
    { role:'🍽 เสิร์ฟ',   roomId:'seat', ni:2, color:'#a8d8f8' },
    { role:'🪑 ลูกค้า',   roomId:'seat', ni:3, color:'#d8d8c8' },
    { role:'🪑 ลูกค้า',   roomId:'seat', ni:5, color:'#d8d8c8' },
  ],
  restaurant: [
    { role:'👨‍🍳 พ่อครัว',  roomId:'kchi', ni:0, color:'#f0f0a0' },
    { role:'👨‍🍳 เชฟ',     roomId:'kchi', ni:2, color:'#f0f0a0' },
    { role:'🍜 เสิร์ฟ',   roomId:'dine', ni:1, color:'#a8d8f8' },
    { role:'🍜 เสิร์ฟ',   roomId:'dine', ni:4, color:'#a8d8f8' },
    { role:'🪑 ลูกค้า',   roomId:'dine', ni:3, color:'#d8d8c8' },
    { role:'🪑 ลูกค้า',   roomId:'dine', ni:5, color:'#d8d8c8' },
  ],
  mall: [
    { role:'👗 พนักงาน',   roomId:'fash', ni:1, color:'#a8d8f8' },
    { role:'👗 พนักงาน',   roomId:'fash', ni:3, color:'#a8d8f8' },
    { role:'🍔 พนักงาน',   roomId:'food', ni:0, color:'#a8d8f8' },
    { role:'🎮 พนักงาน',   roomId:'ent',  ni:2, color:'#a8d8f8' },
    { role:'🛒 นักช้อป',   roomId:'hall', ni:4, color:'#d8d8c8' },
    { role:'🛒 นักช้อป',   roomId:'hall', ni:5, color:'#d8d8c8' },
    { role:'🛒 นักช้อป',   roomId:'hall', ni:3, color:'#d8d8c8' },
  ],
  hospital: [
    { role:'🩺 แพทย์',    roomId:'ward', ni:0, color:'#90f0c0' },
    { role:'🩺 แพทย์',    roomId:'ward', ni:2, color:'#90f0c0' },
    { role:'💉 พยาบาล',   roomId:'ward', ni:4, color:'#a8d8f8' },
    { role:'💉 พยาบาล',   roomId:'wait', ni:1, color:'#a8d8f8' },
    { role:'🪑 ผู้ป่วย',   roomId:'wait', ni:3, color:'#d8d8c8' },
    { role:'🪑 ผู้ป่วย',   roomId:'wait', ni:5, color:'#d8d8c8' },
  ],
  bank: [
    { role:'💰 พนักงาน',  roomId:'bnkc', ni:0, color:'#a8d8f8' },
    { role:'💰 พนักงาน',  roomId:'bnkc', ni:2, color:'#a8d8f8' },
    { role:'🛡 รปภ.',     roomId:'bnkc', ni:4, color:'#f8e090' },
    { role:'🪑 ลูกค้า',   roomId:'bnkc', ni:3, color:'#d8d8c8' },
    { role:'🪑 ลูกค้า',   roomId:'bnkc', ni:5, color:'#d8d8c8' },
  ],
  gym: [
    { role:'💪 เทรนเนอร์', roomId:'flor', ni:1, color:'#f8e090' },
    { role:'🏋 สมาชิก',    roomId:'flor', ni:3, color:'#d8d8c8' },
    { role:'🏋 สมาชิก',    roomId:'flor', ni:5, color:'#d8d8c8' },
    { role:'🚿 สมาชิก',    roomId:'lckr', ni:0, color:'#d8d8c8' },
  ],
  park: [
    { role:'🌳 เจ้าหน้าที่', roomId:'grdn', ni:0, color:'#f8e090' },
    { role:'🌿 คนออกกำลัง', roomId:'grdn', ni:2, color:'#d8d8c8' },
    { role:'🌿 คนออกกำลัง', roomId:'grdn', ni:4, color:'#d8d8c8' },
    { role:'🪑 คนพักผ่อน',  roomId:'grdn', ni:5, color:'#d8d8c8' },
  ],
  bts: [
    { role:'🎫 เจ้าหน้าที่', roomId:'plat', ni:0, color:'#f8e090' },
    { role:'🚇 ผู้โดยสาร',  roomId:'plat', ni:1, color:'#d8d8c8' },
    { role:'🚇 ผู้โดยสาร',  roomId:'plat', ni:3, color:'#d8d8c8' },
    { role:'🚇 ผู้โดยสาร',  roomId:'plat', ni:4, color:'#d8d8c8' },
    { role:'🚇 ผู้โดยสาร',  roomId:'plat', ni:5, color:'#d8d8c8' },
  ],
  store: [
    { role:'🏪 แคชเชียร์', roomId:'stor', ni:0, color:'#f8e090' },
    { role:'📦 พนักงาน',   roomId:'stor', ni:2, color:'#a8d8f8' },
    { role:'🛒 ลูกค้า',    roomId:'stor', ni:3, color:'#d8d8c8' },
    { role:'🛒 ลูกค้า',    roomId:'stor', ni:5, color:'#d8d8c8' },
  ],
  gas: [
    { role:'⛽ พนักงานปั๊ม', roomId:'pump', ni:0, color:'#f8e090' },
    { role:'⛽ พนักงานปั๊ม', roomId:'pump', ni:2, color:'#f8e090' },
    { role:'🚗 ลูกค้า',     roomId:'pump', ni:4, color:'#d8d8c8' },
    { role:'🚗 ลูกค้า',     roomId:'pump', ni:5, color:'#d8d8c8' },
  ],
};

// ─── Indoor Phaser Scene ──────────────────────────────────────────────────────
class IndoorScene extends Phaser.Scene {
  constructor() { super({ key: 'IndoorScene' }); }

  init(data) {
    this._bldg     = data?.building || null;
    this._charData = data?.chars    || [];
  }

  create() {
    if (!this._bldg) { this.scene.sleep(); return; }
    const layout = INDOOR_LAYOUTS[this._bldg.type] || INDOOR_LAYOUTS.house;
    this._walkers = [];

    this.add.rectangle(400, 225, 800, 450, layout.bg).setDepth(0);
    for (const room of layout.rooms) this._drawRoom(room);
    this._spawnAmbientNPCs(layout);
    this._spawnChars(layout);
    this._drawHeader(layout.title);

    // ── Zoom & Pan + pinch-to-zoom (mobile) ───────────────────────────────
    _bindCameraControls(this, 0.4, 3.0, 0.001);
  }

  _drawRoom(room) {
    const { x, y, w, h, fl, wl, label, id } = room;
    const g = this.add.graphics().setDepth(10);
    g.fillStyle(fl); g.fillRect(x, y, w, h);
    // Tile grid
    g.lineStyle(1, fl - 0x141414, 0.22);
    for (let gx = x + 22; gx < x + w - 1; gx += 22) { g.beginPath(); g.moveTo(gx, y+1); g.lineTo(gx, y+h-1); g.strokePath(); }
    for (let gy = y + 22; gy < y + h - 1; gy += 22) { g.beginPath(); g.moveTo(x+1, gy); g.lineTo(x+w-1, gy); g.strokePath(); }
    // Wall border
    g.lineStyle(3, wl); g.strokeRect(x, y, w, h);
    // Label
    this.add.text(x + 7, y + 6, label, {
      fontFamily:'monospace', fontSize:'8px', color:'#1a0a04',
      stroke:'#ffffff', strokeThickness:2, resolution:2,
    }).setDepth(20);
    // Furniture
    this._drawFurniture(id, x, y, w, h, fl);
  }

  _drawFurniture(id, x, y, w, h) {
    const g  = this.add.graphics().setDepth(16);
    const cx = x + w / 2, cy = y + h / 2;

    if (id === 'bed') {
      // Bed
      g.fillStyle(0xc8a0e0); g.fillRect(cx-50, cy-10, 82, 58);
      g.fillStyle(0x9870b8); g.fillRect(cx-50, cy-10, 82, 9);
      g.fillStyle(0xf0e8ff); g.fillRect(cx-46, cy-1, 28, 20);
      g.fillStyle(0xf0e8ff); g.fillRect(cx-14, cy-1, 28, 20);
      g.lineStyle(2, 0x7050a0); g.strokeRect(cx-50, cy-10, 82, 58);
      // Nightstand
      g.fillStyle(0xb89060); g.fillRect(cx+38, cy-2, 24, 22);
      g.fillStyle(0xffe060); g.fillCircle(cx+50, cy+4, 4);
      // Desk
      g.fillStyle(0xb89060); g.fillRect(x+6, y+28, 52, 30);
      g.fillStyle(0x202838); g.fillRect(x+9, y+32, 34, 20);
      g.lineStyle(1, 0x806040); g.strokeRect(x+6, y+28, 52, 30);
    } else if (id === 'bath') {
      // Bathtub
      g.fillStyle(0x90c8e8); g.fillRect(cx-32, cy-44, 54, 74);
      g.fillStyle(0xbce0f8); g.fillRect(cx-28, cy-40, 46, 62);
      g.lineStyle(2, 0x4888a8); g.strokeRect(cx-32, cy-44, 54, 74);
      // Toilet
      g.fillStyle(0xf4f4f4); g.fillEllipse(x+28, cy+32, 32, 40);
      g.fillStyle(0xdadada); g.fillRect(x+14, cy+14, 28, 10);
      g.lineStyle(1, 0xb0b0b0); g.strokeEllipse(x+28, cy+32, 32, 40);
      // Sink
      g.fillStyle(0xeef8f8); g.fillEllipse(cx+32, y+34, 28, 22);
      g.lineStyle(1, 0x80b0c0); g.strokeEllipse(cx+32, y+34, 28, 22);
    } else if (id === 'live') {
      // Sofa
      g.fillStyle(0x7860b0); g.fillRect(cx-65, cy+10, 110, 45);
      g.fillStyle(0x9888d0); g.fillRect(cx-61, cy+15, 102, 30);
      g.fillStyle(0x5848a0); g.fillRect(cx-65, cy+2, 110, 12);
      g.lineStyle(2, 0x4838a0); g.strokeRect(cx-65, cy+10, 110, 45);
      // TV
      g.fillStyle(0x181818); g.fillRect(cx-52, cy-56, 86, 50);
      g.fillStyle(0x2a3848); g.fillRect(cx-48, cy-52, 78, 40);
      g.lineStyle(2, 0x0a0a0a); g.strokeRect(cx-52, cy-56, 86, 50);
      // Coffee table
      g.fillStyle(0xb89060); g.fillRect(cx-30, cy+60, 52, 28);
      g.lineStyle(1, 0x806040); g.strokeRect(cx-30, cy+60, 52, 28);
    } else if (id === 'cook') {
      // Counter
      g.fillStyle(0xe0d0b0); g.fillRect(x+6, y+24, w-12, 26);
      g.fillStyle(0xc0b090); g.fillRect(x+6, y+24, w-12, 6);
      g.lineStyle(1, 0xa09070); g.strokeRect(x+6, y+24, w-12, 26);
      // Burners
      g.fillStyle(0x383838);
      [[x+24,y+34],[x+46,y+34]].forEach(([bx,by]) => { g.fillCircle(bx,by,8); g.fillStyle(0x585858); g.fillCircle(bx,by,4); g.fillStyle(0x383838); });
      // Dining table + chairs
      g.fillStyle(0xd0b878); g.fillRect(cx-38, cy+18, 68, 52);
      g.lineStyle(2, 0xa08848); g.strokeRect(cx-38, cy+18, 68, 52);
      [-36,18].forEach(ox => { g.fillStyle(0xa08040); g.fillRect(cx+ox, cy+74, 26, 18); g.lineStyle(1,0x806030); g.strokeRect(cx+ox, cy+74, 26, 18); });
    } else if (id === 'grdn') {
      // Garden trees
      [[cx-110,cy-50],[cx+70,cy-35],[cx-50,cy+55],[cx+110,cy+40]].forEach(([tx,ty]) => {
        g.fillStyle(0x284818); g.fillCircle(tx, ty, 28);
        g.fillStyle(0x3a6828); g.fillCircle(tx, ty, 22);
        g.fillStyle(0x50882a); g.fillCircle(tx, ty-3, 15);
        g.fillStyle(0x4c2e0e); g.fillRect(tx-4, ty+17, 8, 20);
      });
      // Bench
      g.fillStyle(0xc8a060); g.fillRect(cx-35, cy, 65, 15);
      g.lineStyle(2, 0x906030); g.strokeRect(cx-35, cy, 65, 15);
    } else if (id === 'work') {
      // Desks 2×3 grid
      [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]].forEach(([dc,dr]) => {
        const bx=x+28+dc*142, by=y+58+dr*158;
        g.fillStyle(0xc0b890); g.fillRect(bx,by,70,40);
        g.fillStyle(0x202838); g.fillRect(bx+8,by+6,46,26);
        g.fillStyle(0x3848a0); g.fillRect(bx+14,by+10,32,16);
        g.lineStyle(1,0x908870); g.strokeRect(bx,by,70,40);
      });
    } else if (id === 'conf') {
      // Conference table
      g.fillStyle(0xd0c890); g.fillRect(cx-65,cy-38,115,78);
      g.lineStyle(2, 0xa09860); g.strokeRect(cx-65,cy-38,115,78);
      [-52,-16,20].forEach(ox => {
        g.fillStyle(0x706850); g.fillRect(cx+ox,cy-52,22,14);
        g.fillStyle(0x706850); g.fillRect(cx+ox,cy+42,22,14);
      });
    } else if (id === 'dine') {
      // Restaurant tables (3+2)
      [[0,0],[1,0],[2,0],[0,1],[1,1]].forEach(([tc,tr]) => {
        const bx=x+28+tc*148, by=y+58+tr*168;
        g.fillStyle(0xd0b878); g.fillRect(bx,by,86,55);
        g.lineStyle(2,0xa08848); g.strokeRect(bx,by,86,55);
        [[8,58],[40,58]].forEach(([ox,oy]) => { g.fillStyle(0xa08040); g.fillRect(bx+ox,by+oy,26,18); g.lineStyle(1,0x806030); g.strokeRect(bx+ox,by+oy,26,18); });
      });
    } else if (id === 'seat') {
      // Cafe round tables
      [[0,0],[1,0],[0,1],[1,1]].forEach(([tc,tr]) => {
        const bx=x+55+tc*205, by=y+75+tr*170;
        g.fillStyle(0xd8c888); g.fillEllipse(bx+30,by+28,68,52);
        g.lineStyle(2,0xa09848); g.strokeEllipse(bx+30,by+28,68,52);
        [[-10,56]].forEach(([ox,oy]) => { g.fillStyle(0x9c8848); g.fillRect(bx+ox,by+oy,20,42); g.lineStyle(1,0x7a6830); g.strokeRect(bx+ox,by+oy,20,42); });
      });
    } else if (id === 'cbar') {
      // Cafe bar counter
      g.fillStyle(0xd0b870); g.fillRect(x+6, y+24, 26, h-48);
      g.fillStyle(0xb89050); g.fillRect(x+6, y+24, 26, 8);
      g.lineStyle(2, 0x907030); g.strokeRect(x+6, y+24, 26, h-48);
      g.fillStyle(0x484030); g.fillRect(x+10, y+38, 18, 22);
      g.fillStyle(0xc0b840); g.fillRect(x+12, y+40, 14, 10);
    } else if (id === 'bnkc') {
      // Bank teller windows
      g.fillStyle(0xe8d890); g.fillRect(x+6, y+24, w-12, 28);
      g.lineStyle(2, 0xb09830); g.strokeRect(x+6, y+24, w-12, 28);
      [50,140,230,320,410].forEach(ox => {
        if (x+6+ox < x+w-20) { g.fillStyle(0x90c8d8); g.fillRect(x+14+ox, y+28, 30, 18); g.lineStyle(1,0x4888a8); g.strokeRect(x+14+ox, y+28, 30, 18); }
      });
      // Queue barriers
      [[cx-80,cy+20],[cx,cy+20],[cx+80,cy+20]].forEach(([bx,by]) => {
        g.fillStyle(0xd0a830); g.fillRect(bx-2, by-30, 4, 60);
        g.fillStyle(0xf0c040); g.fillRect(bx-8, by-32, 16, 6);
      });
    } else if (id === 'ward') {
      // Hospital beds
      [[x+16,y+48],[x+16,y+178],[x+16,y+308]].forEach(([bx,by]) => {
        g.fillStyle(0xeef6ff); g.fillRect(bx,by,185,90);
        g.fillStyle(0xd0e8f8); g.fillRect(bx+4,by+8,36,26);
        g.lineStyle(2,0x80b0d0); g.strokeRect(bx,by,185,90);
        // IV stand
        g.fillStyle(0xd0e030); g.fillRect(bx+188,by+18,4,50); g.fillCircle(bx+190,by+18,6);
      });
    } else if (id === 'wait') {
      // Waiting room chairs in rows
      [[x+18,y+60],[x+108,y+60],[x+18,y+160],[x+108,y+160],[x+18,y+260],[x+108,y+260]].forEach(([bx,by]) => {
        g.fillStyle(0x7090c0); g.fillRect(bx,by,70,36);
        g.fillStyle(0x8898b0); g.fillRect(bx+2,by-8,70,10);
        g.lineStyle(1,0x5070a0); g.strokeRect(bx,by,70,36);
      });
    } else if (id === 'flor') {
      // Treadmills
      [[x+28,y+56],[x+28,y+196],[x+178,y+56],[x+178,y+196]].forEach(([bx,by]) => {
        g.fillStyle(0x484038); g.fillRect(bx,by,82,42);
        g.fillStyle(0x686050); g.fillRect(bx+10,by+6,62,26);
        g.lineStyle(2,0x302820); g.strokeRect(bx,by,82,42);
      });
      // Weights rack
      g.fillStyle(0x303030); g.fillRect(x+330,y+46,12,155);
      [0,1,2,3,4].forEach(i => { g.fillStyle(0x585858); g.fillEllipse(x+336,y+68+i*28,24,14); });
    } else if (id === 'lckr') {
      // Locker row
      for (let i=0;i<5;i++) {
        g.fillStyle(0x7090a0); g.fillRect(x+12+i*48,y+32,40,80);
        g.fillStyle(0x90b0c0); g.fillRect(x+14+i*48,y+34,36,36);
        g.fillStyle(0xc8e0f0); g.fillRect(x+16+i*48,y+36,32,32);
        g.fillStyle(0xe0e0d0); g.fillCircle(x+34+i*48,y+76,5);
        g.lineStyle(1,0x508090); g.strokeRect(x+12+i*48,y+32,40,80);
      }
    } else if (id === 'plat') {
      // BTS platform
      g.fillStyle(0xd0c8b8); g.fillRect(x+8, cy-12, w-16, 24);
      g.fillStyle(0xf0e030); g.fillRect(x+8, cy-14, w-16, 5);
      // Benches
      [[x+60,cy-60],[x+320,cy-60],[x+580,cy-60]].forEach(([bx,by]) => {
        g.fillStyle(0xb0a880); g.fillRect(bx,by,78,18);
        g.lineStyle(1,0x807858); g.strokeRect(bx,by,78,18);
      });
    } else if (id === 'stor') {
      // Shelves
      [[y+52],[y+162],[y+272]].forEach(([by]) => {
        g.fillStyle(0xc8c0a0); g.fillRect(x+12,by,w-24,24);
        g.lineStyle(1,0xa0a080); g.strokeRect(x+12,by,w-24,24);
        for (let i=0;i<8;i++) { g.fillStyle(0x608040+(i*0x100810)); g.fillRect(x+18+i*Math.floor((w-36)/8),by+4,Math.floor((w-36)/8)-4,14); }
      });
      g.fillStyle(0xe0d8b0); g.fillRect(x+w-80,y+40,70,h-80);
      g.lineStyle(2,0xb0a870); g.strokeRect(x+w-80,y+40,70,h-80);
    } else if (id === 'pump') {
      // Gas pumps
      [[cx-120,cy],[cx-40,cy],[cx+40,cy],[cx+120,cy]].forEach(([bx,by]) => {
        g.fillStyle(0xe8d030); g.fillRect(bx-14,by-40,28,55);
        g.fillStyle(0xf0f0f0); g.fillRect(bx-10,by-36,20,20);
        g.fillStyle(0xff6020); g.fillRect(bx-10,by-12,20,10);
        g.lineStyle(2,0xa09020); g.strokeRect(bx-14,by-40,28,55);
      });
    } else {
      // Generic: scattered seating
      [[cx-75,cy-28],[cx+20,cy-28],[cx-30,cy+45]].forEach(([bx,by]) => {
        g.fillStyle(0xd0b870); g.fillEllipse(bx,by,56,44);
        g.lineStyle(1,0xa08840); g.strokeEllipse(bx,by,56,44);
      });
    }
  }

  _spawnAmbientNPCs(layout) {
    const defs = INDOOR_NPCS[this._bldg?.type] || [];
    for (const def of defs) {
      const room = layout.rooms.find(r => r.id === def.roomId);
      if (!room) continue;
      const m = 32;
      const px = room.x + m + Math.random() * (room.w - m * 2);
      const py = room.y + m + Math.random() * (room.h - m * 2 - 10);
      const ni  = def.ni % 6;
      const spr = this.add.image(px, py, `npc_${ni}_r`)
        .setOrigin(0.5, 0.95).setScale(2).setDepth(100 + py);
      const nlbl = this.add.text(px, py - 56, def.role, {
        fontFamily:'monospace', fontSize:'9px', color: def.color,
        stroke:'#1a0804', strokeThickness:3,
        backgroundColor:'#1a100a99', padding:{x:4,y:2},
        resolution:2,
      }).setOrigin(0.5, 1).setDepth(102 + py);
      const walker = {
        spr, nlbl, albl:null, px, py, tx:px, ty:py,
        room, ci:ni, gd:'m', isPet:false, isNpc:true,
        facingRight: Math.random() > 0.5,
        waitTimer: Math.random() * 30,
      };
      this._walkers.push(walker);
      this._pickTarget(walker);
    }
  }

  _spawnChars(layout) {
    const margin = 30;
    const roomCounts = {};
    for (const ch of this._charData) {
      const act = (ch.activity || '').toLowerCase();
      const loc = (ch.locStr   || '').toLowerCase();
      let room = layout.rooms.find(r => r.kw && r.kw.some(k => act.includes(k) || loc.includes(k)));
      if (!room) room = layout.rooms.find(r => r.def) || layout.rooms[0];
      const rid = room.id;
      roomCounts[rid] = (roomCounts[rid] || 0) + 1;
      const idx = roomCounts[rid] - 1;
      const cols = 3;
      const cellW = (room.w - margin * 2) / cols;
      const rows  = Math.max(1, Math.ceil(this._charData.length / cols));
      const cellH = (room.h - margin * 2 - 10) / rows;
      const px = room.x + margin + (idx % cols) * cellW + cellW * (0.25 + Math.random() * 0.5);
      const py = room.y + margin + (Math.floor(idx / cols) % rows) * cellH + cellH * (0.25 + Math.random() * 0.5);

      const gd = ch.gender === 'female' ? 'f' : 'm';
      const isPet = ch.character_type === 'pet';
      const spr = this.add.image(px, py, isPet ? `pet_${ch.id}_r` : `char_${ch.id}_r_${gd}`)
        .setOrigin(0.5, 0.95).setScale(2).setDepth(100 + py);
      const _ia = ch.avatar_emoji || (ch.character_type === 'pet' ? '🐾' : '👤');
      const _in = ch.nickname || ch.name.split(' ')[0];
      const nlbl = this.add.text(px, py - 56, `${_ia} ${_in}`, {
        fontFamily:'monospace', fontSize:'11px', color:'#f8f0d0',
        stroke:'#1a0804', strokeThickness:4,
        backgroundColor:'#1a100aaa', padding:{x:5,y:3},
        resolution:2,
      }).setOrigin(0.5, 1).setDepth(102 + py);
      const walker = { spr, nlbl, px, py, tx:px, ty:py, room, id: ch.id, gd, isPet, facingRight:true, waitTimer: Math.random() * 20 };
      this._walkers.push(walker);
      this._pickTarget(walker);  // sets initial tx/ty only
    }
  }

  _pickTarget(w) {
    const m = 30, r = w.room;
    w.tx = r.x + m + Math.random() * (r.w - m * 2);
    w.ty = r.y + m + Math.random() * (r.h - m * 2 - 10);
  }

  _drawHeader(title) {
    const hg = this.add.graphics().setDepth(900);
    hg.fillStyle(0x1a0e06, 0.94); hg.fillRect(0, 0, 800, 42);
    hg.lineStyle(2, 0xd8a840); hg.lineBetween(0, 42, 800, 42);

    this.add.text(400, 21, title, {
      fontFamily:'monospace', fontSize:'13px', color:'#f8e898',
      stroke:'#1a0a04', strokeThickness:3, resolution:2,
    }).setOrigin(0.5, 0.5).setDepth(910);

    const back = this.add.text(14, 21, '← กลับ', {
      fontFamily:'monospace', fontSize:'11px', color:'#f0c040',
      stroke:'#1a0a04', strokeThickness:3, resolution:2,
    }).setOrigin(0, 0.5).setDepth(910)
      .setInteractive({ useHandCursor:true })
      .on('pointerover', () => back.setStyle({ color:'#ffffff' }))
      .on('pointerout',  () => back.setStyle({ color:'#f0c040' }))
      .on('pointerup',   () => {
        if (this._didDrag) return;
        this.scene.stop();
        this.scene.wake('IsoScene');
        const iso = this.scene.get('IsoScene');
        if (iso) _rs._scene = iso;
      });
  }

  update(time, delta) {
    const LERP = 0.055;
    const dt   = delta / 16;
    for (const w of this._walkers) {
      // Waiting between moves — just count down
      if (w.waitTimer > 0) { w.waitTimer -= dt; continue; }

      const dx = w.tx - w.px, dy = w.ty - w.py;

      // Arrived at target — pick new spot and pause briefly
      if (Math.hypot(dx, dy) < 5) {
        this._pickTarget(w);
        w.waitTimer = 18 + Math.random() * 55;  // ~0.3–1.2 s pause
        continue;
      }

      // Move toward target
      if (Math.abs(dx) > 1) w.facingRight = dx > 0;
      w.px += dx * LERP; w.py += dy * LERP;
      if (w.isPet) {
        w.spr.setTexture(`pet_${w.id ?? w.ci}_${w.facingRight?'r':'l'}`);
      } else if (w.isNpc) {
        w.spr.setTexture(`npc_${w.ci}_${w.facingRight?'r':'l'}`);
      } else {
        w.spr.setTexture(`char_${w.id ?? w.ci}_${w.facingRight?'r':'l'}_${w.gd}`);
      }
      w.spr.setPosition(w.px, w.py).setDepth(100 + w.py);
      w.nlbl.setPosition(w.px, w.py - 56).setDepth(102 + w.py);
    }
  }
}

// ─── Public renderer API (same interface as before) ───────────────────────────
const renderer = {
  _game: null,

  start() {
    if (this._game) return;
    this._game = new Phaser.Game({
      type:            Phaser.CANVAS,
      canvas:          document.getElementById('world-canvas'),
      width:           800,
      height:          450,
      backgroundColor: '#3878c8',
      scene:           [IsoScene, IndoorScene],
      pixelArt:        true,
      roundPixels:     true,
      antialias:       false,
      banner:          false,
      input:           { activePointers: 2 },
    });
  },

  stop() {
    if (this._game) { this._game.destroy(true); this._game = null; _rs._scene = null; }
  },

  setCharacters(chars) {
    _rs.chars = chars.map((c,i) => ({ ...c, colorIdx: i % 6 }));
    if (_rs._scene) _rs._scene.updateChars(_rs.chars);
  },

  updateCharacterPosition(charId, locationStr, activity) {
    _rs.moves.set(charId, { locStr: locationStr, activity });
    if (_rs._scene) _rs._scene.moveTo(charId, locationStr);
  },

  updateEmotionState(charId, emotions) {
    if (!emotions) return;
    _rs.emotions.set(charId, emotions);
    const scene = _rs._scene;
    if (!scene) return;
    const icon = scene._dominantEmoIcon(emotions);
    if (icon && icon !== '😐') {
      _rs.emoBursts.set(charId, { icon, born: scene._tick ?? 0, duration: 200 });
    }
  },

  triggerEmotionBurst(charId, icon) {
    if (!icon) return;
    _rs.emoBursts.set(charId, { icon, born: _rs._scene?._tick ?? 0, duration: 200 });
  },

  showCharacterMessage(charId, text) {
    if (!text) return;
    _rs.bubbles.set(charId, { text: text.substring(0, 80), born: _rs._scene?._tick ?? 0 });
  },

  setSimTime(t) {
    if (!t) return;
    const h = parseInt(t.split(':')[0], 10);
    _rs.simHour = isNaN(h) ? 8 : h;
  },

  // Legacy compatibility
  showSpeechBubble(text) {
    const el = document.getElementById('speech-bubble');
    if (el) { el.textContent=text; el.classList.remove('hidden'); clearTimeout(this._bt); this._bt=setTimeout(()=>el.classList.add('hidden'),5000); }
  },

  showIndoor(building, chars) {
    if (!this._game) return;
    this._game.scene.sleep('IsoScene');
    // Stop any running IndoorScene then start fresh with new building data
    try { this._game.scene.stop('IndoorScene'); } catch(_) {}
    this._game.scene.start('IndoorScene', { building, chars });
  },

  onBuildingClick:  null,
  onCharacterClick: null,

  followCharacter(charId) {
    if (_rs._scene) _rs._scene.setFollow(charId);
  },
  unfollowCharacter() {
    if (_rs._scene) _rs._scene.clearFollow();
  },
};
