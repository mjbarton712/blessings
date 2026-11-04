'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Blessing, getTodaysBlessing } from '@/lib/blessings';
import { sortCanonically, splitSentences, typeset } from '@/lib/format';

interface BlessingDisplayProps {
  blessings: Blessing[];
}

/** Seconds between sentences: longer sentences get more time to settle. */
function pauseFor(sentence: string) {
  const words = sentence.split(/\s+/).length;
  return Math.min(6, Math.max(2.5, 1.2 + words * 0.3));
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Fullscreen API, including the webkit-prefixed version older Safari and iPadOS use.
// iPhone Safari has no page fullscreen, so focus mode falls back to hiding the app chrome.
type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

function fullscreenElement() {
  const d = document as FsDocument;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

async function requestFullscreen() {
  const el = document.documentElement as FsElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else await el.webkitRequestFullscreen?.();
  } catch {
    /* refused or unsupported: chrome-free focus mode still applies */
  }
}

async function exitFullscreen() {
  const d = document as FsDocument;
  if (!fullscreenElement()) return;
  try {
    if (d.exitFullscreen) await d.exitFullscreen();
    else await d.webkitExitFullscreen?.();
  } catch {
    /* already exited */
  }
}

const CONTROLS_IDLE_MS = 2800;

export default function BlessingDisplay({ blessings }: BlessingDisplayProps) {
  const [current, setCurrent] = useState<Blessing | null>(null);
  const [today, setToday] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [focus, setFocus] = useState(false);
  const [controlsShown, setControlsShown] = useState(true);

  const focusButtonRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const browseButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const currentItemRef = useRef<HTMLButtonElement>(null);

  const sorted = useMemo(() => sortCanonically(blessings), [blessings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (b) => b.scripture.toLowerCase().includes(q) || b.text.toLowerCase().includes(q),
    );
  }, [sorted, query]);

  // Date-dependent values are resolved on the client to avoid hydration mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrent(getTodaysBlessing());
    setToday(
      new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    );
  }, []);

  const sentences = useMemo(
    () => (current ? splitSentences(typeset(current.text)) : []),
    [current],
  );

  // Sentence-by-sentence reveal.
  useLayoutEffect(() => {
    const root = textRef.current;
    if (!root || sentences.length === 0) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-sentence]'));
    const meta = root.parentElement?.querySelectorAll<HTMLElement>('[data-meta]') ?? [];

    if (prefersReducedMotion()) {
      gsap.set([...els, ...meta], { opacity: 1, filter: 'none' });
      return;
    }

    gsap.set(els, { opacity: 0, filter: 'blur(6px)' });
    const tl = gsap.timeline();
    tl.fromTo(meta, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power1.out' }, 0);

    let at = 0.5;
    els.forEach((el, i) => {
      tl.to(el, { opacity: 1, filter: 'blur(0px)', duration: 1.8, ease: 'power2.out' }, at);
      at += pauseFor(sentences[i]);
    });

    timelineRef.current = tl;
    return () => {
      tl.kill();
      timelineRef.current = null;
    };
  }, [sentences]);

  const revealAll = useCallback(() => {
    const tl = timelineRef.current;
    if (tl && tl.progress() < 1) {
      gsap.to(tl, { progress: 1, duration: 0.6, ease: 'power1.inOut' });
    }
  }, []);

  const choose = useCallback((b: Blessing) => {
    setCurrent(b);
    setIsOpen(false);
    setCopied(false);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, []);

  const shuffle = () => {
    if (blessings.length < 2) return;
    let next = current;
    while (next?.scripture === current?.scripture) next = blessings[Math.floor(Math.random() * blessings.length)];
    if (next) choose(next);
  };

  const copy = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(`${typeset(current.text)}\n\n${typeset(current.scripture)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — leave the button as-is */
    }
  };

  // Drawer: focus, Escape, scroll lock.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const browseButton = browseButtonRef.current;

    requestAnimationFrame(() => {
      const item = currentItemRef.current;
      if (item) {
        item.scrollIntoView({ block: 'center' });
        item.focus({ preventScroll: true });
      } else {
        drawerRef.current?.focus();
      }
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      browseButton?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const enterFocus = useCallback(() => {
    setIsOpen(false);
    setFocus(true);
    // Called synchronously inside the click/keypress so the browser allows it.
    void requestFullscreen();
  }, []);

  const exitFocus = useCallback(() => {
    setFocus(false);
    void exitFullscreen();
  }, []);

  // Focus mode: leave when fullscreen ends (e.g. the browser's own Esc), Escape key,
  // keep the screen awake, and return focus to the toggle afterwards.
  useEffect(() => {
    if (!focus) return;
    const focusButton = focusButtonRef.current;

    let wasFullscreen = !!fullscreenElement();
    const onFullscreenChange = () => {
      const now = !!fullscreenElement();
      if (wasFullscreen && !now) setFocus(false);
      wasFullscreen = now;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitFocus();
    };

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquireWakeLock = async () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (cancelled) void next.release();
        else lock = next;
      } catch {
        /* not allowed (battery saver, unsupported): fine */
      }
    };
    void acquireWakeLock();

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', acquireWakeLock);
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      void lock?.release();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', acquireWakeLock);
      window.removeEventListener('keydown', onKey);
      focusButton?.focus({ preventScroll: true });
    };
  }, [focus, exitFocus]);

  // Focus mode controls fade away (and the cursor hides) when you stop moving.
  useEffect(() => {
    if (!focus) return;
    let timer = 0;
    const wake = () => {
      setControlsShown(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setControlsShown(false), CONTROLS_IDLE_MS);
    };
    wake();
    const events = ['pointermove', 'pointerdown', 'keydown'] as const;
    events.forEach((ev) => window.addEventListener(ev, wake));
    return () => {
      window.clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, wake));
      setControlsShown(true);
    };
  }, [focus]);

  // Space/Enter reveals the rest of the blessing; F toggles focus mode.
  useEffect(() => {
    if (isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea')) return;
      if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (focus) exitFocus();
        else enterFocus();
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        if ((e.target as HTMLElement)?.closest('button, a')) return;
        e.preventDefault();
        revealAll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, focus, enterFocus, exitFocus, revealAll]);

  const isLong = (current?.text.length ?? 0) > 420;
  const textSize = focus
    ? isLong
      ? 'text-[1.4rem] sm:text-[1.8rem] md:text-[2.05rem]'
      : 'text-[1.6rem] sm:text-[2.1rem] md:text-[2.5rem]'
    : isLong
      ? 'text-[1.3rem] sm:text-[1.55rem] md:text-[1.7rem]'
      : 'text-[1.45rem] sm:text-[1.75rem] md:text-[2rem]';

  return (
    <>
      {/* Header */}
      <header
        inert={focus}
        className={`fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] transition-opacity duration-500 sm:px-8 ${
          focus ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <span className="flex items-center gap-2 font-serif text-lg italic text-ink-soft">
          <SunMark />
          Blessings
        </span>
        <div className="flex items-center gap-2">
          <button
            ref={focusButtonRef}
            type="button"
            onClick={enterFocus}
            aria-label="Focus mode"
            title="Focus mode (F)"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper-raised/70 text-ink-soft backdrop-blur-sm transition-colors hover:border-ink-faint/50 hover:text-ink"
          >
            <ExpandIcon />
          </button>
          <button
            ref={browseButtonRef}
            type="button"
            onClick={() => setIsOpen(true)}
            aria-expanded={isOpen}
            aria-controls="blessing-drawer"
            className="flex h-9 items-center gap-2 rounded-full border border-line bg-paper-raised/70 px-4 text-sm text-ink-soft backdrop-blur-sm transition-colors hover:border-ink-faint/50 hover:text-ink"
          >
            <ListIcon />
            Browse
          </button>
        </div>
      </header>

      {/* Blessing */}
      <main
        className={`flex min-h-svh items-center justify-center px-6 sm:px-10 ${
          focus ? 'pb-28 pt-[max(4rem,env(safe-area-inset-top))]' : 'pb-16 pt-28'
        } ${focus && !controlsShown ? 'cursor-none' : ''}`}
      >
        {current && (
          <article
            key={current.scripture}
            className={`flex w-full flex-col items-center text-center ${focus ? 'max-w-[46rem]' : 'max-w-[40rem]'}`}
          >
            <p
              data-meta
              className={`mb-10 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ink-faint ${focus ? 'hidden' : ''}`}
            >
              {today}
            </p>

            <div
              ref={textRef}
              onClick={revealAll}
              className={`font-serif font-light leading-[1.6] text-ink [text-wrap:pretty] ${textSize}`}
            >
              <p>
                {sentences.map((s, i) => (
                  <span key={i} data-sentence>
                    {s}
                    {i < sentences.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </p>
            </div>

            <div data-meta className="mt-10 flex flex-col items-center gap-8">
              <p className="flex items-center gap-3 font-serif text-base italic text-gold sm:text-lg">
                <span aria-hidden className="h-px w-6 bg-gold/40" />
                {typeset(current.scripture)}
                <span aria-hidden className="h-px w-6 bg-gold/40" />
              </p>

              <div className={`flex items-center gap-1 text-sm text-ink-faint ${focus ? 'hidden' : ''}`}>
                <QuietButton onClick={shuffle}>
                  <ShuffleIcon />
                  Another blessing
                </QuietButton>
                <span aria-hidden className="text-line">·</span>
                <QuietButton onClick={copy}>
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
                </QuietButton>
              </div>
            </div>
          </article>
        )}
      </main>

      {/* Focus mode controls: shown on move or tap, fade when idle. */}
      {focus && (
        <div
          className={`fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] transition-opacity duration-700 has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100 ${
            controlsShown ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <div className="flex items-center gap-1 rounded-full border border-line bg-paper-raised/80 px-1.5 py-1 text-sm text-ink-faint shadow-[0_8px_30px_-12px_rgba(80,55,25,0.2)] backdrop-blur-sm">
            <QuietButton onClick={shuffle}>
              <ShuffleIcon />
              Another
            </QuietButton>
            <span aria-hidden className="text-line">·</span>
            <QuietButton onClick={exitFocus}>
              <CollapseIcon />
              Exit focus
            </QuietButton>
          </div>
        </div>
      )}

      {/* Overlay */}
      <div
        aria-hidden
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-30 bg-[#3a2a18]/15 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Drawer */}
      <div
        id="blessing-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        inert={!isOpen}
        className={`fixed inset-y-0 right-0 z-40 flex w-full flex-col bg-paper-raised outline-none transition-[transform,box-shadow] duration-300 ease-out sm:w-[26rem] ${
          isOpen ? 'translate-x-0 shadow-[0_0_60px_-15px_rgba(80,55,25,0.25)]' : 'translate-x-full shadow-none'
        }`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <div>
            <h2 id="drawer-title" className="font-serif text-2xl text-ink">
              All blessings
            </h2>
            <p className="mt-1 text-sm text-ink-faint">{blessings.length} blessings, in Bible order</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
            className="-mr-2 rounded-full p-2 text-ink-faint transition-colors hover:bg-line/60 hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 pb-3">
          <label htmlFor="blessing-search" className="sr-only">
            Search blessings
          </label>
          <input
            id="blessing-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by verse or word"
            className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-gold/50 focus:outline-none focus-visible:outline-none"
          />
        </div>

        <ul className="scrollbar-quiet flex-1 overflow-y-auto px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {filtered.map((b) => {
            const active = b.scripture === current?.scripture;
            return (
              <li key={b.scripture}>
                <button
                  ref={active ? currentItemRef : undefined}
                  type="button"
                  onClick={() => choose(b)}
                  aria-current={active ? 'true' : undefined}
                  className={`group w-full rounded-xl px-3 py-3 text-left transition-colors ${
                    active ? 'bg-glow/50' : 'hover:bg-paper'
                  }`}
                >
                  <span className="flex items-center gap-2 font-serif text-[1.05rem] text-ink">
                    {typeset(b.scripture.split(',')[0])}
                    {b.scripture.includes(',') && (
                      <span className="text-sm text-ink-faint">+{b.scripture.split(',').length - 1}</span>
                    )}
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />}
                  </span>
                  <span className="mt-0.5 line-clamp-1 text-sm text-ink-faint group-hover:text-ink-soft">
                    {typeset(b.text)}
                  </span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-ink-faint">
              Nothing matches “{query}”. Try a book name like “Psalm” or a word like “peace”.
            </li>
          )}
        </ul>
      </div>
    </>
  );
}

function QuietButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors hover:bg-paper-raised hover:text-ink-soft"
    >
      {children}
    </button>
  );
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function SunMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="text-gold/70">
      <circle cx="12" cy="14" r="4" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12 5v2.5M5.6 8.2l1.7 1.7M18.4 8.2l-1.7 1.7M3.5 14H6M18 14h2.5" />
        <path d="M4 19h16" />
      </g>
    </svg>
  );
}

function ListIcon() {
  return (
    <svg {...iconProps}>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="0.6" fill="currentColor" />
      <circle cx="4" cy="12" r="0.6" fill="currentColor" />
      <circle cx="4" cy="18" r="0.6" fill="currentColor" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg {...iconProps}>
      <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg {...iconProps}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 12.5 10 17 19 7" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg {...iconProps} width={20} height={20}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
