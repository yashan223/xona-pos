import { useState, useEffect } from 'react';
import { Database, DatabaseZap, RefreshCw, Trash2, Info } from 'lucide-react';
import { reportApi } from '@/lib/api';
import type { SystemStats } from '@/lib/api';
import { useTranslation } from '@/lib/translations';

export default function MaintenancePage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const statsData = await reportApi.stats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load maintenance stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

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
      showFeedback('error', err?.message || 'Failed to reset database');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `Rs. ${Number(val).toFixed(2)}`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          {t('databaseMaintenance')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Perform administrative database actions, reset mock datasets, and view system logs
        </p>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Statistics Card */}
        <div className="glass-card p-5 space-y-4 bg-card/30 border border-border/40 rounded-2xl">
          <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2">
            <Database className="w-4 h-4 text-primary" />
            Database Statistics
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
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

        {/* Administrative Actions */}
        <div className="glass-card p-5 space-y-4 bg-card/30 border border-border/40 rounded-2xl">
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
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/95 transition-all shadow-lg hover:shadow-primary/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
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
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/25 font-medium text-xs hover:bg-destructive/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Wipe Database Logs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
