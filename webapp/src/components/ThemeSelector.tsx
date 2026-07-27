import { useTheme, ThemeId } from '@/context/ThemeContext';
import { Check, Sparkles, Palette, ShieldCheck } from 'lucide-react';

interface ThemeSelectorProps {
  compact?: boolean;
}

export default function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="space-y-6">
      {!compact && (
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              System Color Theme
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize the visual palette for navigation, buttons, status badges, and active rings.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            6 Themes Available
          </span>
        </div>
      )}

      {/* Grid of Theme Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((t) => {
          const isActive = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id as ThemeId)}
              className={`group relative text-left p-4 rounded-2xl transition-all duration-200 cursor-pointer border ${
                isActive
                  ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/40 scale-[1.01]'
                  : 'bg-secondary/20 border-border/50 hover:bg-secondary/40 hover:border-border hover:scale-[1.005]'
              }`}
            >
              {/* Active Indicator Badge */}
              {isActive && (
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-md shadow-primary/30">
                  <Check className="w-3 h-3 stroke-[3]" />
                  ACTIVE
                </div>
              )}

              {/* Color Swatch & Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex items-center -space-x-2 shrink-0 pt-0.5">
                  <span
                    className="w-6 h-6 rounded-full border-2 border-background shadow-md transition-transform group-hover:scale-110"
                    style={{ backgroundColor: t.primaryColor }}
                    title={`Primary: ${t.primaryColor}`}
                  />
                  <span
                    className="w-6 h-6 rounded-full border-2 border-background shadow-md transition-transform group-hover:scale-110"
                    style={{ backgroundColor: t.accentColor }}
                    title={`Accent: ${t.accentColor}`}
                  />
                </div>
                <div className="pr-12">
                  <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {t.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {t.tagline}
                  </p>
                </div>
              </div>

              {/* Theme Preview Swatch Bar */}
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-secondary/60">
                <div
                  className="h-full w-2/3 transition-all"
                  style={{ backgroundColor: t.primaryColor }}
                />
                <div
                  className="h-full w-1/3 transition-all"
                  style={{ backgroundColor: t.accentColor }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Component Preview Widget */}
      {!compact && (
        <div className="p-5 rounded-2xl glass-card bg-card/40 border border-border/50 space-y-3 mt-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Live Theme Preview
            </span>
            <span className="text-xs text-muted-foreground italic">
              Active: <strong className="text-foreground capitalize">{theme}</strong>
            </span>
          </div>

          <div className="p-4 rounded-xl bg-background/60 border border-border/40 flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all cursor-default"
            >
              Primary Action
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-secondary border border-border/60 text-foreground text-xs font-semibold hover:bg-secondary/80 transition-all cursor-default"
            >
              Secondary Action
            </button>

            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Status Badge
            </span>

            <input
              type="text"
              readOnly
              value="Sample Input Focus Ring"
              className="px-3 py-1.5 rounded-lg text-xs bg-secondary/30 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary text-foreground w-48 opacity-90 cursor-default"
            />
          </div>
        </div>
      )}
    </div>
  );
}
