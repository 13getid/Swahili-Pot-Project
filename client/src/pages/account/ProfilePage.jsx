import { useState } from 'react';
import { Mail, Building2, Shield, CalendarDays } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../api/auth';
import { useToast } from '../../components/ui/Toast';
import { formatEAT } from '../../lib/datetime';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const ROLE_LABEL = { admin: 'System Administrator', supervisor: 'Supervisor', instructor: 'Instructor' };

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-accentSoft">
        <Icon size={16} className="text-brand-600" />
      </div>
      <div>
        <p className="text-xs text-subtle">{label}</p>
        <p className="text-sm font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { show } = useToast();

  const [name, setName] = useState(user.name);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Name is required');
    setSaving(true);
    try {
      const res = await updateProfile({ name: name.trim() });
      updateUser({ name: res.data.user.name });
      show('Profile updated');
    } catch (err) {
      show(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h2 className="font-display text-xl font-bold text-ink">{user.name}</h2>
            <p className="text-sm text-subtle">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Detail icon={Mail} label="Email" value={user.email} />
          <Detail icon={Shield} label="Role" value={ROLE_LABEL[user.role]} />
          <Detail
            icon={Building2}
            label="Department"
            value={user.department_name || 'All departments'}
          />
          <Detail icon={CalendarDays} label="Member since" value={formatEAT(user.created_at, 'd MMM yyyy')} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-display text-base font-semibold text-ink">Edit Profile</h3>
        <form onSubmit={handleSave} className="mt-4 space-y-4" noValidate>
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={error}
          />
          <Input label="Email" value={user.email} disabled />
          <div>
            <Button type="submit" disabled={saving || name.trim() === user.name}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
