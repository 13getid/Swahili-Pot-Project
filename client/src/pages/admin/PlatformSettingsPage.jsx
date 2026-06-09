import { useEffect, useState } from 'react';
import { Settings, AlertTriangle, Save } from 'lucide-react';
import { getPlatformSettings, updatePlatformSettings } from '../../api/admin';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Spinner from '../../components/ui/Spinner';

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-brand-600' : 'bg-line'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

const NUMERIC = [
  { key: 'attendance_expiry_hours', label: 'Attendance QR expiry (hours)', min: 1, max: 24 },
  { key: 'max_file_size_mb', label: 'Max upload size (MB)', min: 1, max: 50 },
  { key: 'downtime_escalation_hours', label: 'Downtime escalation (hours)', min: 1, max: 72 },
];

export default function PlatformSettingsPage() {
  const { show } = useToast();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPlatformSettings()
      .then((res) => setForm(res.data.settings))
      .finally(() => setLoading(false));
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        maintenance_mode: form.maintenance_mode,
        maintenance_message: form.maintenance_message || '',
        org_name: form.org_name || '',
        org_email: form.org_email || '',
      };
      for (const { key } of NUMERIC) payload[key] = form[key];
      const res = await updatePlatformSettings(payload);
      setForm(res.data.settings);
      show('Settings saved');
    } catch (err) {
      show(err.response?.data?.error || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
          <Settings size={22} className="text-brand-600" /> Platform Settings
        </h2>
        <p className="mt-1 text-sm text-subtle">System-wide configuration for SwahiliPot IMS.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Maintenance mode */}
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
                <AlertTriangle size={16} className="text-amber-500" /> Maintenance Mode
              </h3>
              <p className="mt-1 text-sm text-subtle">
                When on, only administrators can use the system. Everyone else sees a maintenance
                notice.
              </p>
            </div>
            <Toggle checked={!!form.maintenance_mode} onChange={(v) => set('maintenance_mode', v)} />
          </div>
          {form.maintenance_mode && (
            <div className="mt-4">
              <Textarea
                label="Message shown to users"
                rows={2}
                placeholder="We're performing scheduled maintenance and will be back shortly."
                value={form.maintenance_message || ''}
                onChange={(e) => set('maintenance_message', e.target.value)}
              />
            </div>
          )}
        </Card>

        {/* Operational limits */}
        <Card className="p-6">
          <h3 className="font-display text-base font-semibold text-ink">Operational Limits</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {NUMERIC.map(({ key, label, min, max }) => (
              <Input
                key={key}
                label={label}
                type="number"
                min={min}
                max={max}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            ))}
          </div>
        </Card>

        {/* Organisation */}
        <Card className="p-6">
          <h3 className="font-display text-base font-semibold text-ink">Organisation</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Organisation name"
              value={form.org_name || ''}
              onChange={(e) => set('org_name', e.target.value)}
            />
            <Input
              label="Contact email"
              type="email"
              value={form.org_email || ''}
              onChange={(e) => set('org_email', e.target.value)}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
