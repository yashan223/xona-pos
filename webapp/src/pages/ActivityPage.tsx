import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { activityApi, ActivityRecord, type User } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';
import { format } from 'date-fns';
import { useTranslation } from '@/lib/translations';
export default function ActivityPage({ currentUser: user }: { currentUser: User | null }) {
  const { t } = useTranslation();
  const { toast } = useNotification();
  const [logs, setLogs] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchLogs() {
      try {
        const data = await activityApi.getAll();
        setLogs(data);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load activity logs');
      } finally {
        setLoading(false);
      }
    }
    if (user?.role === 'admin') {
      fetchLogs();
    }
  }, [user, toast]);
  if (user?.role !== 'admin') {
    return (
      <div className="p-6 text-center mt-20">
        <h2 className="text-xl font-bold text-destructive">{t('unauthorized')}</h2>
        <p className="text-muted-foreground mt-2">{t('noPermActivity')}</p>
      </div>
    );
  }
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 animate-fade-in text-left">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
          {t('activityLogTitle')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('activityLogDesc')}
        </p>
      </div>
      <div className="glass-card bg-card/30 border border-border/40 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground animate-pulse">{t('loadingActivity')}</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">{t('noActivity')}</div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-border/30">
              {logs.map((log) => (
                <div key={log._id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      log.action === 'CREATE' ? 'bg-emerald-500/10 text-emerald-500' :
                      log.action === 'UPDATE' || log.action === 'UPDATE_ROLE' ? 'bg-blue-500/10 text-blue-500' :
                      log.action === 'DELETE' ? 'bg-rose-500/10 text-rose-500' :
                      log.action === 'REFUND' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-secondary text-foreground'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-foreground">
                      {log.entity}
                      {log.entityId && <span className="text-xs text-muted-foreground ml-1">({log.entityId.substring(0, 8)}...)</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {log.userId === 'system' ? 'System' : log.userId?.substring(0, 8)}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-[11px] font-mono text-muted-foreground truncate bg-secondary/20 px-2 py-1 rounded">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-auto max-h-[calc(100vh-220px)]">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/90 backdrop-blur-sm border-b border-border/50 text-muted-foreground text-xs uppercase sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-semibold">{t('timeCol')}</th>
                    <th className="px-6 py-4 font-semibold">{t('actionCol')}</th>
                    <th className="px-6 py-4 font-semibold">{t('entityCol')}</th>
                    <th className="px-6 py-4 font-semibold">{t('userIdCol')}</th>
                    <th className="px-6 py-4 font-semibold">{t('detailsCol')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                          log.action === 'CREATE' ? 'bg-emerald-500/10 text-emerald-500' :
                          log.action === 'UPDATE' || log.action === 'UPDATE_ROLE' ? 'bg-blue-500/10 text-blue-500' :
                          log.action === 'DELETE' ? 'bg-rose-500/10 text-rose-500' :
                          log.action === 'REFUND' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-secondary text-foreground'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {log.entity} {log.entityId && <span className="text-xs text-muted-foreground ml-1">({log.entityId.substring(0, 8)}...)</span>}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {log.userId === 'system' ? 'System' : log.userId?.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground max-w-[300px] truncate">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
