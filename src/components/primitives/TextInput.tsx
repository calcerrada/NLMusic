'use client';

import type React from 'react';

export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export function TextInput({ className = '', ...props }: TextInputProps) {
  return (
    <input
      className={[
        'flex-1 px-3 py-2',
        'bg-dark-50 border border-gray-600 rounded',
        'text-white placeholder:text-gray-500',
        'disabled:opacity-50',
        'focus:outline-none focus:border-gray-400',
        className,
      ].join(' ')}
      {...props}
    />
  );
}
