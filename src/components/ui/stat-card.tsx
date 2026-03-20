'use client';

import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon?: LucideIcon;
}

export function StatCard({ label, value, delta, deltaLabel, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted font-medium">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-muted" />}
      </div>

      <div className="font-mono text-3xl font-bold tracking-tight text-foreground">{value}</div>

      {delta != null && (
        <div className="flex items-center gap-1.5 text-xs">
          {delta >= 0 ? (
            <TrendingUp className="h-3 w-3 text-success" />
          ) : (
            <TrendingDown className="h-3 w-3 text-danger" />
          )}
          <span className={delta >= 0 ? 'text-success' : 'text-danger'}>
            {delta >= 0 ? '+' : ''}
            {delta}
          </span>
          {deltaLabel && <span className="text-muted">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}
