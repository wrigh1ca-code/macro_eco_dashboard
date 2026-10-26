// What the dashboard shows and how each series is drawn. Names, units and
// sources come from manifest.json at runtime; this file holds only what the
// data file can't know: colours, formats and the plain-language framing.

import type { Freq } from './compute';
import { fixed, jobs, millions, pct, signedPt, signedUnits, trillions, units } from './format';

/** Keys of the series the charts draw, raw and derived. */
export type Key =
  | 'FEDFUNDS' | 'IORB' | 'SOFR' | 'ONRRP' | 'DGS2' | 'DGS10' | 'T10Y2Y'
  | 'CPI_YOY' | 'CORECPI_YOY' | 'COREPCE_YOY' | 'PCE_YOY' | 'REAL_RATE'
  | 'UNRATE' | 'PAYROLL_CHG' | 'GDP' | 'GDPNOW'
  | 'MORTGAGE30US' | 'BAA10Y'
  | 'UMCSENT' | 'TDSP'
  | 'SAHM' | 'RECPROB'
  | 'PERMIT' | 'HOUST' | 'HPI_YOY'
  | 'DURABLES_YOY' | 'TOTALSA' | 'CFNAI' | 'CFNAI_MA3' | 'RETAIL_YOY';

/**
 * One colour per series, everywhere it appears. Families carry meaning:
 * blues for rates, warm hues for inflation, green for labour, ink for a
 * derived line (a spread or a real rate) because that line is the answer.
 * Every pair that shares a panel was run through the dataviz palette
 * validator on a white surface.
 */
export const COLOR: Record<Key, string> = {
  FEDFUNDS: '#2F6BFF',
  IORB: '#7C3AED',
  SOFR: '#0D9488',
  ONRRP: '#F59E0B',
  DGS10: '#1D4ED8',
  DGS2: '#0D9488',
  T10Y2Y: '#111827',
  CPI_YOY: '#D97706',
  CORECPI_YOY: '#7C3AED',
  COREPCE_YOY: '#E11D48',
  PCE_YOY: '#0891B2',
  REAL_RATE: '#111827',
  UNRATE: '#16A34A',
  PAYROLL_CHG: '#16A34A',
  GDP: '#475467',
  GDPNOW: '#475467',
  MORTGAGE30US: '#0369A1',
  BAA10Y: '#C2410C',
  UMCSENT: '#C026D3',
  TDSP: '#0F766E',
  SAHM: '#111827',
  RECPROB: '#B42318',
  PERMIT: '#0891B2',
  HOUST: '#155E75',
  HPI_YOY: '#9A3412',
  DURABLES_YOY: '#4338CA',
  TOTALSA: '#B45309',
  CFNAI: '#A5B4C8',
  CFNAI_MA3: '#1E3A8A',
  RETAIL_YOY: '#2563EB',
};

/** Neutral grey behind every time series: NBER recession months. */
export const RECESSION_FILL = 'rgba(16, 24, 40, 0.07)';
/** Full-height rose band on the yield-curve card while the 10y−2y spread is below zero. */
export const INVERSION_BAND = 'rgba(225, 29, 72, 0.10)';
/** The wash between the spread line and zero, and the colour the line turns, while inverted. */
export const INVERSION_FILL = 'rgba(225, 29, 72, 0.28)';
export const INVERSION_STROKE = '#E11D48';

/** Short names used in legends, tooltips and tiles. */
export const NAME: Record<Key, string> = {
  FEDFUNDS: 'Fed funds rate',
  IORB: 'IORB',
  SOFR: 'SOFR',
  ONRRP: 'ON RRP',
  DGS2: '2-year Treasury',
  DGS10: '10-year Treasury',
  T10Y2Y: '10-year minus 2-year',
  CPI_YOY: 'Headline CPI',
  CORECPI_YOY: 'Core CPI',
  COREPCE_YOY: 'Core PCE',
  PCE_YOY: 'Headline PCE',
  REAL_RATE: 'Real policy rate',
  UNRATE: 'Unemployment rate',
  PAYROLL_CHG: 'Payroll change',
  GDP: 'Real GDP growth',
  GDPNOW: 'GDPNow',
  MORTGAGE30US: '30-year mortgage rate',
  BAA10Y: 'Baa spread',
  UMCSENT: 'Consumer sentiment',
  TDSP: 'Debt service ratio',
  SAHM: 'Sahm rule',
  RECPROB: 'Recession probability',
  PERMIT: 'Building permits',
  HOUST: 'Housing starts',
  HPI_YOY: 'Home prices, Case-Shiller',
  DURABLES_YOY: 'Durable goods orders',
  TOTALSA: 'Vehicle sales',
  CFNAI: 'CFNAI, monthly',
  CFNAI_MA3: 'CFNAI, 3-month average',
  RETAIL_YOY: 'Retail sales',
};

/** Rates read as percents; spreads and the real rate read as percentage points. */
export const FORMAT: Record<Key, (v: number) => string> = {
  FEDFUNDS: v => pct(v, 2),
  IORB: v => pct(v, 2),
  SOFR: v => pct(v, 2),
  ONRRP: v => pct(v, 2),
  DGS2: v => pct(v, 2),
  DGS10: v => pct(v, 2),
  T10Y2Y: v => signedPt(v, 2),
  CPI_YOY: v => pct(v, 1),
  CORECPI_YOY: v => pct(v, 1),
  COREPCE_YOY: v => pct(v, 1),
  PCE_YOY: v => pct(v, 1),
  REAL_RATE: v => signedPt(v, 2),
  UNRATE: v => pct(v, 1),
  PAYROLL_CHG: v => jobs(v),
  GDP: v => pct(v, 1),
  GDPNOW: v => pct(v, 1),
  MORTGAGE30US: v => pct(v, 2),
  BAA10Y: v => `${fixed(v, 2)} pt`,
  UMCSENT: v => fixed(v, 1),
  TDSP: v => pct(v, 2),
  SAHM: v => `${fixed(v, 2)} pt`,
  RECPROB: v => pct(v, 1),
  PERMIT: v => units(v),
  HOUST: v => units(v),
  HPI_YOY: v => pct(v, 1),
  DURABLES_YOY: v => pct(v, 1),
  TOTALSA: v => millions(v),
  CFNAI: v => (v > 0 ? '+' : '') + fixed(v, 2),
  CFNAI_MA3: v => (v > 0 ? '+' : '') + fixed(v, 2),
  RETAIL_YOY: v => pct(v, 1),
};

/** Axis tick formats: fewer decimals, no sign noise. */
export const AXIS = {
  pct: (v: number) => `${v}%`,
  pt: (v: number) => (v === 0 ? '0' : `${v} pt`),
  jobs: (v: number) => jobs(v, false),
  trillions: (v: number) => trillions(v, Number.isInteger(v) ? 0 : 1),
  units: (v: number) => units(v, 1),
  millions: (v: number) => millions(v, 0),
  index: (v: number) => String(v),
  signed: (v: number) => (v > 0 ? '+' : v < 0 ? '\u2212' : '') + Math.abs(v),
};

export interface TileSpec {
  key: Key;
  label: string;
  /** One quiet line under the label: what the number is, exactly. */
  qualifier: string;
  freq: Freq;
  /** Change from a year earlier, in the unit that makes sense for the metric. */
  delta: (v: number) => string;
}

export const TILES: TileSpec[] = [
  { key: 'COREPCE_YOY', label: 'Core PCE inflation', qualifier: "Fed's preferred gauge, YoY", freq: 'monthly', delta: v => signedPt(v, 1) },
  { key: 'FEDFUNDS', label: 'Fed funds rate', qualifier: 'effective, monthly average', freq: 'monthly', delta: v => signedPt(v, 2) },
  { key: 'DGS10', label: '10-year Treasury', qualifier: 'constant maturity yield', freq: 'daily', delta: v => signedPt(v, 2) },
  { key: 'UNRATE', label: 'Unemployment rate', qualifier: 'U-3, seasonally adjusted', freq: 'monthly', delta: v => signedPt(v, 1) },
  { key: 'HOUST', label: 'Housing starts', qualifier: 'annualized units, monthly', freq: 'monthly', delta: v => signedUnits(v) },
  { key: 'GDPNOW', label: 'GDPNow', qualifier: 'Atlanta Fed nowcast, annualized', freq: 'quarterly', delta: v => signedPt(v, 1) },
];

/** Years of history each tile's sparkline shows, whatever the chart window is. */
export const SPARKLINE_YEARS = 5;

/** Bars past this many thousand jobs a month are cut at the plot edge and marked. */
export const PAYROLL_CLAMP = 1000;

/** How each FRED series is used, for the Data & sources table. */
export const USED_AS: Record<string, string> = {
  FEDFUNDS: 'Fed funds rate, as published',
  IORB: 'Interest rate the Fed pays banks on their reserves, as published (from July 29, 2021)',
  IOER: 'Interest rate on excess reserves, the rate IORB replaced; drawn as the same IORB line before July 29, 2021',
  SOFR: 'Secured overnight financing rate, as published (from April 2018)',
  RRPONTSYAWARD: 'ON RRP award rate, as published: what the Fed pays on overnight reverse repos, the floor under short-term rates (from September 2013)',
  CFNAI: 'Chicago Fed National Activity Index, as published; the 3-month average is computed on the page. Zero means the economy is growing at its long-run trend.',
  RSAFS: 'Retail sales growth = % change vs the same month a year earlier, from the seasonally adjusted dollar level (not adjusted for inflation)',
  DGS2: '2-year yield, as published',
  DGS10: '10-year yield, as published',
  T10Y2Y: 'Curve spread, as published (FRED computes 10y − 2y); inverted-curve shading is every stretch below zero',
  CPIAUCSL: 'Headline CPI inflation = % change vs the same month a year earlier, from the seasonally adjusted index (BLS headlines use the unadjusted index, which can differ by a tenth). BLS never published October 2025, so that month is blank.',
  CPILFESL: 'Core CPI inflation = % change vs the same month a year earlier, from the seasonally adjusted index. October 2025 was never published.',
  PCEPILFE: 'Core PCE inflation = % change vs a year earlier; real policy rate = fed funds − this',
  PCEPI: 'Headline PCE inflation = % change vs the same month a year earlier (food and energy included)',
  UNRATE: 'Unemployment rate, as published (October 2025 was never published)',
  PAYEMS: 'Payroll change = month-over-month difference, thousands of jobs',
  A191RL1Q225SBEA: 'Real GDP growth, as published (quarterly, seasonally adjusted annual rate). Not currently shown on the page; the GDPNow tile replaced it.',
  GDPNOW: 'GDPNow tile: the Atlanta Fed\u2019s running estimate of real GDP growth for the current quarter, revised as data arrive. Past quarters hold the last estimate made before the official GDP release.',
  MORTGAGE30US: 'Mortgage rate, as published',
  BAA10Y: 'Credit spread, as published (Baa corporate yield − 10-year Treasury)',
  USREC: 'Recession shading on every chart (NBER peak-to-trough months)',
  SAHMREALTIME: 'Sahm rule, as published. The real-time variant: it uses the unemployment rate as it was known each month, not as later revised, so the line shows what the signal actually said at the time.',
  RECPROUSM156N: 'Smoothed recession probability, as published (Chauvet–Piger model of payrolls, industrial production, real income and manufacturing sales)',
  PERMIT: 'Building permits, as published (seasonally adjusted annual rate)',
  HOUST: 'Housing starts, as published (seasonally adjusted annual rate); also the Housing starts tile',
  CSUSHPINSA: 'Home-price growth = % change vs the same month a year earlier, from the Case-Shiller national index. Repeat sales of the same houses, so it is not distorted by the mix of what happens to sell. Index level itself (Jan 2000 = 100) is not shown. © S&P Dow Jones Indices LLC; reprinted with permission.',
  ADXTNO: 'Durable goods orders excluding transportation = % change vs the same month a year earlier, from the published dollar level. Transportation is excluded because a single aircraft order swings the headline.',
  TOTALSA: 'Total vehicle sales, as published (seasonally adjusted annual rate, millions of units)',
  UMCSENT: 'Consumer sentiment, as published. FRED posts it one month after the University of Michigan releases it, at the University\u2019s request; readings before 1978 are quarterly or less. © University of Michigan.',
  TDSP: 'Debt service ratio, as published: required payments on mortgages and consumer debt as a share of after-tax income (quarterly, from 2005)',
};

export const RANGES: { label: string; years: number | null }[] = [
  { label: '5Y', years: 5 },
  { label: '10Y', years: 10 },
  { label: '20Y', years: 20 },
  { label: 'Max', years: null },
];
