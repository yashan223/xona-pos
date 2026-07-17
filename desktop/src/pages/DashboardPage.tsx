import { useEffect, useState } from 'react';
import { Package, ShoppingCart, DollarSign, GitBranch, Clock } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { reportApi } from '@/lib/api';
import type { SystemStats, ProductRecord, TransactionRecord } from '@/lib/api';

// Module-level cache for Stale-While-Revalidate pattern to eliminate visual flickering
let cachedStats: SystemStats | null = null;
let cachedTopProducts: ProductRecord[] | null = null;
let cachedTimeline: TransactionRecord[] | null = null;

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(cachedStats);
  const [topProducts, setTopProducts] = useState<ProductRecord[]>(cachedTopProducts || []);
  const [timeline, setTimeline] = useState<TransactionRecord[]>(cachedTimeline || []);
  const [loading, setLoading] = useState(!cachedStats);

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
    </div>
  );
}
