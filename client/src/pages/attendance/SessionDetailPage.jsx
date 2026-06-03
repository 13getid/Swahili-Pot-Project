import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { getSessionRecords, confirmRecord } from '../../api/attendance';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { formatEAT, formatTimeEAT } from '../../lib/datetime';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { Table, THead, TH, TBody, TR, TD } from '../../components/ui/Table';

export default function SessionDetailPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();

  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await getSessionRecords(sessionId);
      setSession(res.data.session);
      setRecords(res.data.records);
    } catch (err) {
      show(err.response?.data?.error || 'Failed to load session', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function handleConfirm(id) {
    setConfirmingId(id);
    try {
      const res = await confirmRecord(id);
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...res.data.record } : r)));
      show('Attendance confirmed');
    } catch (err) {
      show(err.response?.data?.error || 'Failed to confirm', 'error');
    } finally {
      setConfirmingId(null);
    }
  }

  if (loading) return <Spinner />;

  const confirmed = records.filter((r) => r.is_confirmed).length;
  const pending = records.length - confirmed;
  const isInstructor = user.role === 'instructor';

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-subtle hover:text-ink"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div>
        <h2 className="font-display text-xl font-bold text-ink">
          {session?.session_label || 'Unnamed Session'}
        </h2>
        <p className="mt-1 text-sm text-subtle">{formatEAT(session?.created_at)}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="font-display text-2xl font-bold text-ink">{records.length}</p>
          <p className="text-xs text-subtle">Total Entries</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="font-display text-2xl font-bold text-[#16a34a]">{confirmed}</p>
          <p className="text-xs text-subtle">Confirmed</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="font-display text-2xl font-bold text-[#d97706]">{pending}</p>
          <p className="text-xs text-subtle">Pending</p>
        </Card>
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No attendance yet"
          description="Records appear here as trainees check in via the QR code."
        />
      ) : (
        <Table>
          <THead>
            <TH>Trainee Name</TH>
            <TH>Phone</TH>
            <TH>Tasks Completed</TH>
            <TH>Check-in</TH>
            <TH>Check-out</TH>
            <TH>Confirmed</TH>
            {isInstructor && <TH className="text-right">Action</TH>}
          </THead>
          <TBody>
            {records.map((r, i) => (
              <TR key={r.id} index={i}>
                <TD className="font-medium">{r.trainee_name}</TD>
                <TD>{r.trainee_phone}</TD>
                <TD className="max-w-xs">
                  <span className="block whitespace-pre-wrap text-sm">{r.tasks_completed}</span>
                </TD>
                <TD>{formatTimeEAT(r.check_in)}</TD>
                <TD>{r.check_out ? formatTimeEAT(r.check_out) : '—'}</TD>
                <TD>
                  <Badge status={r.is_confirmed ? 'confirmed' : 'pending'} />
                </TD>
                {isInstructor && (
                  <TD className="text-right">
                    {!r.is_confirmed && (
                      <Button
                        variant="secondary"
                        className="px-3 py-1 text-xs"
                        onClick={() => handleConfirm(r.id)}
                        disabled={confirmingId === r.id}
                      >
                        {confirmingId === r.id ? 'Confirming…' : 'Confirm'}
                      </Button>
                    )}
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
