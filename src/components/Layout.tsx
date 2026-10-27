import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, CalendarDays, Home, Settings, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cx } from './ui';
import { UpdatePrompt } from './UpdatePrompt';

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/week', label: 'Week', icon: CalendarDays, end: false },
  { to: '/report', label: 'Report', icon: BarChart3, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function Layout() {
  const online = useOnline();
  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 md:block">
        <div className="mb-8 flex items-center gap-2 px-2">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight">CalWeek</span>
        </div>
        <nav aria-label="Main" className="space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  'flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
            <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
            You're offline — everything still works and is saved on this device.
          </div>
        )}
        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5 sm:px-6 md:pb-10 md:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cx('flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium', isActive ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400')
            }
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <UpdatePrompt />
    </div>
  );
}
