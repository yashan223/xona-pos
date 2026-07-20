import { useState } from 'react';
import { Settings, Globe, Calculator, Folder, FolderOpen } from 'lucide-react';
import { useTranslation } from '@/lib/translations';
import { useNotification } from '@/context/NotificationContext';
export default function SettingsPage() {
  const { t, lang, setLanguage } = useTranslation();
  const { toast } = useNotification();
  const [activeTab, setActiveTab] = useState<'general' | 'tax' | 'reports'>('general');
  const tabs = [
    { id: 'general', label: t('appLanguage') || 'General', icon: Globe },
    { id: 'tax', label: t('taxVatSettings') || 'Tax & VAT', icon: Calculator },
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
    if (!(window as any).electronDB?.browseDbFolder) {
      toast.error('Folder picker is only available in the desktop app.');
      return;
    }
    const selected = await (window as any).electronDB.browseDbFolder();
    if (selected) {
      setCustomReportPath(selected);
      localStorage.setItem('customReportPath', selected);
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
          Configure application defaults, VAT rates, and localization
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
