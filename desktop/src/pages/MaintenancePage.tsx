import { useState, useEffect } from 'react';
import { Database, Cloud, HardDrive, RefreshCw, Trash2, Download } from 'lucide-react';
import { reportApi, syncApi, BASE_HOST, SyncStatus } from '@/lib/api';
import { getCachedProducts, getCachedCustomers, getPendingOfflineTransactions, saveCachedProducts, saveCachedCustomers } from '@/lib/offlineStore';
import { useTranslation } from '@/lib/translations';
import { useNotification } from '@/context/NotificationContext';

export default function MaintenancePage() {
  const { t } = useTranslation();
  const { confirm, toast } = useNotification();
  const [backups, setBackups] = useState<{ filename: string; size: number; createdAt: string }[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const [cachedProdCount, setCachedProdCount] = useState(0);
  const [cachedCustCount, setCachedCustCount] = useState(0);
  const [pendingTxCount, setPendingTxCount] = useState(0);

  useEffect(() => {
    loadBackups();
    loadLocalDbStats();
  }, []);

  const loadLocalDbStats = async () => {
    setCachedProdCount(getCachedProducts().length);
    setCachedCustCount(getCachedCustomers().length);
    setPendingTxCount(getPendingOfflineTransactions().length);

    try {
      const status = await syncApi.getStatus();
      setSyncStatus(status);
    } catch (e) {
      setSyncStatus({ isOnline: false, pendingCount: 0, isSyncing: false, lastSyncTime: null });
    }
  };

  const loadBackups = async () => {
    try {
      const list = await reportApi.listBackups();
      setBackups(list);
    } catch (err) {
      console.error('Failed to load database backups:', err);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const res = await reportApi.createBackup();
      toast.success(res.message || 'Backup created successfully');
      loadBackups();
    } catch (err) {
      toast.error('Failed to create database backup');
    } finally {
      setLoading(false);
    }
  };

  const handleExportLocalJsonBackup = () => {
    try {
      const products = getCachedProducts();
      const customers = getCachedCustomers();
      const pendingTx = getPendingOfflineTransactions();

      const backupObj = {
        version: 1,
        timestamp: new Date().toISOString(),
        source: 'Client Offline Local Storage',
        data: {
          products,
          customers,
          transactions: pendingTx.map((t) => t.payload),
        },
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `local_pos_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success('Exported local client offline database backup JSON file.');
    } catch (e) {
      toast.error('Failed to export local backup JSON file.');
    }
  };

  const handleClearLocalCache = async () => {
    const isConfirmed = await confirm({
      title: 'Clear Local Client Cache',
      message: 'Are you sure you want to clear the local client cached products and customers? Pending unsynced checkouts will be preserved.',
      confirmText: 'Clear Cache',
      cancelText: 'Cancel',
      type: 'warning',
    });
    if (!isConfirmed) return;

    saveCachedProducts([]);
    saveCachedCustomers([]);
    loadLocalDbStats();
    toast.success('Local client cache cleared successfully.');
  };

  const handleRestoreBackup = async (filename: string) => {
    const isConfirmed = await confirm({
      title: 'Restore Database',
      message: `Are you sure you want to restore the database from backup file "${filename}"? All current data will be overwritten.`,
      confirmText: 'Restore',
      cancelText: 'Cancel',
      type: 'warning',
    });
    if (!isConfirmed) return;

    setLoading(true);
    try {
      const res = await reportApi.restoreBackup(filename);
      toast.success(res.message || 'Database restored successfully');
      loadLocalDbStats();
    } catch (err) {
      toast.error('Failed to restore database from backup');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Backup',
      message: `Are you sure you want to delete backup file "${filename}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!isConfirmed) return;

    setLoading(true);
    try {
      const res = await reportApi.deleteBackup(filename);
      toast.success(res.message || 'Backup deleted successfully');
      loadBackups();
    } catch (err) {
      toast.error('Failed to delete backup file');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const backupData = JSON.parse(text);

        if (!backupData || !backupData.data) {
          toast.error('Invalid backup file format.');
          return;
        }

        const isConfirmed = await confirm({
          title: 'Restore from Upload',
          message: 'Are you sure you want to restore the database from this uploaded file? All current records will be overwritten.',
          confirmText: 'Restore',
          cancelText: 'Cancel',
          type: 'warning',
        });
        if (!isConfirmed) return;

        setLoading(true);
        const res = await reportApi.uploadBackup(backupData);
        toast.success(res.message || 'Database restored from uploaded backup successfully');
        loadBackups();
        loadLocalDbStats();
      } catch (err) {
        toast.error('Failed to parse or restore uploaded backup file.');
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          {t('databaseMaintenance')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Perform administrative DB operations, manage Local SQLite & Cloud MongoDB data, and handle backups
        </p>
      </div>

      {/* Database Engines Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Disk & Client Storage Card */}
        <div className="glass-card p-5 bg-card/30 border border-border/40 rounded-2xl space-y-3">
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              Local Storage / SQLite Database
            </h3>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full">
              🟢 Active
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-secondary/20 rounded-lg border border-border/30">
              <p className="text-[10px] text-muted-foreground">Cached Items</p>
              <p className="font-bold text-foreground text-sm">{cachedProdCount}</p>
            </div>
            <div className="p-2 bg-secondary/20 rounded-lg border border-border/30">
              <p className="text-[10px] text-muted-foreground">Customers</p>
              <p className="font-bold text-foreground text-sm">{cachedCustCount}</p>
            </div>
            <div className="p-2 bg-secondary/20 rounded-lg border border-border/30">
              <p className="text-[10px] text-muted-foreground">Pending Sync</p>
              <p className="font-bold text-amber-400 text-sm">{pendingTxCount}</p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleExportLocalJsonBackup}
              className="flex-1 py-1.5 rounded-lg bg-secondary/60 hover:bg-secondary text-foreground text-xs font-semibold border border-border/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Local JSON
            </button>
            <button
              onClick={handleClearLocalCache}
              className="py-1.5 px-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-semibold border border-destructive/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Clear Local Cache"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Cloud MongoDB Engine Card */}
        <div className="glass-card p-5 bg-card/30 border border-border/40 rounded-2xl space-y-3">
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Cloud className="w-4 h-4 text-primary" />
              Cloud MongoDB Database
            </h3>
            {syncStatus?.isOnline ? (
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full">
                🟢 Connected
              </span>
            ) : (
              <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 font-bold px-2 py-0.5 rounded-full">
                🔴 Unreachable
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Database Provider:</span>
              <span className="font-medium text-foreground">MongoDB Cluster / Atlas</span>
            </div>
            <div className="flex justify-between">
              <span>Auto-Sync Frequency:</span>
              <span className="font-medium text-foreground">10 seconds</span>
            </div>
          </div>
          <button
            onClick={loadLocalDbStats}
            className="w-full py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold border border-primary/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh DB Connection Status
          </button>
        </div>
      </div>

      {/* Backup & Restore Controls */}
      <div className="glass-card p-5 space-y-4 bg-card/30 border border-border/40 rounded-2xl">
        <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2">
          <Database className="w-4 h-4 text-primary" />
          DB Backup & Restore Manager
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
          <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 space-y-2 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-semibold text-foreground text-left">{t('createBackup')}</h4>
              <p className="text-xs text-muted-foreground mt-1 text-left">
                Generate a snapshot JSON file containing all products, categories, transactions, and customers.
              </p>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={loading}
              className="mt-3 w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 animate-fade-in"
            >
              <Database className="w-3.5 h-3.5" />
              {t('createBackup')}
            </button>
          </div>

          <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 space-y-2 flex flex-col justify-between col-span-2">
            <div>
              <h4 className="text-sm font-semibold text-foreground text-left">{t('uploadBackup')}</h4>
              <p className="text-xs text-muted-foreground mt-1 text-left">
                Choose a previously exported backup `.json` file from your local computer's HDD to overwrite and restore the entire database.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="file"
                accept=".json"
                onChange={handleUploadBackup}
                disabled={loading}
                className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Backups List Table */}
        <div className="pt-2 border-t border-border/20">
          <h4 className="text-sm font-semibold text-foreground mb-3 text-left">{t('availableBackups')}</h4>
          {backups.length === 0 ? (
            <div className="text-center p-8 bg-secondary/10 rounded-xl text-xs text-muted-foreground">
              No backups created yet. Click "Create DB Backup" to save your first snapshot to the disk.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/30 bg-secondary/10">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20 font-semibold text-muted-foreground uppercase">
                    <th className="p-3">File Name</th>
                    <th className="p-3">Created Date</th>
                    <th className="p-3">Size</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {backups.map((b) => (
                    <tr key={b.filename} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-3 font-mono text-foreground select-all text-left">{b.filename}</td>
                      <td className="p-3 text-muted-foreground text-left">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-muted-foreground text-left">
                        {formatBytes(b.size)}
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleRestoreBackup(b.filename)}
                          className="px-2 py-1 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded border border-teal-500/25 transition-all text-[10px] font-semibold cursor-pointer"
                          title="Restore this backup"
                        >
                          {t('restore')}
                        </button>
                        <a
                          href={`${BASE_HOST}/api/reports/backups/${b.filename}/download`}
                          download
                          className="inline-block px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded border border-primary/25 transition-all text-[10px] font-semibold cursor-pointer"
                          title="Download copy to client HDD"
                        >
                          {t('download')}
                        </a>
                        <button
                          onClick={() => handleDeleteBackup(b.filename)}
                          className="px-2 py-1 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded border border-destructive/25 transition-all text-[10px] font-semibold cursor-pointer"
                          title="Delete backup file"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
