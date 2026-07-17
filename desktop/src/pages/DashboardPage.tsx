import { useEffect, useState } from 'react';
import { Package, ShoppingCart, DollarSign, GitBranch, Clock, Settings, DatabaseZap, RefreshCw, Trash2, Info } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { reportApi } from '@/lib/api';
import type { SystemStats, ProductRecord, TransactionRecord } from '@/lib/api';
import { useTranslation } from '@/lib/translations';

// Module-level cache for Stale-While-Revalidate pattern to eliminate visual flickering
let cachedStats: SystemStats | null = null;
let cachedTopProducts: ProductRecord[] | null = null;
let cachedTimeline: TransactionRecord[] | null = null;

export default function DashboardPage() {
  const { t, lang, setLanguage } = useTranslation();
  const [stats, setStats] = useState<SystemStats | null>(cachedStats);
  const [topProducts, setTopProducts] = useState<ProductRecord[]>(cachedTopProducts || []);
  const [timeline, setTimeline] = useState<TransactionRecord[]>(cachedTimeline || []);
  const [loading, setLoading] = useState(!cachedStats);

  // States for VAT & Tax
  const [vatEnabled, setVatEnabled] = useState(() => {
    const saved = localStorage.getItem('vatEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [vatPercentage, setVatPercentage] = useState(() => {
    const saved = localStorage.getItem('vatPercentage');
    return saved !== null ? parseFloat(saved) : 15;
  });

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const currentUser = (() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('transactions_updated', handleUpdate);
    return () => {
      window.removeEventListener('transactions_updated', handleUpdate);
    };
  }, []);

  async function loadData() {
    if (!cachedStats) {
      setLoading(true);
    }
    try {
      const [statsData, productsData, timelineData] = await Promise.all([
        reportApi.stats(),
        reportApi.effectiveProducts(),
        reportApi.timeline(),
      ]);
      setStats(statsData);
      setTopProducts(productsData);
      setTimeline(timelineData);
      cachedStats = statsData;
      cachedTopProducts = productsData;
      cachedTimeline = timelineData;
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Database handlers
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return `Rs. ${Number(val).toFixed(2)}`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">POS Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of Xona Point of Sale operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Products"
          value={stats?.products.total ?? 0}
          icon={Package}
          color="violet"
          delay={0}
        />
        <StatsCard
          title="Total Sales"
          value={stats?.transactions.total ?? 0}
          icon={ShoppingCart}
          color="green"
          delay={100}
        />
        <StatsCard
          title="Gross Revenue"
          value={formatCurrency(stats?.transactions.totalRevenue ?? 0)}
          icon={DollarSign}
          color="teal"
          delay={200}
        />
        <StatsCard
          title="Association Nodes"
          value={stats?.graph.nodeCount ?? 0}
          icon={GitBranch}
          color="violet"
          delay={300}
          suffix={`(${stats?.graph.edgeCount ?? 0} relations)`}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products (Max Heap) */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-success" />
            Top Selling Products (Max-Heap Ranked)
          </h2>
          {topProducts.length > 0 ? (
            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3">
              {topProducts.slice(0, 5).map((prod, i) => (
                <div key={prod.id} className="glass-card p-4 flex items-center justify-between border border-border/40 rounded-xl bg-card/40 hover:bg-card/70 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                      #{i + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{prod.name}</h4>
                      <p className="text-xs text-muted-foreground">{prod.category} | {prod.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(prod.price)}</p>
                    <p className="text-xs text-emerald-400 font-medium">{prod.salesCount} sold</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 text-center text-muted-foreground">
              <p className="text-sm">No sales recorded yet. Start checkouts in the Register!</p>
            </div>
          )}
        </div>

        {/* Timeline activity feed */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recent Transactions
          </h2>
          {timeline.length > 0 ? (
            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3">
              {timeline.slice(0, 5).map((tx) => (
                <div key={tx.id} className="glass-card p-4 flex flex-col gap-2 border border-border/40 rounded-xl bg-card/40 hover:bg-card/70 transition-all">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-muted-foreground">{tx.id}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      tx.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {tx.paymentStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Cashier: <span className="font-medium text-foreground">{tx.cashierId}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-foreground">{formatCurrency(tx.totalAmount)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">{tx.paymentMethod}</p>
                    </div>
                  </div>
                  <div className="text-[10px] border-t border-border/20 pt-1.5 text-muted-foreground truncate">
                    Items: {tx.items.map(item => `${item.name} (x${item.quantity})`).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 text-center text-muted-foreground">
              <p className="text-sm">No transaction records found.</p>
            </div>
          )}
        </div>
      </div>

      {currentUser?.role === 'admin' && (
        <div className="space-y-4 pt-4 border-t border-border/20">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Administrative & System Controls
          </h2>

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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System settings */}
            <div className="glass-card p-5 space-y-4 bg-card/30 border border-border/40 rounded-2xl">
              <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2">
                <Settings className="w-4 h-4 text-primary" />
                {t('systemSettings')}
              </h3>
              
              <div className="space-y-4">
                {/* VAT Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/50">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground text-left">{t('enableVat')}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 text-left text-balance">
                      {t('enableVatDesc')}
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
                    <h4 className="text-sm font-semibold text-left">{t('vatPercentage')}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 text-left">
                      {t('vatPercentageDesc')}
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

            {/* Maintenance Settings */}
            <div className="glass-card p-5 space-y-4 bg-card/30 border border-border/40 rounded-2xl">
              <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2">
                <DatabaseZap className="w-4 h-4 text-primary" />
                Administrative Controls
              </h3>
              <div className="space-y-4">
                {/* Reset Database */}
                <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground text-left">Reset & Seed Mock Catalog</h4>
                    <p className="text-xs text-muted-foreground mt-1 text-left">
                      Clears the database and seeds default mock items, categories, loyalty customers, and checkout histories.
                    </p>
                  </div>
                  <button
                    onClick={handleResetDatabase}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/95 transition-all shadow-lg hover:shadow-primary/20 flex items-center gap-1.5 cursor-pointer animate-fade-in"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Restore Seed Data
                  </button>
                </div>

                {/* Wipe Database */}
                <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-destructive text-left">Wipe All Database Logs</h4>
                    <p className="text-xs text-muted-foreground mt-1 text-left">
                      Permanently deletes all products, transactions, customers, and user accounts. The default admin profile is preserved.
                    </p>
                  </div>
                  <button
                    onClick={handleWipeDatabase}
                    className="px-4 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/25 font-medium text-xs hover:bg-destructive/20 transition-all flex items-center gap-1.5 cursor-pointer animate-fade-in"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Wipe Database Logs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
