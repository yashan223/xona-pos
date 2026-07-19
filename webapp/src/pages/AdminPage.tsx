import { useState, useEffect } from 'react';
import {
  Users,
  Trash2,
  RefreshCw,
  UserCheck,
  UserX,
  Plus,
  X,
  Edit3,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import type { User } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { useNotification } from '@/context/NotificationContext';

export default function AdminPage() {
  const { t } = useTranslation();
  const { confirm, toast } = useNotification();
  
  // States
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Current logged in user info (to prevent self-delete/demote)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Editor Modal / Unified State (matches ProductsPage pattern)
  const [isEditing, setIsEditing] = useState<'new' | User | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cashier');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Load logged in user
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      setCurrentUser(JSON.parse(saved));
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const usersData = await authApi.getUsers();
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      toast.error('Failed to retrieve cashier accounts');
    } finally {
      setLoading(false);
    }
  };

  // User Actions
  const handleToggleRole = async (userId: string, currentRole?: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.username === 'admin') {
      toast.error('The default admin role cannot be modified.');
      return;
    }
    if (userId === currentUser?.id) {
      toast.error('You cannot demote or modify your own role.');
      return;
    }
    if (currentUser?.role === 'owner') {
      toast.error('Owners do not have permission to change user roles.');
      return;
    }

    let nextRole = 'cashier';
    if (currentRole === 'cashier') {
      nextRole = 'owner';
    } else if (currentRole === 'owner') {
      nextRole = 'admin';
    } else {
      nextRole = 'cashier';
    }
    try {
      await authApi.updateRole(userId, nextRole);
      toast.success(`Successfully updated role for ${targetUser?.username} to ${nextRole}`);
      loadData();
    } catch (err) {
      toast.error('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.username === 'admin') {
      toast.error('The default admin user cannot be deleted.');
      return;
    }
    if (userId === currentUser?.id) {
      toast.error('You cannot delete your own logged-in user.');
      return;
    }
    if (currentUser?.role === 'owner' && targetUser?.role !== 'cashier') {
      toast.error('Owners can only delete cashier accounts.');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Delete User',
      message: `Are you sure you want to delete user "${targetUser?.username}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try {
      await authApi.delete(userId);
      toast.success(`User ${targetUser?.username} deleted successfully`);
      loadData();
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const startAddNew = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('cashier');
    setError('');
    setSuccess('');
    setIsEditing('new');
  };

  const startEdit = (u: User) => {
    if ((u.username === 'admin' || u.role === 'admin') && currentUser?.role !== 'admin') {
      toast.error('Only a system admin can modify admin accounts.');
      return;
    }
    if (currentUser?.role === 'owner' && u.role !== 'cashier' && u.id !== currentUser.id) {
      toast.error('Owners can only edit cashier accounts.');
      return;
    }
    setUsername(u.username);
    setEmail(u.email || '');
    setPassword('');
    setRole(u.role || 'cashier');
    setError('');
    setSuccess('');
    setIsEditing(u);
  };

  const cancelEdit = () => {
    setIsEditing(null);
  };

  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    if (isEditing === 'new' && !password.trim()) {
      setError('Password is required.');
      return;
    }

    setError('');
    setSuccess('');

    try {
      if (isEditing === 'new') {
        await authApi.register({
          username: username.trim(),
          email: email.trim(),
          password: password,
          role: role,
        });
        setSuccess('User created successfully!');
      } else {
        await authApi.update(isEditing.id, {
          username: username.trim(),
          email: email.trim(),
          password: password || undefined,
          role: role,
        });
        setSuccess('User updated successfully!');

        // If we edited ourselves, sync localStorage
        if (isEditing.id === currentUser?.id) {
          const updatedUser = { ...currentUser, username: username.trim(), email: email.trim(), role: role };
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
        }
      }

      setTimeout(() => {
        setIsEditing(null);
        loadData();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save user.');
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            {t('userPanel')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('manageUsersDesc')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={startAddNew}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors cursor-pointer text-sm shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('addUser')}</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={t('refreshCashiers')}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Accounts Management — Card Grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <div
              key={u.id}
              className="glass-card p-4 sm:p-5 border border-border/40 rounded-2xl bg-card/30 flex flex-col gap-4 hover:bg-card/60 transition-all hover:border-primary/20"
            >
              {/* Card Top: Avatar + Name + You badge */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-base uppercase flex-shrink-0">
                  {u.username[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-foreground text-sm truncate">{u.username}</span>
                    {u.id === currentUser?.id && (
                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold flex-shrink-0">{t('you')}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email || 'No email'}</p>
                </div>
                {/* Role Badge */}
                <span
                  className={`badge text-[10px] uppercase font-semibold flex-shrink-0 ${
                    u.role === 'admin' ? 'badge-teal' : (u.role === 'owner' ? 'badge-violet' : 'badge-amber')
                  }`}
                >
                  {t(u.role === 'admin' ? 'systemAdmin' : (u.role === 'owner' ? 'owner' : 'cashier'))}
                </span>
              </div>

              {/* Card Bottom: Registered date + Actions */}
              <div className="flex items-center justify-between border-t border-border/20 pt-3">
                <p className="text-[11px] text-muted-foreground">
                  {new Date(u.createdAt).toLocaleString('en-US', { dateStyle: 'medium' })}
                </p>
                <div className="flex gap-2">
                  {/* Edit button */}
                  {!((u.username === 'admin' || u.role === 'admin') && currentUser?.role !== 'admin') &&
                    !(currentUser?.role === 'owner' && u.role !== 'cashier' && u.id !== currentUser?.id) && (
                    <button
                      onClick={() => startEdit(u)}
                      className="p-1.5 rounded bg-secondary hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      title="Edit Credentials"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {/* Role toggle + Delete */}
                  {u.username !== 'admin' && u.id !== currentUser?.id && (
                    <>
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={() => handleToggleRole(u.id, u.role)}
                          className="p-1.5 rounded bg-secondary hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                          title="Cycle User Role"
                        >
                          {u.role === 'admin' ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {!(currentUser?.role === 'owner' && u.role !== 'cashier') && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded bg-secondary hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Editor Modal Overlay (matches ProductsPage overlay form pattern) */}
      {isEditing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto md:py-12 animate-fade-in text-left">
          <form onSubmit={saveUser} className="glass-card w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-6 animate-scale-in space-y-4 my-8">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-border/40">
              <h3 className="text-lg font-bold text-foreground">
                {isEditing === 'new' ? t('addNewUser') : t('editUserCreds')}
              </h3>
              <button type="button" onClick={cancelEdit} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Form status feedback */}
            {error && <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg font-medium">{error}</p>}
            {success && <p className="text-xs text-success bg-success/10 p-2.5 rounded-lg font-medium">{success}</p>}
            
            {/* Input fields */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground font-semibold mb-1 block">{t('usernameLabel')} *</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={isEditing !== 'new' && isEditing.username === 'admin'}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground disabled:opacity-50"
                  placeholder="Username"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold mb-1 block">{t('emailLabel')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold mb-1 block">
                  {isEditing === 'new' ? t('passwordLabel') + ' *' : t('passwordLabel')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground"
                  placeholder={isEditing === 'new' ? '••••••' : t('leaveBlankPw')}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold mb-1 block">{t('roleLabel')} *</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  disabled={(isEditing !== 'new' && (isEditing.username === 'admin' || isEditing.id === currentUser?.id)) || currentUser?.role === 'owner'}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground disabled:opacity-50"
                >
                  <option value="cashier">{t('cashier')}</option>
                  <option value="owner" disabled={currentUser?.role === 'owner'}>{t('owner')}</option>
                  <option value="admin" disabled={currentUser?.role === 'owner'}>{t('systemAdmin')}</option>
                </select>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex gap-3 justify-end pt-3 border-t border-border/20">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-lg text-sm transition-colors cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-lg text-sm transition-colors cursor-pointer"
              >
                {isEditing === 'new' ? t('createUserBtn') : t('saveChangesBtn')}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
