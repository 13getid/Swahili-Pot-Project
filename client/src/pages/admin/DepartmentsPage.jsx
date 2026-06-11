import { useEffect, useState } from 'react';
import { Building2, Plus, Pencil, Trash2, Users } from 'lucide-react';
import {
  getAdminDepartments,
  createAdminDepartment,
  updateAdminDepartment,
  deleteAdminDepartment,
} from '../../api/admin';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { Table, THead, TH, TBody, TR, TD } from '../../components/ui/Table';

const EMPTY = { name: '', has_trainees: false, has_radio_report: false };

export default function DepartmentsPage() {
  const { show } = useToast();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // department being edited, or null for create
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmTarget, setConfirmTarget] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await getAdminDepartments();
      setDepartments(res.data.departments);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setModalOpen(true);
  }

  function openEdit(d) {
    setEditing(d);
    setForm({ name: d.name, has_trainees: d.has_trainees, has_radio_report: d.has_radio_report });
    setError('');
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Department name is required');
    setSaving(true);
    try {
      if (editing) {
        await updateAdminDepartment(editing.id, form);
        show('Department updated');
      } else {
        await createAdminDepartment(form);
        show('Department created');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmTarget) return;
    try {
      await deleteAdminDepartment(confirmTarget.id);
      show('Department deleted');
      setConfirmTarget(null);
      await load();
    } catch (err) {
      show(err.response?.data?.error || 'Failed to delete department', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <Building2 size={22} className="text-brand-600" /> Departments
          </h2>
          <p className="mt-1 text-sm text-subtle">Create and manage organisation departments.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Add Department
        </Button>
      </div>

      {loading ? (
        <Spinner />
      ) : departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments yet"
          description="Add your first department to get started."
          action={{ label: 'Add Department', onClick: openCreate }}
        />
      ) : (
        <Table>
          <THead>
            <TH>Name</TH>
            <TH>Members</TH>
            <TH>Capabilities</TH>
            <TH className="text-right">Actions</TH>
          </THead>
          <TBody>
            {departments.map((d, i) => (
              <TR key={d.id} index={i}>
                <TD className="font-medium">{d.name}</TD>
                <TD>
                  <span className="inline-flex items-center gap-1.5 text-subtle">
                    <Users size={14} /> {d.member_count}
                  </span>
                </TD>
                <TD>
                  <div className="flex flex-wrap gap-1.5">
                    {d.has_trainees && <Badge status="active">Trainees</Badge>}
                    {d.has_radio_report && <Badge status="active">Downtime</Badge>}
                    {!d.has_trainees && !d.has_radio_report && (
                      <span className="text-xs text-subtle">—</span>
                    )}
                  </div>
                </TD>
                <TD className="text-right">
                  <div className="inline-flex items-center justify-end gap-3">
                    <button
                      onClick={() => openEdit(d)}
                      className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      onClick={() => setConfirmTarget(d)}
                      className="inline-flex items-center gap-1 text-sm text-[#dc2626] hover:underline"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {/* Create / edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Department' : 'Add Department'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          <Input
            label="Department Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={error}
          />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.has_trainees}
              onChange={(e) => setForm({ ...form, has_trainees: e.target.checked })}
              className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-200"
            />
            Has trainees (QR attendance)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.has_radio_report}
              onChange={(e) => setForm({ ...form, has_radio_report: e.target.checked })}
              className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-200"
            />
            Files radio downtime reports
          </label>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title="Delete Department"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Delete <span className="font-medium">{confirmTarget?.name}</span>? This cannot be undone.
          {confirmTarget?.member_count > 0 && (
            <span className="mt-2 block text-[#dc2626]">
              This department has {confirmTarget.member_count} member(s) and cannot be deleted until
              they are reassigned.
            </span>
          )}
        </p>
      </Modal>
    </div>
  );
}
