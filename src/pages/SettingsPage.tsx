import { useEffect, useMemo, useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ThemePreference, Units, WeekdayIndex } from '@/types';
import { repo, ValidationError } from '@/db/repo';
import { useAppData } from '@/hooks/useData';
import { useToday } from '@/hooks/useToday';
import { BodyFields, TargetFields } from '@/components/ProfileFields';
import { GoalSummary } from '@/components/GoalSummary';
import { Alert, Button, Card, Segmented, SectionTitle, SelectField, Spinner, TextField, PageHeader } from '@/components/ui';
import { bodyInputs, convertDraftUnits, draftFromProfile, validateDraft, type ProfileDraft } from '@/lib/draft';
import { buildPlan } from '@/lib/calories';
import { addDays, compareDates, formatFull, formatRange, isValidISODate, weekdayName, weekdayOf, WEEKDAY_NAMES } from '@/lib/dates';
import { getCurrentPeriod, resolveFirstAnchor } from '@/lib/week';

export default function SettingsPage() {
  const { profile, settings } = useAppData();
  if (!profile || !settings) return <Spinner />;
  return <SettingsInner />;
}

function SettingsInner() {
  const { profile, settings } = useAppData();
  const today = useToday();
  const navigate = useNavigate();
  const units = settings!.preferredUnits;

  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(profile!, units));
  const [showErrors, setShowErrors] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const [weekDay, setWeekDay] = useState<WeekdayIndex>(settings!.weekStartDay);
  const [firstDate, setFirstDate] = useState(settings!.firstTrackingDate);
  const [reorganize, setReorganize] = useState(false);
  const [weekMsg, setWeekMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  // If another tab/device-side change updates settings, keep the form in step.
  useEffect(() => {
    setWeekDay(settings!.weekStartDay);
    setFirstDate(settings!.firstTrackingDate);
  }, [settings]);

  const patch = (p: Partial<ProfileDraft>) => { setDraft((d) => ({ ...d, ...p })); setProfileMsg(null); };
  const result = useMemo(() => validateDraft(draft, units), [draft, units]);
  const body = useMemo(() => bodyInputs(draft, units), [draft, units]);
  const plan = result.input ? buildPlan(result.input) : null;
  const errors = showErrors ? result.errors : {};

  const saveProfile = async () => {
    if (!result.input) {
      setShowErrors(true);
      return setProfileMsg({ tone: 'error', text: 'Please fix the highlighted fields first.' });
    }
    try {
      await repo.saveProfile(result.input, today);
      setShowErrors(false);
      setProfileMsg({ tone: 'success', text: 'Saved. Your calorie target has been recalculated and applies from today onward. Earlier days keep the target they were logged with.' });
    } catch (e) {
      setProfileMsg({ tone: 'error', text: e instanceof ValidationError ? e.message : 'Could not save. Please try again.' });
    }
  };

  const changeUnits = async (next: Units) => {
    setDraft((d) => convertDraftUnits(d, units, next));
    await repo.updateSettings({ preferredUnits: next }, today);
  };

  // Week settings
  const anchors = settings!.weekAnchors;
  const pending = anchors.filter((a) => compareDates(a, today) > 0);
  const firstOk = isValidISODate(firstDate);
  const dayChanged = weekDay !== settings!.weekStartDay;
  const firstChanged = firstDate !== settings!.firstTrackingDate;
  const currentPeriod = getCurrentPeriod(anchors, today);

  const saveWeek = async () => {
    if (!firstOk) return setWeekMsg({ tone: 'error', text: 'Choose a valid date.' });
    if (!dayChanged && !firstChanged) return setWeekMsg({ tone: 'success', text: 'Nothing to change.' });
    if (firstChanged && !window.confirm('Changing the first tracking date rebuilds ALL tracking weeks from the new date, including past ones. Your daily entries are kept, but they will be grouped into new weeks. Continue?')) return;
    if (dayChanged && reorganize && !firstChanged && !window.confirm('Reorganize all past weeks to start on ' + weekdayName(weekDay) + '? Daily entries are kept but regrouped.')) return;
    try {
      await repo.updateSettings({ weekStartDay: weekDay, firstTrackingDate: firstDate }, today, { reorganize });
      setReorganize(false);
      setWeekMsg({
        tone: 'success',
        text: firstChanged || reorganize ? 'Tracking weeks were rebuilt.' : `Done. Weeks will start on ${weekdayName(weekDay)} after your current week ends.`,
      });
    } catch (e) {
      setWeekMsg({ tone: 'error', text: e instanceof ValidationError ? e.message : 'Could not save.' });
    }
  };

  const exportData = async () => {
    const data = await repo.exportAll();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `calweek-export-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = async () => {
    if (!window.confirm('Delete ALL data on this device — profile, targets and every logged day? This cannot be undone.')) return;
    await repo.resetAll();
    navigate('/onboarding', { replace: true });
  };

  const firstAnchorPreview = firstOk ? resolveFirstAnchor(firstDate, weekDay) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile & settings" />

      <Card>
        <SectionTitle hint="Update these whenever they change — your target is recalculated when you save.">Personal information</SectionTitle>
        <div className="mb-4 max-w-xs">
          <Segmented label="Units" value={units} onChange={changeUnits} options={[{ value: 'metric', label: 'kg · cm' }, { value: 'imperial', label: 'lb · ft/in' }]} />
        </div>
        <BodyFields draft={draft} units={units} errors={errors} onChange={patch} />
      </Card>

      <Card>
        <SectionTitle>Calorie target</SectionTitle>
        <TargetFields draft={draft} errors={errors} body={body} onChange={patch} />
      </Card>

      {plan && result.input && <GoalSummary plan={plan} units={units} input={result.input} />}

      <div className="space-y-3">
        <Alert tone="info">Saving applies the new target from today onward. Days you've already logged keep the target they were logged with, so past reports don't change.</Alert>
        {profileMsg && <Alert tone={profileMsg.tone === 'success' ? 'success' : 'error'}>{profileMsg.text}</Alert>}
        <Button onClick={saveProfile}>Save & recalculate</Button>
      </div>

      <Card>
        <SectionTitle hint={`Current week: ${formatRange(currentPeriod.start, currentPeriod.end)}.`}>Tracking week</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Week starts on" value={weekDay} onChange={(e) => { setWeekDay(Number(e.target.value) as WeekdayIndex); setWeekMsg(null); }}>
            {WEEKDAY_NAMES.map((n, i) => (<option key={n} value={i}>{n}</option>))}
          </SelectField>
          <TextField
            label="Initial tracking date"
            type="date"
            value={firstDate}
            onChange={(e) => { setFirstDate(e.target.value); setWeekMsg(null); }}
            error={firstOk ? undefined : 'Choose a valid date'}
            hint="Changing this rebuilds every week from the new date."
          />
        </div>

        {dayChanged && !firstChanged && (
          <div className="mt-4 space-y-3">
            <Alert tone="info">
              Your current week stays as it is. {WEEKDAY_NAMES[weekDay]} weeks begin after it ends
              {weekdayOf(addDays(currentPeriod.end, 1)) !== weekDay ? ' (one shorter transition week fills the gap)' : ''}.
            </Alert>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 accent-emerald-600" checked={reorganize} onChange={(e) => setReorganize(e.target.checked)} />
              <span>Also reorganize past weeks to start on {WEEKDAY_NAMES[weekDay]} <span className="text-slate-500 dark:text-slate-400">(regroups existing entries)</span></span>
            </label>
          </div>
        )}
        {firstChanged && firstAnchorPreview && (
          <div className="mt-4"><Alert tone="warning">Week 1 will start on your chosen date, {formatFull(firstAnchorPreview)}, and all weeks will be rebuilt from there.</Alert></div>
        )}
        {pending.length > 0 && !dayChanged && !firstChanged && (
          <div className="mt-4"><Alert tone="info">A new week-start day takes effect on {formatFull(pending[pending.length - 1])}.</Alert></div>
        )}
        {weekMsg && <div className="mt-4"><Alert tone={weekMsg.tone === 'success' ? 'success' : 'error'}>{weekMsg.text}</Alert></div>}
        <Button className="mt-4" variant="secondary" onClick={saveWeek} disabled={!dayChanged && !firstChanged}>Save week settings</Button>
      </Card>

      <Card>
        <SectionTitle>Appearance</SectionTitle>
        <div className="max-w-sm">
          <Segmented<ThemePreference>
            label="Theme"
            value={settings!.theme}
            onChange={(theme) => repo.updateSettings({ theme }, today)}
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]}
          />
        </div>
      </Card>

      <Card>
        <SectionTitle hint="Everything is stored only on this device (in your browser's IndexedDB).">Your data</SectionTitle>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={exportData}><Download className="h-4 w-4" aria-hidden="true" />Export as JSON</Button>
          <Button variant="danger" onClick={reset}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete all data</Button>
        </div>
      </Card>
    </div>
  );
}
