// The macro dashboard: six headline tiles, five charts that each answer one
// question, and a collapsed table of every series used. One time window for
// everything, recession shading on every time series.

import { useEffect, useMemo, useState } from 'react';
import ChartCard from './ChartCard';
import { addYears, clip } from './compute';
import { loadMacro, manifestEnd, type MacroData, type ManifestEntry } from './data';
import { longDate } from './format';
import type { PanelSpec, SeriesSpec } from './Panel';
import {
  AXIS, COLOR, FORMAT, INVERSION_BAND, INVERSION_FILL, INVERSION_STROKE, NAME, PAYROLL_CLAMP, RANGES,
  RECESSION_FILL, TILES, type Key,
} from './registry';
import Sources from './Sources';
import { computeHealth, type Verdict } from './health';
import { Heart, TONE, WORD } from './HealthBadge';
import Tile from './Tile';

interface Props {
  label?: string;
  manifest: ManifestEntry[];
  fetchedAt: string;
}

export default function MacroDashboard({ label = 'Macro Dashboard', manifest, fetchedAt }: Props) {
  const [data, setData] = useState<MacroData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [years, setYears] = useState<number | null>(10);

  useEffect(() => {
    loadMacro().then(setData).catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const end = data ? data.dataEnd : manifestEnd(manifest);
  const start = years === null ? null : addYears(end, -years);

  const charts = useMemo(() => {
    if (!data) return null;
    const S = (key: Key): SeriesSpec =>
      ({ id: key, name: NAME[key], color: COLOR[key], data: data.series[key], format: FORMAT[key], freq: data.freq[key] });
    const inversion = [{ spans: data.inversions, fill: INVERSION_BAND }];
    const policy: PanelSpec[] = [{
      key: 'policy',
      series: [S('FEDFUNDS'), S('IORB'), S('SOFR'), S('COREPCE_YOY'), S('REAL_RATE')],
      yFormat: AXIS.pct,
      includeZero: true,
    }];
    const curve: PanelSpec[] = [
      { key: 'curve', series: [S('DGS2'), S('DGS10')], yFormat: AXIS.pct, bands: inversion, flex: 1 },
      {
        key: 'spread',
        series: [S('T10Y2Y')],
        yFormat: AXIS.pt,
        includeZero: true,
        bands: inversion,
        fillSign: { below: INVERSION_FILL, strokeBelow: INVERSION_STROKE },
        caption: '10-year minus 2-year',
        flex: 1,
      },
    ];
    const labor: PanelSpec[] = [
      { key: 'unrate', series: [S('UNRATE')], yFormat: AXIS.pct, caption: 'Unemployment rate', flex: 3 },
      {
        key: 'payrolls',
        series: [S('PAYROLL_CHG')],
        kind: 'bars',
        yFormat: AXIS.jobs,
        includeZero: true,
        clampAbs: PAYROLL_CLAMP,
        caption: 'Monthly change in nonfarm payrolls',
        flex: 2,
      },
    ];
    const inflation: PanelSpec[] = [{
      key: 'inflation',
      series: [S('CPI_YOY'), S('CORECPI_YOY'), S('PCE_YOY'), S('COREPCE_YOY')],
      yFormat: AXIS.pct,
      includeZero: true,
      refLines: [{ v: 2, label: '2% target', dashed: true }],
    }];
    const consumer: PanelSpec[] = [
      { key: 'sentiment', series: [S('UMCSENT')], yFormat: AXIS.index, caption: 'University of Michigan consumer sentiment' },
      { key: 'dsr', series: [S('TDSP')], yFormat: AXIS.pct, caption: 'Household debt service payments, % of disposable income' },
    ];
    const recession: PanelSpec[] = [
      {
        key: 'sahm',
        series: [S('SAHM')],
        yFormat: AXIS.pt,
        includeZero: true,
        refLines: [{ v: 0.5, label: '0.50 = triggered', dashed: true }],
        caption: 'Sahm rule: unemployment\u2019s 3-month average, above its low of the past year',
        flex: 3,
      },
      {
        key: 'recprob',
        series: [S('RECPROB')],
        yFormat: AXIS.pct,
        includeZero: true,
        caption: 'Smoothed probability the economy was in recession that month',
        flex: 2,
      },
      { key: 'baa', series: [S('BAA10Y')], yFormat: AXIS.pt, caption: 'Baa corporate spread over 10-year Treasury', flex: 2 },
    ];
    const housing: PanelSpec[] = [
      { key: 'mortgage', series: [S('MORTGAGE30US')], yFormat: AXIS.pct, caption: '30-year fixed mortgage rate' },
      { key: 'starts', series: [S('PERMIT'), S('HOUST')], yFormat: AXIS.units, caption: 'Permits and starts, annualized units' },
      { key: 'price', series: [S('HPI_YOY')], yFormat: AXIS.pct, includeZero: true, caption: 'Home prices vs a year earlier, Case-Shiller national' },
    ];
    const production: PanelSpec[] = [
      {
        key: 'durables',
        series: [S('DURABLES_YOY')],
        yFormat: AXIS.pct,
        includeZero: true,
        caption: 'Durable goods orders ex-transport, vs a year earlier',
        flex: 3,
      },
      {
        key: 'vehicles',
        series: [S('TOTALSA')],
        yFormat: AXIS.millions,
        caption: 'Total vehicle sales, annualized',
        flex: 2,
      },
    ];
    return { policy, curve, labor, inflation, consumer, recession, housing, production };
  }, [data]);

  // The payroll note only earns its line when a bar in the window is actually cut.
  const payrollCut = useMemo(
    () => (data ? clip(data.series.PAYROLL_CHG, start ?? -Infinity, end).some(o => Math.abs(o.v) > PAYROLL_CLAMP) : false),
    [data, start, end],
  );

  const health = useMemo(() => (data ? computeHealth(data.series) : null), [data]);
  const tally = useMemo(() => {
    const t: Record<Verdict, number> = { good: 0, mixed: 0, bad: 0, none: 0 };
    if (health) for (const h of Object.values(health)) t[h.verdict]++;
    return t;
  }, [health]);

  const recessions = data?.recessions ?? [];
  const legendOf = (keys: Key[]) => keys.map(k => ({ name: NAME[k], color: COLOR[k] }));

  return (
    <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6 pt-6 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-5">
        <div className="min-w-0">
          <h1 className="font-grotesk text-[28px] font-bold leading-none text-fika-text m-0 tracking-[-0.02em]">{label}</h1>
          <p className="text-[13.5px] text-fika-secondary leading-snug mt-2 mb-0 max-w-[640px]">
            A SparkNotes view of the US economy.
          </p>
          <p className="text-[12px] text-fika-tertiary leading-none mt-2 mb-0">
            Data through <span className="font-semibold text-fika-secondary">{longDate(end)}</span>
            <span className="mx-2">·</span>
            <span className="inline-block w-3 h-3 rounded-[3px] align-[-2px] mr-1.5" style={{ background: RECESSION_FILL, border: '1px solid rgba(16,24,40,0.10)' }} />
            shaded bands are NBER recessions
          </p>
        </div>

        <div role="group" aria-label="Time window" className="flex rounded-full border border-fika-border bg-fika-surface p-0.5 shrink-0">
          {RANGES.map(r => {
            const on = r.years === years;
            return (
              <button
                key={r.label}
                aria-pressed={on}
                onClick={() => setYears(r.years)}
                className={`font-grotesk text-[12.5px] font-bold rounded-full px-3.5 py-1.5 leading-none transition-colors ${on ? 'bg-fika-text text-white' : 'text-fika-secondary hover:text-fika-text'}`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </header>

      {health && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-fika-border bg-fika-surface px-4 py-2.5 mb-4">
          <span className="font-grotesk text-[14px] font-bold text-fika-text">Today&rsquo;s reading</span>
          {(['good', 'mixed', 'bad', 'none'] as Verdict[]).filter(v => v !== 'none' || tally.none > 0).map(v => (
            <span key={v} className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: TONE[v].ink }}>
              <Heart verdict={v} size={24} />
              {tally[v]} {v === 'none' ? 'waiting for data' : WORD[v].toLowerCase()}
            </span>
          ))}
        </div>
      )}

      {error && (
        <p className="text-[13px] font-semibold text-fika-red mb-4 m-0">Could not load the data file ({error}). Re-run <code className="font-mono">npm run fred</code> and redeploy.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        {TILES.map(t =>
          data ? (
            <Tile key={t.key} spec={t} data={data.series[t.key]} color={COLOR[t.key]} end={end} recessions={data.recessions} />
          ) : (
            <div key={t.key} className="rounded-xl border border-fika-border bg-fika-surface h-[168px]" />
          ),
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard
          title="What is the Current Recession Threat?"
          subtitle="Three readings. The Sahm rule watches only unemployment and triggers at 0.50. The smoothed probability comes from a model of payrolls, production, income and sales. The Baa spread is what investors demand to hold corporate risk over Treasuries; it widens when they start to fear defaults. When they move together, that is the signal worth taking seriously."
          panels={charts?.recession ?? []}
          health={health?.recession}
          start={start}
          end={end}
          recessions={recessions}
          note="The Sahm rule and the probability are coincident, not leading: they tell you a recession has likely begun, not that one is coming. The spread is set daily in markets, so it often moves first."
          className="min-h-[560px]"
        />
        <ChartCard
          title="How is Big-Ticket Spending?"
          subtitle="Durable goods orders are what businesses commit to; vehicle sales are what households commit to. Both are purchases that can wait, so both sag before the wider economy does."
          panels={charts?.production ?? []}
          health={health?.production}
          start={start}
          end={end}
          recessions={recessions}
          className="min-h-[360px]"
        />
        <ChartCard
          title="What is the State of the Labor Market?"
          subtitle="Unemployment rises slowly, then fast. Payroll growth usually stalls first."
          panels={charts?.labor ?? []}
          health={health?.labor}
          start={start}
          end={end}
          recessions={recessions}
          note={payrollCut ? 'Bars beyond ±1M jobs a month are cut at the edge and marked; hover for the exact figure.' : undefined}
          className="min-h-[360px]"
        />
        <ChartCard
          title="What is the Inflation Landscape?"
          subtitle="Headline CPI swings with food and energy; core CPI and core PCE show what sticks. The Fed's target is 2% on PCE."
          panels={charts?.inflation ?? []}
          health={health?.inflation}
          start={start}
          end={end}
          recessions={recessions}
          legend={legendOf(['CPI_YOY', 'CORECPI_YOY', 'PCE_YOY', 'COREPCE_YOY'])}
          className="min-h-[360px]"
        />
        <ChartCard
          title="How Healthy is the Residential Housing Market?"
          subtitle="Mortgage rates set what buyers can afford. Permits are pulled before ground is broken, so they lead starts by a month or two. Prices are Case-Shiller: repeat sales of the same houses, so the line tracks the market rather than the mix of what happened to sell."
          panels={charts?.housing ?? []}
          health={health?.housing}
          layout="row"
          start={start}
          end={end}
          recessions={recessions}
          legend={[...legendOf(['MORTGAGE30US', 'PERMIT', 'HOUST'])]}
          className="lg:col-span-2 min-h-[375px]"
        />
        <ChartCard
          title="How Are Consumers Doing?"
          subtitle="How households feel and how stretched they are. Sentiment is the University of Michigan's monthly survey of how people see their finances and the economy. The debt service ratio is the share of after-tax income that goes to mortgage and loan payments; when it climbs, there is less left to spend."
          panels={charts?.consumer ?? []}
          health={health?.consumer}
          layout="row"
          start={start}
          end={end}
          recessions={recessions}
          className="lg:col-span-2 min-h-[350px]"
        />
        <ChartCard
          title="How Tight is Monetary Policy?"
          subtitle="The Fed's rates against core PCE inflation. IORB is the rate the Fed pays banks on their reserves; fed funds trades just below it, and SOFR, the cost of borrowing overnight against Treasuries, sits close by. The gap between fed funds and core PCE is the real policy rate. Judge tight or loose against neutral, which most estimates put a little under 1%, not against zero."
          panels={charts?.policy ?? []}
          health={health?.policy}
          start={start}
          end={end}
          recessions={recessions}
          legend={legendOf(['FEDFUNDS', 'IORB', 'SOFR', 'COREPCE_YOY', 'REAL_RATE'])}
          className="min-h-[360px]"
        />
        <ChartCard
          title="What is the Yield Curve Saying?"
          subtitle="2-year and 10-year Treasury yields. When the 2-year sits above the 10-year the curve is inverted, which has preceded every recession since 1980."
          panels={charts?.curve ?? []}
          health={health?.curve}
          start={start}
          end={end}
          recessions={recessions}
          legend={[...legendOf(['DGS2', 'DGS10']), { name: 'Inverted', color: INVERSION_FILL, kind: 'swatch' as const }]}
          className="min-h-[596px]"
        />
      </div>

      <div className="mt-4">
        <Sources fetchedAt={data?.fetchedAt ?? fetchedAt} manifest={data?.manifest ?? manifest} />
      </div>
    </div>
  );
}
