import type { Localized } from '@data/types';

export interface Metric {
  value: number;
  suffix?: string;
  label: string;
}

/**
 * Months of work experience: Pistis Group (Oct 2025 - Feb 2026) counts 5; Gases de Occidente
 * started in Aug 2026 and is ongoing, so add the whole months elapsed since then.
 */
const workMonths = (): number => {
  const start = new Date(2026, 7, 1);
  const now = new Date();
  const elapsed =
    (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  return 5 + Math.max(0, elapsed);
};

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
