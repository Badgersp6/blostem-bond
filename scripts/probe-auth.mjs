// Probe /api/get-token via Node's fetch to rule out Windows curl quirks
// (HTTP/2 vs HTTP/1.1, header casing, TLS handshake differences, etc.)
//
// Run: node scripts/probe-auth.mjs

// Read the partner Bearer token from the environment so this script can be
// committed safely. Run with: API_TOKEN=<your-token> node scripts/probe-auth.mjs
const TOKEN = process.env.API_TOKEN;
const URL = 'https://test.thefixedincome.com/api/get-token';

if (!TOKEN) {
  console.error('Missing API_TOKEN environment variable.');
  console.error('Run with: API_TOKEN=<your-partner-token> node scripts/probe-auth.mjs');
  process.exit(1);
}

const variants = [
  {
    name: '1. minimal: Authorization + Content-Type + Accept, body {}',
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        Accept: '*/*',
      },
      body: '{}',
    },
  },
  {
    name: '2. minimal, no body',
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        Accept: '*/*',
      },
    },
  },
  {
    name: '3. with browser UA + Origin + Referer, body {}',
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        Accept: '*/*',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
        Origin: 'https://test.thefixedincome.com',
        Referer: 'https://test.thefixedincome.com/',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      body: '{}',
    },
  },
  {
    name: '4. as #3 but with Accept-Language',
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
        Origin: 'https://test.thefixedincome.com',
        Referer: 'https://test.thefixedincome.com/',
      },
      body: '{}',
    },
  },
];

for (const v of variants) {
  process.stdout.write(`\n=== ${v.name} ===\n`);
  try {
    const res = await fetch(URL, v.init);
    const text = await res.text();
    console.log(`HTTP ${res.status} ${res.statusText}`);
    console.log(
      `RateLimit: ${res.headers.get('x-ratelimit-remaining') ?? '-'} / ${res.headers.get('x-ratelimit-limit') ?? '-'}`,
    );
    console.log(`Body: ${text.slice(0, 400)}`);
  } catch (e) {
    console.log(`fetch error: ${e?.message}`);
  }
}
