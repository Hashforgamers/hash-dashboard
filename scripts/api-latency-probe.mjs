// Read-only, bounded staging probe. Manifest: [{name,url,tokenEnv?}].
// No response bodies, URLs, or tokens are printed. Redirects are rejected.
import { readFile } from 'node:fs/promises';

const [file, samplesArg = '10', concurrencyArg = '2'] = process.argv.slice(2);
if (!file) throw new Error('Usage: node scripts/api-latency-probe.mjs manifest.json [samples:1-100] [concurrency:1-5]');
const samples = Number(samplesArg), concurrency = Number(concurrencyArg);
if (!Number.isInteger(samples) || samples < 1 || samples > 100 || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 5) throw new Error('Invalid sample or concurrency limits');
const endpoints = JSON.parse(await readFile(file, 'utf8'));
if (!Array.isArray(endpoints) || !endpoints.length || endpoints.length > 50) throw new Error('Provide 1-50 endpoints');
for (const endpoint of endpoints) {
  const url = new URL(endpoint.url);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid endpoint URL');
  if (endpoint.tokenEnv && !process.env[endpoint.tokenEnv]) throw new Error(`Missing token environment variable for ${endpoint.name}`);
}
const percentile = (values, fraction) => values.length ? Math.round(values[Math.ceil(values.length * fraction) - 1]) : null;
const results = [];
for (const endpoint of endpoints) {
  let next = 0;
  const durations = [], successful = [], statuses = {};
  await Promise.all(Array.from({length: concurrency}, async () => {
    while (next++ < samples) {
      const start = performance.now();
      let status = 'network_or_timeout';
      try {
        const response = await fetch(endpoint.url, {
          method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000),
          headers: endpoint.tokenEnv ? {Authorization: `Bearer ${process.env[endpoint.tokenEnv]}`} : {},
        });
        status = String(response.status);
        // Include body transfer in the latency without retaining or displaying data.
        if (response.body) for await (const chunk of response.body) { /* drain */ }
        if (response.ok) successful.push(performance.now() - start);
      } catch { /* counted below */ }
      durations.push(performance.now() - start);
      statuses[status] = (statuses[status] || 0) + 1;
    }
  }));
  durations.sort((a,b) => a-b); successful.sort((a,b) => a-b);
  results.push({name: endpoint.name, samples: durations.length, successes: successful.length,
    errors: durations.length-successful.length, p50_ms: percentile(durations,.5), p95_ms: percentile(durations,.95),
    successful_p95_ms: percentile(successful,.95), statuses});
}
console.log(JSON.stringify({measured_at: new Date().toISOString(), concurrency, results}, null, 2));
if (results.some(result => result.errors)) process.exitCode = 1;
