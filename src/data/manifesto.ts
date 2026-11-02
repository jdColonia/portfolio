// Text of the "About me" section (components/sections/about/Manifesto.astro): a heading and
// three short blocks that mirror the hero tagline (Build, Deploy, Analyze).
import type { Localized } from '@data/types';

/** One of the short blocks under the heading. */
export interface ManifestoBlock {
  title: string;
  text: string;
}

export interface ManifestoContent {
  /** Small monospace line above the heading, written like a dataset name (`layer.name`). */
  path: string;
  heading: string;
  blocks: ManifestoBlock[];
}

/** Section content per language. */
export const manifesto: Localized<ManifestoContent> = {
  es: {
    path: 'bronze.sobre_mi',
    heading: 'Del código a la decisión',
    blocks: [
      {
        title: 'Construir',
        text: 'Desarrollo aplicaciones web, móviles y APIs, con pruebas y código mantenible.',
      },
      {
        title: 'Desplegar',
        text: 'Llevo esas aplicaciones a producción con Terraform, Docker, Kubernetes y CI/CD en GCP, Azure y AWS.',
      },
      {
        title: 'Analizar',
        text: 'Construyo pipelines con Airflow, PySpark y dbt, y tableros en Power BI que responden preguntas de negocio concretas.',
      },
    ],
  },
  en: {
    path: 'bronze.sobre_mi',
    heading: 'From code to decisions',
    blocks: [
      {
        title: 'Build',
        text: 'I develop web and mobile apps and APIs, with tests and maintainable code.',
      },
      {
        title: 'Deploy',
        text: 'I take them to production with Terraform, Docker, Kubernetes, and CI/CD on GCP, Azure, and AWS.',
      },
      {
        title: 'Analyze',
        text: 'I build pipelines with Airflow, PySpark, and dbt, and Power BI dashboards that answer specific business questions.',
      },
    ],
  },
};
