import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, GraduationCap, Mail, Phone, Building2, CalendarDays, UserCheck,
  ListTodo, MessageSquarePlus, Brain, FileText, Loader2, Send,
} from 'lucide-react';
import { getAttacheeSummary, getAttacheeNotes, addAttacheeNote } from '../../api/attachees';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { formatEAT, formatDateEAT } from '../../lib/datetime';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

function Stat({ label, value }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-ink">{value}</p>
    </Card>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="mt-0.5 text-brand-600" />
      <div>
        <p className="text-xs text-subtle">{label}</p>
        <p className="text-sm text-ink">{value || '—'}</p>
      </div>
    </div>
  );
}

const TABS = ['Overview', 'Notes & Feedback', 'AI & Reports'];

export default function AttacheeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();
  const isSupervisor = user.role === 'supervisor';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');

  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    let active = true;
    getAttacheeSummary(id)
      .then((res) => active && setData(res.data))
      .catch(() => active && show('Failed to load attachee', 'error'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (tab === 'Notes & Feedback') {
      getAttacheeNotes(id).then((r) => setNotes(r.data.notes)).catch(() => {});
    }
  }, [tab, id]);

  async function submitNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const res = await addAttacheeNote(id, noteText.trim());
      setNotes((prev) => [res.data.note, ...prev]);
      setNoteText('');
    } catch (err) {
      show(err.response?.data?.error || 'Failed to add note', 'error');
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) return <Spinner />;
  if (!data) return <EmptyState icon={GraduationCap} title="Attachee not found" description="It may have been removed." />;

  const a = data.attachee;
  const { stats, timeline, recentTasks } = data;

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/attachees')} className="inline-flex items-center gap-1 text-sm text-subtle hover:text-ink">
        <ArrowLeft size={15} /> Back to attachees
      </button>

      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">
          {a.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">{a.name}</h2>
          <p className="text-sm text-subtle">
            {a.course_of_study || 'Attachee'}{a.university_name ? ` · ${a.university_name}` : ''}
          </p>
        </div>
        <span className="ml-auto"><Badge status={a.is_active ? 'active' : 'inactive'} /></span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line">
        {TABS.filter((t) => t !== 'AI & Reports' || isSupervisor).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-subtle hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Tasks Assigned" value={stats.total} />
            <Stat label="Submitted" value={stats.submitted} />
            <Stat label="Reviewed" value={stats.reviewed} />
            <Stat label="Completion Rate" value={`${stats.completion_rate}%`} />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card className="p-5 space-y-4">
              <h3 className="font-display text-base font-semibold text-ink">Profile</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Detail icon={Mail} label="Email" value={a.email} />
                <Detail icon={Phone} label="Phone" value={a.phone} />
                <Detail icon={Building2} label="University" value={a.university_name} />
                <Detail icon={GraduationCap} label="Course" value={a.course_of_study} />
                <Detail icon={UserCheck} label="Supervisor" value={a.supervisor_name} />
                <Detail icon={UserCheck} label="Instructor" value={a.instructor_name} />
                <Detail icon={CalendarDays} label="Start" value={a.attachment_start_date ? formatDateEAT(a.attachment_start_date) : null} />
                <Detail icon={CalendarDays} label="End" value={a.attachment_end_date ? formatDateEAT(a.attachment_end_date) : null} />
              </div>
              {timeline.progressPercent != null && (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-subtle">
                    <span>{timeline.daysElapsed} days completed</span>
                    <span>{timeline.daysRemaining} days remaining</span>
                  </div>
                  <div className="h-2 rounded-full bg-hover overflow-hidden">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${timeline.progressPercent}%` }} />
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
                <ListTodo size={16} className="text-brand-600" /> Recent Tasks
              </h3>
              {recentTasks.length === 0 ? (
                <p className="mt-3 text-sm text-subtle">No tasks assigned yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {recentTasks.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{t.title}</p>
                        <p className="text-xs text-subtle">
                          {t.due_date ? `Due ${formatDateEAT(t.due_date)} · ` : ''}by {t.assigned_by_name}
                        </p>
                      </div>
                      <Badge status={t.status} />
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/tasks" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
                Go to Tasks →
              </Link>
            </Card>
          </div>
        </div>
      )}

      {tab === 'Notes & Feedback' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
              <MessageSquarePlus size={16} className="text-brand-600" /> Add a note
            </h3>
            <form onSubmit={submitNote} className="mt-3 space-y-3">
              <Textarea
                rows={3}
                placeholder="A general observation about this attachee (not tied to a task)…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <Button type="submit" disabled={savingNote || !noteText.trim()}>
                {savingNote ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Add Note
              </Button>
            </form>
          </Card>

          {notes.length === 0 ? (
            <EmptyState icon={MessageSquarePlus} title="No notes yet" description="Notes and task feedback about this attachee appear here." />
          ) : (
            <div className="space-y-2.5">
              {notes.map((n) => (
                <Card key={n.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">
                      {n.author_name} <span className="text-xs font-normal text-subtle">({n.author_role})</span>
                    </p>
                    <span className="text-xs text-subtle">{formatEAT(n.created_at)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink">{n.body}</p>
                  <p className="mt-1 text-xs text-subtle">
                    {n.is_general_note ? 'General note' : n.task_title ? `On task: ${n.task_title}` : 'Task comment'}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'AI & Reports' && isSupervisor && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link to={`/ai/attachees/${id}/profile`}>
            <Card className="h-full p-5 transition-colors hover:bg-hover">
              <Brain size={20} className="text-brand-600" />
              <h3 className="mt-3 font-display text-base font-semibold text-ink">AI Intelligence Profile</h3>
              <p className="mt-1 text-sm text-subtle">
                Strengths, growth areas, competency radar, and career paths.
                {data.ai_profile_exists ? ' (generated)' : ''}
              </p>
            </Card>
          </Link>
          <Link to={`/ai/reports/new?attacheeId=${id}&type=progress`}>
            <Card className="h-full p-5 transition-colors hover:bg-hover">
              <FileText size={20} className="text-brand-600" />
              <h3 className="mt-3 font-display text-base font-semibold text-ink">Progress Report</h3>
              <p className="mt-1 text-sm text-subtle">AI-drafted mid-attachment progress report.</p>
            </Card>
          </Link>
          <Link to={`/ai/reports/new?attacheeId=${id}&type=completion`}>
            <Card className="h-full p-5 transition-colors hover:bg-hover">
              <FileText size={20} className="text-brand-600" />
              <h3 className="mt-3 font-display text-base font-semibold text-ink">Completion Letter</h3>
              <p className="mt-1 text-sm text-subtle">AI-drafted attachment completion letter.</p>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
