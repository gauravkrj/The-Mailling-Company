import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  status: string;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const s = status.toUpperCase();

  const styles: Record<string, string> = {
    SENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    SENDING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    QUEUED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    DRAFT: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    PAUSED: 'bg-orange-50 text-orange-700 border-orange-200',
    FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
    BOUNCED: 'bg-rose-50 text-rose-700 border-rose-200',
    UNSUBSCRIBED: 'bg-neutral-100 text-neutral-500 border-neutral-200',
    CANCELLED: 'bg-neutral-100 text-neutral-500 border-neutral-200',
  };

  const currentStyle = styles[s] || 'bg-neutral-100 text-neutral-600 border-neutral-200';

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize tracking-tight',
        currentStyle
      )}
    >
      {s.toLowerCase()}
    </span>
  );
};
