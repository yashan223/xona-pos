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

  const btnPadding = size === 'sm' ? 'px-2 py-1' : 'px-2.5 py-1.5';
  const iconSize = size === 'sm' ? 14 : 16;
  const inputWidth = size === 'sm' ? 'w-16 text-xs' : 'w-20 text-sm';

  return (
    <div className={`inline-flex items-center rounded-xl border border-primary/40 bg-background shadow-md transition-all hover:border-primary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={min !== undefined && numVal <= min}
        className={`${btnPadding} rounded-lg bg-secondary text-foreground hover:bg-primary/20 hover:text-primary active:scale-95 disabled:opacity-30 disabled:hover:bg-secondary disabled:hover:text-foreground disabled:active:scale-100 transition-all select-none cursor-pointer flex items-center justify-center font-bold`}
        title="Decrease"
      >
        <Minus size={iconSize} strokeWidth={2.5} />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value === '' ? '' : numVal}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`${inputWidth} bg-transparent text-center font-mono font-bold text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-1`}
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={max !== undefined && numVal >= max}
        className={`${btnPadding} rounded-lg bg-secondary text-foreground hover:bg-primary/20 hover:text-primary active:scale-95 disabled:opacity-30 disabled:hover:bg-secondary disabled:hover:text-foreground disabled:active:scale-100 transition-all select-none cursor-pointer flex items-center justify-center font-bold`}
        title="Increase"
      >
        <Plus size={iconSize} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default NumericUpDown;
