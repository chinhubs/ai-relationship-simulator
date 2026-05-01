/**
 * Thai Neighborhood Renderer — animated pixel-art scene.
 */

const LOCATIONS = {
  "home":                    { x: 330, y: 345 },
  "home (bedroom)":          { x: 330, y: 345 },
  "home (living room)":      { x: 310, y: 345 },
  "office":                  { x: 650, y: 345 },
  "7-eleven":                { x: 100, y: 345 },
  "near office / 7-eleven":  { x: 100, y: 345 },
  "convenience store":       { x: 100, y: 345 },
  "bts / road":              { x: 400, y: 395 },
  "road":                    { x: 450, y: 395 },
  "restaurant":              { x: 500, y: 345 },
  "cafe":                    { x: 420, y: 345 },
  "shopping mall":           { x: 720, y: 345 },
  "mall":                    { x: 720, y: 345 },
  "park":                    { x: 220, y: 345 },
  "hospital":                { x: 580, y: 345 },
  "school":                  { x: 480, y: 345 },
  "gym":                     { x: 560, y: 345 },
  "default":                 { x: 400, y: 345 },
};

// Activity → animation type mapping
function getActivityType(activity, isMoving) {
  if (isMoving) return "walk";
  const a = (activity || "").toLowerCase();
  if (/นอน|หลับ|sleep/.test(a))               return "sleep";
  if (/กิน|ทาน|อาหาร|eat|drink|ดื่ม/.test(a)) return "eat";
  if (/โทร|phone|call|line|chat/.test(a))       return "phone";
  if (/ทำงาน|work|คอม|พิมพ์|type/.test(a))     return "work";
  if (/วิ่ง|ออกกำลัง|exercise|run/.test(a))     return "run";
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
    const existing = new Map(this.characters.map(c => [c.id, c]));
    this.characters = chars.map((c, i) => {
      const prev = existing.get(c.id);
      return {
        ...c,
        shirtColor:      CHAR_SHIRTS[i % CHAR_SHIRTS.length],
        pantsColor:      CHAR_PANTS [i % CHAR_PANTS.length],
        hairColor:       CHAR_HAIR  [i % CHAR_HAIR.length],
        skinColor:       CHAR_SKIN  [i % CHAR_SKIN.length],
        px:              prev ? prev.px : 300 + i * 55,
        py:              prev ? prev.py : 345,
        targetX:         prev ? prev.targetX : 300 + i * 55,
        targetY:         prev ? prev.targetY : 345,
        bobOffset:       i * 0.9,
        isFemale:        c.gender === "female",
        currentActivity: prev ? prev.currentActivity : "sleeping",
        facingRight:     prev ? prev.facingRight : true,
      };
    });
  }

  updateCharacterPosition(charId, locationStr, activity) {
    const char = this.characters.find(c => c.id === charId);
    if (!char) return;
    const loc = getLocationData(locationStr);
    const idx = this.characters.indexOf(char);
    const newX = loc.x + idx * 38 - (this.characters.length - 1) * 19;
    if (Math.abs(newX - char.px) > 10) {
      char.facingRight = newX > char.px;
    }
    char.targetX = newX;
    char.targetY = loc.y;
    if (activity) char.currentActivity = activity;
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

  _draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const h = this._hour();
    this._drawSky(h);
    this._drawBackgroundTrees();
    this._drawGround();
    this._drawBuildings();
    this._drawForeground();

    for (const c of [...this.characters].sort((a, b) => a.py - b.py)) {
      const prevX = c.px;
      c.px += (c.targetX - c.px) * 0.05;
      c.py += (c.targetY - c.py) * 0.05;
      const isMoving = Math.abs(c.targetX - c.px) > 6;
      if (isMoving && c.px !== prevX) {
        c.facingRight = c.targetX > c.px;
      }
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
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, 215);

    if (h >= 6 && h < 19) {
      const p  = (h - 6) / 13;
      const sx = 60 + p * (canvas.width - 120);
      const sy = 55 - Math.sin(p * Math.PI) * 30;
      ctx.fillStyle = "rgba(255,220,0,0.25)";
      ctx.beginPath(); ctx.arc(sx, sy, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#FFD700";
      ctx.beginPath(); ctx.arc(sx, sy, 18, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = "#fffde7";
      ctx.beginPath(); ctx.arc(120, 50, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      [[60,20],[230,15],[400,28],[570,12],[720,35],[780,50],[160,48]].forEach(([x,y])=>{
        ctx.fillRect(x, y, 2, 2);
      });
    }

    if (h >= 6 && h < 20) {
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      const off = (this.frame * 0.12) % canvas.width;
      [[140,50,80,28],[370,38,100,32],[630,58,65,24]].forEach(([cx,cy,w,ht])=>{
        this._cloud(ctx, (cx + off) % canvas.width - 50, cy, w, ht);
      });
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
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x,318); ctx.lineTo(x,386); ctx.stroke();
    }
    for (let y = 318; y < 386; y += 32) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
    }
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
    this._drawThaiHouse(228, 198);
    this._drawOfficeBuilding(568, 212);
    this._drawTree(195, 316); this._drawTree(548, 312); this._drawTree(768, 318);
    this._drawBush(168, 322); this._drawBush(520, 318);
  }

  _draw7Eleven(x, y) {
    const { ctx } = this;
    const W = 145, H = 112;
    ctx.fillStyle="#f0ece0"; ctx.fillRect(x,y+22,W,H);
    ctx.fillStyle="#1a6e2e"; ctx.fillRect(x,y,W,26);
    ctx.fillStyle="#cc2828"; ctx.fillRect(x+28,y,26,26);
    ctx.fillStyle="#fff"; ctx.font="bold 18px 'Courier New'"; ctx.textAlign="center";
    ctx.fillText("7",x+41,y+20);
    ctx.fillStyle="#cc2828"; ctx.font="bold 7px 'Courier New'";
    ctx.fillText("ELEVEN",x+95,y+15);
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
    const W = 210, H = 92;
    ctx.fillStyle="#5a8c40"; ctx.fillRect(x-25,y+82,W+50,52);
    ctx.fillStyle="#dcd5c0"; ctx.fillRect(x+W,y+38,16,H-4);
    ctx.fillStyle="#f8f4ea"; ctx.fillRect(x+18,y+36,W-10,H);
    ctx.fillStyle="#5c3d1e";
    ctx.beginPath(); ctx.moveTo(x+8,y+40); ctx.lineTo(x+W/2+20,y); ctx.lineTo(x+W+20,y+40); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#3d280e"; ctx.fillRect(x+8,y+40,W+12,7);
    ctx.fillStyle="#8b5e3c"; ctx.fillRect(x+90,y+82,30,46);
    ctx.fillStyle="#6b4425"; ctx.fillRect(x+92,y+84,13,22); ctx.fillRect(x+107,y+84,11,22);
    ctx.fillStyle="#f5c518"; ctx.beginPath(); ctx.arc(x+117,y+107,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#c8e4f8"; ctx.fillRect(x+30,y+55,38,32);
    ctx.fillStyle="#8b6b45"; ctx.fillRect(x+26,y+52,7,36); ctx.fillRect(x+68,y+52,7,36);
    ctx.strokeStyle="#7a9cb0"; ctx.lineWidth=0.5; ctx.strokeRect(x+30,y+55,38,32);
    ctx.beginPath(); ctx.moveTo(x+49,y+55); ctx.lineTo(x+49,y+87); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+30,y+71); ctx.lineTo(x+68,y+71); ctx.stroke();
    ctx.fillStyle="#c8e4f8"; ctx.fillRect(x+142,y+55,38,32);
    ctx.fillStyle="#8b6b45"; ctx.fillRect(x+138,y+52,7,36); ctx.fillRect(x+180,y+52,7,36);
    ctx.strokeStyle="#7a9cb0"; ctx.strokeRect(x+142,y+55,38,32);
    ctx.beginPath(); ctx.moveTo(x+161,y+55); ctx.lineTo(x+161,y+87); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+142,y+71); ctx.lineTo(x+180,y+71); ctx.stroke();
    ctx.fillStyle="#8b6b45"; ctx.fillRect(x+6,y+88,4,28);
    ctx.fillStyle="#f5efe0"; ctx.fillRect(x-10,y+85,40,18);
    ctx.strokeStyle="#c4a882"; ctx.lineWidth=1; ctx.strokeRect(x-10,y+85,40,18);
    ctx.fillStyle="#5c3d1e"; ctx.font="5px 'Courier New'"; ctx.textAlign="center";
    ctx.fillText("หมู่บ้าน",x+10,y+95); ctx.fillText("ชวนชื่น",x+10,y+101);
    [[x-12,"#e85454"],[x+165,"#f76ab7"],[x+185,"#f5c518"]].forEach(([fx,fc])=>{
      ctx.fillStyle="#4a8c3a"; ctx.fillRect(fx+3,y+108,2,16);
      ctx.fillStyle=fc; ctx.beginPath(); ctx.arc(fx+4,y+106,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#fff176"; ctx.beginPath(); ctx.arc(fx+4,y+106,2,0,Math.PI*2); ctx.fill();
    });
    ctx.fillStyle="#f0e8d0";
    for (let fx=x-26; fx<x+W+32; fx+=13) { ctx.fillRect(fx,y+104,7,20); }
    ctx.fillRect(x-26,y+108,W+60,4);
  }

  _drawOfficeBuilding(x, y) {
    const { ctx } = this;
    const W = 175, H = 112;
    ctx.fillStyle="#e8e0d0"; ctx.fillRect(x,y,W,H);
    ctx.fillStyle="#c8a888"; ctx.fillRect(x-6,y-10,W+12,14);
    ctx.fillStyle="#a8d4e8";
    for (let wy=y+18; wy<y+H-22; wy+=24) {
      for (let wx=x+14; wx<x+W-14; wx+=30) {
        ctx.fillRect(wx,wy,20,15);
        ctx.strokeStyle="#88afc4"; ctx.lineWidth=0.5; ctx.strokeRect(wx,wy,20,15);
      }
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
    this._drawCar(this.ctx, 690, 358);
    this._drawMailbox(this.ctx, 462, 348);
  }

  _drawCar(ctx, x, y) {
    ctx.fillStyle="#8898a8"; ctx.fillRect(x,y,72,22);
    ctx.fillStyle="#6a7a8a"; ctx.fillRect(x+10,y-15,48,17);
    ctx.fillStyle="#b8d8e8";
    ctx.fillRect(x+13,y-13,20,13); ctx.fillRect(x+34,y-13,20,13);
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
    ctx.fillStyle="#aa1818";
    ctx.beginPath(); ctx.ellipse(x,y-9,11,4,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#fff"; ctx.font="5px 'Courier New'"; ctx.textAlign="center";
    ctx.fillText("ไปรษณีย์",x,y-3);
  }

  // ── Character drawing dispatcher ─────────────────────────────────────────
  _drawCharacter(char, actType) {
    if (actType === "sleep") {
      this._drawSleeping(char);
    } else if (char.isFemale) {
      this._drawFemale(char, actType);
    } else {
      this._drawMale(char, actType);
    }
  }

  // ── Walk cycle helpers ────────────────────────────────────────────────────
  _walkLegs(frame, bobOffset, actType) {
    const speed = actType === "run" ? 0.45 : 0.22;
    const swing = actType === "run" ? 6 : 4;
    const phase = frame * speed + bobOffset;
    return {
      leftY:  Math.round(Math.sin(phase)        * swing),
      rightY: Math.round(Math.sin(phase + Math.PI) * swing),
      leftX:  Math.round(Math.cos(phase)        * (swing * 0.4)),
      rightX: Math.round(Math.cos(phase + Math.PI) * (swing * 0.4)),
    };
  }

  // ── Male character ────────────────────────────────────────────────────────
  _drawMale(char, actType) {
    const { ctx, frame } = this;
    const x  = Math.round(char.px);
    const y  = Math.round(char.py);
    const sk = char.skinColor  || "#f5d0a0";
    const sh = char.shirtColor || "#4a9eff";
    const pa = char.pantsColor || "#2c3e50";
    const ha = char.hairColor  || "#1a1008";

    const isWalking = actType === "walk" || actType === "run";
    const b   = isWalking ? 0 : Math.round(Math.sin(frame * 0.07 + char.bobOffset) * 1.5);
    const legs = isWalking ? this._walkLegs(frame, char.bobOffset, actType) : { leftY:0, rightY:0, leftX:0, rightX:0 };

    // Flip ctx when facing left
    const flip = !char.facingRight;
    if (flip) { ctx.save(); ctx.scale(-1, 1); ctx.translate(-2 * x, 0); }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.ellipse(x, y+4, 11, 3, 0, 0, Math.PI*2); ctx.fill();

    // Left shoe
    ctx.fillStyle = "#111";
    ctx.fillRect(x-8 + legs.leftX,  y-1+b + legs.leftY,  7, 4);
    ctx.fillRect(x+1 + legs.rightX, y-1+b + legs.rightY, 7, 4);

    // Pants legs
    ctx.fillStyle = pa;
    ctx.fillRect(x-7 + legs.leftX,  y-11+b + legs.leftY,  5, 11);
    ctx.fillRect(x+2 + legs.rightX, y-11+b + legs.rightY, 5, 11);

    // Belt
    ctx.fillStyle = "#4a3020"; ctx.fillRect(x-7, y-12+b, 14, 3);
    ctx.fillStyle = "#f5c040"; ctx.fillRect(x-1, y-12+b,  2, 3);

    // Shirt
    ctx.fillStyle = sh; ctx.fillRect(x-7, y-25+b, 14, 14);
    ctx.fillStyle = "#f5e8d8"; ctx.fillRect(x-2, y-25+b, 4, 4);
    ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fillRect(x+2, y-22+b, 4, 4);

    // Arms — swing opposite to legs when walking
    const armSwing = isWalking ? legs.leftY * 0.6 : 0;
    ctx.fillStyle = sh;
    ctx.fillRect(x-11, y-24+b - armSwing, 4, 10);
    ctx.fillRect(x+7,  y-24+b + armSwing, 4, 10);
    ctx.fillStyle = sk;
    ctx.fillRect(x-11, y-15+b - armSwing, 4, 6);
    ctx.fillRect(x+7,  y-15+b + armSwing, 4, 6);

    // Phone in hand
    if (actType === "phone") {
      ctx.fillStyle = "#333"; ctx.fillRect(x+7, y-22+b, 4, 6);
      ctx.fillStyle = "#7ae"; ctx.fillRect(x+8, y-21+b, 2, 4);
    }

    // Head
    ctx.fillStyle = sk; ctx.fillRect(x-6, y-37+b, 12, 13);
    // Hair
    ctx.fillStyle = ha;
    ctx.fillRect(x-7, y-40+b, 14, 6);
    ctx.fillRect(x-7, y-38+b,  3, 8);
    ctx.fillRect(x+4, y-38+b,  3, 5);
    // Eyes
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x-4, y-32+b, 2, 2); ctx.fillRect(x+2, y-32+b, 2, 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x-4, y-33+b, 1, 1); ctx.fillRect(x+2, y-33+b, 1, 1);
    // Eyebrows
    ctx.fillStyle = ha;
    ctx.fillRect(x-5, y-35+b, 4, 1); ctx.fillRect(x+1, y-35+b, 4, 1);
    // Mouth
    ctx.fillStyle = "#b06040"; ctx.fillRect(x-2, y-27+b, 4, 1);

    // Work: small laptop icon in front
    if (actType === "work") {
      ctx.fillStyle = "#4a7c90"; ctx.fillRect(x-8, y-12+b, 16, 9);
      ctx.fillStyle = "#7ae";    ctx.fillRect(x-7, y-11+b, 14, 6);
      ctx.fillStyle = "#4a7c90"; ctx.fillRect(x-10,y-4+b,  20, 2);
    }

    if (flip) ctx.restore();

    this._drawNameTag(ctx, char, x, y, b);
  }

  // ── Female character ──────────────────────────────────────────────────────
  _drawFemale(char, actType) {
    const { ctx, frame } = this;
    const x  = Math.round(char.px);
    const y  = Math.round(char.py);
    const sk = char.skinColor  || "#f5d0a0";
    const sh = char.shirtColor || "#f76ab7";
    const pa = char.pantsColor || "#9b7dff";
    const ha = char.hairColor  || "#1a1008";

    const isWalking = actType === "walk" || actType === "run";
    const b    = isWalking ? 0 : Math.round(Math.sin(frame * 0.07 + char.bobOffset) * 1.5);
    const legs = isWalking ? this._walkLegs(frame, char.bobOffset, actType) : { leftY:0, rightY:0, leftX:0, rightX:0 };

    const flip = !char.facingRight;
    if (flip) { ctx.save(); ctx.scale(-1, 1); ctx.translate(-2 * x, 0); }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.ellipse(x, y+4, 11, 3, 0, 0, Math.PI*2); ctx.fill();

    // Shoes
    ctx.fillStyle = "#cc3060";
    ctx.fillRect(x-7 + legs.leftX,  y-1+b + legs.leftY,  6, 4);
    ctx.fillRect(x+1 + legs.rightX, y-1+b + legs.rightY, 6, 4);

    // Legs (skin)
    ctx.fillStyle = sk;
    ctx.fillRect(x-5 + legs.leftX,  y-8+b + legs.leftY,  4, 8);
    ctx.fillRect(x+1 + legs.rightX, y-8+b + legs.rightY, 4, 8);

    // Skirt
    ctx.fillStyle = pa;
    ctx.beginPath();
    ctx.moveTo(x-7, y-20+b); ctx.lineTo(x+7, y-20+b);
    ctx.lineTo(x+10, y-8+b); ctx.lineTo(x-10, y-8+b);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(x-10, y-10+b, 20, 2);

    // Blouse
    ctx.fillStyle = sh; ctx.fillRect(x-6, y-25+b, 12, 6);
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(x-6, y-20+b, 12, 2);

    // Arms
    const armSwing = isWalking ? legs.leftY * 0.6 : 0;
    ctx.fillStyle = sh;
    ctx.fillRect(x-9, y-24+b - armSwing, 3, 8);
    ctx.fillRect(x+6, y-24+b + armSwing, 3, 8);
    ctx.fillStyle = sk;
    ctx.fillRect(x-9, y-17+b - armSwing, 3, 6);
    ctx.fillRect(x+6, y-17+b + armSwing, 3, 6);

    // Phone
    if (actType === "phone") {
      ctx.fillStyle = "#333"; ctx.fillRect(x+6, y-22+b, 3, 6);
      ctx.fillStyle = "#f9a"; ctx.fillRect(x+7, y-21+b, 1, 4);
    }

    // Head
    ctx.fillStyle = sk; ctx.fillRect(x-6, y-38+b, 12, 14);
    // Hair
    ctx.fillStyle = ha;
    ctx.fillRect(x-7, y-42+b, 14, 7);
    ctx.fillRect(x-8, y-38+b,  3, 18);
    ctx.fillRect(x+5, y-38+b,  3, 18);
    ctx.fillRect(x-7, y-38+b,  2, 10);
    ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(x-3, y-41+b, 5, 3);
    // Eyes
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x-5, y-33+b, 3, 3); ctx.fillRect(x+2, y-33+b, 3, 3);
    ctx.fillRect(x-6, y-34+b, 1, 2); ctx.fillRect(x+5, y-34+b, 1, 2);
    ctx.fillRect(x-5, y-35+b, 1, 1); ctx.fillRect(x+4, y-35+b, 1, 1);
    ctx.fillStyle = "#5a3090";
    ctx.fillRect(x-4, y-33+b, 2, 2); ctx.fillRect(x+2, y-33+b, 2, 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x-4, y-34+b, 1, 1); ctx.fillRect(x+3, y-34+b, 1, 1);
    // Eyebrows
    ctx.fillStyle = ha;
    ctx.fillRect(x-5, y-37+b, 3, 1); ctx.fillRect(x+1, y-37+b, 3, 1);
    // Blush
    ctx.fillStyle = "rgba(255,130,150,0.55)";
    ctx.fillRect(x-6, y-30+b, 3, 2); ctx.fillRect(x+3, y-30+b, 3, 2);
    // Mouth
    ctx.fillStyle = "#d05060"; ctx.fillRect(x-2, y-28+b, 4, 2);
    ctx.fillStyle = "#e07080"; ctx.fillRect(x-1, y-28+b, 2, 1);

    // Work: laptop
    if (actType === "work") {
      ctx.fillStyle = "#4a7c90"; ctx.fillRect(x-8, y-12+b, 16, 9);
      ctx.fillStyle = "#7ae";    ctx.fillRect(x-7, y-11+b, 14, 6);
      ctx.fillStyle = "#4a7c90"; ctx.fillRect(x-10, y-4+b, 20, 2);
    }

    if (flip) ctx.restore();

    this._drawNameTag(ctx, char, x, y, b);
  }

  // ── Sleeping pose ─────────────────────────────────────────────────────────
  _drawSleeping(char) {
    const { ctx, frame } = this;
    const x = Math.round(char.px);
    const y = Math.round(char.py) - 6;
    const sk = char.skinColor  || "#f5d0a0";
    const sh = char.shirtColor || "#4a9eff";
    const pa = char.pantsColor || "#2c3e50";
    const ha = char.hairColor  || "#1a1008";

    // Shadow (elongated, horizontal)
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.ellipse(x, y+5, 22, 4, 0, 0, Math.PI*2); ctx.fill();

    // Body (lying horizontal)
    ctx.fillStyle = sh;  ctx.fillRect(x-18, y-3, 24, 10);   // torso
    ctx.fillStyle = pa;  ctx.fillRect(x+6,  y-3, 14, 8);    // legs
    ctx.fillStyle = sk;  ctx.fillRect(x+20, y,   5,  5);    // feet
    ctx.fillStyle = sk;  ctx.fillRect(x-22, y-2, 5,  6);    // arm out

    // Head
    ctx.fillStyle = sk; ctx.fillRect(x-28, y-8, 12, 11);
    ctx.fillStyle = ha; ctx.fillRect(x-29, y-10, 14, 5);
    if (char.isFemale) {
      ctx.fillStyle = ha; ctx.fillRect(x-29, y-7, 3, 10);
    }
    // Closed eyes (sleeping)
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x-26, y-5, 3, 1); ctx.fillRect(x-22, y-5, 3, 1);
    // Tiny smile
    ctx.fillStyle = "#b06040"; ctx.fillRect(x-25, y-3, 4, 1);

    // ZZZ bubbles floating up
    ctx.fillStyle = "rgba(100,120,200,0.8)";
    ctx.font = "bold 8px 'Courier New'"; ctx.textAlign = "center";
    const zOff = (frame * 0.4) % 20;
    ctx.globalAlpha = 1 - zOff / 22;
    ctx.fillText("z",  x+6,  y - 10 - zOff);
    ctx.globalAlpha = Math.max(0, 0.9 - ((zOff + 7) % 20) / 22);
    ctx.fillText("Z",  x+12, y - 16 - ((zOff + 7) % 20));
    ctx.globalAlpha = Math.max(0, 0.7 - ((zOff + 14) % 20) / 22);
    ctx.fillText("Z",  x+18, y - 24 - ((zOff + 14) % 20));
    ctx.globalAlpha = 1;

    this._drawNameTag(ctx, char, x - 16, y, 0);
  }

  // ── Name tag ──────────────────────────────────────────────────────────────
  _drawNameTag(ctx, char, x, y, b) {
    const name = char.nickname || char.name.split(" ")[0];
    ctx.font = "9px 'Courier New'"; ctx.textAlign = "center";
    const nw = ctx.measureText(name).width + 10;
    ctx.fillStyle = "rgba(30,15,5,0.65)";
    if (ctx.roundRect) ctx.roundRect(x - nw/2, y-56+b, nw, 13, 3);
    else ctx.rect(x - nw/2, y-56+b, nw, 13);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(name, x, y-46+b);
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
