import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const THEME_CHOICES = ['system', 'light', 'dark'] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

const STORAGE_KEY = 'theme';

export function isThemeChoice(value: string | null): value is ThemeChoice {
  return THEME_CHOICES.some((choice) => choice === value);
}

/**
 * The visitor's theme choice.  'system' follows prefers-color-scheme; 'light'
 * and 'dark' pin a theme through data-theme on <html>.  The inline script in
 * index.html applies a saved choice before first paint.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly choice = signal<ThemeChoice>(this.readStoredChoice());

  select(choice: ThemeChoice): void {
    this.choice.set(choice);
    const root = this.document.documentElement;
    if (choice === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', choice);
    }
    this.store(choice);
  }

  private readStoredChoice(): ThemeChoice {
    if (!this.isBrowser) {
      return 'system';
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return isThemeChoice(stored) ? stored : 'system';
    } catch {
      return 'system';
    }
  }

  private store(choice: ThemeChoice): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Storage is unavailable (private window, blocked site data): the choice lasts for this visit.
    }
  }
}
