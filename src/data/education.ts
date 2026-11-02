import type { Localized } from '@data/types';

export interface Education {
  degree: string;
  institution: string;
  year: string;
  description: string;
  highlights: string[];
}

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
