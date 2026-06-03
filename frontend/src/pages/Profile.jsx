// Profile page — update personal info, change password (logs out all sessions),
// and a "Danger zone" to delete the account (confirm + OTP).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, KeyRound, Trash2, Loader2, Save } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmOtpDialog from '../components/ConfirmOtpDialog';

export default function Profile() {
  const { user, setUser, clearSession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', email: user?.email || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingP, setSavingP] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingP(true);
    try {
      const { user: updated } = await api.put('/auth/me', profile);
      setUser(updated);
      toast.success('Profile updated.');
    } catch (err) { toast.error(err.message); }
    finally { setSavingP(false); }
  };

  // Change password. The server revokes all sessions on success, so we sign the
  // user out locally and send them back to the login page.
  const changePw = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return toast.error('New passwords do not match.');
    setSavingPw(true);
    try {
      await api.put('/auth/me/password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success('Password changed. Please sign in again.');
      clearSession();
      navigate('/login');
    } catch (err) { toast.error(err.message); }
    finally { setSavingPw(false); }
  };

  // Permanently delete the account. Triggered by ConfirmOtpDialog with the emailed
  // code; verified server-side, then the local session is cleared.
  const deleteAccount = async (otp) => {
    await api.del('/auth/me', { otp });
    toast.success('Account deleted.');
    clearSession();
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">My Profile</h1>
        <p className="text-slate-500">Manage your personal information and security.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <form onSubmit={saveProfile} className="card space-y-4">
          <div className="flex items-center gap-3"><UserCircle className="text-ember-500" /><h3 className="font-display font-semibold">Personal information</h3></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">First name</label><input className="input" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} /></div>
            <div><label className="label">Last name</label><input className="input" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} /></div>
          </div>
          <div><label className="label">Email</label><input className="input" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></div>
          <button className="btn btn-primary" disabled={savingP}>{savingP ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save changes</button>
        </form>

        {/* Password */}
        <form onSubmit={changePw} className="card space-y-4">
          <div className="flex items-center gap-3"><KeyRound className="text-ember-500" /><h3 className="font-display font-semibold">Change password</h3></div>
          <div><label className="label">Current password</label><input className="input" type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">New password</label><input className="input" type="password" required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
            <div><label className="label">Confirm</label><input className="input" type="password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
          </div>
          <button className="btn btn-primary" disabled={savingPw}>{savingPw ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Update password</button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="card border-flame-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-semibold text-flame-500">Danger zone</h3>
            <p className="text-sm text-slate-500">Permanently delete your account. This requires email OTP verification.</p>
          </div>
          <button className="btn btn-danger" onClick={() => setDelOpen(true)}><Trash2 size={16} /> Delete my account</button>
        </div>
      </div>

      <ConfirmOtpDialog
        open={delOpen}
        onClose={() => setDelOpen(false)}
        title="Delete account"
        message="Are you absolutely sure? Your account and all associated sessions will be permanently deleted. This cannot be undone."
        confirmLabel="Yes, delete my account"
        purpose="delete_account"
        onConfirm={deleteAccount}
      />
    </div>
  );
}
