import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DataProvider, useAppData } from '@/hooks/useData';
import { useApplyTheme } from '@/hooks/useTheme';
import { Layout } from '@/components/Layout';
import { Spinner } from '@/components/ui';
import Dashboard from '@/pages/Dashboard';
import DayPage from '@/pages/DayPage';
import Onboarding from '@/pages/Onboarding';
import SettingsPage from '@/pages/SettingsPage';
import WeekPage from '@/pages/WeekPage';
import { UpdatePrompt } from '@/components/UpdatePrompt';

// The report pulls in the charting library, so it is loaded on demand (it is still precached for offline use).
const ReportPage = lazy(() => import('@/pages/ReportPage'));

function Routing() {
  const { ready, profile, settings } = useAppData();
  useApplyTheme(settings?.theme);

  if (!ready) return <Spinner label="Opening your data…" />;

  // Until onboarding is finished there is nothing to track, so everything leads there.
  if (!profile || !settings) {
    return (
      <>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
        <UpdatePrompt />
      </>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="week/:start?" element={<WeekPage />} />
        <Route path="report/:start?" element={<Suspense fallback={<Spinner />}><ReportPage /></Suspense>} />
        <Route path="day/:date" element={<DayPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <DataProvider>
      <Routing />
    </DataProvider>
  );
}
