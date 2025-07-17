// Number of parallel requests to simulate multiple POPs
const endpoints = [
  {
    url: 'https://whats-my-latency-worker.arungupta.workers.dev',
    label: 'Cloudflare Edge (Your Location)',
  },
  {
    url: 'https://a0skeuxl34.execute-api.us-east-1.amazonaws.com/default/latency-use1',
    label: 'AWS Lambda us-east-1',
  },
  {
    url: 'https://f3lvvd2s2c.execute-api.ap-south-1.amazonaws.com/default/latency-aps1',
    label: 'AWS Lambda ap-south-1',
  },
  {
    url: 'https://vsrnqnedwj.execute-api.eu-central-1.amazonaws.com/default/latency-euc1',
    label: 'AWS Lambda eu-central-1',
  },
  {
    url: 'https://u1l64b21ql.execute-api.sa-east-1.amazonaws.com/default/latency-sae1',
    label: 'AWS Lambda sa-east-1',
  },
  {
    url: 'https://qcsjziee6h.execute-api.ca-central-1.amazonaws.com/default/latency-cac1',
    label: 'AWS Lambda ca-central-1',
  },
  {
    url: 'https://3fsen4xjk6.execute-api.us-west-1.amazonaws.com/default/latency-usw1',
    label: 'AWS Lambda us-west-1',
  },
  {
    url: 'https://fkvpl9lqs8.execute-api.ap-southeast-1.amazonaws.com/default/latency-apse1',
    label: 'AWS Lambda ap-southeast-1',
  },
];

const NUM_TESTS = 1; // Only one test per endpoint now

const countryNames = {
  US: 'United States',
  IN: 'India',
  DE: 'Germany',
  BR: 'Brazil',
  CA: 'Canada',
  SG: 'Singapore',
  // Add more as needed
};

function countryFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '';
  // Regional indicator symbols: A = 0x1F1E6
  const codePoints = [...countryCode.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65);
  // Add aria-label for flag emoji
  const countryName = countryNames[countryCode.toUpperCase()] || countryCode;
  return `<span role="img" aria-label="${countryName} flag">${String.fromCodePoint(...codePoints)}</span>`;
}

const tableBody = document.querySelector('#latency-table tbody');
const retestBtn = document.getElementById('retest-btn');
const leaderboardMap = document.getElementById('leaderboard-map');

function getLatencyClass(ms) {
  if (ms < 50) return 'latency-fast';
  if (ms < 150) return 'latency-medium';
  return 'latency-slow';
}

function showLoadingSpinner(show, message = 'Testing latency...') {
  const spinner = document.getElementById('loading-spinner');
  if (show) {
    spinner.innerHTML = `<span class="spinner"></span> <span>${message}</span>`;
    spinner.style.display = 'flex';
  } else {
    spinner.innerHTML = '';
    spinner.style.display = 'none';
  }
}

function setFeedbackMessage(msg, type = '') {
  const el = document.getElementById('feedback-message');
  el.textContent = msg;
  el.className = type ? ` ${type}` : '';
}

function setButtonsDisabled(disabled) {
  document.getElementById('retest-btn').disabled = disabled;
  document.getElementById('center-me-btn').disabled = disabled;
  document.getElementById('theme-toggle-btn').disabled = disabled;
}

async function testLatency(endpoint, testNum) {
  const start = performance.now();
  let data = null;
  let latency = null;
  let error = null;
  try {
    const response = await fetch(endpoint.url, { cache: 'no-store' });
    latency = performance.now() - start;
    data = await response.json();
  } catch (e) {
    latency = null;
    data = { pop: 'N/A', country: 'N/A', region: endpoint.label };
    error = e.message || 'Network error';
  }
  return {
    ...endpoint,
    latency,
    ...data,
    testNum,
    error,
  };
}

// Coordinates for AWS Lambda regions
const regionCoords = {
  'us-east-1': [37.7749, -77.0369],      // N. Virginia
  'ap-south-1': [19.0760, 72.8777],     // Mumbai
  'eu-central-1': [50.1109, 8.6821],    // Frankfurt
  'sa-east-1': [-23.5505, -46.6333],    // São Paulo
  'ca-central-1': [45.4215, -75.6997],  // Montreal
  'us-west-1': [37.3382, -121.8863],    // N. California
  'ap-southeast-1': [1.3521, 103.8198], // Singapore
};

function getRegionFromLabel(label) {
  const match = label.match(/([a-z]{2}-[a-z]+-\d)/);
  return match ? match[1] : null;
}

function getBrowserLocation() {
  return new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => resolve([pos.coords.latitude, pos.coords.longitude]),
        () => resolve(null),
        { timeout: 3000 }
      );
    } else {
      resolve(null);
    }
  });
}

let map, markers = [], lines = [];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function addPulseMarker(map, coord) {
  const divIcon = L.divIcon({
    className: 'pulse-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: '<div class="pulse"></div>'
  });
  return L.marker(coord, { icon: divIcon }).addTo(map);
}

let lastResults = [];

async function animateWarGamesLines(regionMarkers, browserLoc) {
  for (let i = 0; i < regionMarkers.length; i++) {
    const { coord, marker, label } = regionMarkers[i];
    const animLine = L.polyline([coord, browserLoc], {
      color: '#39ff14', weight: 5, opacity: 0.9, className: 'wargames-glow'
    }).addTo(map);
    const pulse = addPulseMarker(map, browserLoc);
    marker.openPopup();
    await sleep(500);
    map.removeLayer(animLine);
    map.removeLayer(pulse);
    const line = L.polyline([coord, browserLoc], {
      color: '#00ff00', weight: 2, opacity: 0.7
    }).addTo(map);
    lines.push(line);
    marker.closePopup();
  }
}

async function animateSingleWarGamesLine(coord, marker, browserLoc) {
  // Remove all lines
  lines.forEach(l => map.removeLayer(l));
  lines = [];
  // Glowing green line
  const animLine = L.polyline([coord, browserLoc], {
    color: '#39ff14', weight: 5, opacity: 0.9, className: 'wargames-glow'
  }).addTo(map);
  const pulse = addPulseMarker(map, browserLoc);
  marker.openPopup();
  await sleep(500);
  map.removeLayer(animLine);
  map.removeLayer(pulse);
  const line = L.polyline([coord, browserLoc], {
    color: '#00ff00', weight: 2, opacity: 0.7
  }).addTo(map);
  lines.push(line);
  marker.closePopup();
}

async function replayWarGamesAnimationForMarker(coord, marker) {
  const browserLoc = await getBrowserLocation();
  if (browserLoc && coord) {
    await animateSingleWarGamesLine(coord, marker, browserLoc);
  }
}

async function replayWarGamesAnimation() {
  if (!lastResults.length) return;
  // Remove all lines
  lines.forEach(l => map.removeLayer(l));
  lines = [];
  // Get browser location
  const browserLoc = await getBrowserLocation();
  // Prepare region markers
  const regionMarkers = [];
  lastResults.forEach(result => {
    let coord = null;
    let markerLabel = result.label;
    let region = getRegionFromLabel(result.label);
    if (region && regionCoords[region]) {
      coord = regionCoords[region];
      markerLabel = `${result.label}`;
    }
    if (coord && region && result._marker) {
      regionMarkers.push({ coord, marker: result._marker, label: markerLabel });
    }
  });
  if (browserLoc && regionMarkers.length > 0) {
    await animateWarGamesLines(regionMarkers, browserLoc);
  }
}

async function updateMap(results) {
  if (!map) {
    map = L.map('latency-map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 8,
      minZoom: 2,
    }).addTo(map);
  }
  // Remove old markers/lines
  markers.forEach(m => map.removeLayer(m));
  lines.forEach(l => map.removeLayer(l));
  markers = [];
  lines = [];

  // Get browser location
  const browserLoc = await getBrowserLocation();
  let browserMarker = null;
  const bounds = [];
  if (browserLoc) {
    browserMarker = L.marker(browserLoc, { title: 'Your Location', keyboard: true, alt: 'Your Location' }).addTo(map);
    browserMarker.bindPopup('Your Location').openPopup();
    markers.push(browserMarker);
    bounds.push(browserLoc);
  }

  // Prepare region markers
  const regionMarkers = [];
  results.forEach((result, idx) => {
    let coord = null;
    let markerLabel = result.label;
    let region = getRegionFromLabel(result.label);
    if (region && regionCoords[region]) {
      coord = regionCoords[region];
      markerLabel = `${result.label}`;
    } else if (result.label.includes('Cloudflare')) {
      coord = browserLoc;
      markerLabel = 'Your Location (Cloudflare Edge)';
    }
    if (coord && region) {
      const latency = result.latency !== null ? result.latency.toFixed(1) + ' ms' : 'Error';
      const popup = `<b>${markerLabel}</b><br>Latency: ${latency}`;
      const marker = L.marker(coord, { title: markerLabel, keyboard: true, alt: markerLabel, riseOnFocus: true }).addTo(map);
      marker.bindPopup(popup);
      marker._icon.setAttribute('tabindex', '0');
      marker._icon.setAttribute('role', 'button');
      marker._icon.setAttribute('aria-label', markerLabel + ', ' + latency);
      // Animate on click
      marker.on('click', () => replayWarGamesAnimationForMarker(coord, marker));
      // Animate on keyboard activation
      marker._icon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          replayWarGamesAnimationForMarker(coord, marker);
          marker.openPopup();
          setTimeout(() => {
            const popupEl = document.querySelector('.leaflet-popup-content');
            if (popupEl) popupEl.focus();
          }, 100);
        }
      });
      // Allow popup to be closed with Escape
      marker.on('popupopen', () => {
        setTimeout(() => {
          const popupEl = document.querySelector('.leaflet-popup-content');
          if (popupEl) {
            popupEl.setAttribute('tabindex', '0');
            popupEl.focus();
            popupEl.addEventListener('keydown', (e) => {
              if (e.key === 'Escape') {
                map.closePopup();
              }
            });
          }
        }, 100);
      });
      markers.push(marker);
      result._marker = marker;
      regionMarkers.push({ coord, marker, label: markerLabel });
      bounds.push(coord);
    }
  });
  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

function updateTable(results) {
  tableBody.innerHTML = '';
  let summary = '';
  // Find the fastest (lowest non-null, non-error latency)
  const validResults = results.filter(r => r.latency !== null && !r.error);
  let fastest = null;
  if (validResults.length) {
    fastest = validResults.reduce((min, r) => (min === null || r.latency < min.latency ? r : min), null);
  }
  results.forEach(result => {
    const flag = countryFlagEmoji(result.country);
    const latency = result.latency !== null ? result.latency.toFixed(1) : 'Error';
    const latencyClass = result.error ? 'latency-slow' : getLatencyClass(result.latency || 9999);
    const errorIcon = result.error ? '⚠️' : '';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${result.pop || result.label}</td>
      <td class="${latencyClass}">${latency} ${errorIcon}</td>
      <td>${flag} ${countryNames[result.country] || result.country}</td>
    `;
    if (result.error) row.title = `Error: ${result.error}`;
    tableBody.appendChild(row);
    summary += `${result.pop || result.label}: ${latency} ms. `;
  });
  // Update leaderboard/winner display
  if (fastest) {
    const flag = countryFlagEmoji(fastest.country);
    leaderboardMap.innerHTML = `🏆 Fastest: <b>${fastest.pop || fastest.label}</b> (${flag} ${countryNames[fastest.country] || fastest.country}) <span class="latency-fast">${fastest.latency.toFixed(1)} ms</span>`;
  } else {
    leaderboardMap.innerHTML = 'No successful results.';
  }
  // Announce table update
  const liveRegion = document.getElementById('aria-live-region');
  if (liveRegion) {
    liveRegion.textContent = 'Latency results updated. ' + summary;
  }
}

async function runTests() {
  setFeedbackMessage('');
  showLoadingSpinner(true);
  setButtonsDisabled(true);
  try {
    const promises = endpoints.map((ep, i) => testLatency(ep, i));
    const results = await Promise.all(promises);
    updateTable(results);
    lastResults = results;
    await updateMap(results);
    await replayWarGamesAnimation(); // Restore WarGames animation after map update
    if (results.some(r => r.error)) {
      setFeedbackMessage('Some regions could not be reached. See ⚠️ in table.', 'error');
    } else {
      setFeedbackMessage('All latency tests completed successfully.', 'success');
    }
  } catch (e) {
    setFeedbackMessage('Unexpected error: ' + e.message, 'error');
  } finally {
    showLoadingSpinner(false);
    setButtonsDisabled(false);
  }
}

retestBtn.addEventListener('click', runTests);

document.getElementById('center-me-btn').addEventListener('click', async () => {
  setFeedbackMessage('');
  showLoadingSpinner(true, 'Centering map...');
  setButtonsDisabled(true);
  try {
    const browserLoc = await getBrowserLocation();
    if (browserLoc && map) {
      map.setView(browserLoc, 5);
      setFeedbackMessage('Map centered on your location.', 'success');
    } else {
      setFeedbackMessage('Could not determine your location.', 'error');
    }
  } catch (e) {
    setFeedbackMessage('Error centering map: ' + e.message, 'error');
  } finally {
    showLoadingSpinner(false);
    setButtonsDisabled(false);
  }
});

const THEMES = ['matrix', 'classic', 'light'];
let currentThemeIdx = 0;

function applyTheme(theme) {
  document.body.classList.remove(...THEMES.map(t => 'theme-' + t));
  document.body.classList.add('theme-' + theme);
  localStorage.setItem('latency-theme', theme);
}

function cycleTheme() {
  currentThemeIdx = (currentThemeIdx + 1) % THEMES.length;
  applyTheme(THEMES[currentThemeIdx]);
}

function loadTheme() {
  const saved = localStorage.getItem('latency-theme');
  const idx = THEMES.indexOf(saved);
  currentThemeIdx = idx >= 0 ? idx : 0;
  applyTheme(THEMES[currentThemeIdx]);
}

document.getElementById('theme-toggle-btn').addEventListener('click', cycleTheme);
loadTheme();

// Add ARIA live region for latency table updates
document.addEventListener('DOMContentLoaded', () => {
  let liveRegion = document.getElementById('aria-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'aria-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('role', 'status');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-9999px';
    document.body.appendChild(liveRegion);
  }
});

// Helper to get Turnstile token
function getTurnstileToken() {
  const input = document.querySelector('.cf-turnstile [name="cf-turnstile-response"]');
  return input ? input.value : '';
}

// Example: When submitting stats (add turnstileToken to POST body)
async function submitStats(country, fastestPop) {
  const turnstileToken = getTurnstileToken();
  const res = await fetch('https://YOUR_WORKER_DOMAIN/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country, fastestPop, turnstileToken })
  });
  // Handle response...
}

// Run on load
window.addEventListener('DOMContentLoaded', () => {
  runTests();
}); 