'use strict';

const searchInput = document.getElementById('search-input');
const summonBtn = document.getElementById('summon-btn');
const summonText = document.getElementById('summon-text');
const summonSpinner = document.getElementById('summon-spinner');
const resultsSection = document.getElementById('results-section');
const resultsGrid = document.getElementById('results-grid');
const resultsQuery = document.getElementById('results-query');
const emptyState = document.getElementById('empty-state');
const errorState = document.getElementById('error-state');
const errorMsg = document.getElementById('error-msg');
const summonSection = document.getElementById('summon-section');
const modalOverlay = document.getElementById('modal-overlay');
const grimoireModal = document.getElementById('grimoire-modal');
const settingsModal = document.getElementById('settings-modal');
const grimoireList = document.getElementById('grimoire-list');
const groqApiKeyInput = document.getElementById('groq-api-key');
const ttsEnabled = document.getElementById('tts-enabled');
const ttsRate = document.getElementById('tts-rate');
const ttsRateLabel = document.getElementById('tts-rate-label');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const settingsSaved = document.getElementById('settings-saved');
const cardTemplate = document.getElementById('card-template');

let currentApiKey = '';
let ttsActive = false;
let currentSpeech = null;

async function loadSettings() {
  const settings = await window.seance.getSettings();
  if (settings.groqApiKey) {
    currentApiKey = settings.groqApiKey;
    groqApiKeyInput.value = settings.groqApiKey;
  }
  if (settings.ttsEnabled === 'true') {
    ttsEnabled.checked = true;
  }
  if (settings.ttsRate) {
    ttsRate.value = settings.ttsRate;
    ttsRateLabel.textContent = `${parseFloat(settings.ttsRate).toFixed(1)}x`;
  }
}

async function performSummon() {
  const query = searchInput.value.trim();
  if (!query) return;

  if (!currentApiKey) {
    openSettings();
    return;
  }

  setLoading(true);
  hideAllResults();

  try {
    const result = await window.seance.summon(query, currentApiKey);

    if (result.error) {
      showError(result.error);
    } else if (!result.results || result.results.length === 0) {
      showEmpty();
    } else {
      showResults(result.results, query);
    }
  } catch (err) {
    showError('The séance failed. Check your connection and API key.');
  } finally {
    setLoading(false);
  }
}

function setLoading(loading) {
  summonBtn.disabled = loading;
  searchInput.disabled = loading;
  if (loading) {
    summonText.classList.add('hidden');
    summonSpinner.classList.remove('hidden');
  } else {
    summonText.classList.remove('hidden');
    summonSpinner.classList.add('hidden');
  }
}

function hideAllResults() {
  resultsSection.classList.add('hidden');
  emptyState.classList.add('hidden');
  errorState.classList.add('hidden');
}

function showEmpty() {
  emptyState.classList.remove('hidden');
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorState.classList.remove('hidden');
}

function showResults(results, query) {
  resultsGrid.innerHTML = '';
  resultsQuery.textContent = `"${query}"`;

  for (const result of results) {
    const card = buildCard(result);
    resultsGrid.appendChild(card);
  }

  resultsSection.classList.remove('hidden');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

function getConfidenceClass(label) {
  const map = {
    'WHISPERED': 'confidence-whispered',
    'MURMURED': 'confidence-murmured',
    'SPOKEN': 'confidence-spoken',
    'DECLARED': 'confidence-declared',
    'SCREAMED': 'confidence-screamed'
  };
  return map[label] || 'confidence-spoken';
}

function buildCard(result) {
  const frag = cardTemplate.content.cloneNode(true);
  const card = frag.querySelector('.ghost-card');

  card.dataset.url = result.url;

  const eraBadge = card.querySelector('.card-era-badge');
  eraBadge.textContent = result.era.label;

  const confidence = card.querySelector('.card-confidence');
  confidence.textContent = result.confidence.label;
  confidence.classList.add(getConfidenceClass(result.confidence.label));

  const domain = card.querySelector('.card-domain');
  domain.textContent = result.domain;

  const urlEl = card.querySelector('.card-url');
  urlEl.textContent = result.url.length > 80 ? result.url.substring(0, 80) + '...' : result.url;

  const timestamp = card.querySelector('.card-timestamp');
  timestamp.textContent = `Last archived: ${formatDate(result.timestamp)} · HTTP 404`;

  const personality = card.querySelector('.card-personality');
  personality.textContent = `◈ ${result.personality}`;

  const response = card.querySelector('.card-response');
  response.textContent = result.response;

  const ectoFill = card.querySelector('.ectoplasm-fill');
  const ectoValue = card.querySelector('.ectoplasm-value');
  setTimeout(() => {
    ectoFill.style.width = `${result.ectoplasm}%`;
  }, 300);
  ectoValue.textContent = `${result.ectoplasm}% archival`;

  if (result.priorVisits > 0) {
    const priorVisits = card.querySelector('.card-prior-visits');
    const priorCount = card.querySelector('.prior-count');
    priorVisits.classList.remove('hidden');
    priorCount.textContent = `Summoned ${result.priorVisits} time${result.priorVisits !== 1 ? 's' : ''} before`;
  }

  const ttsBtn = card.querySelector('.tts-btn');
  ttsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    speakResponse(result.response, ttsBtn);
  });

  const waybackBtn = card.querySelector('.wayback-btn');
  waybackBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.seance.openWayback(result.url);
  });

  return frag;
}

function speakResponse(text, btn) {
  if (!('speechSynthesis' in window)) return;

  if (currentSpeech) {
    window.speechSynthesis.cancel();
    currentSpeech = null;
    if (btn.dataset.speaking === 'true') {
      btn.dataset.speaking = 'false';
      btn.textContent = '▶ POSSESS';
      return;
    }
  }

  document.querySelectorAll('.tts-btn').forEach(b => {
    b.dataset.speaking = 'false';
    b.textContent = '▶ POSSESS';
  });

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = parseFloat(ttsRate.value) || 0.9;
  utterance.pitch = 0.7;
  utterance.volume = 0.9;

  utterance.onend = () => {
    btn.dataset.speaking = 'false';
    btn.textContent = '▶ POSSESS';
    currentSpeech = null;
  };

  utterance.onerror = () => {
    btn.dataset.speaking = 'false';
    btn.textContent = '▶ POSSESS';
    currentSpeech = null;
  };

  btn.dataset.speaking = 'true';
  btn.textContent = '■ EXORCISE';
  currentSpeech = utterance;
  window.speechSynthesis.speak(utterance);
}

async function openGrimoire() {
  const ghosts = await window.seance.getGrimoire();
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
          <span>Era: ${ghost.era || 'Unknown'}</span>
          <span>Visits: ${ghost.visit_count}</span>
          <span>Last summoned: ${lastDate}</span>
          <span>Last query: "${ghost.last_query || '—'}"</span>
        </div>
      `;
      entry.addEventListener('click', () => {
        searchInput.value = ghost.last_query || ghost.domain;
        closeModal();
      });
      grimoireList.appendChild(entry);
    }
  }

  openModal(grimoireModal);
}

function openSettings() {
  openModal(settingsModal);
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
document.getElementById('btn-settings').addEventListener('click', openSettings);

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', closeModal);
});

ttsRate.addEventListener('input', () => {
  ttsRateLabel.textContent = `${parseFloat(ttsRate.value).toFixed(1)}x`;
});

saveSettingsBtn.addEventListener('click', async () => {
  const apiKey = groqApiKeyInput.value.trim();
  currentApiKey = apiKey;

  await window.seance.saveSettings({
    groqApiKey: apiKey,
    ttsEnabled: ttsEnabled.checked ? 'true' : 'false',
    ttsRate: ttsRate.value
  });

  settingsSaved.classList.remove('hidden');
  setTimeout(() => settingsSaved.classList.add('hidden'), 2000);
});

summonBtn.addEventListener('click', performSummon);

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') performSummon();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

loadSettings();
