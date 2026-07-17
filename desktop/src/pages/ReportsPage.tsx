import { useEffect, useState, useRef } from 'react';
import { RefreshCw, Package, TrendingUp, DollarSign, FileText } from 'lucide-react';
import { reportApi } from '@/lib/api';
import type { ProductRecord, POSPatterns, User } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';

interface ReportsPageProps {
  currentUser: User | null;
}

export default function ReportsPage({ currentUser }: ReportsPageProps) {
  const { toast } = useNotification();
  const [popularProducts, setPopularProducts] = useState<ProductRecord[]>([]);
  const [patterns, setPatterns] = useState<POSPatterns | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'popular' | 'patterns' | 'timeline'>('popular');
  const [exporting, setExporting] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<'summary' | 'category' | 'daily'>('summary');

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
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }

  async function generatePdfReport() {
    setExporting(true);
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

      const res = await fetch(`http://localhost:3000/api/reports/pdf?type=${selectedReportType}&role=${role}`, {
        headers
      });

      if (!res.ok) {
        throw new Error('Failed to generate sales report PDF');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReportType}_sales_report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Sales report PDF downloaded successfully!');
    } catch (err: any) {
      console.error('Fetch PDF failed, falling back to direct download:', err);
      // Fallback for Electron environments
      try {
        const role = currentUser?.role || 'cashier';
        window.open(`http://localhost:3000/api/reports/pdf?type=${selectedReportType}&role=${role}`);
        toast.success('Sales report PDF generated successfully!');
      } catch (fallbackErr: any) {
        toast.error('Failed to generate PDF sales report.');
      }
    } finally {
      setExporting(false);
    }
  }

  const tabs = [
    { key: 'popular' as const, label: 'Top Sold Items', icon: Package },
    { key: 'patterns' as const, label: 'Sales Patterns', icon: TrendingUp },
    { key: 'timeline' as const, label: 'Revenue Trends', icon: DollarSign },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visual insights from Xona Point of Sale database
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
            <>
              {/* Report Type Dropdown */}
              <select
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value as any)}
                className="bg-[#0d0e12] border border-border/50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary text-foreground cursor-pointer"
              >
                <option value="summary">Overview Summary Report</option>
                <option value="category">Category-wise Sales Report</option>
                <option value="daily">Daily Sales Timeline Report</option>
              </select>

              <button
                onClick={generatePdfReport}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer text-xs shadow-md shadow-primary/20"
              >
                <FileText className="w-3.5 h-3.5" />
                {exporting ? 'Exporting...' : 'Export PDF Report'}
              </button>
            </>
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

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/50 border border-border">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-primary/12 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
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
        </div>
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
    const h = 250;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const maxCount = Math.max(...products.map(p => p.salesCount), 1);
    const visibleProducts = products.slice(0, 10);
    const barWidth = Math.max(20, (w - 60) / visibleProducts.length - 12);
    const chartHeight = h - 50;

    ctx.clearRect(0, 0, w, h);

    visibleProducts.forEach((prod, i) => {
      const x = 40 + i * (barWidth + 12);
      const barHeight = (prod.salesCount / maxCount) * chartHeight;
      const y = chartHeight - barHeight + 20;

      // Bar gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, '#8b5cf6'); // purple
      gradient.addColorStop(1, '#8b5cf630');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
      ctx.fill();

      // Count label
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(prod.salesCount), x + barWidth / 2, y - 6);

      // X-axis label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 9px Inter, sans-serif';
      const label = prod.name.substring(0, 10) + (prod.name.length > 10 ? '…' : '');
      ctx.fillText(label, x + barWidth / 2, h - 8);
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
      <div className="glass-card p-5 border border-border/40 rounded-xl bg-card/20">
        <h3 className="text-sm font-bold mb-4">Total Units Sold (Top-10 Products)</h3>
        <canvas ref={canvasRef} className="w-full" style={{ height: 250 }} />
      </div>

      <div className="space-y-2">
        {products.slice(0, 10).map((prod, i) => (
          <div key={prod.id} className="glass-card p-4 flex items-center justify-between border border-border/20 rounded-xl bg-card/10">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{prod.name}</p>
                <p className="text-[10px] text-muted-foreground">{prod.category} | {prod.sku}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-primary">{formatCurrency(prod.price)}</p>
              <p className="text-xs text-emerald-400 font-semibold">{prod.salesCount} units sold</p>
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
      <div className="glass-card p-5 border border-border/40 rounded-xl bg-card/20 space-y-4">
        <h3 className="text-sm font-bold">Sales Share by Category</h3>
        {patterns.byCategory.length > 0 ? (
          <div className="space-y-3">
            {patterns.byCategory.map((cat) => {
              const maxVal = Math.max(...patterns.byCategory.map(c => c.count), 1);
              const width = (cat.count / maxVal) * 100;
              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-foreground">
                    <span>{cat.category}</span>
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
      <div className="glass-card p-5 border border-border/40 rounded-xl bg-card/20 space-y-4">
        <h3 className="text-sm font-bold">Preferred Payment Methods</h3>
        {patterns.byPaymentMethod.length > 0 ? (
          <div className="space-y-3">
            {patterns.byPaymentMethod.map((method) => {
              const maxVal = Math.max(...patterns.byPaymentMethod.map(m => m.count), 1);
              const width = (method.count / maxVal) * 100;
              return (
                <div key={method.method} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-foreground">
                    <span className="uppercase">{method.method}</span>
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
            <div key={day.date} className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-muted-foreground w-20 flex-shrink-0">{day.date}</span>
              <div className="flex-1 h-5 rounded-md bg-secondary/50 overflow-hidden">
                <div
                  className="h-full rounded-md transition-all duration-500"
                  style={{
                    width: `${width}%`,
                    background: 'linear-gradient(90deg, hsl(171 70% 45%), hsl(263 80% 64%))'
                  }}
                />
              </div>
              <span className="text-xs font-bold text-foreground w-20 text-right">{formatCurrency(day.revenue)}</span>
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
