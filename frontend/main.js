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
];

const NUM_TESTS = 1; // Only one test per endpoint now

const countryNames = {
  US: 'United States',
  IN: 'India',
  DE: 'Germany',
  BR: 'Brazil',
  CA: 'Canada',
  // Add more as needed
};

function countryFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '';
  // Regional indicator symbols: A = 0x1F1E6
  const codePoints = [...countryCode.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

const tableBody = document.querySelector('#latency-table tbody');
const retestBtn = document.getElementById('retest-btn');
const leaderboardMap = document.getElementById('leaderboard-map');

function getLatencyClass(ms) {
  if (ms < 50) return 'latency-fast';
  if (ms < 150) return 'latency-medium';
  return 'latency-slow';
}

async function testLatency(endpoint, testNum) {
  const start = performance.now();
  let data = null;
  let latency = null;
  try {
    const response = await fetch(endpoint.url, { cache: 'no-store' });
    latency = performance.now() - start;
    data = await response.json();
  } catch (e) {
    latency = null;
    data = { pop: 'N/A', country: 'N/A', region: endpoint.label };
  }
  return {
    ...endpoint,
    latency,
    ...data,
    testNum,
  };
}

async function runTests() {
  tableBody.innerHTML = '';
  leaderboardMap.textContent = 'Testing...';
  const testPromises = [];
  endpoints.forEach((endpoint, i) => {
    for (let t = 0; t < NUM_TESTS; t++) {
      testPromises.push(testLatency(endpoint, t + 1));
    }
  });
  const results = await Promise.all(testPromises);
  // Find the fastest (lowest non-null latency)
  const fastest = results.reduce((min, r) => (r.latency !== null && (min === null || r.latency < min.latency) ? r : min), null);
  results.forEach(result => {
    const tr = document.createElement('tr');
    // POP or Region
    const popTd = document.createElement('td');
    popTd.textContent = result.pop && result.pop !== '' && result.pop !== 'N/A' ? result.pop : (result.region || result.label);
    tr.appendChild(popTd);
    // Latency
    const latencyTd = document.createElement('td');
    if (result.latency !== null) {
      latencyTd.textContent = result.latency.toFixed(1);
      latencyTd.className = getLatencyClass(result.latency);
      if (fastest && result === fastest) {
        latencyTd.innerHTML += ' ⭐';
      }
    } else {
      latencyTd.textContent = 'Error';
      latencyTd.className = 'latency-slow';
    }
    tr.appendChild(latencyTd);
    // Country (flag + full name)
    const countryTd = document.createElement('td');
    const code = result.country || '';
    const flag = countryFlagEmoji(code);
    const name = countryNames[code] || code;
    countryTd.textContent = `${flag ? flag + ' ' : ''}${name}`;
    tr.appendChild(countryTd);
    tableBody.appendChild(tr);
  });
  if (fastest && fastest.latency !== null) {
    leaderboardMap.innerHTML = `Fastest: <b>${fastest.pop || fastest.region || fastest.label}</b> (${fastest.latency.toFixed(1)} ms)`;
  } else {
    leaderboardMap.textContent = 'No successful results.';
  }
}

retestBtn.addEventListener('click', runTests);

// Run on load
runTests(); 