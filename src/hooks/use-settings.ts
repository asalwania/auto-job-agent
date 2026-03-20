'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'job-agent-settings';

export interface AppSettings {
  // Search preferences
  jobTitles: string[];
  locations: string[];
  remoteOnly: boolean;
  minAtsScore: number;
  sources: Record<string, boolean>;

  // Automation
  autoApply: boolean;
  scrapeSchedule: 'manual' | 'daily' | 'twice-daily';

  // Notifications
  notifyEmail: string;
  notifyHighScore: boolean;
  notifyApplicationSent: boolean;
  notifyInterview: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  jobTitles: ['Senior Frontend Engineer', 'Full Stack Developer'],
  locations: ['India', 'Remote'],
  remoteOnly: true,
  minAtsScore: 75,
  sources: {
    linkedin: true,
    naukri: true,
    greenhouse: true,
    lever: true,
    wellfound: true,
  },
  autoApply: false,
  scrapeSchedule: 'manual',
  notifyEmail: '',
  notifyHighScore: true,
  notifyApplicationSent: true,
  notifyInterview: true,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch {
      // Ignore parse errors
    }
    setLoaded(true);
  }, []);

  const save = useCallback((updated: AppSettings) => {
    setSettings(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const update = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      save({ ...settings, [key]: value });
    },
    [settings, save],
  );

  return { settings, update, save, loaded };
}
