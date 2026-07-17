import { useState, useEffect } from 'react';
import {
  Users,
  Package,
  Settings,
  Trash2,
  RefreshCw,
  UserCheck,
  UserX,
  Database,
  DatabaseZap,
  Info,
} from 'lucide-react';
import { authApi, productApi, reportApi } from '@/lib/api';
import type { User, ProductRecord, SystemStats } from '@/lib/api';
import { useTranslation } from '@/lib/translations';

export default function AdminPage() {
  const { t, lang, setLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState<'users' | 'records' | 'maintenance' | 'settings'>('users');
  
  // States
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);

  // VAT & Tax Settings
  const [vatEnabled, setVatEnabled] = useState(() => {
    const saved = localStorage.getItem('vatEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [vatPercentage, setVatPercentage] = useState(() => {
    const saved = localStorage.getItem('vatPercentage');
    return saved !== null ? parseFloat(saved) : 8;
  });
  
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Current logged in user info (to prevent self-delete/demote)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Load logged in user
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      setCurrentUser(JSON.parse(saved));
    }
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'settings') {
        return;
      }
      if (activeTab === 'users') {
        const usersData = await authApi.getUsers();
        setUsers(usersData);
      } else if (activeTab === 'records') {
        const productsData = await productApi.getAll();
        setProducts(productsData);
      } else if (activeTab === 'maintenance') {
        const statsData = await reportApi.stats();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      showFeedback('error', 'Failed to retrieve administrative records');
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

  // Record Actions
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? All catalog mappings and graph relations will be cleared.')) {
      return;
    }

    try {
      await productApi.delete(productId);
      showFeedback('success', 'Product catalog record successfully deleted');
      loadData();
    } catch (err) {
      showFeedback('error', 'Failed to delete product');
    }
  };

  // Maintenance Actions
  const handleWipeDatabase = async () => {
    if (!confirm('WARNING: This will permanently wipe all products, transaction receipts, CRM logs, and user accounts (except the primary admin). Proceed?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await reportApi.clearDatabase();
      showFeedback('success', res.message || 'Database wiped successfully');
      loadData();
    } catch (err) {
      showFeedback('error', 'Failed to wipe database');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('This will wipe all existing data and restore the default mock Xona POS catalog data. Proceed?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await reportApi.resetDatabase();
      showFeedback('success', res.message || 'Database reset and seeded successfully');
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to reset database');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (val: number) => {
    return `Rs. ${Number(val).toFixed(2)}`;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            User Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            System configuration, cashier privileges, and database controls
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Refresh Current View"
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

      {/* Admin Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          Cashier Accounts ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'records'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="w-4 h-4" />
          Catalog Manager ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'maintenance'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Database className="w-4 h-4" />
          Database Maintenance
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'settings'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="w-4 h-4" />
          System Settings
        </button>
      </div>

      {/* Loading indicator */}
      {loading && !feedbackMsg && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Tab Panels */}
      {!loading && (
        <div className="space-y-4">
          {/* USER MANAGEMENT TAB */}
          {activeTab === 'users' && (
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

          {/* CATALOG MANAGER TAB */}
          {activeTab === 'records' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Search catalog products by name, SKU or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground"
              />

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredProducts.length === 0 ? (
                  <div className="glass-card p-8 text-center text-muted-foreground">
                    <p className="text-sm">No products found matching your search</p>
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <div key={p.id} className="glass-card p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="badge badge-teal">{p.category}</span>
                          <span className="badge badge-amber font-mono">{p.sku}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-foreground truncate">{p.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Price: <span className="font-semibold text-primary">{formatCurrency(p.price)}</span> · Stock: <span className="font-semibold text-foreground">{p.stock} units</span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-2 rounded-lg bg-secondary hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer flex-shrink-0"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* DATABASE MAINTENANCE TAB */}
          {activeTab === 'maintenance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stats Overview */}
              <div className="glass-card p-5 space-y-4">
                <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2">
                  <Database className="w-4 h-4 text-teal" />
                  Database Statistics
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Products</p>
                    <p className="text-xl font-bold text-foreground mt-1">{stats?.products.total ?? 0}</p>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Transactions</p>
                    <p className="text-xl font-bold text-foreground mt-1">{stats?.transactions.total ?? 0}</p>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold text-foreground mt-1 text-primary">{formatCurrency(stats?.transactions.totalRevenue ?? 0)}</p>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Graph Nodes</p>
                    <p className="text-xl font-bold text-foreground mt-1">{stats?.graph.nodeCount ?? 0}</p>
                  </div>
                </div>
              </div>

              {/* Maintenance Tools */}
              <div className="glass-card p-5 space-y-4">
                <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2">
                  <DatabaseZap className="w-4 h-4 text-primary" />
                  Administrative Controls
                </h3>
                <div className="space-y-4">
                  {/* Reset Database */}
                  <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Reset & Seed Mock Catalog</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Clears the database and seeds default mock items, categories, loyalty customers, and checkout histories.
                      </p>
                    </div>
                    <button
                      onClick={handleResetDatabase}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/95 transition-all shadow-lg hover:shadow-primary/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Restore Seed Data
                    </button>
                  </div>

                  {/* Wipe Database */}
                  <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-destructive">Wipe All Database Logs</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Permanently deletes all products, transactions, customers, and user accounts. The default admin profile is preserved.
                      </p>
                    </div>
                    <button
                      onClick={handleWipeDatabase}
                      className="px-4 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/25 font-medium text-xs hover:bg-destructive/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Wipe Database Logs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-xl animate-fade-in">
              <div className="glass-card p-5 space-y-4 bg-card/30 border border-border/40 rounded-2xl">
                <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2">
                  <Settings className="w-4 h-4 text-primary" />
                  Tax & VAT Settings
                </h3>
                
                <div className="space-y-4">
                  {/* VAT Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/50">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground text-left">Enable VAT Calculation</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 text-left">
                        Toggle to enable or disable VAT tax additions on checkouts.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={vatEnabled}
                        onChange={(e) => {
                          const val = e.target.checked;
                          localStorage.setItem('vatEnabled', String(val));
                          setVatEnabled(val);
                          showFeedback('success', `VAT calculations ${val ? 'enabled' : 'disabled'} successfully.`);
                          // Trigger window event so other loaded pages pick it up
                          window.dispatchEvent(new CustomEvent('products_updated'));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-secondary/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* VAT Percentage */}
                  <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-left">VAT Percentage</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 text-left">
                        Specify the VAT tax rate applied to items during checkout.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 max-w-[150px]">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={vatPercentage}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          localStorage.setItem('vatPercentage', String(val));
                          setVatPercentage(val);
                          // Trigger window event so checkout register reloads
                          window.dispatchEvent(new CustomEvent('products_updated'));
                        }}
                        disabled={!vatEnabled}
                        className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary disabled:opacity-40 transition-all text-foreground"
                      />
                      <span className="text-sm font-bold text-foreground">%</span>
                    </div>
                  </div>

                  {/* Language Settings */}
                  <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-left">{t('appLanguage')}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 text-left">
                        {t('appLanguageDesc')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {(['en', 'si'] as const).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setLanguage(l)}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase transition-all cursor-pointer border ${
                            lang === l
                              ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                              : 'bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {l === 'en' ? 'English' : 'සිංහල (Sinhala)'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
