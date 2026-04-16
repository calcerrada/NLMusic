'use client';

import type React from 'react';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  activeClassName?: string;
  inactiveClassName?: string;
}

export function IconButton({
  active = false,
  activeClassName = 'bg-red-900 text-red-200',
  inactiveClassName = 'bg-gray-700 text-gray-300 hover:bg-gray-600',
  children,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      className={[
        'px-2 py-1 text-xs font-bold rounded transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        active ? activeClassName : inactiveClassName,
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
