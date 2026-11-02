/**
 * @file Academic background.
 *
 * It is not rendered on its own: experience.ts reads the first entry and shows it as the last tab
 * ("Education") of the experience section.
 */

import type { Localized } from '@data/types';

/** One degree. `year` is the display range, `highlights` become the tags shown under it. */
export interface Education {
  degree: string;
  institution: string;
  year: string;
  description: string;
  highlights: string[];
}

/** Degrees per language. Only the first entry of each list is used by the experience tab. */
export const education: Localized<Education[]> = {
  es: [
    {
      degree: 'Ingeniería de Sistemas',
      institution: 'Universidad Icesi',
      year: 'Enero 2022 – Marzo 2027',
      description:
        'Lista de Honor durante nueve semestres consecutivos (2022-1 a 2026-1). Becas de Honor y Oro de la Universidad Icesi y beca Generación E del Gobierno de Colombia.',
      highlights: [
        'Ingeniería de Datos',
        'Ciencia de Datos',
        'Arquitectura de Software',
        'Inteligencia Artificial',
        'Computación en la Nube',
      ],
    },
  ],
  en: [
    {
      degree: 'B.Sc. in Systems Engineering',
      institution: 'Universidad Icesi',
      year: 'Jan 2022 – Mar 2027',
      description:
        "Dean's List for nine consecutive semesters (2022-1 to 2026-1). Recipient of the Honor and Gold Scholarships from Universidad Icesi and the Generación E Scholarship from the Government of Colombia.",
      highlights: [
        'Data Engineering',
        'Data Science',
        'Software Architecture',
        'Artificial Intelligence',
        'Cloud Computing',
      ],
    },
  ],
};
