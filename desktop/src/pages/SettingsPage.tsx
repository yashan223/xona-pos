import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useTranslation } from '@/lib/translations';
import { useNotification } from '@/context/NotificationContext';

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



  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          {t('systemSettings')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure application defaults, VAT rates, and localization preferences
        </p>
      </div>



      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
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

        {/* Language Settings Card */}
        <div className="glass-card p-6 space-y-4 bg-card/30 border border-border/40 rounded-2xl h-fit">
          <h3 className="text-base font-semibold flex items-center gap-2 border-b border-border/50 pb-2 text-foreground">
            {t('appLanguage')}
          </h3>
          
          <div className="space-y-4">
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
    </div>
  );
}
