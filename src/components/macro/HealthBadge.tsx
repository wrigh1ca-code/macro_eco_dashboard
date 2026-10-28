// The health heart in each card's corner, the line of checks under the title,
// the info pop-up that explains the rules, and the colours they share.

import { useEffect, useRef, useState } from 'react';
import type { BoxHealth, Light, Verdict } from './health';

export const WORD: Record<Verdict, string> = { good: 'Healthy', mixed: 'Mixed', bad: 'Unhealthy', none: 'No reading yet' };

export const TONE: Record<Verdict, { strong: string; ink: string }> = {
  good: { strong: '#16A34A', ink: '#166534' },
  mixed: { strong: '#EAB308', ink: '#854D0E' },
  bad: { strong: '#DC2626', ink: '#991B1B' },
  none: { strong: '#CBD5E1', ink: '#667085' },
};

export const LIGHT: Record<Light, string> = { green: '#16A34A', yellow: '#EAB308', red: '#DC2626' };
const LIGHT_WORD: Record<Light, string> = { green: 'healthy', yellow: 'mixed', red: 'unhealthy' };

/** A heart with a pulse line: strong and regular, weak, erratic, or a dashed flat line while waiting for data. */
export function Heart({ verdict, size = 46 }: { verdict: Verdict; size?: number }) {
  const pulse = {
    good: 'M6 23 h8 l3 -9 l4 17 l4 -14 l2 6 h11',
    mixed: 'M6 23 h9 l2 -4 l3 7 l2 -3 h14',
    bad: 'M6 23 h5 l2 4 l3 -8 l2 10 l3 -13 l2 9 l2 -4 l3 6 l2 -5 h5',
    none: 'M8 23 h28',
  }[verdict];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden className="block">
      <path d="M22 39 C 9 30, 3 23, 3 15 a 9.5 9.5 0 0 1 19 -3 a 9.5 9.5 0 0 1 19 3 C 41 23, 35 30, 22 39 z"
        fill={TONE[verdict].strong} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
      <path d={pulse} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={verdict === 'none' ? '3 3' : undefined} />
    </svg>
  );
}

function Dot({ light }: { light: Light | null }) {
  return (
    <span className="inline-block w-2 h-2 rounded-full shrink-0 translate-y-[-1px]"
      style={{ background: light ? LIGHT[light] : 'transparent', border: light ? 'none' : '1.5px solid #98A2B3' }} />
  );
}

/** The checks, one chip each, under the card title. */
export function CheckLine({ health }: { health: BoxHealth }) {
  return (
    <ul className="list-none p-0 m-0 mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
      {health.checks.map(c => (
        <li key={c.name} className="flex items-center gap-1.5 text-[12px] leading-tight text-fika-secondary">
          <Dot light={c.light} />
          <span>{c.name}</span>
          <span className="font-semibold text-fika-text" style={{ fontVariantNumeric: 'tabular-nums' }}>{c.value ?? 'waiting for data'}</span>
        </li>
      ))}
    </ul>
  );
}

/** The (i) button and the pop-up explaining how this card is rated. Opens on hover, focus or tap. */
export function InfoTip({ health, title }: { health: BoxHealth; title: string }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    if (!pinned) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) { setPinned(false); setOpen(false); } };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPinned(false); setOpen(false); } };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [pinned]);

  const show = open || pinned;
  useEffect(() => {
    if (!show || !pop.current) { setShift(0); return; }
    const r = pop.current.getBoundingClientRect();
    const over = r.right - shift - (window.innerWidth - 12);
    setShift(over > 0 ? -over : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);
  return (
    <span ref={ref} className="relative inline-flex align-middle"
      onPointerEnter={e => { if (e.pointerType === 'mouse') setOpen(true); }}
      onPointerLeave={e => { if (e.pointerType === 'mouse') setOpen(false); }}>
      <button type="button"
        aria-label={`How "${title}" is rated`} aria-expanded={show}
        onClick={() => setPinned(p => !p)}
        onFocus={() => setOpen(true)} onBlur={() => { if (!pinned) setOpen(false); }}
        className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border border-fika-tertiary/50 text-fika-tertiary hover:text-fika-text hover:border-fika-text font-grotesk text-[11px] font-bold leading-none italic"
        style={{ fontFamily: 'Georgia, serif' }}>
        i
      </button>
      {show && (
        <div role="tooltip" ref={pop} style={{ transform: `translateX(${shift}px)` }}
          className="absolute z-30 left-0 top-[24px] w-[min(380px,calc(100vw-48px))] rounded-lg border border-fika-border bg-white shadow-[0_10px_30px_rgba(16,24,40,0.18)] p-3.5 text-left not-italic">
          <div className="font-grotesk text-[13.5px] font-bold text-fika-text leading-tight">How this box is rated</div>
          <ul className="list-none p-0 m-0 mt-2.5 space-y-2.5">
            {health.checks.map(c => (
              <li key={c.name}>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12.5px] font-semibold text-fika-text leading-tight">
                  <Dot light={c.light} />
                  <span>{c.name}</span>
                  <span className="ml-auto pl-2 font-bold whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>{c.value ?? 'no data yet'}</span>
                </div>
                <div className="mt-1 ml-3.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11.5px] leading-snug text-fika-secondary">
                  <span className="font-semibold" style={{ color: LIGHT.green }}>Healthy</span><span>{c.green}</span>
                  <span className="font-semibold" style={{ color: '#A16207' }}>Mixed</span><span>{c.yellow}</span>
                  <span className="font-semibold" style={{ color: LIGHT.red }}>Unhealthy</span><span>{c.red}</span>
                </div>
                <div className="mt-1 ml-3.5 text-[11px] leading-snug text-fika-tertiary">{c.why}</div>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-2.5 border-t border-fika-border text-[11.5px] leading-snug text-fika-secondary">
            The heart is <b style={{ color: TONE.good.ink }}>Healthy</b> when every check is {LIGHT_WORD.green},{' '}
            <b style={{ color: TONE.bad.ink }}>Unhealthy</b> when at least two-thirds are {LIGHT_WORD.red} (or more than half, with none {LIGHT_WORD.green}), and{' '}
            <b style={{ color: TONE.mixed.ink }}>Mixed</b> otherwise. It needs at least two checks with data to give a reading.
            {health.footnote && <> {health.footnote}</>}
          </div>
        </div>
      )}
    </span>
  );
}
