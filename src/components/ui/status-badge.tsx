'use client';

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  pending: {
    label: 'Pending',
    classes: 'bg-muted/20 text-muted border-muted/30',
  },
  tailoring: {
    label: 'Tailoring',
    classes: 'bg-accent/20 text-accent border-accent/30 animate-pulse-subtle',
  },
  approved: {
    label: 'Approved',
    classes: 'bg-success/20 text-success border-success/30',
  },
  applying: {
    label: 'Applying',
    classes: 'bg-warning/20 text-warning border-warning/30 animate-pulse-subtle',
  },
  applied: {
    label: 'Applied',
    classes: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  },
  failed: {
    label: 'Failed',
    classes: 'bg-danger/20 text-danger border-danger/30',
  },
  skipped: {
    label: 'Skipped',
    classes: 'bg-muted/10 text-muted/60 border-muted/20 line-through',
  },
  // Application response statuses
  viewed: {
    label: 'Viewed',
    classes: 'bg-accent/20 text-accent border-accent/30',
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-danger/20 text-danger border-danger/30',
  },
  interview: {
    label: 'Interview',
    classes: 'bg-success/20 text-success border-success/30',
  },
  offer: {
    label: 'Offer',
    classes: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    classes: 'bg-muted/20 text-muted border-muted/30',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
