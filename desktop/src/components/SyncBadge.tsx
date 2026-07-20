import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { syncApi } from '@/lib/api';
import type { SyncStatus } from '@/lib/api';
interface SyncBadgeProps {
  collapsed?: boolean;
}
export default function SyncBadge({ collapsed = false }: SyncBadgeProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchStatus = async () => {
    try {
      const data = await syncApi.getStatus();
      setStatus(data);
    } catch (err) {
      setStatus({ isOnline: false, pendingCount: 0, isSyncing: false, lastSyncTime: null });
    }
  };
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    const handleSyncEvent = () => fetchStatus();
    window.addEventListener('transactions_updated', handleSyncEvent);
    window.addEventListener('products_updated', handleSyncEvent);
    return () => {
      clearInterval(interval);
      window.removeEventListener('transactions_updated', handleSyncEvent);
      window.removeEventListener('products_updated', handleSyncEvent);
    };
  }, []);
  const handleManualSync = async () => {
    setLoading(true);
    try {
      const res = await syncApi.trigger();
      setStatus(res.status);
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setLoading(false);
    }
  };
  if (!status) return null;
  const isOnline = status.isOnline;
  const pending = status.pendingCount;
  if (collapsed) {
    return (
      <button
        onClick={handleManualSync}
        className={`w-full p-2 flex justify-center items-center rounded-lg transition-all ${
          !isOnline
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : pending > 0
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        }`}
        title={!isOnline ? `Offline (${pending} pending)` : `Online (${pending} pending)`}
      >
        {!isOnline ? (
          <CloudOff className="w-4 h-4 animate-pulse" />
        ) : loading || status.isSyncing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Cloud className="w-4 h-4" />
        )}
      </button>
    );
  }
  return (
    <button
      onClick={handleManualSync}
      disabled={loading || status.isSyncing}
      className={`w-full px-3 py-1.5 rounded-xl flex items-center justify-between text-xs font-semibold border transition-all cursor-pointer ${
        !isOnline
          ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
          : pending > 0
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
      }`}
      title="Click to trigger manual cloud sync"
    >
      <div className="flex items-center gap-2 truncate">
        {!isOnline ? (
          <>
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
            <span className="truncate">Offline (Saved Locally)</span>
          </>
        ) : status.isSyncing || loading ? (
          <>
            <RefreshCw className="w-3 h-3 animate-spin flex-shrink-0 text-amber-400" />
            <span className="truncate">Syncing to Cloud...</span>
          </>
        ) : pending > 0 ? (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
            <span className="truncate">{pending} Pending Sync</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span className="truncate">Cloud Synced</span>
          </>
        )}
      </div>
      {pending > 0 && (
        <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-foreground/10 font-bold ml-1">
          {pending}
        </span>
      )}
    </button>
  );
}
