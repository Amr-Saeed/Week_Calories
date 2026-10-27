import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui';

/**
 * Handles app updates. The new version downloads in the background; nothing reloads until the
 * user chooses to, so an update never interrupts an entry being typed.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Look for a new version every hour while the app stays open.
      if (registration) setInterval(() => registration.update().catch(() => undefined), 60 * 60 * 1000);
    },
  });

  if (!needRefresh && !offlineReady) return null;
  const close = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };
  return (
    <div role="status" className="fixed inset-x-3 bottom-20 z-30 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900 md:bottom-6 md:left-auto md:right-6">
      <p className="text-sm font-medium">{needRefresh ? 'A new version is available.' : 'Ready to work offline.'}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {needRefresh ? 'Update now to get the latest improvements. Your data stays on this device.' : 'You can keep logging calories without an internet connection.'}
      </p>
      <div className="mt-3 flex gap-2">
        {needRefresh && <Button size="sm" onClick={() => updateServiceWorker(true)}>Update</Button>}
        <Button size="sm" variant="secondary" onClick={close}>{needRefresh ? 'Later' : 'Got it'}</Button>
      </div>
    </div>
  );
}
