/**
 * @file Projects shown in the horizontal gallery of the home page (components/sections/projects).
 *
 * Each project is written once per language. The tech stack lists and the images are shared
 * constants used by both entries, so they cannot drift apart between languages.
 */

import type { ImageMetadata } from 'astro';
import type { Localized } from '@data/types';
import qversityImage from '@assets/projects/qversity-executive-overview.webp';
import microTodoImage from '@assets/projects/project1.webp';
import cozamImage from '@assets/projects/project2.webp';

/**
 * Group a project belongs to. The gallery lists projects by group, with a divider and a caption
 * for each one. A group with no projects does not appear, so a project only needs
 * `track: 'software'` to create the software group.
 */
export type ProjectTrack = 'data' | 'software' | 'platform';

/** One project card. */
export interface Project {
  /** Stable identifier, the same in both languages. Sent with the `project_click` event. */
  id: string;
  track: ProjectTrack;
  title: string;
  summary: string;
  /** Technology names. Names found in techIcons.ts get their icon next to them. */
  stack: string[];
  /**
   * Image imported from src/assets, so Astro can generate responsive sizes at build time.
   * Without it, the card shows a placeholder.
   */
  image?: ImageMetadata;
  github?: string;
  demo?: string;
  /** 'upcoming' shows a "Coming soon" label on the card. */
  status: 'live' | 'upcoming';
}

// Tech stacks are shared by the Spanish and English entries below.
const microTodoStack = [
  'Azure',
  'Terraform',
  'Docker',
  'GitHub Actions',
  'Go',
  'Node.js',
  'Spring Boot',
  'Vue.js',
  'Prometheus',
  'Grafana',
];

const cozamStack = [
  'Java',
  'Spring Boot',
  'Kubernetes',
  'Terraform',
  'Azure',
  'GCP',
  'Jenkins',
  'Prometheus',
  'Grafana',
  'Ansible',
];

const qversityStack = ['Airflow', 'PySpark', 'dbt', 'PostgreSQL', 'Power BI', 'Docker'];

/** Projects per language, in display order within each track. */
export const projects: Localized<Project[]> = {
  es: [
    {
      id: 'qversity-elt-fintech',
      track: 'data',
      title: 'Plataforma ELT Fintech LATAM',
      summary:
        'Pipeline ELT contenerizado para datos fintech de 7 países de LATAM, con arquitectura medallón: Airflow orquesta, PySpark y dbt modelan un esquema estrella en PostgreSQL y un tablero de Power BI responde 24 preguntas de negocio. Proyecto final de Qversity 2026.',
      stack: qversityStack,
      image: qversityImage,
      github: 'https://github.com/jdColonia/qversity-data-2026-cali-juancolonia',
      status: 'live',
    },
    {
      id: 'microtodosuite',
      track: 'platform',
      title: 'MicroTodoSuite',
      summary:
        'Microservicios en Azure con Terraform, CI/CD en GitHub Actions y observabilidad con Prometheus y Grafana: despliegues reproducibles y métricas de producción.',
      stack: microTodoStack,
      image: microTodoImage,
      github: 'https://github.com/MicroTodoSuite/',
      status: 'live',
    },
    {
      id: 'ecommercecozam',
      track: 'platform',
      title: 'EcommerceCoZam',
      summary:
        'E-commerce de microservicios en Kubernetes sobre Azure y GCP, con pipelines de Jenkins, pruebas automatizadas, SonarQube y Trivy: calidad y seguridad dentro del flujo de entrega.',
      stack: cozamStack,
      image: cozamImage,
      github: 'https://github.com/EcommerceCoZam',
      status: 'live',
    },
  ],
  en: [
    {
      id: 'qversity-elt-fintech',
      track: 'data',
      title: 'LATAM Fintech ELT platform',
      summary:
        'Containerized ELT pipeline for fintech data from 7 LATAM countries, with a medallion architecture: Airflow orchestrates, PySpark and dbt model a star schema in PostgreSQL, and a Power BI dashboard answers 24 business questions. My Qversity 2026 capstone.',
      stack: qversityStack,
      image: qversityImage,
      github: 'https://github.com/jdColonia/qversity-data-2026-cali-juancolonia',
      status: 'live',
    },
    {
      id: 'microtodosuite',
      track: 'platform',
      title: 'MicroTodoSuite',
      summary:
        'Microservices on Azure with Terraform, CI/CD on GitHub Actions, and observability with Prometheus and Grafana: reproducible deployments and production metrics.',
      stack: microTodoStack,
      image: microTodoImage,
      github: 'https://github.com/MicroTodoSuite/',
      status: 'live',
    },
    {
      id: 'ecommercecozam',
      track: 'platform',
      title: 'EcommerceCoZam',
      summary:
        'Microservices e-commerce on Kubernetes across Azure and GCP, with Jenkins pipelines, automated tests, SonarQube, and Trivy: quality and security built into delivery.',
      stack: cozamStack,
      image: cozamImage,
      github: 'https://github.com/EcommerceCoZam',
      status: 'live',
    },
  ],
};
