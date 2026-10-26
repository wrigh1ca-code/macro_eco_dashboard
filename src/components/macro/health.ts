// Health readings for each chart card: a few simple checks per card, each
// green / yellow / red against fixed thresholds, rolled up into one verdict.
// Pure functions, no React, so the rules can be tested with plain node.
//
// To change a threshold, edit the check below; the info pop-up on the page
// reads its text from the same place, so the explanation stays in step.

import { atOrBefore, last, monthKey, type Series } from './compute';
import type { Key } from './registry';

export type Light = 'green' | 'yellow' | 'red';
export type Verdict = 'good' | 'mixed' | 'bad' | 'none';
export type BoxId = 'recession' | 'production' | 'labor' | 'inflation' | 'housing' | 'consumer' | 'policy' | 'curve';

export interface CheckResult {
  name: string;
  /** Today's value, formatted; null when the data isn't there yet. */
  value: string | null;
  light: Light | null;
  /** The three bands in plain words. */
  green: string;
  yellow: string;
  red: string;
  /** One line on why the thresholds sit where they do. */
  why: string;
}

export interface BoxHealth {
  verdict: Verdict;
  checks: CheckResult[];
  /** Extra line for the pop-up, e.g. an override. */
  footnote?: string;
}

const DAY = 86_400_000;
const MINUS = '−';

// ---- small helpers --------------------------------------------------------

const sign = (v: number, dp: number) => (v > 0 ? '+' : v < 0 ? MINUS : '') + Math.abs(v).toFixed(dp);
const pct = (v: number, dp = 1) => `${v < 0 ? MINUS : ''}${Math.abs(v).toFixed(dp)}%`;
const spct = (v: number, dp = 1) => `${sign(v, dp)}%`;
const spt = (v: number, dp = 2) => `${sign(v, dp)} pt`;

function latest(s: Series | undefined): number | null {
  const o = s ? last(s) : undefined;
  return o ? o.v : null;
}

/** Latest value minus the value about `days` earlier. */
function changeOver(s: Series | undefined, days: number): number | null {
  const now = s ? last(s) : undefined;
  if (!s || !now) return null;
  const then = atOrBefore(s, now.t - days * DAY);
  if (!then || now.t - then.t < days * DAY * 0.8) return null;
  return now.v - then.v;
}

/** Monthly series: change versus the same month `months` earlier. */
function changeMonths(s: Series | undefined, months: number): number | null {
  const now = s ? last(s) : undefined;
  if (!s || !now) return null;
  const want = monthKey(now.t) - months;
  const then = s.find(o => monthKey(o.t) === want);
  return then ? now.v - then.v : null;
}

/** Average of the last 3 monthly observations. */
function avg3(s: Series | undefined): number | null {
  if (!s || s.length < 3) return null;
  return (s[s.length - 1].v + s[s.length - 2].v + s[s.length - 3].v) / 3;
}

/** 3-month average versus the same three months a year earlier, in percent. */
function avg3Yoy(s: Series | undefined): number | null {
  if (!s || s.length < 15) return null;
  const now = s.slice(-3);
  const keys = now.map(o => monthKey(o.t) - 12);
  const then = keys.map(k => s.find(o => monthKey(o.t) === k));
  if (then.some(o => !o)) return null;
  const a = now.reduce((t, o) => t + o.v, 0) / 3;
  const b = then.reduce((t, o) => t + (o as { v: number }).v, 0) / 3;
  return 100 * (a / b - 1);
}

/** Average over the last `n` observations of a minus b, matching b by date (unused for now, kept for future spread checks). */
function avgGap(a: Series | undefined, b: Series | undefined, n: number): number | null {
  if (!a || !b || !a.length || !b.length) return null;
  const tail = a.slice(-n);
  let sum = 0;
  let count = 0;
  for (const o of tail) {
    const m = atOrBefore(b, o.t);
    if (m && o.t - m.t < 10 * DAY) { sum += o.v - m.v; count++; }
  }
  return count >= Math.min(n, 5) ? sum / count : null;
}

/** Lower is better: green below g, red above r. */
const below = (v: number | null, g: number, r: number): Light | null =>
  v === null ? null : v < g ? 'green' : v <= r ? 'yellow' : 'red';
/** Higher is better: green above g, red below r. */
const above = (v: number | null, g: number, r: number): Light | null =>
  v === null ? null : v > g ? 'green' : v >= r ? 'yellow' : 'red';
/** Green inside [gLo, gHi], yellow inside [yLo, yHi], red outside. */
const band = (v: number | null, gLo: number, gHi: number, yLo: number, yHi: number): Light | null =>
  v === null ? null : v >= gLo && v <= gHi ? 'green' : v >= yLo && v <= yHi ? 'yellow' : 'red';

function check(name: string, value: number | null, fmt: (v: number) => string, light: Light | null,
  green: string, yellow: string, red: string, why: string): CheckResult {
  return { name, value: value === null ? null : fmt(value), light: value === null ? null : light, green, yellow, red, why };
}

/** Every check green: healthy. More than half red: unhealthy. Otherwise mixed. Fewer than two checks with data: no reading. */
export function rollUp(lights: (Light | null)[]): Verdict {
  const have = lights.filter((l): l is Light => l !== null);
  if (have.length < 2) return 'none';
  if (have.every(l => l === 'green')) return 'good';
  if (have.filter(l => l === 'red').length > have.length / 2) return 'bad';
  return 'mixed';
}

const box = (checks: CheckResult[], footnote?: string): BoxHealth => ({ verdict: rollUp(checks.map(c => c.light)), checks, footnote });

// ---- the rules ------------------------------------------------------------

export function computeHealth(S: Record<Key, Series>): Record<BoxId, BoxHealth> {
  // Recession
  const sahm = latest(S.SAHM);
  const recprob = latest(S.RECPROB);
  const baa = latest(S.BAA10Y);
  const recession = box([
    check('Sahm rule', sahm, v => v.toFixed(2), sahm === null ? null : sahm < 0.3 ? 'green' : sahm < 0.5 ? 'yellow' : 'red',
      'under 0.30', '0.30 to 0.49', '0.50 or more',
      'Claudia Sahm’s trigger: at 0.50 a recession has almost always begun.'),
    check('Recession probability', recprob, v => pct(v), below(recprob, 10, 50),
      'under 10%', '10% to 50%', 'over 50%',
      'The Chauvet–Piger model; readings above 50% have lined up with recessions.'),
    check('Baa corporate spread', baa, v => `${v.toFixed(2)} pt`, below(baa, 2.25, 3.0),
      'under 2.25 pt', '2.25 to 3.0 pt', 'over 3.0 pt',
      'Near its long-run norm the spread is calm; above 3 it has meant investors fear defaults.'),
  ]);
  if (sahm !== null && sahm >= 0.5) recession.verdict = 'bad';
  recession.footnote = 'If the Sahm rule reaches 0.50, this box turns Unhealthy on its own.';

  // Big purchases
  const dur = latest(S.DURABLES_YOY);
  const veh = avg3Yoy(S.TOTALSA);
  const production = box([
    check('Durable goods orders vs a year ago', dur, v => spct(v), above(dur, 2, -3),
      'up more than 2%', '−3% to +2%', 'down more than 3%',
      'Business orders for long-lived equipment fall before investment does.'),
    check('Vehicle sales, 3-month avg vs a year ago', veh, v => spct(v), above(veh, -5, -10),
      'down less than 5%', 'down 5% to 10%', 'down more than 10%',
      'Monthly sales are noisy; drops past 10% preceded 5 of the last 6 recessions.'),
  ]);

  // Labor
  const unr = changeMonths(S.UNRATE, 12);
  const pay = avg3(S.PAYROLL_CHG);
  const labor = box([
    check('Unemployment vs a year ago', unr, v => spt(v, 1), unr === null ? null : unr < 0.3 ? 'green' : unr <= 0.6 ? 'yellow' : 'red',
      'up less than 0.3 pt', 'up 0.3 to 0.6 pt', 'up more than 0.6 pt',
      'Unemployment rises slowly, then fast; a half-point rise is the classic warning.'),
    check('Payroll gains, 3-month average', pay, v => `${v < 0 ? MINUS : '+'}${Math.round(Math.abs(v))}k a month`,
      pay === null ? null : pay >= 100 ? 'green' : pay >= 0 ? 'yellow' : 'red',
      '100k a month or more', '0 to 100k a month', 'losing jobs',
      'Hiring usually stalls before unemployment climbs.'),
  ]);

  // Inflation
  const inf = (name: string, v: number | null) => check(name, v, x => pct(x, 2), below(v === null ? null : v - 1e-9, 2.5, 3.0),
    '2.5% or less', '2.5% to 3.0%', 'over 3.0%',
    'Measured against the Fed’s 2% target.');
  const inflation = box([
    inf('Headline CPI, year over year', latest(S.CPI_YOY)),
    inf('Core CPI, year over year', latest(S.CORECPI_YOY)),
    inf('Core PCE, year over year', latest(S.COREPCE_YOY)),
  ]);

  // Housing
  const mort = latest(S.MORTGAGE30US);
  const mortChg = changeOver(S.MORTGAGE30US, 365);
  const startsMom = avg3Yoy(S.HOUST);
  const startsPace = avg3(S.HOUST);
  const hpi = latest(S.HPI_YOY);
  const housing = box([
    check('30-year mortgage rate', mort, v => pct(v, 2), below(mort, 6, 7),
      'under 6%', '6% to 7%', 'over 7%',
      'NAR calls 6% the “magic number” that brings buyers back.'),
    check('Mortgage rate change over 12 months', mortChg, v => spt(v), below(mortChg, 0.5, 1.0),
      'up less than 0.5 pt', 'up 0.5 to 1.0 pt', 'up more than 1.0 pt',
      'A fast jump freezes buyers and sellers in place.'),
    check('Housing starts, 3-month avg vs a year ago', startsMom, v => spct(v), above(startsMom, -7.5, -15),
      'down less than 7.5%', 'down 7.5% to 15%', 'down more than 15%',
      'Starts were down more than 15% going into 7 of the last 9 recessions.'),
    check('Housing starts pace, 3-month average', startsPace, v => `${(v / 1000).toFixed(2)}M a year`, above(startsPace, 1500 - 1e-9, 1300),
      '1.5M a year or more', '1.3M to 1.5M', 'under 1.3M',
      'About 1.3M a year just keeps up with new households (RSM).'),
    check('Home prices vs a year ago', hpi, v => spct(v), band(hpi, 0, 6, -3, 10),
      '0% to +6%', '−3% to 0%, or +6% to +10%', 'below −3%, or above +10%',
      'Steady gains are healthy; falling prices or a bubble are not.'),
  ]);

  // Consumers
  const sent = (() => { const x = S.UMCSENT; return x && x.length >= 3 ? (x[x.length - 1].v + x[x.length - 2].v + x[x.length - 3].v) / 3 : null; })();
  const dsr = latest(S.TDSP);
  const consumer = box([
    check('Consumer sentiment, 3-month average', sent, v => v.toFixed(1), sent === null ? null : sent >= 80 ? 'green' : sent >= 65 ? 'yellow' : 'red',
      '80 or higher', '65 to 80', 'under 65',
      'The long-run average since 1978 is about 84; every recession since then began with the index above 65.'),
    check('Debt service ratio', dsr, v => pct(v, 2), below(dsr, 12.5, 14),
      'under 12.5% of income', '12.5% to 14%', 'over 14%',
      'It ran 15% to 16% before the 2008 crisis and has held near 11% to 12% since 2012.'),
  ]);

  // Policy
  const real = latest(S.REAL_RATE);
  const ff12 = changeMonths(S.FEDFUNDS, 12);
  const ff6 = changeMonths(S.FEDFUNDS, 6);
  const ff3 = changeMonths(S.FEDFUNDS, 3);
  let move: Light | null = null;
  let moveText: number | null = null;
  if (ff12 !== null && ff6 !== null && ff3 !== null) {
    moveText = ff12;
    move = ff12 > 1.5 || ff6 < -1.0 ? 'red' : ff12 >= 0.5 || ff3 > 0.1 ? 'yellow' : 'green';
  }
  const policyChecks = [
    check('Real policy rate', real, v => spt(v), band(real, 0, 1.5, -1, 2.5),
      '0 to +1.5 pt', '−1 to 0, or +1.5 to +2.5 pt', 'below −1, or above +2.5 pt',
      'Near neutral (a little under 1%) is neither braking nor fueling the economy.'),
    check('Fed funds moves', moveText, v => `${spt(v)} over 12 months${ff3 !== null && ff3 > 0.1 ? ', hiked in the last 3 months' : ''}`, move,
      'steady, or cutting gradually', 'up 0.5 to 1.5 pt in a year, or a hike in the last 3 months', 'up more than 1.5 pt in a year, or cut more than 1 pt in 6 months',
      'Rapid hikes have usually preceded recessions; sharp cuts usually mean one has begun.'),
  ];
  const policy = box(policyChecks);

  // Curve
  const spread = latest(S.T10Y2Y);
  const tenChg = changeOver(S.DGS10, 365);
  const curve = box([
    check('10-year minus 2-year', spread, v => spt(v), above(spread, 0.5, 0),
      'above +0.5 pt', '0 to +0.5 pt', 'below 0 (inverted)',
      'An inverted curve has preceded every recession since 1980.'),
    check('10-year yield change over 12 months', tenChg, v => spt(v), below(tenChg, 0.5, 1.0),
      'up less than 0.5 pt', 'up 0.5 to 1.0 pt', 'up more than 1.0 pt',
      'A fast rise in long rates lifts borrowing costs across the economy.'),
  ]);

  return { recession, production, labor, inflation, housing, consumer, policy, curve };
}
