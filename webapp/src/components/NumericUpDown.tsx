import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface NumericUpDownProps {
  value: number | string;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  placeholder?: string;
  size?: 'sm' | 'md';
}

export function NumericUpDown({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  className = '',
  placeholder = '0',
  size = 'sm'
}: NumericUpDownProps) {
  const numVal = typeof value === 'number' ? value : (parseInt(value || '0', 10) || 0);

  const handleDecrement = () => {
    const next = numVal - step;
    if (min !== undefined && next < min) return;
    onChange(next);
  };

  const handleIncrement = () => {
    const next = numVal + step;
    if (max !== undefined && next > max) return;
    onChange(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (isNaN(parsed)) {
      onChange(min !== undefined ? min : 0);
    } else {
      let val = parsed;
      if (min !== undefined && val < min) val = min;
      if (max !== undefined && val > max) val = max;
      onChange(val);
    }
  };

  const btnPadding = size === 'sm' ? 'p-1' : 'p-1.5';
  const iconSize = size === 'sm' ? 14 : 16;
  const inputWidth = size === 'sm' ? 'w-14 text-xs' : 'w-20 text-sm';

  return (
    <div className={`inline-flex items-center rounded-xl border border-border/50 bg-secondary/50 p-1 shadow-sm transition-all hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={min !== undefined && numVal <= min}
        className={`${btnPadding} rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent disabled:active:scale-100 transition-all select-none cursor-pointer`}
        title="Decrease"
      >
        <Minus size={iconSize} />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value === '' ? '' : numVal}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`${inputWidth} bg-transparent text-center font-mono font-bold text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={max !== undefined && numVal >= max}
        className={`${btnPadding} rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent disabled:active:scale-100 transition-all select-none cursor-pointer`}
        title="Increase"
      >
        <Plus size={iconSize} />
      </button>
    </div>
  );
}

export default NumericUpDown;
