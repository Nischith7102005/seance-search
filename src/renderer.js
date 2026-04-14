'use strict';

/* ─── Canvas brush stroke animation ─────────────── */
(function initCanvas() {
  const canvas = document.getElementById('canvas-layer');
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  function noise(x) {
    return Math.sin(x) * 0.5 + Math.sin(x * 2.1) * 0.25 + Math.sin(x * 4.3) * 0.125;
  }

  class NaturalBrushStroke {
    constructor(startY, delay, direction) {
      this.startY = startY;
      this.delay = delay;
      this.direction = direction;
      this.progress = 0;
      this.active = false;
      const baseHue = 25 + Math.random() * 15;
      const baseSat = 8 + Math.random() * 12;
      const baseLight = 45 + Math.random() * 15;
      this.color = { h: baseHue, s: baseSat, l: baseLight };
      this.brushSize = 8 + Math.random() * 6;
      this.bristleCount = 12 + Math.floor(Math.random() * 8);
      this.inkAmount = 1.0;
      this.inkDepletion = 0.002 + Math.random() * 0.003;
      this.speed = 2 + Math.random() * 1.5;
      this.currentX = direction === 1 ? -50 : width + 50;
      this.targetY = startY;
      this.currentY = startY + (Math.random() - 0.5) * 20;
      this.wavePhase = Math.random() * Math.PI * 2;
      this.waveFreq = 0.001 + Math.random() * 0.002;
      this.waveAmp = 10 + Math.random() * 15;
      this.pressure = 0.5 + Math.random() * 0.5;
      this.bristles = [];
      for (let i = 0; i < this.bristleCount; i++) {
        const angle = (i / this.bristleCount) * Math.PI - Math.PI / 2;
        const dist = Math.random() * this.brushSize;
        this.bristles.push({
          offsetX: Math.cos(angle) * dist,
          offsetY: Math.sin(angle) * dist,
          wear: Math.random(),
          flow: 0.7 + Math.random() * 0.3,
          hueShift: (Math.random() - 0.5) * 10
        });
      }
      this.history = [];
      this.splatterQueue = [];
    }

    update() {
      if (this.delay > 0) { this.delay--; return; }
      this.active = true;
      const travelProgress = this.direction === 1
        ? (this.currentX + 50) / (width + 100)
        : 1 - ((this.currentX + 50) / (width + 100));
      const time = this.progress * 0.05;
      const waveY = Math.sin(this.currentX * this.waveFreq + this.wavePhase + time) * this.waveAmp;
      const secondaryWave = Math.cos(this.currentX * this.waveFreq * 2.3 + this.wavePhase) * (this.waveAmp * 0.3);
      const noiseY = noise(this.currentX * 0.01 + this.progress * 0.02) * 8;
      const targetY = this.targetY + waveY + secondaryWave + noiseY;
      this.currentY += (targetY - this.currentY) * 0.15;
      const moveX = this.speed * this.direction * (1 + Math.sin(this.progress * 0.1) * 0.2);
      this.currentX += moveX;
      const velocity = Math.abs(moveX);
      const velFactor = Math.max(0.3, 1 - velocity * 0.05);
      const targetPressure = (0.6 + Math.sin(travelProgress * Math.PI) * 0.4) * velFactor;
      this.pressure += (targetPressure - this.pressure) * 0.2;
      this.inkAmount = Math.max(0.1, this.inkAmount - this.inkDepletion);
      this.history.push({ x: this.currentX, y: this.currentY, pressure: this.pressure });
      if (this.history.length > 3) this.history.shift();
      if (this.history.length >= 2) this.drawStroke();
      this.progress++;
      if (this.direction === 1 && this.currentX > width + 50) this.active = false;
      if (this.direction === -1 && this.currentX < -50) this.active = false;
      if (velocity > 2 && this.pressure > 0.7 && Math.random() > 0.97) this.createSplatter();
    }

    drawStroke() {
      const curr = this.history[this.history.length - 1];
      const prev = this.history[this.history.length - 2];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const angle = Math.atan2(dy, dx);
      const normal = angle + Math.PI / 2;

      this.bristles.forEach((b, i) => {
        const spread = 1 + (1 - this.pressure) * 0.5;
        const bx = Math.cos(normal) * b.offsetX * spread;
        const by = Math.sin(normal) * b.offsetX * spread;
        const bristleWobble = Math.sin(this.progress * 0.1 + i) * (1 - b.wear) * 2;
        const x1 = prev.x + bx + Math.cos(normal) * bristleWobble;
        const y1 = prev.y + by + Math.sin(normal) * bristleWobble;
        const x2 = curr.x + bx + Math.cos(normal) * bristleWobble;
        const y2 = curr.y + by + Math.sin(normal) * bristleWobble;
        const flow = b.flow * this.inkAmount * (0.8 + Math.random() * 0.4);
        const alpha = flow * this.pressure * 0.6;
        const bWidth = (1 + b.wear * 2) * this.pressure * (this.inkAmount * 0.8 + 0.2);
        const h = this.color.h + b.hueShift + (1 - this.inkAmount) * 10;
        const s = this.color.s * (0.8 + this.pressure * 0.4);
        const l = this.color.l * (0.9 + flow * 0.2);
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
        ctx.lineWidth = bWidth;
        ctx.lineCap = 'round';
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        if (this.inkAmount < 0.4 && Math.random() > 0.7) {
          ctx.beginPath();
          ctx.strokeStyle = `hsla(${h}, ${s}%, ${l + 10}%, ${alpha * 0.3})`;
          ctx.lineWidth = bWidth * 0.4;
          const breakOffset = (Math.random() - 0.5) * 10;
          ctx.moveTo(x2 + breakOffset, y2 + breakOffset);
          ctx.lineTo(x2 + breakOffset + dx * 0.5, y2 + breakOffset + dy * 0.5);
          ctx.stroke();
        }
        if (this.pressure > 0.8 && flow > 0.6 && i % 3 === 0) {
          ctx.beginPath();
          ctx.fillStyle = `hsla(${h}, ${s}%, ${l - 5}%, ${alpha * 0.4})`;
          ctx.arc(x2, y2, bWidth * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      this.splatterQueue.forEach((s, idx) => {
        s.life--;
        if (s.life <= 0) { this.splatterQueue.splice(idx, 1); return; }
        ctx.beginPath();
        ctx.fillStyle = `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l}%, ${s.alpha * (s.life / 20)})`;
        ctx.arc(s.x, s.y, s.size * (s.life / 20), 0, Math.PI * 2);
        ctx.fill();
        if (s.drip && s.life > 10) {
          ctx.beginPath();
          ctx.strokeStyle = `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l}%, ${s.alpha * 0.5})`;
          ctx.lineWidth = s.size * 0.3;
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x, s.y + (20 - s.life) * 2);
          ctx.stroke();
        }
      });
    }

    createSplatter() {
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 30 * this.pressure;
        this.splatterQueue.push({
          x: this.currentX + Math.cos(angle) * dist,
          y: this.currentY + Math.sin(angle) * dist,
          size: 1 + Math.random() * 3,
          alpha: 0.1 + Math.random() * 0.2,
          life: 20 + Math.floor(Math.random() * 10),
          drip: Math.random() > 0.7
        });
      }
    }
  }

  let strokes = [];
  let animFrameId = null;
  function animate() {
    let anyActive = false;
    strokes.forEach(s => {
      s.update();
      if (s.active || s.delay > 0) anyActive = true;
    });
    if (anyActive) animFrameId = requestAnimationFrame(animate);
    else animFrameId = null;
  }

  function initStrokes() {
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    ctx.clearRect(0, 0, width, height);
    strokes = [];
    const topRegion = height * 0.12;
    const bottomRegion = height * 0.88;
    const strokeCount = 6;
    const spacing = 14;
    for (let i = 0; i < strokeCount; i++) {
      const y = topRegion - ((strokeCount / 2) * spacing) + (i * spacing) + (Math.random() - 0.5) * 5;
      strokes.push(new NaturalBrushStroke(y, i * 15, 1));
    }
    for (let i = 0; i < strokeCount; i++) {
      const y = bottomRegion - ((strokeCount / 2) * spacing) + (i * spacing) + (Math.random() - 0.5) * 5;
      strokes.push(new NaturalBrushStroke(y, (i + strokeCount) * 12, -1));
    }
    animate();
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => initStrokes(), 250);
  });

  window.addEventListener('load', () => {
    initStrokes();
    if (typeof gsap !== 'undefined') {
      const tl = gsap.timeline({ delay: 1.2 });
      tl.to('#title', { opacity: 1, y: 0, duration: 1.8, ease: 'power3.out' })
        .to('#tagline', { opacity: 1, duration: 1.2, ease: 'power2.out' }, '-=1.0')
        .to('#search-wrapper', { opacity: 1, duration: 1.2, ease: 'power2.out' }, '-=0.8')
        .to('#header-actions', { opacity: 1, duration: 0.8, ease: 'power2.out' }, '-=0.6');
    } else {
      document.getElementById('title').style.opacity = '1';
      document.getElementById('tagline').style.opacity = '1';
      document.getElementById('search-wrapper').style.opacity = '1';
      document.getElementById('header-actions').style.opacity = '1';
    }
  });
})();

/* ─── App Logic ──────────────────────────────────── */

const viewSearch = document.getElementById('view-search');
const viewLoading = document.getElementById('view-loading');
const viewResults = document.getElementById('view-results');
const searchInput = document.getElementById('search-input');
const resultsGrid = document.getElementById('results-grid');
const resultsQueryLabel = document.getElementById('results-query-label');
const emptyState = document.getElementById('empty-state');
const errorState = document.getElementById('error-state');
const errorMsg = document.getElementById('error-msg');
const modalOverlay = document.getElementById('modal-overlay');
const grimoireModal = document.getElementById('grimoire-modal');
const grimoireList = document.getElementById('grimoire-list');
const cardTemplate = document.getElementById('card-template');
const progressFill = document.getElementById('progress-fill');

function showView(view) {
  [viewSearch, viewLoading, viewResults].forEach(v => {
    v.classList.remove('active');
    v.classList.add('hidden');
  });
  view.classList.remove('hidden');
  requestAnimationFrame(() => view.classList.add('active'));
}

let progressInterval = null;
function startProgress() {
  let pct = 0;
  progressFill.style.width = '0%';
  progressInterval = setInterval(() => {
    pct = Math.min(pct + Math.random() * 4, 88);
    progressFill.style.width = pct + '%';
  }, 300);
}
function finishProgress() {
  clearInterval(progressInterval);
  progressFill.style.width = '100%';
}

async function performSummon() {
  const query = searchInput.value.trim();
  if (!query) return;

  showView(viewLoading);
  startProgress();

  try {
    let result;
    if (window.seance) {
      result = await window.seance.summon(query);
    } else {
      result = await fetch('/api/summon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      }).then(r => r.json());
    }

    finishProgress();

    resultsGrid.innerHTML = '';
    emptyState.classList.add('hidden');
    errorState.classList.add('hidden');
    resultsQueryLabel.textContent = `"${query}"`;

    if (result.error) {
      errorMsg.textContent = result.error;
      errorState.classList.remove('hidden');
    } else if (!result.results || result.results.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      for (const r of result.results) {
        resultsGrid.appendChild(buildCard(r));
      }
    }

    showView(viewResults);
    viewResults.scrollTop = 0;
  } catch (err) {
    finishProgress();
    errorMsg.textContent = 'The séance failed. Check your connection.';
    errorState.classList.remove('hidden');
    showView(viewResults);
  }
}

function formatDate(timestamp) {
  if (!timestamp || timestamp.length < 8) return 'unknown date';
  const year = timestamp.substring(0, 4);
  const month = timestamp.substring(4, 6);
  const day = timestamp.substring(6, 8);
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[parseInt(month) - 1] || month} ${day}, ${year}`;
}

function buildCard(result) {
  const frag = cardTemplate.content.cloneNode(true);
  const card = frag.querySelector('.ghost-card');

  card.querySelector('.card-era-badge').textContent = result.era.label;
  card.querySelector('.card-domain').textContent = result.domain;
  card.querySelector('.card-url').textContent = result.url.length > 80 ? result.url.substring(0, 80) + '...' : result.url;
  card.querySelector('.card-timestamp').textContent = `Last archived: ${formatDate(result.timestamp)} · HTTP 404`;
  card.querySelector('.card-personality').textContent = result.personality;
  card.querySelector('.card-response').textContent = result.response;
  card.querySelector('.card-confidence').textContent = result.confidence.label;

  const ectoFill = card.querySelector('.ecto-fill');
  const ectoValue = card.querySelector('.ecto-value');
  setTimeout(() => { ectoFill.style.width = `${result.ectoplasm}%`; }, 400);
  ectoValue.textContent = `${result.ectoplasm}%`;

  if (result.priorVisits > 0) {
    const priorEl = card.querySelector('.card-prior-visits');
    priorEl.classList.remove('hidden');
    card.querySelector('.prior-count').textContent = `Summoned ${result.priorVisits} time${result.priorVisits !== 1 ? 's' : ''} before`;
  }

  card.querySelector('.wayback-btn').addEventListener('click', e => {
    e.stopPropagation();
    if (window.seance) {
      window.seance.openWayback(result.url);
    } else {
      window.open(`https://web.archive.org/web/*/${result.url}`, '_blank');
    }
  });

  return frag;
}

async function openGrimoire() {
  try {
    const ghosts = await (window.seance ? window.seance.getGrimoire() : fetch('/api/grimoire').then(r => r.json()));
    grimoireList.innerHTML = '';
    if (!ghosts || ghosts.length === 0) {
      grimoireList.innerHTML = '<div class="grimoire-empty">No spirits bound yet.<br>Summon the dead to fill your grimoire.</div>';
    } else {
      for (const ghost of ghosts) {
        const entry = document.createElement('div');
        entry.className = 'grimoire-entry';
        const lastDate = new Date(ghost.last_summoned).toLocaleDateString();
        entry.innerHTML = `
          <div class="grimoire-domain">${ghost.domain}</div>
          <div class="grimoire-meta">
            <span>${ghost.era || 'Unknown era'}</span>
            <span>${ghost.visit_count} visits</span>
            <span>Last: ${lastDate}</span>
            <span>"${ghost.last_query || '—'}"</span>
          </div>`;
        entry.addEventListener('click', () => {
          searchInput.value = ghost.last_query || ghost.domain;
          closeModal();
        });
        grimoireList.appendChild(entry);
      }
    }
  } catch {
    grimoireList.innerHTML = '<div class="grimoire-empty">Failed to load grimoire.</div>';
  }
  openModal(grimoireModal);
}

function openModal(modal) {
  modalOverlay.classList.remove('hidden');
  modal.classList.remove('hidden');
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

document.getElementById('btn-grimoire').addEventListener('click', openGrimoire);
document.getElementById('btn-grimoire-results').addEventListener('click', openGrimoire);
document.getElementById('btn-back').addEventListener('click', () => showView(viewSearch));

modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', closeModal));

searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') performSummon(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
