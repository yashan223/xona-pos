import { useState, useEffect } from 'react';
import {
  Users,
  Trash2,
  RefreshCw,
  UserCheck,
  UserX,
  Info,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import type { User } from '@/lib/api';
import { useTranslation } from '@/lib/translations';

export default function AdminPage() {
  const { t } = useTranslation();
  
  // States
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Current logged in user info (to prevent self-delete/demote)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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
      showFeedback('error', 'Failed to retrieve cashier accounts');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // User Actions
  const handleToggleRole = async (userId: string, currentRole?: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.username === 'admin') {
      showFeedback('error', 'The default admin role cannot be modified.');
      return;
    }
    if (userId === currentUser?.id) {
      showFeedback('error', 'You cannot demote or modify your own role.');
      return;
    }

    const nextRole = currentRole === 'admin' ? 'cashier' : 'admin';
    try {
      await authApi.updateRole(userId, nextRole);
      showFeedback('success', `Successfully updated role for ${targetUser?.username} to ${nextRole}`);
      loadData();
    } catch (err) {
      showFeedback('error', 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.username === 'admin') {
      showFeedback('error', 'The default admin user cannot be deleted.');
      return;
    }
    if (userId === currentUser?.id) {
      showFeedback('error', 'You cannot delete your own logged-in user.');
      return;
    }

    if (!confirm(`Are you sure you want to delete user "${targetUser?.username}"?`)) {
      return;
    }

    try {
      await authApi.delete(userId);
      showFeedback('success', `User ${targetUser?.username} deleted successfully`);
      loadData();
    } catch (err) {
      showFeedback('error', 'Failed to delete user');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            {t('userPanel')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage system users, cashier accounts, and admin roles
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Refresh Cashiers"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Feedback message banner */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-lg flex items-center gap-2 border text-xs animate-fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          }`}
        >
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Loading indicator */}
      {loading && !feedbackMsg && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Accounts Management */}
      {!loading && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="p-4">Cashier</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Registered</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-4 font-medium flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase">
                        {u.username[0]}
                      </div>
                      <span>{u.username}</span>
                      {u.id === currentUser?.id && (
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">You</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">{u.email || 'N/A'}</td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleString('en-US', { dateStyle: 'medium' })}
                    </td>
                    <td className="p-4">
                      <span
                        className={`badge text-[10px] uppercase font-semibold ${
                          u.role === 'admin' ? 'badge-teal' : 'badge-amber'
                        }`}
                      >
                        {u.role || 'cashier'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-2">
                        {u.username !== 'admin' && u.id !== currentUser?.id && (
                          <>
                            <button
                              onClick={() => handleToggleRole(u.id, u.role)}
                              className="p-1.5 rounded bg-secondary hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                              title={u.role === 'admin' ? 'Demote to Cashier' : 'Promote to Admin'}
                            >
                              {u.role === 'admin' ? (
                                <UserX className="w-4 h-4" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 rounded bg-secondary hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
