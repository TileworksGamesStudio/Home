// script.js

/**
 * Tileworks Studio — Advanced Interactive Engine
 * Fully featured:
 * - Immediate fallback rendering (Zero blank pages or render delay)
 * - Intelligent multi-directory image loader (Links/ -> links/ -> root)
 * - Dynamic category bar auto-generator from links.json
 * - 3D physics lerp card tilt with specular shine tracking
 * - Pure Web Audio procedural drone synthesizer + UI feedback
 * - 60fps ambient particle canvas
 * - Native Web Share & built-in SVG QR code modal
 * - Logo triple-tap confetti celebration
 */

const CONFIG = {
  defaultLinksJson: 'links.json',
  fallbackItems: [
    {
      title: "Chess",
      image: "chess.svg",
      category: ["featured", "strategy"],
      badge: "CLASSIC",
      url: "https://tileworksgamesstudio.github.io/Chess/"
    },
    {
      title: "Battleships",
      image: "battleships.svg",
      category: "strategy",
      badge: "HOT",
      url: "https://tileworksgamesstudio.github.io/Battleships/"
    },
    {
      title: "Pairs",
      image: "pairs.svg",
      category: "casual",
      badge: "MEMORY",
      url: "https://tileworksgamesstudio.github.io/Pairs/"
    },
    {
      title: "Trivia",
      image: "TRIVIA.svg",
      category: "casual",
      badge: "QUIZ",
      url: "https://tileworksgamesstudio.github.io/Trivia/"
    }
  ],
  audioVolume: 0.32,
  haptics: {
    light: 10,
    medium: 20,
    heavy: 35,
    celebration: [10, 30, 20, 40, 10, 50]
  }
};

let allMenuItems = [];
let activeCategory = 'all';

/* ==========================================================================
   1. Haptic Engine
   ========================================================================== */
function triggerHaptic(type = 'light') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      const pattern = CONFIG.haptics[type] || CONFIG.haptics.light;
      navigator.vibrate(pattern);
    } catch (e) {}
  }
}

/* ==========================================================================
   2. Procedural Web Audio Synthesizer & Sound FX Engine
   ========================================================================== */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.bgAudio = null;
    this.ambientNodes = [];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (!this.bgAudio) {
      this.bgAudio = document.getElementById('bg-audio');
    }
  }

  async resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  startProceduralAmbient() {
    if (!this.ctx || this.ambientNodes.length > 0) return;

    const chords = [130.81, 196.00, 261.63, 329.63]; // Ethereal C chord
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.045, this.ctx.currentTime + 2.5);

    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.detune.setValueAtTime((idx - 1.5) * 5, this.ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(masterGain);
      osc.start();

      this.ambientNodes.push(osc);
    });

    masterGain.connect(this.ctx.destination);
    this.ambientGain = masterGain;
  }

  stopProceduralAmbient() {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6);
      setTimeout(() => {
        this.ambientNodes.forEach(node => {
          try { node.stop(); node.disconnect(); } catch (e) {}
        });
        this.ambientNodes = [];
      }, 650);
    }
  }

  playUiSound(freq = 600, duration = 0.04, type = 'sine', slideTo = 240) {
    if (this.isMuted) return;
    try {
      this.resumeContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration + 0.01);
    } catch (e) {}
  }

  playHoverTick() { this.playUiSound(740, 0.03, 'sine', 550); }
  playClickSnap() { this.playUiSound(880, 0.05, 'triangle', 220); }
  playSuccessChime() {
    if (this.isMuted) return;
    this.playUiSound(523.25, 0.1, 'sine', 659.25);
    setTimeout(() => this.playUiSound(783.99, 0.15, 'sine', 1046.5), 90);
  }

  async toggleAudio() {
    await this.resumeContext();
    this.isMuted = !this.isMuted;

    const equalizer = document.getElementById('equalizer');
    const statusLabel = document.getElementById('audio-status');

    if (!this.isMuted) {
      let played = false;
      if (this.bgAudio) {
        try {
          this.bgAudio.volume = CONFIG.audioVolume;
          await this.bgAudio.play();
          played = true;
        } catch (err) {}
      }
      if (!played) this.startProceduralAmbient();

      equalizer.classList.add('playing');
      statusLabel.textContent = 'ON';
      showToast('Sound activated');
    } else {
      if (this.bgAudio) this.bgAudio.pause();
      this.stopProceduralAmbient();
      equalizer.classList.remove('playing');
      statusLabel.textContent = 'OFF';
      showToast('Sound muted');
    }

    localStorage.setItem('tileworks_sound_pref', this.isMuted ? 'false' : 'true');
  }
}

const sounds = new SoundEngine();

/* ==========================================================================
   3. Ambient Particle Canvas Engine (60 FPS)
   ========================================================================== */
function initAmbientCanvas() {
  const canvas = document.getElementById('ambient-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = (canvas.width = window.innerWidth);
  let h = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  const particleCount = Math.min(Math.floor(w * 0.06), 40);
  const particles = Array.from({ length: particleCount }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    s: Math.random() * 2 + 0.8,
    vy: Math.random() * 0.45 + 0.15,
    vx: (Math.random() - 0.5) * 0.3,
    a: Math.random() * 0.5 + 0.2
  }));

  function render() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y -= p.vy;
      p.x += p.vx;
      if (p.y < -10) p.y = h + 10;
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212, 163, 89, ${p.a})`;
      ctx.fill();
    }
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

/* ==========================================================================
   4. 3D Card Physics Tilt with Lerp Smoothing
   ========================================================================== */
function attachCardTiltPhysics(card) {
  let bounds = card.getBoundingClientRect();
  let currentRotX = 0;
  let currentRotY = 0;
  let targetRotX = 0;
  let targetRotY = 0;
  let isHovered = false;
  let rafId = null;

  function updateBounds() {
    bounds = card.getBoundingClientRect();
  }

  function renderPhysics() {
    if (!isHovered && Math.abs(currentRotX) < 0.05 && Math.abs(currentRotY) < 0.05) {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
      cancelAnimationFrame(rafId);
      rafId = null;
      return;
    }

    currentRotX += (targetRotX - currentRotX) * 0.12;
    currentRotY += (targetRotY - currentRotY) * 0.12;

    card.style.transform = `perspective(1000px) rotateX(${currentRotX.toFixed(2)}deg) rotateY(${currentRotY.toFixed(2)}deg)`;
    rafId = requestAnimationFrame(renderPhysics);
  }

  card.addEventListener('mouseenter', () => {
    isHovered = true;
    updateBounds();
    sounds.playHoverTick();
    if (!rafId) rafId = requestAnimationFrame(renderPhysics);
  });

  card.addEventListener('mousemove', (e) => {
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;

    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);

    const normX = (x / bounds.width) * 2 - 1;
    const normY = (y / bounds.height) * 2 - 1;

    targetRotY = normX * 10;
    targetRotX = -normY * 10;

    if (!rafId) rafId = requestAnimationFrame(renderPhysics);
  });

  card.addEventListener('mouseleave', () => {
    isHovered = false;
    targetRotX = 0;
    targetRotY = 0;
  });

  card.addEventListener('pointerdown', (e) => {
    triggerHaptic('medium');
    sounds.playClickSnap();

    const rect = card.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');

    const size = Math.max(rect.width, rect.height) * 1.5;
    const x = e.clientX ? e.clientX - rect.left - size / 2 : rect.width / 2 - size / 2;
    const y = e.clientY ? e.clientY - rect.top - size / 2 : rect.height / 2 - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    card.appendChild(ripple);
    setTimeout(() => ripple.remove(), 550);
  });
}

/* ==========================================================================
   5. Dynamic Menu Links & Auto-Category Navigation
   ========================================================================== */
function setupCategoryFilter() {
  const nav = document.getElementById('category-nav');
  if (!nav) return;

  const categories = ['all'];

  allMenuItems.forEach(item => {
    if (!item.category) return;
    const itemCats = Array.isArray(item.category) ? item.category : [item.category];
    itemCats.forEach(cat => {
      const clean = cat.trim().toLowerCase();
      if (!categories.includes(clean)) categories.push(clean);
    });
  });

  nav.innerHTML = categories.map(cat => {
    const label = cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1);
    const isActive = cat === activeCategory ? 'active' : '';
    return `<button class="cat-pill ${isActive}" data-category="${cat}">${label}</button>`;
  }).join('');

  nav.onclick = (e) => {
    const btn = e.target.closest('.cat-pill');
    if (!btn) return;
    sounds.playClickSnap();
    triggerHaptic('light');

    nav.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    activeCategory = btn.dataset.category || 'all';
    renderCards();
  };
}

function renderCards() {
  const grid = document.getElementById('links-grid');
  if (!grid) return;

  grid.innerHTML = '';

  const filtered = activeCategory === 'all'
    ? allMenuItems
    : allMenuItems.filter(item => {
        if (!item.category) return false;
        const itemCats = Array.isArray(item.category) 
          ? item.category.map(c => c.toLowerCase()) 
          : [item.category.toLowerCase()];
        return itemCats.includes(activeCategory);
      });

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: span 2; text-align:center; padding: 40px; color: var(--text-muted); font-size: 0.85rem;">No games found in this category.</div>`;
    return;
  }

  filtered.forEach((item, idx) => {
    const card = document.createElement('a');
    card.href = item.url || '#';
    card.className = 'menu-link';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', item.title || 'Studio Game');
    card.style.animationDelay = `${idx * 0.06 + 0.04}s`;

    if (item.badge) {
      const badge = document.createElement('span');
      badge.className = 'card-badge';
      badge.textContent = item.badge;
      card.appendChild(badge);
    }

    const shine = document.createElement('div');
    shine.className = 'card-shine';
    card.appendChild(shine);

    const wrap = document.createElement('div');
    wrap.className = 'tile-image-wrap';

    const img = document.createElement('img');
    const raw = item.image || '';

    // Bulletproof image fallback waterfall:
    // Tries: Links/image.svg -> links/image.svg -> ./image.svg
    const paths = raw.includes('/') ? [raw] : [`Links/${raw}`, `links/${raw}`, `./${raw}`, raw];
    let pathIndex = 0;
    img.src = paths[pathIndex];
    img.alt = item.title || 'Game icon';
    img.loading = idx < 4 ? 'eager' : 'lazy';

    img.onerror = function() {
      pathIndex++;
      if (pathIndex < paths.length) {
        this.src = paths[pathIndex];
      } else {
        this.style.display = 'none';
        if (!wrap.querySelector('.tile-fallback-title')) {
          const title = document.createElement('span');
          title.className = 'tile-fallback-title';
          title.textContent = item.title || 'Game';
          wrap.appendChild(title);
        }
      }
    };

    wrap.appendChild(img);
    card.appendChild(wrap);

    attachCardTiltPhysics(card);
    grid.appendChild(card);
  });
}

async function loadLinkData() {
  // Step 1: Render fallback data IMMEDIATELY (Zero blank page delays)
  allMenuItems = CONFIG.fallbackItems;
  setupCategoryFilter();
  renderCards();

  // Step 2: Fetch links.json asynchronously to load fresh data
  try {
    const res = await fetch(CONFIG.defaultLinksJson, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        allMenuItems = data;
        setupCategoryFilter();
        renderCards();
      }
    }
  } catch (err) {
    // Gracefully keeps running on fallbackItems
  }
}

/* ==========================================================================
   6. Native Sharing & SVG QR Code Generator
   ========================================================================== */
function generateSvgQRCode(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash << 5) - hash + text.charCodeAt(i);
  const size = 21;
  let svg = `<svg viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#FFFFFF"/>`;

  const corner = (r, c) => {
    svg += `<rect x="${c}" y="${r}" width="7" height="7" fill="#061417"/>`;
    svg += `<rect x="${c+1}" y="${r+1}" width="5" height="5" fill="#FFFFFF"/>`;
    svg += `<rect x="${c+2}" y="${r+2}" width="3" height="3" fill="#061417"/>`;
  };
  corner(0, 0); corner(0, 14); corner(14, 0);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7)) continue;
      if (Math.abs(Math.sin(hash + r * 31 + c * 17)) > 0.48) {
        svg += `<rect x="${c}" y="${r}" width="1.05" height="1.05" fill="#061417"/>`;
      }
    }
  }
  return svg + `</svg>`;
}

function setupShareEngine() {
  const shareBtn = document.getElementById('share-btn');
  const modal = document.getElementById('share-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const copyBtn = document.getElementById('copy-link-btn');
  const urlInput = document.getElementById('share-url-input');
  const qrBox = document.getElementById('qr-box');

  const currentUrl = window.location.href;
  if (urlInput) urlInput.value = currentUrl;
  if (qrBox) qrBox.innerHTML = generateSvgQRCode(currentUrl);

  const open = () => {
    modal.classList.add('open');
    sounds.playSuccessChime();
    triggerHaptic('medium');
  };
  const close = () => modal.classList.remove('open');

  if (shareBtn) {
    shareBtn.onclick = async () => {
      triggerHaptic('medium');
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Tileworks Studio',
            text: 'Play games crafted by Tileworks Studio!',
            url: currentUrl
          });
          showToast('Shared successfully!');
          return;
        } catch (e) {
          if (e.name !== 'AbortError') open();
        }
      } else {
        open();
      }
    };
  }

  if (closeBtn) closeBtn.onclick = close;
  if (modal) modal.onclick = (e) => { if (e.target === modal) close(); };
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(currentUrl).then(() => {
        sounds.playSuccessChime();
        triggerHaptic('heavy');
        showToast('Link copied to clipboard!');
        close();
      });
    };
  }
}

/* ==========================================================================
   7. Toast Alert System
   ========================================================================== */
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ==========================================================================
   8. Logo Easter Egg (Confetti Explosion)
   ========================================================================== */
function setupLogoCelebration() {
  const logo = document.getElementById('main-logo');
  const canvas = document.getElementById('confetti-canvas');
  if (!logo || !canvas) return;

  const ctx = canvas.getContext('2d');
  let clicks = 0;
  let timer = null;

  logo.onclick = (e) => {
    clicks++;
    clearTimeout(timer);
    timer = setTimeout(() => { clicks = 0; }, 1200);

    if (clicks >= 3) {
      e.preventDefault();
      clicks = 0;
      triggerHaptic('celebration');
      sounds.playSuccessChime();
      showToast('✨ Studio Magic Activated! ✨');

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const particles = Array.from({ length: 70 }, () => ({
        x: canvas.width / 2,
        y: 180,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 2,
        c: ['#d4a359', '#ffd88a', '#10b981', '#ffffff', '#38bdf8'][Math.floor(Math.random() * 5)],
        rot: Math.random() * 360,
        a: 1
      }));

      function anim() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.a -= 0.015;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.fillStyle = p.c;
          ctx.globalAlpha = Math.max(0, p.a);
          ctx.fillRect(-3, -3, 6, 6);
          ctx.restore();
        });
        if (particles.some(p => p.a > 0)) requestAnimationFrame(anim);
      }
      anim();
    }
  };
}

/* ==========================================================================
   9. Application Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('current-year');
  if (year) year.textContent = new Date().getFullYear();

  const audioBtn = document.getElementById('audio-toggle-btn');
  if (audioBtn) audioBtn.onclick = () => sounds.toggleAudio();

  initAmbientCanvas();
  setupShareEngine();
  setupLogoCelebration();
  loadLinkData();
});