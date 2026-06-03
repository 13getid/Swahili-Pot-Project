import { useState } from 'react';
import { Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { changePassword } from '../../api/auth';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { show } = useToast();

  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  function validate() {
    const e = {};
    if (!form.current_password) e.current_password = 'Current password is required';
    if (!form.new_password) e.new_password = 'New password is required';
    else if (form.new_password.length < 8) e.new_password = 'Must be at least 8 characters';
    if (form.confirm !== form.new_password) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setForm({ current_password: '', new_password: '', confirm: '' });
      setErrors({});
      show('Password changed successfully');
    } catch (err) {
      show(err.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  }

  const pwField = (key, label) => (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <div className="relative">
        <input
          type={showPw ? 'text' : 'password'}
          value={form[key]}
          onChange={(ev) => setForm({ ...form, [key]: ev.target.value })}
          className={`w-full rounded-lg border bg-card px-3 py-2 pr-10 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-200 ${
            errors[key] ? 'border-[#dc2626]' : 'border-line focus:border-brand-500'
          }`}
        />
        <button
          type="button"
          onClick={() => setShowPw((s) => !s)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-subtle hover:text-ink"
          aria-label={showPw ? 'Hide passwords' : 'Show passwords'}
        >
          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {errors[key] && <p className="mt-1 text-xs text-[#dc2626]">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Appearance */}
      <Card className="p-6">
        <h3 className="font-display text-base font-semibold text-ink">Appearance</h3>
        <p className="mt-1 text-sm text-subtle">Choose how SwahiliPot IMS looks to you.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { key: 'light', label: 'Light', icon: Sun },
            { key: 'dark', label: 'Dark', icon: Moon },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                theme === key
                  ? 'border-brand-600 bg-accentSoft text-brand-600'
                  : 'border-line text-ink hover:bg-hover'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Change password */}
      <Card className="p-6">
        <h3 className="font-display text-base font-semibold text-ink">Change Password</h3>
        <form onSubmit={handleChangePassword} className="mt-4 space-y-4" noValidate>
          {pwField('current_password', 'Current Password')}
          {pwField('new_password', 'New Password')}
          {pwField('confirm', 'Confirm New Password')}
          <div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Update Password'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
