import type { Localized } from '@data/types';
import { techIcons } from '@data/techIcons';

export type StackDomainId = 'software' | 'cloud' | 'data';

export interface StackItem {
  name: string;
  /** Iconify id rendered at build time (see techIcons). */
  icon?: string;
}

export interface StackDomain {
  id: StackDomainId;
  label: Localized<string>;
  description: Localized<string>;
  items: StackItem[];
}

/** Builds the tiles of a domain, looking up each icon by name. */
const items = (names: string[]): StackItem[] =>
  names.map((name) => ({ name, icon: techIcons[name] }));

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
