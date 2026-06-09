import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, UserPlus, Eye, Brain, Pencil, UserX, Search } from 'lucide-react';
import {
  getAttachees, getDeptStaff, createAttachee, updateAttachee, deactivateAttachee,
} from '../../api/attachees';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { formatDateEAT } from '../../lib/datetime';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { Table, THead, TH, TBody, TR, TD } from '../../components/ui/Table';

const EMPTY_FORM = {
  name: '', email: '', phone: '', university_name: '', course_of_study: '',
  student_id_number: '', attachment_start_date: '', attachment_end_date: '',
  supervisor_id: '', instructor_id: '',
};

function daysRemaining(end) {
  if (!end) return null;
  return Math.max(0, Math.round((new Date(end) - new Date()) / 86400000));
}

function period(start, end) {
  if (!start || !end) return '—';
  const f = (d) => new Date(d).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' });
  return `${f(start)} – ${f(end)}`;
}

export default function AttacheesPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const isSupervisor = user.role === 'supervisor';

  const [attachees, setAttachees] = useState([]);
  const [staff, setStaff] = useState({ supervisors: [], instructors: [] });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await getAttachees();
      setAttachees(res.data.attachees);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    getDeptStaff().then((r) => setStaff(r.data)).catch(() => {});
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attachees.filter((a) => {
      if (statusFilter === 'active' && !a.is_active) return false;
      if (statusFilter === 'inactive' && a.is_active) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.university_name || '').toLowerCase().includes(q) ||
        (a.course_of_study || '').toLowerCase().includes(q)
      );
    });
  }, [attachees, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEdit(a) {
    setEditing(a);
    setForm({
      name: a.name || '', email: a.email || '', phone: a.phone || '',
      university_name: a.university_name || '', course_of_study: a.course_of_study || '',
      student_id_number: a.student_id_number || '',
      attachment_start_date: a.attachment_start_date ? a.attachment_start_date.slice(0, 10) : '',
      attachment_end_date: a.attachment_end_date ? a.attachment_end_date.slice(0, 10) : '',
      supervisor_id: a.supervisor_id || '', instructor_id: a.instructor_id || '',
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      ['supervisor_id', 'instructor_id'].forEach((k) => {
        payload[k] = payload[k] ? parseInt(payload[k], 10) : null;
      });
      if (editing) {
        await updateAttachee(editing.id, payload);
        show('Attachee updated');
      } else {
        const res = await createAttachee(payload);
        show(`Attachee added. Login details sent to ${res.data.email_sent_to}.`);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save attachee');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!confirmTarget) return;
    try {
      await deactivateAttachee(confirmTarget.id);
      show('Attachee deactivated');
      setConfirmTarget(null);
      await load();
    } catch (err) {
      show(err.response?.data?.error || 'Failed to deactivate', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <GraduationCap size={22} className="text-brand-600" /> Attachees
          </h2>
          <p className="mt-1 text-sm text-subtle">University students on industrial attachment.</p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus size={16} /> Add Attachee
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1" style={{ minWidth: 220 }}>
          <Search size={15} className="pointer-events-none absolute left-3 top-9 -translate-y-1/2 text-subtle" />
          <Input
            label="Search"
            placeholder="Name, university or course…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div style={{ minWidth: 160 }}>
          <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No attachees"
          description="Add an attachee to create their account and attachment record."
          action={{ label: 'Add Attachee', onClick: openCreate }}
        />
      ) : (
        <Table>
          <THead>
            <TH>Name</TH>
            <TH>University</TH>
            <TH>Course</TH>
            <TH>Period</TH>
            <TH>Days Left</TH>
            <TH>Instructor</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </THead>
          <TBody>
            {visible.map((a, i) => {
              const dl = daysRemaining(a.attachment_end_date);
              const dlColor = dl == null ? 'text-subtle' : dl > 30 ? 'text-[#16a34a]' : dl >= 10 ? 'text-[#d97706]' : 'text-[#dc2626]';
              return (
                <TR key={a.id} index={i}>
                  <TD className="font-medium">{a.name}</TD>
                  <TD className="text-subtle">{a.university_name || '—'}</TD>
                  <TD className="text-subtle">{a.course_of_study || '—'}</TD>
                  <TD>{period(a.attachment_start_date, a.attachment_end_date)}</TD>
                  <TD className={`font-medium ${dlColor}`}>{dl == null ? '—' : `${dl}d`}</TD>
                  <TD className="text-subtle">{a.instructor_name || '—'}</TD>
                  <TD><Badge status={a.is_active ? 'active' : 'inactive'} /></TD>
                  <TD className="text-right">
                    <div className="inline-flex items-center justify-end gap-3">
                      <button onClick={() => navigate(`/attachees/${a.id}`)} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline" title="View">
                        <Eye size={14} />
                      </button>
                      {isSupervisor && (
                        <button onClick={() => navigate(`/ai/attachees/${a.id}/profile`)} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline" title="AI Profile">
                          <Brain size={14} />
                        </button>
                      )}
                      <button onClick={() => openEdit(a)} className="inline-flex items-center gap-1 text-sm text-subtle hover:text-ink" title="Edit">
                        <Pencil size={14} />
                      </button>
                      {isSupervisor && a.is_active && (
                        <button onClick={() => setConfirmTarget(a)} className="inline-flex items-center gap-1 text-sm text-[#dc2626] hover:underline" title="Deactivate">
                          <UserX size={14} />
                        </button>
                      )}
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      {/* Add / edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Attachee' : 'Add Attachee'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Attachee'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-3" noValidate>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[#dc2626]">{error}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" type="email" value={form.email} disabled={!!editing}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" placeholder="0712345678" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Student ID" value={form.student_id_number} onChange={(e) => setForm({ ...form, student_id_number: e.target.value })} />
            <Input label="University" value={form.university_name} onChange={(e) => setForm({ ...form, university_name: e.target.value })} />
            <Input label="Course of Study" value={form.course_of_study} onChange={(e) => setForm({ ...form, course_of_study: e.target.value })} />
            <Input label="Start Date" type="date" value={form.attachment_start_date} onChange={(e) => setForm({ ...form, attachment_start_date: e.target.value })} />
            <Input label="End Date" type="date" value={form.attachment_end_date} onChange={(e) => setForm({ ...form, attachment_end_date: e.target.value })} />
            <Select label="Supervisor" value={form.supervisor_id} onChange={(e) => setForm({ ...form, supervisor_id: e.target.value })}>
              <option value="">— None —</option>
              {staff.supervisors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Select label="Instructor" value={form.instructor_id} onChange={(e) => setForm({ ...form, instructor_id: e.target.value })}>
              <option value="">— None —</option>
              {staff.instructors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          {!editing && (
            <p className="text-xs text-subtle">
              A login account is created and a temporary password is emailed to the attachee.
            </p>
          )}
        </form>
      </Modal>

      {/* Deactivate confirm */}
      <Modal
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title="Deactivate Attachee"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeactivate}>Deactivate</Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Deactivate <span className="font-medium">{confirmTarget?.name}</span>? They will no longer be
          able to sign in.
        </p>
      </Modal>
    </div>
  );
}
