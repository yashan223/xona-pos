import { useState, useEffect } from 'react';
import { Settings, Cloud, RefreshCw, CheckCircle2, CloudOff, HardDrive, FolderOpen, Save, Printer, Wifi, Usb, TestTube, Globe, Calculator, Database, Folder } from 'lucide-react';
import { useTranslation } from '@/lib/translations';
import { useNotification } from '@/context/NotificationContext';
import { syncApi, SyncStatus } from '@/lib/api';
import { isForceOfflineEnabled, setForceOfflineEnabled } from '@/lib/offlineStore';
import {
  getPrinterConfig,
  savePrinterConfig,
  listWindowsPrinters,
  printReceipt,
  type PrinterConfig,
  type PrintMethod,
} from '@/lib/printerStore';
export default function SettingsPage() {
  const { t, lang, setLanguage } = useTranslation();
  const { toast } = useNotification();
  const [activeTab, setActiveTab] = useState<'general' | 'tax' | 'db' | 'printer' | 'reports'>('general');
  const tabs = [
    { id: 'general', label: t('appLanguage') || 'General', icon: Globe },
    { id: 'tax', label: t('taxVatSettings') || 'Tax & VAT', icon: Calculator },
    { id: 'db', label: 'Database & Sync', icon: Database },
    { id: 'printer', label: 'Receipt Printer', icon: Printer },
    { id: 'reports', label: 'Reports', icon: Folder },
  ];
  const [vatEnabled, setVatEnabled] = useState(() => {
    const saved = localStorage.getItem('vatEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [vatPercentage, setVatPercentage] = useState(() => {
    const saved = localStorage.getItem('vatPercentage');
    return saved !== null ? parseFloat(saved) : 15;
  });
  const [customReportPath, setCustomReportPath] = useState(() => {
    return localStorage.getItem('customReportPath') || '';
  });
  const handleBrowseReportFolder = async () => {
    if (!window.electronDB?.browseDbFolder) {
      toast.error('Folder picker is only available in the desktop app.');
      return;
    }
    const selected = await window.electronDB.browseDbFolder();
    if (selected) {
      setCustomReportPath(selected);
      localStorage.setItem('customReportPath', selected);
    }
  };
  const [forceOffline, setForceOffline] = useState(() => isForceOfflineEnabled());
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [dbPath, setDbPath] = useState('');
  const [dbPathInput, setDbPathInput] = useState('');
  const [savingPath, setSavingPath] = useState(false);
  useEffect(() => {
    const load = async () => {
      if (window.electronDB?.getDbPath) {
        const p = await window.electronDB.getDbPath();
        setDbPath(p);
        setDbPathInput(p);
      }
    };
    load();
  }, []);
  const handleBrowseDbFolder = async () => {
    if (!window.electronDB?.browseDbFolder) return;
    const selected = await window.electronDB.browseDbFolder();
    if (selected) setDbPathInput(selected);
  };
  const handleSaveDbPath = async () => {
    if (!window.electronDB?.setDbPath) {
      toast.error('Folder picker is only available in the desktop app.');
      return;
    }
    const trimmed = dbPathInput.trim();
    if (!trimmed) {
      toast.error('Please enter a valid folder path.');
      return;
    }
    setSavingPath(true);
    try {
      const result = await window.electronDB.setDbPath(trimmed);
      if (result.success) {
        setDbPath(trimmed);
        toast.success('Local database storage path updated. Restart the app to fully apply the change.');
      } else {
        toast.error(`Failed to set path: ${result.error ?? 'Unknown error'}`);
      }
    } finally {
      setSavingPath(false);
    }
  };
  const [printerCfg, setPrinterCfg] = useState<PrinterConfig>(() => getPrinterConfig());
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [savingPrinter, setSavingPrinter] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState(false);
  useEffect(() => {
    if (printerCfg.method === 'queue') {
      listWindowsPrinters().then(setAvailablePrinters);
    }
  }, [printerCfg.method]);
  const updatePrinterCfg = (partial: Partial<PrinterConfig>) => {
    setPrinterCfg((prev) => ({ ...prev, ...partial }));
  };
  const handleSavePrinter = () => {
    setSavingPrinter(true);
    try {
      savePrinterConfig(printerCfg);
      toast.success('Printer settings saved successfully.');
    } catch {
      toast.error('Failed to save printer settings.');
    } finally {
      setSavingPrinter(false);
    }
  };
  const handleTestPrint = async () => {
    savePrinterConfig(printerCfg);
    setTestingPrinter(true);
    try {
      const result = await printReceipt({
        id: 'TEST-001',
        cashierId: 'Admin',
        createdAt: new Date().toISOString(),
        items: [{ name: 'Test Product', quantity: 1, price: 100, subtotal: 100 }],
        subtotal: 100,
        discount: 0,
        tax: 8,
        totalAmount: 108,
        paymentMethod: 'cash',
      });
      if (result.success) toast.success('Test receipt sent to printer.');
      else toast.error(`Test print failed: ${result.error}`);
    } finally {
      setTestingPrinter(false);
    }
  };
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
      <div className="flex items-center gap-2 border-b border-border/50 pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
        {activeTab === 'tax' && (
        <div className="glass-card p-6 space-y-4 bg-card/30 border border-border/40 rounded-2xl md:col-span-2">
          <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2 text-foreground">
            {t('taxVatSettings')}
          </h3>
          <div className="space-y-4">
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
        )}
        {activeTab === 'db' && (
          <>
        <div className="glass-card p-6 space-y-4 bg-card/30 border border-border/40 rounded-2xl">
          <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2 text-foreground">
            <Cloud className="w-4 h-4 text-primary" />
            Cloud Sync & Offline Mode
          </h3>
          <div className="space-y-4">
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
        <div className="glass-card p-6 space-y-4 bg-card/30 border border-border/40 rounded-2xl">
          <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2 text-foreground">
            <HardDrive className="w-4 h-4 text-primary" />
            Local Database Storage
          </h3>
          <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
            <div>
              <h4 className="text-sm font-semibold">Storage Folder Location</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                The folder where all local offline database files (.json) are stored on this machine.
                Changes take effect after restarting the app.
              </p>
            </div>
            {dbPath && dbPath !== dbPathInput && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 px-3 py-2 rounded-lg border border-border/40">
                <span className="shrink-0 font-medium">Active:</span>
                <span className="font-mono truncate">{dbPath}</span>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <input
                id="db-path-input"
                type="text"
                value={dbPathInput}
                onChange={(e) => setDbPathInput(e.target.value)}
                placeholder="e.g. C:\XonaPOS\Data"
                spellCheck={false}
                className="flex-1 bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary transition-all text-foreground placeholder:text-muted-foreground/60"
              />
              <button
                id="db-browse-btn"
                type="button"
                onClick={handleBrowseDbFolder}
                title="Browse folder"
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                Browse
              </button>
            </div>
            <button
              id="db-save-path-btn"
              type="button"
              onClick={handleSaveDbPath}
              disabled={savingPath || dbPathInput.trim() === dbPath}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              {savingPath ? 'Saving...' : 'Save Path'}
            </button>
          </div>
        </div>
        </>
        )}
        {activeTab === 'printer' && (
        <div className="glass-card p-6 space-y-5 bg-card/30 border border-border/40 rounded-2xl md:col-span-2">
          <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2 text-foreground">
            <Printer className="w-4 h-4 text-primary" />
            Receipt Printer
          </h3>
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/50">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Enable POS Printer</h4>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[260px]">
                Print ESC/POS receipts on any thermal printer via network, Windows driver, or serial port.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none flex-shrink-0">
              <input
                id="printer-enabled-toggle"
                type="checkbox"
                checked={printerCfg.enabled}
                onChange={(e) => updatePrinterCfg({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-secondary/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>
          {printerCfg.enabled && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
                <h4 className="text-sm font-semibold">Connection Method</h4>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { key: 'network', label: 'Network (TCP/IP)', icon: <Wifi className="w-3.5 h-3.5" /> },
                    { key: 'queue',   label: 'Windows Print Queue', icon: <Printer className="w-3.5 h-3.5" /> },
                    { key: 'serial',  label: 'Serial / COM Port', icon: <Usb className="w-3.5 h-3.5" /> },
                  ] as { key: PrintMethod; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
                    <button
                      key={key}
                      type="button"
                      id={`printer-method-${key}`}
                      onClick={() => updatePrinterCfg({ method: key })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        printerCfg.method === key
                          ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                          : 'bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {icon}{label}
                    </button>
                  ))}
                </div>
                {printerCfg.method === 'network' && (
                  <div className="flex gap-3 pt-1">
                    <div className="flex-1 space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Printer IP Address</label>
                      <input
                        id="printer-network-ip"
                        type="text"
                        value={printerCfg.networkIp}
                        onChange={(e) => updatePrinterCfg({ networkIp: e.target.value })}
                        placeholder="192.168.1.100"
                        className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-primary transition-all text-foreground"
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Port</label>
                      <input
                        id="printer-network-port"
                        type="number"
                        value={printerCfg.networkPort}
                        onChange={(e) => updatePrinterCfg({ networkPort: parseInt(e.target.value) || 9100 })}
                        className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-primary transition-all text-foreground"
                      />
                    </div>
                  </div>
                )}
                {printerCfg.method === 'queue' && (
                  <div className="space-y-2 pt-1">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] text-muted-foreground font-medium">Printer Name</label>
                        <select
                          id="printer-queue-name"
                          value={printerCfg.queueName}
                          onChange={(e) => updatePrinterCfg({ queueName: e.target.value })}
                          className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-all text-foreground"
                        >
                          <option value="">-- Select a printer --</option>
                          {availablePrinters.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => listWindowsPrinters().then(setAvailablePrinters)}
                        title="Refresh printer list"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50 text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {availablePrinters.length === 0 && (
                      <p className="text-[11px] text-amber-400">No printers detected. Make sure the printer driver is installed in Windows.</p>
                    )}
                  </div>
                )}
                {printerCfg.method === 'serial' && (
                  <div className="flex gap-3 pt-1">
                    <div className="flex-1 space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">COM Port</label>
                      <input
                        id="printer-serial-port"
                        type="text"
                        value={printerCfg.serialPort}
                        onChange={(e) => updatePrinterCfg({ serialPort: e.target.value })}
                        placeholder="COM3"
                        className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-primary transition-all text-foreground"
                      />
                    </div>
                    <div className="w-32 space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Baud Rate</label>
                      <select
                        id="printer-serial-baud"
                        value={printerCfg.serialBaud}
                        onChange={(e) => updatePrinterCfg({ serialBaud: parseInt(e.target.value) })}
                        className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-all text-foreground"
                      >
                        {[1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
                  <h4 className="text-sm font-semibold">Paper Width</h4>
                  <div className="flex gap-2">
                    {([{ w: 48, label: '80 mm' }, { w: 32, label: '58 mm' }] as { w: 48|32; label: string }[]).map(({ w, label }) => (
                      <button
                        key={w}
                        type="button"
                        id={`printer-paper-${w}`}
                        onClick={() => updatePrinterCfg({ paperWidth: w })}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          printerCfg.paperWidth === w
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
                  <h4 className="text-sm font-semibold">Auto-Print after Checkout</h4>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Automatically print receipt on successful sale</p>
                    <label className="relative inline-flex items-center cursor-pointer select-none flex-shrink-0">
                      <input
                        id="printer-autoprint-toggle"
                        type="checkbox"
                        checked={printerCfg.autoPrint}
                        onChange={(e) => updatePrinterCfg({ autoPrint: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-secondary/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
                <h4 className="text-sm font-semibold">Receipt Header</h4>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Store Name</label>
                    <input
                      id="printer-store-name"
                      type="text"
                      value={printerCfg.storeName}
                      onChange={(e) => updatePrinterCfg({ storeName: e.target.value })}
                      placeholder="Xona POS"
                      className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-all text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Store Address / Tagline</label>
                    <input
                      id="printer-store-address"
                      type="text"
                      value={printerCfg.storeAddress}
                      onChange={(e) => updatePrinterCfg({ storeAddress: e.target.value })}
                      placeholder="123 Main St, City"
                      className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-all text-foreground"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  id="printer-save-btn"
                  type="button"
                  onClick={handleSavePrinter}
                  disabled={savingPrinter}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-40"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingPrinter ? 'Saving...' : 'Save Printer Settings'}
                </button>
                <button
                  id="printer-test-btn"
                  type="button"
                  onClick={handleTestPrint}
                  disabled={testingPrinter}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground font-bold text-xs hover:bg-secondary/80 transition-all cursor-pointer disabled:opacity-40"
                >
                  <TestTube className="w-3.5 h-3.5" />
                  {testingPrinter ? 'Sending...' : 'Test Print'}
                </button>
              </div>
            </div>
          )}
        </div>
        )}
        {activeTab === 'general' && (
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
        )}
        {activeTab === 'reports' && (
        <div className="glass-card p-6 space-y-4 bg-card/30 border border-border/40 rounded-2xl md:col-span-2">
          <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2 text-foreground">
            Report Settings
          </h3>
          <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
            <div>
              <h4 className="text-sm font-semibold">Custom Generation Path</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set a custom location on your local HDD where PDF sales reports will be saved. Leave empty to use the default location.
              </p>
            </div>
            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={customReportPath}
                readOnly={true}
                placeholder="Default Location"
                className="flex-1 bg-secondary/40 border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-all text-foreground cursor-not-allowed opacity-80"
              />
              <button
                type="button"
                onClick={handleBrowseReportFolder}
                title="Browse folder"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                Browse
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
