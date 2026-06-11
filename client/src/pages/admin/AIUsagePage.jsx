import { useEffect, useState } from 'react';
import { Sparkles, Activity, CheckCircle2, XCircle, Cpu } from 'lucide-react';
import { getAIUsage } from '../../api/ai';
import { updatePlatformSettings } from '../../api/admin';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { Table, THead, TH, TBody, TR, TD } from '../../components/ui/Table';

const FEATURE_LABEL = {
  profile_generation: 'Profile generation',
  report_generation: 'Report generation',
  assistant_chat: 'Supervisor assistant',
};

function StatCard({ icon: Icon, label, value, tone = 'brand' }) {
  const toneClass =
    tone === 'green' ? 'text-[#16a34a]' : tone === 'red' ? 'text-[#dc2626]' : 'text-brand-600';
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-subtle">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accentSoft">
          <Icon size={18} className={toneClass} />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-ink">{value}</p>
    </Card>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
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

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function AIUsagePage() {
  const { show } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState('');
  const [savingToggle, setSavingToggle] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = `${to}T23:59:59`;
      const res = await getAIUsage(params);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  async function toggleAI(next) {
    setSavingToggle(true);
    try {
      await updatePlatformSettings({ system_ai_enabled: next });
      setData((d) => ({ ...d, ai_enabled: next }));
      show(next ? 'AI features enabled' : 'AI features disabled');
    } catch (err) {
      show(err.response?.data?.error || 'Failed to update', 'error');
    } finally {
      setSavingToggle(false);
    }
  }

  const maxDay = data ? Math.max(1, ...data.by_day.map((d) => d.calls)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
          <Sparkles size={22} className="text-brand-600" /> AI Usage Statistics
        </h2>
        <p className="mt-1 text-sm text-subtle">Monitor AI feature usage across the system.</p>
      </div>

      {/* AI enabled toggle */}
      <Card className="flex items-center justify-between p-5">
        <div>
          <h3 className="font-display text-base font-semibold text-ink">AI Features</h3>
          <p className="mt-1 text-sm text-subtle">
            {data?.configured === false
              ? 'No NVIDIA NIM key configured on the server — AI features are unavailable.'
              : 'Enable or disable all AI-powered features across the system.'}
          </p>
        </div>
        <Toggle
          checked={!!data?.ai_enabled}
          disabled={savingToggle || data?.configured === false}
          onChange={toggleAI}
        />
      </Card>

      {/* Date range */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div style={{ minWidth: 160 }}>
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div style={{ minWidth: 160 }}>
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </Card>

      {loading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Activity} label="Total AI Calls" value={data.total_calls} />
            <StatCard icon={CheckCircle2} label="Successful" value={data.successful_calls} tone="green" />
            <StatCard icon={XCircle} label="Failed" value={data.failed_calls} tone="red" />
            <StatCard icon={Cpu} label="Tokens Used" value={data.total_tokens || 0} />
          </div>

          {/* Calls per day — lightweight CSS bar chart */}
          <Card className="p-5">
            <h3 className="font-display text-base font-semibold text-ink">Calls per day</h3>
            {data.by_day.length === 0 ? (
              <p className="mt-4 text-sm text-subtle">No activity in this period.</p>
            ) : (
              <div className="mt-5 flex h-44 items-end gap-2 overflow-x-auto">
                {data.by_day.map((d) => (
                  <div key={d.date} className="flex min-w-[28px] flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-subtle">{d.calls}</span>
                    <div
                      className="w-full rounded-t bg-brand-600"
                      style={{ height: `${Math.round((d.calls / maxDay) * 140) + 4}px` }}
                      title={`${d.date}: ${d.calls} calls`}
                    />
                    <span className="text-[10px] text-subtle">{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* By feature */}
          {data.by_feature.length === 0 ? (
            <EmptyState icon={Activity} title="No AI usage yet" description="Usage will appear here once AI features are used." />
          ) : (
            <Table>
              <THead>
                <TH>Feature</TH>
                <TH>Total Calls</TH>
                <TH>Success Rate</TH>
                <TH>Avg Duration</TH>
                <TH>Tokens</TH>
              </THead>
              <TBody>
                {data.by_feature.map((f, i) => (
                  <TR key={f.feature} index={i}>
                    <TD className="font-medium">{FEATURE_LABEL[f.feature] || f.feature}</TD>
                    <TD>{f.calls}</TD>
                    <TD>{f.calls ? Math.round((f.successful / f.calls) * 100) : 0}%</TD>
                    <TD>{f.avg_duration_ms ? `${(f.avg_duration_ms / 1000).toFixed(1)}s` : '—'}</TD>
                    <TD>{f.tokens || '—'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
