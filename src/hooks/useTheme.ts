import { useEffect } from 'react';
import type { ThemePreference } from '@/types';

const KEY = 'calweek-theme';

/** localStorage only mirrors the preference so the page can pick the right theme before first paint. The source of truth is IndexedDB. */
export function applyTheme(pref: ThemePreference) {
  try { localStorage.setItem(KEY, pref); } catch { /* storage may be unavailable */ }
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f172a' : '#10b981');
}

export function useApplyTheme(pref: ThemePreference | undefined) {
  useEffect(() => {
    if (!pref) return;
    applyTheme(pref);
    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);
}
