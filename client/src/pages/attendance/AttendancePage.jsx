import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Copy, Download, Check, ClipboardCheck } from 'lucide-react';
import { createSession, getSessions } from '../../api/attendance';
import { useToast } from '../../components/ui/Toast';
import { formatEAT } from '../../lib/datetime';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

function attendUrl(token) {
  return `${window.location.origin}/attend/${token}`;
}

function useCountdown(expiresAt) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `Expires in ${hours}h ${minutes}m`;
}

export default function AttendancePage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const qrRef = useRef(null);

  const [label, setLabel] = useState('');
  const [generating, setGenerating] = useState(false);
  const [active, setActive] = useState(null); // newly generated session
  const [copied, setCopied] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const countdown = useCountdown(active?.expires_at);

  async function load() {
    setLoading(true);
    try {
      const res = await getSessions();
      setSessions(res.data.sessions);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await createSession({ session_label: label.trim() });
      setActive(res.data.session);
      setLabel('');
      show('Attendance session created');
      await load();
    } catch (err) {
      show(err.response?.data?.error || 'Failed to create session', 'error');
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    if (!active) return;
    navigator.clipboard.writeText(attendUrl(active.token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `attendance-qr-${active.token.slice(0, 8)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Generate */}
      <div className="space-y-5">
        <Card className="p-5">
          <h3 className="font-display text-base font-semibold text-ink">
            Generate New Session
          </h3>
          <div className="mt-4 space-y-4">
            <Input
              label="Session Label (optional)"
              placeholder="e.g. Morning Session — June 3"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              <QrCode size={16} />
              {generating ? 'Generating…' : 'Generate QR Code'}
            </Button>
          </div>
        </Card>

        {active && (
          <Card className="p-5">
            <div className="flex flex-col items-center text-center" ref={qrRef}>
              <QRCodeCanvas value={attendUrl(active.token)} size={220} includeMargin level="M" />
              <p className="mt-3 text-sm font-medium text-brand-600">{countdown}</p>

              <div className="mt-3 flex w-full items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
                <span className="flex-1 truncate text-left text-xs text-subtle">
                  {attendUrl(active.token)}
                </span>
                <button onClick={handleCopy} className="text-brand-600 hover:text-brand-700">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <Button variant="secondary" className="mt-4 w-full" onClick={handleDownload}>
                <Download size={16} /> Download QR
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Sessions list */}
      <div className="space-y-3">
        <h3 className="font-display text-base font-semibold text-ink">Sessions</h3>
        {loading ? (
          <Spinner />
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No sessions yet"
            description="Generate a QR code to start collecting attendance."
          />
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {s.session_label || 'Unnamed Session'}
                    </p>
                    <p className="mt-0.5 text-xs text-subtle">{formatEAT(s.created_at)}</p>
                    <p className="mt-1 text-xs text-subtle">
                      {s.record_count} {s.record_count === 1 ? 'response' : 'responses'}
                    </p>
                  </div>
                  <Badge status={s.is_expired ? 'expired' : 'active'} />
                </div>
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => navigate(`/attendance/${s.id}`)}
                  >
                    View Responses
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
