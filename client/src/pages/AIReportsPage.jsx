import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, Download, Edit3, Loader2, CheckCircle, ArrowLeft, Lock } from 'lucide-react';
import { saveReport, reportStreamUrl, reportExportUrl } from '../api/ai';
import { streamAIRequest } from '../utils/streamAI';
import { useToast } from '../components/ui/Toast';

export default function AIReportsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { show } = useToast();
  const attacheeId = searchParams.get('attacheeId');
  const type = searchParams.get('type') || 'progress';

  const [generating, setGenerating] = useState(false);
  const [reportId, setReportId] = useState(null);
  const [status, setStatus] = useState('draft');
  const [narrative, setNarrative] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const started = useRef(false);

  const isCompletion = type === 'completion';

  const generate = () => {
    setGenerating(true);
    setNarrative('');
    setReportId(null);
    setStatus('draft');
    streamAIRequest({
      url: reportStreamUrl(attacheeId),
      body: { report_type: type },
      onChunk: (chunk) => setNarrative((prev) => prev + chunk),
      onDone: (data) => {
        setReportId(data.report_id);
        setGenerating(false);
      },
      onError: (msg) => {
        show(msg || 'Failed to generate report', 'error');
        setGenerating(false);
      },
    });
  };

  useEffect(() => {
    if (attacheeId && !started.current) {
      started.current = true;
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (finalize = false) => {
    if (!reportId) return;
    setSaving(true);
    try {
      const payload = { supervisor_edits: narrative };
      if (finalize) payload.status = 'finalized';
      const { data } = await saveReport(reportId, payload);
      setStatus(data.report.status);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (finalize) show('Report finalized');
    } catch (err) {
      show(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-hover transition-colors">
          <ArrowLeft className="w-4 h-4 text-subtle" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600" />
            <h1 className="text-xl font-semibold text-ink">
              {isCompletion ? 'Completion Letter' : 'Progress Report'}
            </h1>
          </div>
          <p className="text-sm text-subtle mt-0.5">
            AI-generated via NVIDIA NIM — review and edit before exporting
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-subtle uppercase tracking-wide">
              AI Narrative — edit as needed
            </h2>
            {generating && (
              <span className="flex items-center gap-1.5 text-xs text-subtle">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" /> Generating…
              </span>
            )}
            {status === 'finalized' && (
              <span className="flex items-center gap-1 text-xs text-[#16a34a]">
                <Lock className="w-3.5 h-3.5" /> Finalized
              </span>
            )}
          </div>
          <textarea
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            rows={16}
            readOnly={generating || status === 'finalized'}
            placeholder={generating ? 'Writing the report…' : ''}
            className="w-full text-sm text-ink bg-canvas border border-line rounded-lg p-4 focus:outline-none focus:border-brand-500 leading-relaxed resize-none read-only:opacity-90"
          />
          <p className="text-[11px] text-subtle">
            AI-assisted draft via NVIDIA NIM · review and approve before sharing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => save(false)}
            disabled={saving || generating || !reportId || status === 'finalized'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" />
              : saved ? <CheckCircle className="w-4 h-4" />
              : <Edit3 className="w-4 h-4" />}
            {saved ? 'Saved' : 'Save Edits'}
          </button>

          {status !== 'finalized' && (
            <button
              onClick={() => save(true)}
              disabled={saving || generating || !reportId}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-line hover:bg-hover text-sm font-medium transition-colors text-ink disabled:opacity-50"
            >
              <Lock className="w-4 h-4" /> Finalize
            </button>
          )}

          <button
            onClick={() => window.open(reportExportUrl(reportId), '_blank')}
            disabled={!reportId || generating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-line hover:bg-hover text-sm font-medium transition-colors text-ink disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>

          {!generating && (
            <button
              onClick={generate}
              disabled={saving}
              className="text-sm text-subtle hover:text-ink transition-colors disabled:opacity-50"
            >
              Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
