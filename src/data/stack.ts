// The "What I build with" section (components/sections/stack/StackDomains.astro): technologies
// grouped into three areas. Technology names are not translated, so `items` is shared by both
// languages and only the label and description are localized.
import type { Localized } from '@data/types';
import { techIcons } from '@data/techIcons';

export type StackDomainId = 'software' | 'cloud' | 'data';

/** One technology tile. */
export interface StackItem {
  name: string;
  /** Iconify id taken from techIcons.ts. Missing when the technology has no registered icon. */
  icon?: string;
}

/** One area of the stack, shown as its own panel. */
export interface StackDomain {
  id: StackDomainId;
  label: Localized<string>;
  description: Localized<string>;
  items: StackItem[];
}

/**
 * Builds the tiles of a domain, looking up each icon by technology name in techIcons.ts. A name
 * that is not registered there still gets a tile, just without an icon.
 */
const items = (names: string[]): StackItem[] =>
  names.map((name) => ({ name, icon: techIcons[name] }));

/**
 * The three areas in display order: data first, because it is the main focus of the portfolio.
 * A technology can appear in more than one area (Python is in both data and software).
 */
export const stackDomains: StackDomain[] = [
  {
    id: 'data',
    label: { es: 'Datos y analítica', en: 'Data & analytics' },
    description: {
      es: 'Pipelines, bases de datos y tableros',
      en: 'Pipelines, databases, and dashboards',
    },
    items: items([
      'SQL',
      'Python',
      'Databricks',
      'PySpark',
      'Airflow',
      'dbt',
      'Power BI',
      'PostgreSQL',
      'MySQL',
      'MongoDB',
    ]),
  },
  {
    id: 'software',
    label: { es: 'Software', en: 'Software' },
    description: { es: 'Aplicaciones web, móviles y APIs', en: 'Web and mobile apps, and APIs' },
    items: items([
      'Java',
      'Python',
      'TypeScript',
      'JavaScript',
      'Kotlin',
      'Spring Boot',
      'FastAPI',
      'Flask',
      'React',
      'React Native',
      'Next.js',
      'NestJS',
      'Express.js',
      'Django',
    ]),
  },
  {
    id: 'cloud',
    label: { es: 'Cloud y DevOps', en: 'Cloud & DevOps' },
    description: {
      es: 'Infraestructura como código y entrega continua',
      en: 'Infrastructure as code and continuous delivery',
    },
    items: items([
      'GCP',
      'Azure',
      'AWS',
      'Kubernetes',
      'Docker',
      'Terraform',
      'Jenkins',
      'GitHub Actions',
      'Ansible',
      'SonarQube',
      'Prometheus',
      'Grafana',
    ]),
  },
];
