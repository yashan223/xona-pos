import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
interface StatsCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'teal' | 'violet' | 'amber' | 'red' | 'green';
  delay?: number;
}
const colorMap = {
  teal: {
    bg: 'bg-primary/8',
    iconBg: 'bg-primary/15',
    icon: 'text-primary',
    badge: 'badge-teal',
  },
  violet: {
    bg: 'bg-accent/8',
    iconBg: 'bg-accent/15',
    icon: 'text-accent',
    badge: 'badge-violet',
  },
  amber: {
    bg: 'bg-warning/8',
    iconBg: 'bg-warning/15',
    icon: 'text-warning',
    badge: 'badge-amber',
  },
  red: {
    bg: 'bg-destructive/8',
    iconBg: 'bg-destructive/15',
    icon: 'text-destructive',
    badge: 'badge-red',
  },
  green: {
    bg: 'bg-success/8',
    iconBg: 'bg-success/15',
    icon: 'text-success',
    badge: 'badge-green',
  },
};
export default function StatsCard({
  title,
  value,
  suffix = '',
  icon: Icon,
  trend = 'neutral',
  trendValue,
  color = 'teal',
  delay = 0,
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState<number | string>(typeof value === 'number' ? 0 : value);
  const ref = useRef<HTMLDivElement>(null);
  const colors = colorMap[color];
  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }
    const timeout = setTimeout(() => {
      const duration = 800;
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(value * eased));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return (
    <div
      ref={ref}
      className="glass-card p-5 animate-fade-in transition-all duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
        {trend !== 'neutral' && trendValue && (
          <span className={`badge ${colors.badge} text-xs`}>
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trendValue}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold tracking-tight">
          {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
          {suffix && <span className="text-base font-normal text-muted-foreground ml-1">{suffix}</span>}
        </p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}
