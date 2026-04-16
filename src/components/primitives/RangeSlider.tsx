'use client';

import type React from 'react';

export interface RangeSliderProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  displayValue?: string;
}

export function RangeSlider({
  label,
  displayValue,
  id,
  className = '',
  ...props
}: RangeSliderProps) {
  return (
    <div className="flex items-center gap-2 w-full">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-bold whitespace-nowrap"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type="range"
        className={['flex-1 accent-blue-500', className].join(' ')}
        {...props}
      />
      {displayValue !== undefined && (
        <span className="text-sm font-mono font-bold w-12 text-right">
          {displayValue}
        </span>
      )}
    </div>
  );
}
