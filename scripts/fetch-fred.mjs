// Pull every FRED series the macro dashboard uses and write:
//
//   public/data/fred/<ID>.csv       the exact CSV FRED served, untouched
//   public/data/fred/manifest.json  one entry per series: name, units, frequency,
//                                   source, first/last observation, links
//   public/data/fred/bundle.json    manifest + parsed observations in one file,
//                                   which is what the page actually loads
//
// Run it right before showing the dashboard:   npm run fred
//
// Two ways to reach FRED:
//
//   With FRED_API_KEY set (a free key from fredaccount.stlouisfed.org), it uses
//   FRED's official API for both the data and the metadata. This is the reliable
//   route; the GitHub workflow passes the key in from a repository secret.
//
//   Without a key, it falls back to FRED's graph endpoint, which serves any
//   public series as CSV, and reads metadata from the series page's HTML. FRED
//   sometimes answers automated requests there with a web page instead of data.
//
// Either way, if FRED's metadata can't be read the FALLBACK table below keeps
// the manifest complete; the script says so when it has to use it.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'data', 'fred');

// Order here is the order in the Data & sources table.
const SERIES = [
  'FEDFUNDS',
  'DGS2',
  'DGS10',
  'T10Y2Y',
  'CPIAUCSL',
  'CPILFESL',
  'PCEPILFE',
  'UNRATE',
  'PAYEMS',
  'A191RL1Q225SBEA',
  'GDPNOW',
  'MORTGAGE30US',
  'BAA10Y',
  'WALCL',
  'EFFR',
  'IORB',
  'IOER',
  'SOFR',
  'USREC',
  'SAHMREALTIME',
  'RECPROUSM156N',
  'PERMIT',
  'HOUST',
  'CSUSHPINSA',
  'ADXTNO',
  'TOTALSA',
];

// Used only when the series page cannot be parsed.
const FALLBACK = {
  FEDFUNDS: { name: 'Federal Funds Effective Rate', units: 'Percent', frequency: 'Monthly', source: 'Board of Governors of the Federal Reserve System (US)', release: 'H.15 Selected Interest Rates' },
  DGS2: { name: 'Market Yield on U.S. Treasury Securities at 2-Year Constant Maturity', units: 'Percent', frequency: 'Daily', source: 'Board of Governors of the Federal Reserve System (US)', release: 'H.15 Selected Interest Rates' },
  DGS10: { name: 'Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity', units: 'Percent', frequency: 'Daily', source: 'Board of Governors of the Federal Reserve System (US)', release: 'H.15 Selected Interest Rates' },
  T10Y2Y: { name: '10-Year Treasury Constant Maturity Minus 2-Year Treasury Constant Maturity', units: 'Percent', frequency: 'Daily', source: 'Federal Reserve Bank of St. Louis', release: '' },
  CPIAUCSL: { name: 'Consumer Price Index for All Urban Consumers: All Items in U.S. City Average', units: 'Index 1982-1984=100', frequency: 'Monthly', source: 'U.S. Bureau of Labor Statistics', release: 'Consumer Price Index' },
  CPILFESL: { name: 'Consumer Price Index for All Urban Consumers: All Items Less Food and Energy in U.S. City Average', units: 'Index 1982-1984=100', frequency: 'Monthly', source: 'U.S. Bureau of Labor Statistics', release: 'Consumer Price Index' },
  PCEPILFE: { name: 'Personal Consumption Expenditures Excluding Food and Energy (Chain-Type Price Index)', units: 'Index 2017=100', frequency: 'Monthly', source: 'U.S. Bureau of Economic Analysis', release: 'Personal Income and Outlays' },
  UNRATE: { name: 'Unemployment Rate', units: 'Percent', frequency: 'Monthly', source: 'U.S. Bureau of Labor Statistics', release: 'Employment Situation' },
  PAYEMS: { name: 'All Employees, Total Nonfarm', units: 'Thousands of Persons', frequency: 'Monthly', source: 'U.S. Bureau of Labor Statistics', release: 'Employment Situation' },
  A191RL1Q225SBEA: { name: 'Real Gross Domestic Product', units: 'Percent Change from Preceding Period', frequency: 'Quarterly', source: 'U.S. Bureau of Economic Analysis', release: 'Gross Domestic Product' },
  GDPNOW: { name: 'GDPNow', units: 'Percent Change at Annual Rate', frequency: 'Quarterly', source: 'Federal Reserve Bank of Atlanta', release: 'GDPNow' },
  MORTGAGE30US: { name: '30-Year Fixed Rate Mortgage Average in the United States', units: 'Percent', frequency: 'Weekly, Ending Thursday', source: 'Freddie Mac', release: 'Primary Mortgage Market Survey' },
  BAA10Y: { name: "Moody's Seasoned Baa Corporate Bond Yield Relative to Yield on 10-Year Treasury Constant Maturity", units: 'Percent', frequency: 'Daily', source: 'Federal Reserve Bank of St. Louis', release: '' },
  WALCL: { name: 'Assets: Total Assets: Total Assets (Less Eliminations from Consolidation): Wednesday Level', units: 'Millions of U.S. Dollars', frequency: 'Weekly, As of Wednesday', source: 'Board of Governors of the Federal Reserve System (US)', release: 'H.4.1 Factors Affecting Reserve Balances' },
  EFFR: { name: 'Effective Federal Funds Rate', units: 'Percent', frequency: 'Daily', source: 'Federal Reserve Bank of New York', release: 'Federal Funds Data' },
  IORB: { name: 'Interest Rate on Reserve Balances (IORB Rate)', units: 'Percent', frequency: 'Daily, 7-Day', source: 'Board of Governors of the Federal Reserve System (US)', release: 'Interest Rate on Reserve Balances' },
  IOER: { name: 'Interest Rate on Excess Reserves (IOER Rate) (DISCONTINUED)', units: 'Percent', frequency: 'Daily, 7-Day', source: 'Board of Governors of the Federal Reserve System (US)', release: 'Interest Rate on Reserve Balances' },
  SOFR: { name: 'Secured Overnight Financing Rate', units: 'Percent', frequency: 'Daily', source: 'Federal Reserve Bank of New York', release: 'Secured Overnight Financing Rate Data' },
  USREC: { name: 'NBER based Recession Indicators for the United States from the Period following the Peak through the Trough', units: '+1 or 0', frequency: 'Monthly', source: 'Federal Reserve Bank of St. Louis', release: 'Recession Indicators Series' },
  SAHMREALTIME: { name: 'Real-time Sahm Rule Recession Indicator', units: 'Percentage Points', frequency: 'Monthly', source: 'Sahm, Claudia', release: 'Sahm Rule Recession Indicator' },
  RECPROUSM156N: { name: 'Smoothed U.S. Recession Probabilities', units: 'Percent', frequency: 'Monthly', source: 'Chauvet, Marcelle', release: 'U.S. Recession Probabilities' },
  PERMIT: { name: 'New Privately-Owned Housing Units Authorized in Permit-Issuing Places: Total Units', units: 'Thousands of Units', frequency: 'Monthly', source: 'U.S. Census Bureau', release: 'New Residential Construction' },
  HOUST: { name: 'New Privately-Owned Housing Units Started: Total Units', units: 'Thousands of Units', frequency: 'Monthly', source: 'U.S. Census Bureau', release: 'New Residential Construction' },
  CSUSHPINSA: { name: 'S&P Cotality Case-Shiller U.S. National Home Price Index', units: 'Index Jan 2000=100', frequency: 'Monthly', source: 'S&P Dow Jones Indices LLC', release: 'S&P Cotality Case-Shiller Home Price Indices' },
  ADXTNO: { name: "Manufacturers' New Orders: Durable Goods Excluding Transportation", units: 'Millions of Dollars', frequency: 'Monthly', source: 'U.S. Census Bureau', release: "Manufacturer's Shipments, Inventories, and Orders (M3) Survey" },
  TOTALSA: { name: 'Total Vehicle Sales', units: 'Millions of Units', frequency: 'Monthly', source: 'U.S. Bureau of Economic Analysis', release: 'Supplemental Estimates, Motor Vehicles' },
};

const csvUrl = id => `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`;
const API_KEY = (process.env.FRED_API_KEY ?? '').trim();
const API = process.env.FRED_API_BASE ?? 'https://api.stlouisfed.org/fred';
const apiUrl = (path, params) =>
  `${API}/${path}?${new URLSearchParams({ ...params, api_key: API_KEY, file_type: 'json' })}`;
// Never print the key: these logs are public on a public repository.
const redact = s => String(s).replace(/api_key=[^&\s]*/g, 'api_key=***');
const sleep = ms => new Promise(res => setTimeout(res, ms));
const pageUrl = id => `https://fred.stlouisfed.org/series/${id}`;

async function get(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'macro-eco-dashboard fetch (node)' } });
      if (!r.ok) {
        const body = (await r.text().catch(() => '')).slice(0, 300);
        throw new Error(`HTTP ${r.status} ${body}`);
      }
      return await r.text();
    } catch (e) {
      last = e;
      await sleep(800 * (i + 1));
    }
  }
  throw new Error(redact(`${url}: ${last?.message ?? last}`));
}

async function getJson(url) {
  await sleep(250); // FRED allows 120 API requests a minute
  return JSON.parse(await get(url));
}

/** Data and metadata for one series from FRED's official API. */
async function fromApi(id) {
  const obs = (await getJson(apiUrl('series/observations', { series_id: id }))).observations ?? [];
  // Written in the same shape as FRED's CSV download, so the saved files look the same either way.
  const csv = ['observation_date,' + id, ...obs.map(o => `${o.date},${o.value === '.' ? '' : o.value}`)].join('\n') + '\n';
  const meta = {};
  try {
    const s = (await getJson(apiUrl('series', { series_id: id }))).seriess?.[0] ?? {};
    meta.name = s.title ?? null;
    meta.units = s.units ?? null;
    meta.frequency = s.frequency ?? null;
    meta.updated = s.last_updated ?? null;
    const rel = (await getJson(apiUrl('series/release', { series_id: id }))).releases?.[0];
    if (rel) {
      meta.release = rel.name ?? null;
      meta.releaseUrl = rel.link ?? null;
      const src = (await getJson(apiUrl('release/sources', { release_id: rel.id }))).sources?.[0];
      if (src) {
        meta.source = src.name ?? null;
        meta.sourceUrl = src.link ?? null;
      }
    }
  } catch (e) {
    console.warn(`\n  metadata lookup failed (${redact(e.message)}); using fallback metadata`);
  }
  return { csv, meta };
}

/** Data from the graph endpoint and metadata from the series page (no key needed). */
async function fromGraph(id) {
  const csv = await get(csvUrl(id));
  if (csv.trimStart().startsWith('<')) {
    throw new Error(
      `${id}: FRED sent back a web page instead of data. It does this to automated requests at times. ` +
      'Set FRED_API_KEY (a free key from fredaccount.stlouisfed.org) to use the official API instead.',
    );
  }
  let meta = {};
  try {
    meta = metaFromPage(id, await get(pageUrl(id)));
  } catch (e) {
    console.warn(`\n  series page failed (${e.message}); using fallback metadata`);
  }
  return { csv, meta };
}

const clean = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

function metaFromPage(id, html) {
  const grab = cls => {
    const m = html.match(new RegExp(`class="[^"]*${cls}[^"]*"[^>]*>([\\s\\S]*?)</`));
    return m ? clean(m[1]) : null;
  };
  const title = html.match(new RegExp(`<title>([\\s\\S]*?)\\s*\\(${id}\\)`));
  const source = html.match(/Source:<\/strong>\s*<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
  const release = html.match(/Release:<\/strong>\s*<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
  return {
    name: title ? clean(title[1]) : null,
    units: grab('series-meta-value-units'),
    frequency: grab('series-meta-value-frequency'),
    source: source ? clean(source[2]) : null,
    sourceUrl: source ? source[1] : null,
    release: release ? clean(release[2]) : null,
    releaseUrl: release ? release[1] : null,
    updated: grab('series-meta-updated-date'),
  };
}

function parseCsv(id, text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',');
  if (header[0] !== 'observation_date' || header[1] !== id) {
    throw new Error(`${id}: unexpected CSV header "${lines[0]}"`);
  }
  const dates = [];
  const values = [];
  for (const line of lines.slice(1)) {
    const [d, v] = line.split(',');
    if (!d || v === undefined || v === '.' || v === '') continue; // FRED marks holidays "."
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    dates.push(d);
    values.push(n);
  }
  return { dates, values };
}

mkdirSync(OUT, { recursive: true });
const fetchedAt = new Date().toISOString();
const manifest = [];
const data = {};
const files = [];
let usedFallback = 0;

console.log(API_KEY ? 'Using the FRED API (FRED_API_KEY is set)\n' : 'No FRED_API_KEY set: using the graph download\n');

for (const id of SERIES) {
  process.stdout.write(`${id.padEnd(16)}`);
  const { csv, meta } = API_KEY ? await fromApi(id) : await fromGraph(id);
  const parsed = parseCsv(id, csv);
  if (parsed.dates.length === 0) throw new Error(`${id}: no observations`);
  files.push([join(OUT, `${id}.csv`), csv]);

  const fb = FALLBACK[id] ?? {};
  const pick = k => {
    if (meta[k]) return meta[k];
    if (fb[k]) { usedFallback++; return fb[k]; }
    return fb[k] ?? null;
  };

  const entry = {
    id,
    name: pick('name'),
    units: pick('units'),
    frequency: pick('frequency'),
    source: pick('source'),
    sourceUrl: meta.sourceUrl ?? null,
    release: pick('release'),
    releaseUrl: meta.releaseUrl ?? null,
    firstDate: parsed.dates[0],
    lastDate: parsed.dates[parsed.dates.length - 1],
    observations: parsed.dates.length,
    fredUpdated: meta.updated ?? null,
    fredUrl: pageUrl(id),
    csvUrl: csvUrl(id),
    localCsv: `/data/fred/${id}.csv`,
  };
  manifest.push(entry);
  data[id] = parsed;
  console.log(`${String(parsed.dates.length).padStart(6)} obs  ${entry.firstDate} → ${entry.lastDate}  ${entry.frequency}`);
}

// Nothing touches disk until every series is in hand, so a failed run leaves
// the previous CSVs, manifest and bundle consistent with each other.
for (const [path, text] of files) writeFileSync(path, text);
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ fetchedAt, series: manifest }, null, 2) + '\n');
writeFileSync(join(OUT, 'bundle.json'), JSON.stringify({ fetchedAt, series: manifest, data }));

console.log(`\nfetched ${SERIES.length} series at ${fetchedAt}`);
if (usedFallback) console.log(`(${usedFallback} metadata field(s) came from the fallback table — check FRED's page markup)`);
