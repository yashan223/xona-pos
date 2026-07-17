import { useState } from 'react';
import { Settings, Info } from 'lucide-react';
import { useTranslation } from '@/lib/translations';

export default function SettingsPage() {
  const { t, lang, setLanguage } = useTranslation();

  const [vatEnabled, setVatEnabled] = useState(() => {
    const saved = localStorage.getItem('vatEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [vatPercentage, setVatPercentage] = useState(() => {
    const saved = localStorage.getItem('vatPercentage');
    return saved !== null ? parseFloat(saved) : 15;
  });

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

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

      {feedbackMsg && (
        <div
          className={`p-3 rounded-lg flex items-center gap-2 border text-xs animate-fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          }`}
        >
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      <div className="glass-card p-6 space-y-6 bg-card/30 border border-border/40 rounded-2xl max-w-xl">
        <div className="space-y-6">
          {/* VAT Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/50">
            <div>
              <h4 className="text-sm font-semibold text-foreground">{t('enableVat')}</h4>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[280px]">
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
                  showFeedback('success', `VAT calculations ${val ? 'enabled' : 'disabled'} successfully.`);
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

          {/* Language Settings */}
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
                  {l === 'en' ? 'English' : 'සිංහල (Sinhala)'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
