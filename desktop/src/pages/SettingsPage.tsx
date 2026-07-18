import { useState, useEffect } from 'react';
import { Settings, Cloud, RefreshCw, CheckCircle2, CloudOff } from 'lucide-react';
import { useTranslation } from '@/lib/translations';
import { useNotification } from '@/context/NotificationContext';
import { syncApi, SyncStatus } from '@/lib/api';
import { isForceOfflineEnabled, setForceOfflineEnabled } from '@/lib/offlineStore';

export default function SettingsPage() {
  const { t, lang, setLanguage } = useTranslation();
  const { toast } = useNotification();

  const [vatEnabled, setVatEnabled] = useState(() => {
    const saved = localStorage.getItem('vatEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [vatPercentage, setVatPercentage] = useState(() => {
    const saved = localStorage.getItem('vatPercentage');
    return saved !== null ? parseFloat(saved) : 15;
  });

  const [forceOffline, setForceOffline] = useState(() => isForceOfflineEnabled());
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchSyncStatus = async () => {
    try {
      const data = await syncApi.getStatus();
      setSyncStatus(data);
    } catch (err) {
      setSyncStatus({ isOnline: false, pendingCount: 0, isSyncing: false, lastSyncTime: null });
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 5000);

    const handleOfflineModeChange = () => fetchSyncStatus();
    window.addEventListener('offline_mode_changed', handleOfflineModeChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('offline_mode_changed', handleOfflineModeChange);
    };
  }, []);

  const handleManualSync = async () => {
    if (forceOffline) {
      toast.error('Cannot sync to cloud while Always Offline Mode is enabled.');
      return;
    }
    setSyncing(true);
    try {
      const res = await syncApi.trigger();
      setSyncStatus(res.status);
      toast.success('Cloud synchronization triggered successfully.');
    } catch (err: any) {
      toast.error('Sync failed: Cloud Backend is currently unreachable.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          {t('systemSettings')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure application defaults, offline storage preferences, VAT rates, and localization
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
        {/* VAT & Tax Settings Card */}
        <div className="glass-card p-6 space-y-4 bg-card/30 border border-border/40 rounded-2xl">
          <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2 text-foreground">
            {t('taxVatSettings')}
          </h3>

          <div className="space-y-4">
            {/* VAT Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/50">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{t('enableVat')}</h4>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-[180px]">
                  {t('enableVatDesc')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none flex-shrink-0">
                <input
                  type="checkbox"
                  checked={vatEnabled}
                  onChange={(e) => {
                    const val = e.target.checked;
                    localStorage.setItem('vatEnabled', String(val));
                    setVatEnabled(val);
                    toast.success(`VAT calculations ${val ? 'enabled' : 'disabled'} successfully.`);
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
                <h4 className="text-sm font-semibold">{t('vatPercentage')}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
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
          </div>
        </div>

        {/* Cloud Sync & Offline Mode Card */}
        <div className="glass-card p-6 space-y-4 bg-card/30 border border-border/40 rounded-2xl">
          <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2 text-foreground">
            <Cloud className="w-4 h-4 text-primary" />
            Cloud Sync & Offline Mode
          </h3>

          <div className="space-y-4">
            {/* Always Offline Mode Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/50">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Always Offline Mode</h4>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px]">
                  Operate strictly using local disk storage and disable all cloud connections.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none flex-shrink-0">
                <input
                  type="checkbox"
                  checked={forceOffline}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setForceOfflineEnabled(val);
                    setForceOffline(val);
                    toast.success(`Always Offline Mode ${val ? 'enabled' : 'disabled'}.`);
                    fetchSyncStatus();
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-secondary/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Connection Status Box */}
            <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-semibold">Sync Status</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {forceOffline ? 'Operating in Forced Offline Mode' : 'Real-time status of Cloud DB sync'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {forceOffline ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <CloudOff className="w-3.5 h-3.5" />
                      Always Offline
                    </span>
                  ) : syncStatus?.isOnline ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Cloud Connected
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                      <CloudOff className="w-3.5 h-3.5 animate-pulse" />
                      Offline (Local Mode)
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-border/30 flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Pending Unsynced Items:</span>
                <span className="font-mono font-bold text-foreground bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                  {syncStatus?.pendingCount ?? 0} items
                </span>
              </div>

              {syncStatus?.lastSyncTime && !forceOffline && (
                <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                  <span>Last Successful Sync:</span>
                  <span>{new Date(syncStatus.lastSyncTime).toLocaleTimeString()}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncing || forceOffline}
                className="w-full mt-2 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing to Cloud...' : 'Trigger Cloud Sync Now'}
              </button>
            </div>
          </div>
        </div>

        {/* Language Settings Card */}
        <div className="glass-card p-6 space-y-4 bg-card/30 border border-border/40 rounded-2xl md:col-span-2">
          <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2 text-foreground">
            {t('appLanguage')}
          </h3>

          <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
            <div>
              <h4 className="text-sm font-semibold">{t('appLanguage')}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
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
                  {l === 'en' ? 'English' : 'සිංහල (si)'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
