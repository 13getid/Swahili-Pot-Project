import { useRef, useState } from 'react';
import { Mail, Building2, Shield, CalendarDays, Clock, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, uploadProfilePhoto } from '../../api/auth';
import { useToast } from '../../components/ui/Toast';
import { formatEAT } from '../../lib/datetime';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';

const ROLE_LABEL = {
  admin: 'System Administrator',
  supervisor: 'Supervisor',
  instructor: 'Instructor',
  attachee: 'Attachee',
};

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
const photoSrc = (path) => (path ? `${API_ORIGIN}${path}` : null);

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
  const fileRef = useRef(null);

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [bio, setBio] = useState(user.bio || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Cache-bust the avatar after a new upload.
  const [photoV, setPhotoV] = useState(0);

  const dirty =
    name.trim() !== user.name || (phone || '') !== (user.phone || '') || (bio || '') !== (user.bio || '');

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Name is required');
    setSaving(true);
    try {
      const res = await updateProfile({ name: name.trim(), phone: phone.trim(), bio: bio.trim() });
      updateUser({ name: res.data.user.name, phone: res.data.user.phone, bio: res.data.user.bio });
      show('Profile updated');
    } catch (err) {
      show(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return show('Image must be 5MB or smaller', 'error');
    setUploading(true);
    try {
      const res = await uploadProfilePhoto(file);
      updateUser({ profile_photo: res.data.photo });
      setPhotoV((v) => v + 1);
      show('Photo updated');
    } catch (err) {
      show(err.response?.data?.error || 'Failed to upload photo', 'error');
    } finally {
      setUploading(false);
    }
  }

  const avatar = user.profile_photo ? `${photoSrc(user.profile_photo)}?v=${photoV}` : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatar ? (
              <img
                src={avatar}
                alt={user.name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Change photo"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
            >
              <Camera size={13} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handlePhoto}
            />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-ink">{user.name}</h2>
            <p className="text-sm text-subtle">{ROLE_LABEL[user.role] || user.role}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Detail icon={Mail} label="Email" value={user.email} />
          <Detail icon={Shield} label="Role" value={ROLE_LABEL[user.role] || user.role} />
          <Detail
            icon={Building2}
            label="Department"
            value={user.department_name || 'All departments'}
          />
          <Detail
            icon={CalendarDays}
            label="Member since"
            value={formatEAT(user.created_at, 'd MMM yyyy')}
          />
          {user.last_login && (
            <Detail icon={Clock} label="Last sign-in" value={formatEAT(user.last_login)} />
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-display text-base font-semibold text-ink">Edit Profile</h3>
        <form onSubmit={handleSave} className="mt-4 space-y-4" noValidate>
          <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} error={error} />
          <Input label="Email" value={user.email} disabled />
          <Input
            label="Phone"
            placeholder="+254 712 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Textarea
            label="Bio"
            rows={3}
            maxLength={500}
            placeholder="A short description about yourself (optional)."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <div>
            <Button type="submit" disabled={saving || !dirty}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
