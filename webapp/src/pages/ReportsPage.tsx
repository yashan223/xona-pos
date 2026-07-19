import { useEffect, useState, useRef } from 'react';
import { RefreshCw, Package, TrendingUp, DollarSign, FileText, ChevronDown } from 'lucide-react';
import { reportApi, BASE_HOST } from '@/lib/api';
import type { ProductRecord, POSPatterns, User, SavedReportRecord } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';
import { useTranslation } from '@/lib/translations';

interface ReportsPageProps {
  currentUser: User | null;
}

export default function ReportsPage({ currentUser }: ReportsPageProps) {
  const { t } = useTranslation();
  const { confirm, toast } = useNotification();
  const [popularProducts, setPopularProducts] = useState<ProductRecord[]>([]);
  const [patterns, setPatterns] = useState<POSPatterns | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'popular' | 'patterns' | 'timeline' | 'saved'>('popular');
  const [exporting, setExporting] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<'summary' | 'category' | 'daily'>('summary');
  const [savedReports, setSavedReports] = useState<SavedReportRecord[]>([]);
  const [showExportPanel, setShowExportPanel] = useState(false);

  useEffect(() => {
    loadReports();

    const handleUpdate = () => {
      loadReports();
    };
    window.addEventListener('transactions_updated', handleUpdate);
    return () => {
      window.removeEventListener('transactions_updated', handleUpdate);
    };
  }, []);

  async function loadReports() {
    setLoading(true);
    try {
      const [products, pats] = await Promise.all([
        reportApi.popularProducts(),
        reportApi.posPatterns(),
      ]);
      setPopularProducts(products);
      setPatterns(pats);

      const isAuth = currentUser?.role === 'admin' || currentUser?.role === 'owner';
      if (isAuth) {
        const savedList = await reportApi.listSavedReports();
        setSavedReports(savedList);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }

  async function generatePdfReport() {
    setExporting(true);
    setShowExportPanel(false);
    try {
      const saved = localStorage.getItem('currentUser');
      const headers: Record<string, string> = {};
      let role = currentUser?.role || 'cashier';
      if (saved) {
        const user = JSON.parse(saved);
        if (user?.id) headers['x-user-id'] = user.id;
        if (user?.role) {
          headers['x-user-role'] = user.role;
          role = user.role;
        }
      }

      const res = await fetch(`${BASE_HOST}/api/reports/pdf?type=${selectedReportType}&role=${role}`, {
        headers
      });

      if (!res.ok) {
        throw new Error('Failed to generate sales report PDF');
      }

      toast.success('Sales report PDF generated and saved to HDD successfully!');
      setActiveTab('saved');
      loadReports();
    } catch (err: any) {
      console.error('Failed to generate report silently:', err);
      toast.error('Failed to generate PDF sales report.');
    } finally {
      setExporting(false);
    }
  }

  const handleDeleteSavedReport = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Saved Report',
      message: 'Are you sure you want to delete this archived report PDF? This file will be permanently deleted from the disk.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try {
      await reportApi.deleteSavedReport(id);
      toast.success('Saved report deleted successfully');
      loadReports();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete saved report');
    }
  };

  const tabs = [
    { key: 'popular' as const, label: 'Top Items', icon: Package },
    { key: 'patterns' as const, label: 'Patterns', icon: TrendingUp },
    { key: 'timeline' as const, label: 'Revenue', icon: DollarSign },
    ...((currentUser?.role === 'admin' || currentUser?.role === 'owner') ? [
      { key: 'saved' as const, label: 'PDF Reports', icon: FileText }
    ] : []),
  ];

  const isAdminOrOwner = currentUser?.role === 'admin' || currentUser?.role === 'owner';

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('salesReports')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visual insights from Xona Point of Sale database
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isAdminOrOwner && (
            <div className="relative">
              <button
                onClick={() => setShowExportPanel(!showExportPanel)}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer text-xs shadow-md shadow-primary/20"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export PDF'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showExportPanel ? 'rotate-180' : ''}`} />
              </button>
              {showExportPanel && (
                <div className="absolute right-0 top-full mt-2 w-64 glass-card border border-border/50 rounded-xl p-3 shadow-xl z-50 space-y-3 bg-[#0d0e12]/95 backdrop-blur-md">
                  <p className="text-xs font-semibold text-muted-foreground">Select Report Type</p>
                  <div className="space-y-1">
                    {([
                      { value: 'summary', label: 'Overview Summary' },
                      { value: 'category', label: 'Category-wise Sales' },
                      { value: 'daily', label: 'Daily Sales Timeline' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedReportType(opt.value)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          selectedReportType === opt.value
                            ? 'bg-primary/15 text-primary border border-primary/25'
                            : 'hover:bg-secondary/60 text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={generatePdfReport}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Export PDF Report
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            onClick={loadReports}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs — scrollable strip on mobile */}
      <div className="flex items-center gap-1 border-b border-border/50 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium transition-all cursor-pointer whitespace-nowrap flex-shrink-0 border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="animate-fade-in">
          {activeTab === 'popular' && <PopularProductsTab products={popularProducts} />}
          {activeTab === 'patterns' && <PatternsTab patterns={patterns} />}
          {activeTab === 'timeline' && <TimelineTab timeline={patterns?.timeline || []} />}
          {activeTab === 'saved' && <SavedReportsTab reports={savedReports} onDelete={handleDeleteSavedReport} />}
        </div>
      )}

      {/* Export panel backdrop */}
      {showExportPanel && (
        <div className="fixed inset-0 z-40" onClick={() => setShowExportPanel(false)} />
      )}
    </div>
  );
}

// ─── Top Sold Items Tab ────────────────────────────────

function PopularProductsTab({ products }: { products: ProductRecord[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || products.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = 220;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const maxCount = Math.max(...products.map(p => p.salesCount), 1);
    const maxVisible = Math.min(10, Math.max(3, Math.floor(w / 42)));
    const visibleProducts = products.slice(0, maxVisible);
    const barWidth = Math.max(16, (w - 50) / visibleProducts.length - 10);
    const chartHeight = h - 48;

    ctx.clearRect(0, 0, w, h);

    visibleProducts.forEach((prod, i) => {
      const x = 28 + i * (barWidth + 10);
      const barHeight = (prod.salesCount / maxCount) * chartHeight;
      const y = chartHeight - barHeight + 16;

      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, '#8b5cf6');
      gradient.addColorStop(1, '#8b5cf620');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(prod.salesCount), x + barWidth / 2, y - 4);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 8px Inter, sans-serif';
      const label = prod.name.substring(0, 8) + (prod.name.length > 8 ? '…' : '');
      ctx.fillText(label, x + barWidth / 2, h - 6);
    });
  }, [products]);

  const formatCurrency = (val: number) => {
    return `Rs. ${Number(val).toFixed(2)}`;
  };

  if (products.length === 0) {
    return <EmptyState icon={Package} message="No product sales recorded yet" />;
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 sm:p-5 border border-border/40 rounded-xl bg-card/20">
        <h3 className="text-sm font-bold mb-4">Total Units Sold (Top Products)</h3>
        <canvas ref={canvasRef} className="w-full" style={{ height: 220 }} />
      </div>

      <div className="space-y-2">
        {products.slice(0, 10).map((prod, i) => (
          <div key={prod.id} className="glass-card p-3 sm:p-4 flex items-center justify-between border border-border/20 rounded-xl bg-card/10">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-bold text-muted-foreground w-6 flex-shrink-0">#{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{prod.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{prod.category} | {prod.sku}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-sm font-bold text-primary">{formatCurrency(prod.price)}</p>
              <p className="text-xs text-emerald-400 font-semibold">{prod.salesCount} sold</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sales Patterns Tab ────────────────────────────────

function PatternsTab({ patterns }: { patterns: POSPatterns | null }) {
  if (!patterns) {
    return <EmptyState icon={TrendingUp} message="No patterns data available" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      
      {/* Categories pattern */}
      <div className="glass-card p-4 sm:p-5 border border-border/40 rounded-xl bg-card/20 space-y-4">
        <h3 className="text-sm font-bold">Sales Share by Category</h3>
        {patterns.byCategory.length > 0 ? (
          <div className="space-y-3">
            {patterns.byCategory.map((cat) => {
              const maxVal = Math.max(...patterns.byCategory.map(c => c.count), 1);
              const width = (cat.count / maxVal) * 100;
              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-foreground">
                    <span className="truncate mr-2">{cat.category}</span>
                    <span>{cat.count} units</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-secondary/50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${width}%`,
                        background: 'linear-gradient(90deg, hsl(263 80% 64%), hsl(263 80% 64% / 0.4))'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">No category stats available</p>
        )}
      </div>

        {/* Payment method patterns */}
        <div className="glass-card p-4 sm:p-5 border border-border/40 rounded-xl bg-card/20 space-y-4">
        <h3 className="text-sm font-bold">Preferred Payment Methods</h3>
        {patterns.byPaymentMethod.length > 0 ? (
          <div className="space-y-3">
            {patterns.byPaymentMethod.map((method) => {
              const maxVal = Math.max(...patterns.byPaymentMethod.map(m => m.count), 1);
              const width = (method.count / maxVal) * 100;
              return (
                <div key={method.method} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-foreground">
                    <span className="uppercase truncate mr-2">{method.method}</span>
                    <span>{method.count} transactions</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-secondary/50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${width}%`,
                        background: 'linear-gradient(90deg, hsl(171 70% 45%), hsl(171 70% 45% / 0.4))'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">No payment stats available</p>
        )}
      </div>
    </div>
  );
}

// ─── Revenue Trends Tab ────────────────────────────────

function TimelineTab({ timeline }: { timeline: { date: string; revenue: number }[] }) {
  const formatCurrency = (val: number) => {
    return `Rs. ${Number(val).toFixed(2)}`;
  };

  if (timeline.length === 0) {
    return <EmptyState icon={DollarSign} message="No revenue logs recorded yet" />;
  }

  return (
    <div className="glass-card p-5 border border-border/40 rounded-xl bg-card/20 space-y-4">
      <h3 className="text-sm font-bold">Daily Revenue Timeline (Last 30 Days)</h3>
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {timeline.map((day) => {
          const maxRev = Math.max(...timeline.map(t => t.revenue), 1);
          const width = (day.revenue / maxRev) * 100;
          return (
            <div key={day.date} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground w-14 sm:w-20 flex-shrink-0">{day.date}</span>
              <div className="flex-1 h-5 rounded-md bg-secondary/50 overflow-hidden min-w-0">
                <div
                  className="h-full rounded-md transition-all duration-500"
                  style={{
                    width: `${width}%`,
                    background: 'linear-gradient(90deg, hsl(171 70% 45%), hsl(263 80% 64%))'
                  }}
                />
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-foreground w-14 sm:w-20 text-right flex-shrink-0">{formatCurrency(day.revenue)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-border/20 rounded-xl bg-card/10">
      <Icon className="w-12 h-12 mb-4 opacity-30" />
      <p className="text-sm font-semibold">{message}</p>
    </div>
  );
}

// ─── Saved PDF Reports Tab ────────────────────────────

function SavedReportsTab({
  reports,
  onDelete
}: {
  reports: SavedReportRecord[];
  onDelete: (id: string) => void;
}) {
  const formatReportType = (type: string) => {
    if (type === 'summary') return 'Overview Summary';
    if (type === 'category') return 'Category-wise Sales';
    if (type === 'daily') return 'Daily Sales Timeline';
    return type;
  };

  if (reports.length === 0) {
    return <EmptyState icon={FileText} message="No saved reports archived in database yet. Try exporting one!" />;
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <div key={report._id} className="glass-card p-4 border border-border/30 rounded-2xl bg-card/10 space-y-3">
          {/* Type + Date */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex-shrink-0 ${
              report.reportType === 'category'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : report.reportType === 'daily'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            }`}>
              {formatReportType(report.reportType)}
            </span>
            <span className="text-[10px] text-muted-foreground">{new Date(report.createdAt).toLocaleString()}</span>
          </div>

          {/* Filename */}
          <div>
            <p className="text-xs font-mono font-semibold text-foreground truncate">{report.filename}</p>
            <p className="text-[9px] text-muted-foreground font-mono mt-0.5 truncate bg-secondary/30 px-2 py-1 rounded border border-border/20">
              {report.localPath}
            </p>
          </div>

          {/* By + Actions */}
          <div className="flex items-center justify-between gap-2 border-t border-border/20 pt-2">
            <p className="text-[11px] text-muted-foreground uppercase">
              By: <span className="font-semibold text-foreground">{report.generatedBy}</span>
            </p>
            <div className="flex items-center gap-2">
              <a
                href={`${BASE_HOST}/reports/${report.filename}`}
                download
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg border border-primary/20 transition-all text-[11px] font-semibold cursor-pointer"
              >
                Download
              </a>
              <button
                onClick={() => onDelete(report._id)}
                className="px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg border border-destructive/20 transition-all text-[11px] font-semibold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
