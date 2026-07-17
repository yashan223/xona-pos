import { useEffect, useState } from 'react';
import { Package, ShoppingCart, DollarSign, GitBranch, Clock } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { reportApi } from '@/lib/api';
import type { SystemStats, TransactionRecord } from '@/lib/api';

// Module-level cache for Stale-While-Revalidate pattern to eliminate visual flickering
let cachedStats: SystemStats | null = null;
let cachedTimeline: TransactionRecord[] | null = null;

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(cachedStats);
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
      const [statsData, timelineData] = await Promise.all([
        reportApi.stats(),
        reportApi.timeline(),
      ]);
      setStats(statsData);
      setTimeline(timelineData);
      cachedStats = statsData;
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
    <div className="p-6 h-full flex flex-col space-y-6 max-w-6xl mx-auto overflow-hidden animate-fade-in text-left">
      {/* Header */}
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">POS Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of Xona Point of Sale operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
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
          title="Product Associations"
          value={stats?.graph.nodeCount ?? 0}
          icon={GitBranch}
          color="violet"
          delay={300}
          suffix={`(${stats?.graph.edgeCount ?? 0} connections)`}
        />
      </div>

      {/* Single Column Layout for Recent Transactions */}
      <div className="flex-1 min-h-0">
        <div className="flex flex-col h-full overflow-hidden">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 flex-shrink-0">
            <Clock className="w-5 h-5 text-primary" />
            Recent Transactions
          </h2>
          {timeline.length > 0 ? (
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 min-h-0">
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
