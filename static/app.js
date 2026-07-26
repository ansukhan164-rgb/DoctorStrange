// MediaPipe Hands bridge
const Hands = window.Hands;
const Camera = window.Camera;

const W = () => innerWidth, H = () => innerHeight;
const bg = document.getElementById('bgCanvas'), bgCtx = bg.getContext('2d');
const cv = document.getElementById('fxCanvas'), ctx = cv.getContext('2d');
const cam = document.getElementById('cam');
const fpsEl = document.getElementById('fps');

function resize() { bg.width = cv.width = W(); bg.height = cv.height = H(); }
resize();
window.addEventListener('resize', resize);

// Futuristic tech background layer
const stars = Array.from({ length: 300 }, () => ({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    z: Math.random() * 1.5 + 0.5,
    s: Math.random() * 1.5 + 0.5
}));

const techGlyphs = [
    'QUANTUM CORE', 'NEURAL LINK', 'VECTOR GRID', 'MYSTIC STREAM',
    'PORTAL NODE', 'ARCANE SIGNAL', 'SYNTH WAVE', 'OMEGA RUNE'
];

const floatingGlyphs = Array.from({ length: 18 }, (_, i) => ({
    text: techGlyphs[i % techGlyphs.length],
    x: Math.random() * 1.2 - 0.1,
    y: Math.random() * 1.2 - 0.1,
    vx: (Math.random() - 0.5) * 0.0004,
    vy: (Math.random() - 0.5) * 0.00025,
    alpha: 0.08 + Math.random() * 0.08,
    size: 10 + Math.random() * 8
}));

function drawStars() {
    bgCtx.fillStyle = '#000';
    bgCtx.fillRect(0, 0, bg.width, bg.height);

    const cx = bg.width / 2, cy = bg.height / 2;

    // Grid lines for a futuristic HUD feel
    bgCtx.save();
    bgCtx.globalAlpha = 0.18;
    bgCtx.strokeStyle = 'rgba(0, 255, 255, 0.16)';
    bgCtx.lineWidth = 1;

    const gridSize = 60;
    bgCtx.beginPath();
    for (let x = 0; x <= bg.width; x += gridSize) {
        bgCtx.moveTo(x, 0);
        bgCtx.lineTo(x, bg.height);
    }
    for (let y = 0; y <= bg.height; y += gridSize) {
        bgCtx.moveTo(0, y);
        bgCtx.lineTo(bg.width, y);
    }
    bgCtx.stroke();

    // Soft scanning beam
    const scanY = (performance.now() * 0.03) % bg.height;
    const scanGrad = bgCtx.createLinearGradient(0, scanY - 120, 0, scanY + 120);
    scanGrad.addColorStop(0, 'rgba(0, 255, 255, 0)');
    scanGrad.addColorStop(0.5, 'rgba(0, 255, 255, 0.08)');
    scanGrad.addColorStop(1, 'rgba(0, 255, 255, 0)');
    bgCtx.fillStyle = scanGrad;
    bgCtx.fillRect(0, scanY - 120, bg.width, 240);

    // Floating tech labels
    bgCtx.font = '12px Segoe UI, system-ui, sans-serif';
    for (const g of floatingGlyphs) {
        g.x += g.vx;
        g.y += g.vy;
        if (g.x < -0.1) g.x = 1.1;
        if (g.x > 1.1) g.x = -0.1;
        if (g.y < -0.1) g.y = 1.1;
        if (g.y > 1.1) g.y = -0.1;
        bgCtx.globalAlpha = g.alpha;
        bgCtx.fillStyle = 'rgba(255, 165, 0, 0.85)';
        bgCtx.fillText(g.text, g.x * bg.width, g.y * bg.height);
    }
    bgCtx.restore();

    for (const s of stars) {
        s.z -= 0.002;
        if (s.z <= 0) {
            s.z = 1.5;
            s.x = Math.random() * 2 - 1;
            s.y = Math.random() * 2 - 1;
        }
        const sx = cx + s.x / s.z * cx, sy = cy + s.y / s.z * cy;
        const r = s.s / s.z;
        const a = Math.min(1, (1.5 - s.z) / 1);
        bgCtx.globalAlpha = a * 0.7;
        bgCtx.fillStyle = '#fff';
        bgCtx.beginPath();
        bgCtx.arc(sx, sy, r, 0, Math.PI * 2);
        bgCtx.fill();
    }
    bgCtx.globalAlpha = 1;
}

// State
let handData = null, gestureState = {}, activeEffects = new Set();
const trails = [], smokeParticles = [], sparkParticles = [], portalParticles = [];
let portalActive = false, portalCenter = null, portalRadius = 0, portalAngle = 0;
let shieldData = { active: false, center: null, radius: 0, angle: 0, pulse: 0 };

// Gesture detection helpers
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function detectGestures(landmarks, handedness) {
    const tips = [8, 12, 16, 20], pips = [6, 10, 14, 18];
    const wrist = landmarks[0];
    const extended = tips.map((t, i) => {
        const tip = landmarks[t], pip = landmarks[pips[i]];
        return dist(tip, wrist) > dist(pip, wrist) * 1.05;
    });
    const allExtended = extended.every(e => e);
    const fist = extended.every(e => !e);
    const indexOnly = extended[0] && !extended[1] && !extended[2] && !extended[3];
    return { allExtended, fist, indexOnly, extended };
}

// Trail system
class TrailPoint {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.birth = performance.now();
        this.life = 1000;
    }
    get alpha() { return Math.max(0, 1 - (performance.now() - this.birth) / this.life); }
    get alive() { return this.alpha > 0; }
}

function updateTrails(hands) {
    for (const h of hands) {
        const tip = h.landmarks[8];
        const g = detectGestures(h.landmarks, h.handedness);
        if (g.indexOnly) {
            const x = (1 - tip.x) * cv.width, y = tip.y * cv.height;
            trails.push(new TrailPoint(x, y));
            activeEffects.add('trail');
        }
    }
    for (let i = trails.length - 1; i >= 0; i--) if (!trails[i].alive) trails.splice(i, 1);
    if (trails.length === 0) activeEffects.delete('trail');
}

function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return {
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
    };
}

function drawTrails() {
    if (trails.length < 3) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const layers = [
        { color: [255, 20, 20], aMul: 0.15, w: 18 },
        { color: [255, 60, 40], aMul: 0.35, w: 8 },
        { color: [255, 180, 160], aMul: 0.85, w: 2.5 }
    ];
    for (const L of layers) {
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < trails.length - 1; i++) {
            const p0 = trails[Math.max(i - 1, 0)];
            const p1 = trails[i];
            const p2 = trails[Math.min(i + 1, trails.length - 1)];
            const p3 = trails[Math.min(i + 2, trails.length - 1)];
            const a = Math.min(p1.alpha, p2.alpha);
            if (a <= 0) { started = false; continue; }
            const steps = 6;
            for (let s = 0; s <= steps; s++) {
                const pt = catmullRom(p0, p1, p2, p3, s / steps);
                if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
                else ctx.lineTo(pt.x, pt.y);
            }
        }
        const avgA = trails.reduce((s, t) => s + t.alpha, 0) / trails.length;
        ctx.strokeStyle = `rgba(${L.color[0]},${L.color[1]},${L.color[2]},${avgA * L.aMul})`;
        ctx.lineWidth = L.w;
        ctx.stroke();
    }
}

// Smoke system
class SmokeParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = -Math.random() * 2.5 - 1;
        this.life = 1;
        this.decay = 0.008 + Math.random() * 0.008;
        this.size = Math.random() * 25 + 15;
        this.rot = Math.random() * Math.PI * 2;
        this.rotV = (Math.random() - 0.5) * 0.04;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy -= 0.02;
        this.vx *= 0.99;
        this.life -= this.decay;
        this.rot += this.rotV;
        this.size += 0.3;
    }
    get alive() { return this.life > 0; }
}

function updateSmoke(hands) {
    for (const h of hands) {
        const wrist = h.landmarks[0];
        const indexTip = h.landmarks[8];
        const ringTip = h.landmarks[16];
        const ySpread = Math.abs(wrist.y - h.landmarks[12].y);
        const fingerSpread = Math.abs(indexTip.y - ringTip.y);
        const isFlat = ySpread < 0.08 && fingerSpread < 0.06;
        const g = detectGestures(h.landmarks, h.handedness);
        const palmUp = isFlat && g.allExtended;
        if (palmUp) {
            const emitPoints = [0, 4, 5, 8, 9, 12, 13, 16, 17, 20];
            for (const idx of emitPoints) {
                const lm = h.landmarks[idx];
                const x = (1 - lm.x) * cv.width, y = lm.y * cv.height;
                for (let i = 0; i < 2; i++) {
                    smokeParticles.push(new SmokeParticle(
                        x + (Math.random() - 0.5) * 30,
                        y + (Math.random() - 0.5) * 30
                    ));
                }
            }
            activeEffects.add('smoke');
        }
    }
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        smokeParticles[i].update();
        if (!smokeParticles[i].alive) smokeParticles.splice(i, 1);
    }
    if (smokeParticles.length === 0) activeEffects.delete('smoke');
}

function drawSmoke() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of smokeParticles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const a = p.life * 0.25;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        g.addColorStop(0, `rgba(0,255,255,${a * 0.5})`);
        g.addColorStop(0.4, `rgba(0,180,220,${a * 0.25})`);
        g.addColorStop(1, `rgba(0,100,150,0)`);
        ctx.fillStyle = g;
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
        ctx.restore();
    }
    ctx.restore();
}

// Sparks
class Spark {
    constructor(x, y) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 4;
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1;
        this.decay = 0.015 + Math.random() * 0.015;
        this.size = Math.random() * 3 + 1;
        this.tail = [];
    }
    update() {
        this.tail.push({ x: this.x, y: this.y });
        if (this.tail.length > 8) this.tail.shift();
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.25;
        this.vx *= 0.98;
        this.life -= this.decay;
    }
    get alive() { return this.life > 0; }
}

let fistCooldown = { left: 0, right: 0 };

function updateSparks(hands, now) {
    for (const h of hands) {
        const g = detectGestures(h.landmarks, h.handedness);
        const key = h.handedness || 'left';
        if (g.fist && (now - (fistCooldown[key] || 0)) > 400) {
            fistCooldown[key] = now;
            const wrist = h.landmarks[0];
            const x = (1 - wrist.x) * cv.width, y = wrist.y * cv.height;
            for (let i = 0; i < 50; i++) sparkParticles.push(new Spark(x, y));
            activeEffects.add('spark');
        }
    }
    for (let i = sparkParticles.length - 1; i >= 0; i--) {
        sparkParticles[i].update();
        if (!sparkParticles[i].alive) sparkParticles.splice(i, 1);
    }
    if (sparkParticles.length === 0) activeEffects.delete('spark');
}

function drawSparks() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of sparkParticles) {
        if (s.tail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(s.tail[0].x, s.tail[0].y);
            for (let i = 1; i < s.tail.length; i++) ctx.lineTo(s.tail[i].x, s.tail[i].y);
            ctx.lineTo(s.x, s.y);
            ctx.strokeStyle = `rgba(255,200,50,${s.life * 0.5})`;
            ctx.lineWidth = s.size * 0.7;
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,230,120,${s.life})`;
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${s.life * 0.6})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// Portal
class PortalSpark {
    constructor(cx, cy, r) {
        const a = Math.random() * Math.PI * 2;
        this.angle = a;
        this.r = r;
        this.cx = cx;
        this.cy = cy;
        this.x = cx + Math.cos(a) * r;
        this.y = cy + Math.sin(a) * r;
        this.life = 1;
        this.decay = 0.02 + Math.random() * 0.02;
        this.size = Math.random() * 3 + 1;
        this.drift = (Math.random() - 0.5) * 3;
    }
    update() {
        this.angle += 0.03 + this.drift * 0.01;
        this.x = this.cx + Math.cos(this.angle) * (this.r + (Math.random() - 0.5) * 8);
        this.y = this.cy + Math.sin(this.angle) * (this.r + (Math.random() - 0.5) * 8);
        this.life -= this.decay;
    }
    get alive() { return this.life > 0; }
}

function updatePortal(hands, now) {
    if (hands.length >= 2) {
        const h1 = hands[0].landmarks[8], h2 = hands[1].landmarks[8];
        const x1 = (1 - h1.x) * cv.width, y1 = h1.y * cv.height;
        const x2 = (1 - h2.x) * cv.width, y2 = h2.y * cv.height;
        const d = Math.hypot(x2 - x1, y2 - y1);
        if (d < 120) {
            portalActive = true;
            portalCenter = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
            portalRadius = Math.min(portalRadius + 3, 140);
            for (let i = 0; i < 4; i++) portalParticles.push(new PortalSpark(portalCenter.x, portalCenter.y, portalRadius));
            activeEffects.add('portal');
        } else {
            portalRadius = Math.max(0, portalRadius - 4);
            if (portalRadius === 0) {
                portalActive = false;
                activeEffects.delete('portal');
            }
        }
    } else {
        portalRadius = Math.max(0, portalRadius - 4);
        if (portalRadius === 0) {
            portalActive = false;
            activeEffects.delete('portal');
        }
    }
    portalAngle += 0.02;
    for (let i = portalParticles.length - 1; i >= 0; i--) {
        portalParticles[i].update();
        if (!portalParticles[i].alive) portalParticles.splice(i, 1);
    }
}

function drawPortal() {
    if (!portalActive || portalRadius < 5) return;
    const cx = portalCenter.x, cy = portalCenter.y, r = portalRadius;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const voidG = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    voidG.addColorStop(0, 'rgba(20,0,40,0.8)');
    voidG.addColorStop(0.6, 'rgba(40,0,80,0.3)');
    voidG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = voidG;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    for (let ring = 0; ring < 3; ring++) {
        const rr = r - ring * 8;
        ctx.beginPath();
        for (let i = 0; i <= 120; i++) {
            const a = portalAngle * (1 + ring * 0.3) + i * Math.PI * 2 / 120;
            const wobble = Math.sin(a * 6 + now * 0.003) * 4;
            const px = cx + Math.cos(a) * (rr + wobble);
            const py = cy + Math.sin(a) * (rr + wobble);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255,${150 + ring * 30},0,${0.6 - ring * 0.15})`;
        ctx.lineWidth = 3 - ring * 0.5;
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    for (const p of portalParticles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,200,50,${p.life})`;
        ctx.fill();
    }
    ctx.restore();
}

// Mandala shield
function updateShield(hands, now) {
    let found = false;
    for (const h of hands) {
        const g = detectGestures(h.landmarks, h.handedness);
        if (g.allExtended) {
            found = true;
            const palm = h.landmarks[9];
            const x = (1 - palm.x) * cv.width, y = palm.y * cv.height;
            shieldData.active = true;
            shieldData.center = { x, y };
            shieldData.radius = Math.min(shieldData.radius + 5, 200);
            shieldData.pulse = now;
            activeEffects.add('shield');
        }
    }
    if (!found) {
        shieldData.radius = 0;
        shieldData.active = false;
        activeEffects.delete('shield');
    }
    shieldData.angle += 0.015;
}

function drawShield(now) {
    if (!shieldData.active || shieldData.radius < 5) return;
    const { center: c, radius: r, angle } = shieldData;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.globalCompositeOperation = 'lighter';

    const pulseA = 0.6 + 0.3 * Math.sin(now * 0.004);
    const PI2 = Math.PI * 2;

    const glow = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.4);
    glow.addColorStop(0, `rgba(255,0,0,${pulseA * 0.08})`);
    glow.addColorStop(0.7, `rgba(200,0,0,${pulseA * 0.04})`);
    glow.addColorStop(1, 'rgba(100,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, PI2); ctx.fill();

    ctx.beginPath(); ctx.arc(0, 0, r, 0, PI2);
    ctx.strokeStyle = `rgba(255,30,30,${pulseA * 0.9})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, PI2);
    ctx.strokeStyle = `rgba(255,60,30,${pulseA * 0.7})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const runeChars = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ';
    ctx.font = `${r * 0.07}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const runeR = r * 0.96;
    const runeCount = runeChars.length;
    for (let i = 0; i < runeCount; i++) {
        const a = angle * 0.3 + i * PI2 / runeCount;
        ctx.save();
        ctx.rotate(a);
        ctx.translate(0, -runeR);
        ctx.rotate(Math.PI);
        ctx.fillStyle = `rgba(255,80,40,${pulseA * 0.8})`;
        ctx.fillText(runeChars[i], 0, 0);
        ctx.restore();
    }

    ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, PI2);
    ctx.strokeStyle = `rgba(255,40,20,${pulseA * 0.6})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, PI2);
    ctx.strokeStyle = `rgba(255,50,30,${pulseA * 0.5})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    for (let sq = 0; sq < 3; sq++) {
        const sqAngle = angle * (1.2 + sq * 0.5) + sq * Math.PI / 8;
        const sqR = r * (0.72 - sq * 0.06);
        ctx.save(); ctx.rotate(sqAngle);
        ctx.beginPath();
        ctx.moveTo(-sqR, -sqR); ctx.lineTo(sqR, -sqR);
        ctx.lineTo(sqR, sqR); ctx.lineTo(-sqR, sqR); ctx.closePath();
        ctx.strokeStyle = `rgba(255,${40 + sq * 30},${20 + sq * 15},${pulseA * (0.7 - sq * 0.1)})`;
        ctx.lineWidth = 2 - sq * 0.4;
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    const dR = r * 0.5;
    ctx.save(); ctx.rotate(angle * -0.8 + Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, -dR); ctx.lineTo(dR, 0); ctx.lineTo(0, dR); ctx.lineTo(-dR, 0); ctx.closePath();
    ctx.strokeStyle = `rgba(255,60,30,${pulseA * 0.65})`;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();

    for (let i = 1; i <= 5; i++) {
        ctx.beginPath(); ctx.arc(0, 0, r * i * 0.14, 0, PI2);
        ctx.strokeStyle = `rgba(255,40,20,${pulseA * (0.5 - i * 0.06)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    const starFolds = 8;
    for (let layer = 0; layer < 2; layer++) {
        const sR = r * (0.45 - layer * 0.12);
        const sAngle = angle * (1.5 + layer * 0.7);
        ctx.beginPath();
        for (let i = 0; i < starFolds; i++) {
            const a1 = sAngle + i * PI2 / starFolds;
            const a2 = sAngle + (i + 0.5) * PI2 / starFolds;
            const outerX = Math.cos(a1) * sR, outerY = Math.sin(a1) * sR;
            const innerX = Math.cos(a2) * sR * 0.4, innerY = Math.sin(a2) * sR * 0.4;
            if (i === 0) ctx.moveTo(outerX, outerY);
            else ctx.lineTo(outerX, outerY);
            ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255,${50 + layer * 40},${20 + layer * 20},${pulseA * (0.7 - layer * 0.15)})`;
        ctx.lineWidth = 1.5 - layer * 0.3;
        ctx.stroke();
    }

    for (let i = 0; i < 16; i++) {
        const a = angle * -0.5 + i * PI2 / 16;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15);
        ctx.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
        ctx.strokeStyle = `rgba(255,50,30,${pulseA * 0.2})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
    }

    for (let i = 0; i < 8; i++) {
        const a = angle * -1.5 + i * PI2 / 8;
        const rx = Math.cos(a) * r * 0.3, ry = Math.sin(a) * r * 0.3;
        ctx.beginPath();
        ctx.arc(rx, ry, r * 0.06, a - 0.6, a + 0.6);
        ctx.strokeStyle = `rgba(255,100,60,${pulseA * 0.6})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }

    for (let t = 0; t < 2; t++) {
        const tR = r * (0.35 - t * 0.1);
        const tA = angle * (2 + t) + t * Math.PI / 3;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a = tA + i * PI2 / 3;
            const px = Math.cos(a) * tR, py = Math.sin(a) * tR;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255,70,40,${pulseA * (0.5 - t * 0.1)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    const eyeG = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.1);
    eyeG.addColorStop(0, `rgba(255,200,180,${pulseA})`);
    eyeG.addColorStop(0.4, `rgba(255,80,40,${pulseA * 0.6})`);
    eyeG.addColorStop(1, `rgba(200,0,0,0)`);
    ctx.fillStyle = eyeG;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.1, 0, PI2); ctx.fill();

    ctx.beginPath(); ctx.arc(0, 0, r * 0.04, 0, PI2);
    ctx.fillStyle = `rgba(255,220,200,${pulseA})`; ctx.fill();
    ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.02, 0, PI2);
    ctx.fillStyle = `rgba(255,255,255,${pulseA})`; ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
}

// Skeleton overlay
const CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17]
];

function drawSkeleton(hands) {
    for (const h of hands) {
        const lm = h.landmarks;
        ctx.save();
        ctx.globalAlpha = 0.3;
        for (const [a, b] of CONNECTIONS) {
            const ax = (1 - lm[a].x) * cv.width, ay = lm[a].y * cv.height;
            const bx = (1 - lm[b].x) * cv.width, by = lm[b].y * cv.height;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.strokeStyle = 'rgba(0,255,255,0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        for (let i = 0; i < 21; i++) {
            const px = (1 - lm[i].x) * cv.width, py = lm[i].y * cv.height;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,255,255,0.6)';
            ctx.fill();
        }
        ctx.restore();
    }
}

function updateHUD() {
    document.getElementById('bTrail').classList.toggle('active', activeEffects.has('trail'));
    document.getElementById('bSmoke').classList.toggle('active', activeEffects.has('smoke'));
    document.getElementById('bPortal').classList.toggle('active', activeEffects.has('portal'));
    document.getElementById('bShield').classList.toggle('active', activeEffects.has('shield'));
    document.getElementById('bSpark').classList.toggle('active', activeEffects.has('spark'));
}

// Main loop
let now = 0, lastFps = 0, frameCount = 0;
function loop(t) {
    now = t;
    requestAnimationFrame(loop);

    frameCount++;
    if (t - lastFps > 500) {
        fpsEl.textContent = `${Math.round(frameCount / ((t - lastFps) / 1000))} FPS`;
        frameCount = 0;
        lastFps = t;
    }

    drawStars();
    ctx.clearRect(0, 0, cv.width, cv.height);

    if (handData && handData.length > 0) {
        const hands = handData.map((lm, i) => ({ landmarks: lm, handedness: i === 0 ? 'left' : 'right' }));
        updateTrails(hands);
        updateSmoke(hands);
        updateSparks(hands, now);
        updatePortal(hands, now);
        updateShield(hands, now);

        drawTrails();
        drawSmoke();
        drawPortal();
        drawShield(now);
        drawSparks();
        drawSkeleton(hands);
        updateHUD();
    } else {
        updateTrails([]);
        updateSmoke([]);
        for (let i = sparkParticles.length - 1; i >= 0; i--) {
            sparkParticles[i].update();
            if (!sparkParticles[i].alive) sparkParticles.splice(i, 1);
        }
        drawTrails();
        drawSmoke();
        drawPortal();
        drawShield(now);
        drawSparks();
        updateHUD();
    }
}

// MediaPipe init
document.getElementById('startBtn').addEventListener('click', async () => {
    document.getElementById('startBtn').style.display = 'none';
    setTimeout(() => document.getElementById('title').classList.add('hide'), 1500);

    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }
    });
    cam.srcObject = stream;

    const hands = new Hands({
        locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`
    });
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.6
    });
    hands.onResults(r => {
        handData = r.multiHandLandmarks || [];
    });

    const camera = new Camera(cam, {
        onFrame: async () => await hands.send({ image: cam }),
        width: 1280,
        height: 720
    });

    camera.start();
    requestAnimationFrame(loop);
});
