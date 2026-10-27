import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { repo } from './db/repo';
import { db } from './db/db';

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: () => {} }),
}));

const renderApp = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

beforeEach(async () => {
  await repo.resetAll();
});
afterEach(cleanup);

async function completeOnboarding(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: /welcome to calweek/i });
  await user.type(screen.getByLabelText('Age'), '30');
  await user.type(screen.getByLabelText('Height'), '180');
  await user.type(screen.getByLabelText('Current weight'), '80');
  await user.click(screen.getByRole('button', { name: /continue/i }));

  await screen.findByText(/choose your calorie target/i);
  await user.click(screen.getByRole('radio', { name: /^Weight loss/ }));
  expect(screen.getByRole('region', { name: /goal summary/i })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /continue/i }));

  await screen.findByText(/set up your tracking week/i);
  await user.click(screen.getByRole('button', { name: /start tracking/i }));
}

describe('app flow', () => {
  it('sends a new user to onboarding and blocks incomplete profiles', async () => {
    const user = userEvent.setup();
    renderApp('/settings');
    await screen.findByRole('heading', { name: /welcome to calweek/i });
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(screen.queryByText(/choose your calorie target/i)).not.toBeInTheDocument();
  });

  it('onboards, logs today, edits it, and persists to IndexedDB', async () => {
    const user = userEvent.setup();
    renderApp();
    await completeOnboarding(user);

    await user.click(await screen.findByRole('button', { name: /log today's calories/i }));
    const input = await screen.findByLabelText(/total calories eaten/i);
    await user.type(input, '1800');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    // Back on the dashboard with the entry shown.
    await screen.findByRole('button', { name: /edit today's calories/i });
    expect(await db.logs.count()).toBe(1);
    expect((await db.logs.toArray())[0].totalCalories).toBe(1800);

    // Edit the same day — still one record.
    await user.click(screen.getByRole('button', { name: /edit today's calories/i }));
    const again = await screen.findByLabelText(/total calories eaten/i);
    expect(again).toHaveValue(1800);
    await user.clear(again);
    await user.type(again, '2000');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await screen.findByRole('button', { name: /edit today's calories/i });
    await waitFor(async () => expect((await db.logs.toArray())[0].totalCalories).toBe(2000));
    expect(await db.logs.count()).toBe(1);
  });

  it('rejects a negative entry on the day page', async () => {
    const user = userEvent.setup();
    renderApp();
    await completeOnboarding(user);
    await user.click(await screen.findByRole('button', { name: /log today's calories/i }));
    await user.type(await screen.findByLabelText(/total calories eaten/i), '-50');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot be negative/i);
    expect(await db.logs.count()).toBe(0);
  });

  it('shows days as not logged rather than 0 on the week page', async () => {
    const user = userEvent.setup();
    renderApp();
    await completeOnboarding(user);
    await screen.findByRole('button', { name: /log today's calories/i });
    await user.click(screen.getByRole('link', { name: /open weekly calendar/i }));
    const list = await screen.findAllByRole('listitem');
    expect(list.length).toBeGreaterThanOrEqual(7);
    expect(within(list[0]).getAllByText(/not logged yet/i).length).toBeGreaterThan(0);
  });
});
