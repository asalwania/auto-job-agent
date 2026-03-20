'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListTodo,
  Send,
  BarChart3,
  Settings,
  Activity,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/jobs', label: 'Jobs Queue', icon: ListTodo },
  { href: '/applications', label: 'Applications', icon: Send },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-card-border bg-surface">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-card-border px-5">
          <Activity className="h-4 w-4 text-accent" />
          <span className="font-mono text-sm font-bold tracking-tight text-foreground">
            job-agent
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'border-l-2 border-accent bg-accent/10 pl-2.5 text-accent'
                    : 'border-l-2 border-transparent text-muted hover:bg-card hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Settings + Worker status */}
        <div className="border-t border-card-border px-2 py-3 space-y-0.5">
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              pathname === '/settings'
                ? 'border-l-2 border-accent bg-accent/10 pl-2.5 text-accent'
                : 'border-l-2 border-transparent text-muted hover:bg-card hover:text-foreground'
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </Link>

          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Workers running
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
