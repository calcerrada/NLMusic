'use client';

import type React from 'react';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function Card({ children, title, className = '' }: CardProps) {
  return (
    <div
      className={[
        'bg-dark-50 rounded border border-gray-700 p-4',
        className,
      ].join(' ')}
    >
      {title && (
        <h2 className="text-xs font-bold uppercase text-gray-400 mb-3">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
