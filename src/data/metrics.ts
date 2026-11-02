/**
 * @file The four figures of the "About me" section, styled as the result of a SQL query
 * (components/sections/about/Metrics.astro), which counts each number up when it scrolls into view.
 */

import type { Localized } from '@data/types';

/** One figure: the number that is counted up, an optional suffix such as "+", and its label. */
export interface Metric {
  value: number;
  suffix?: string;
  label: string;
}

/**
 * Months of work experience, computed when the site is built so it keeps growing on its own.
 * The Pistis Group job (Oct 2025 - Feb 2026) is a fixed 5 months. The Gases de Occidente job
 * started in Aug 2026 and is still ongoing, so the whole months elapsed since then are added.
 * Update this function if that job ends or a new one starts.
 */
const workMonths = (): number => {
  // Month index 7 is August (JavaScript months start at 0).
  const start = new Date(2026, 7, 1);
  const now = new Date();
  const elapsed =
    (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  return 5 + Math.max(0, elapsed);
};

/**
 * The metrics per language, in display order. The footnote "4 rows" in i18n/ui.ts
 * (`metrics.footnote`) assumes there are exactly four.
 */
export const metrics: Localized<Metric[]> = {
  es: [
    { value: 270, suffix: '+', label: 'estudiantes guiados' },
    { value: 9, suffix: '', label: 'semestres en Lista de Honor' },
    { value: 2, suffix: '+', label: 'años como monitor' },
    { value: workMonths(), suffix: '+', label: 'meses de experiencia laboral' },
  ],
  en: [
    { value: 270, suffix: '+', label: 'students mentored' },
    { value: 9, suffix: '', label: "semesters on the Dean's List" },
    { value: 2, suffix: '+', label: 'years as a teaching assistant' },
    { value: workMonths(), suffix: '+', label: 'months of work experience' },
  ],
};
