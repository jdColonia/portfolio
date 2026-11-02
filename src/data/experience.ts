// Content of the "Experience" section (components/sections/experience): one tab per company,
// ordered from the most recent job, plus a last tab for the degree. The text comes from the
// resume, so keep it in sync with it when the resume changes. Dates are display strings already
// written in each language.
import type { Localized } from '@data/types';
import { education } from '@data/education';

/** One role held at a company: its name, period and the tasks done. */
export interface ExperienceRole {
  role: string;
  period: string;
  tasks: string[];
  /** Data-related role: gets a small accent mark after its name. */
  highlight?: boolean;
}

/** One tab of the experience section: a company (or the education block) with its roles. */
export interface ExperienceCompany {
  /** Identifier of the tab, the same in both languages. */
  id: string;
  company: string;
  /** Tab text when it should differ from the company name (e.g. the education tab). */
  tabLabel?: string;
  url?: string;
  /** Panel heading: "{title} @ {company}". */
  title: string;
  /** Overall range shown under the heading. */
  range: string;
  roles: ExperienceRole[];
  /**
   * Set while the content of this entry is not written yet. The panel then shows a "coming soon"
   * note (the `experience.pending` text in i18n/ui.ts) instead of the roles.
   */
  pending?: boolean;
  /** Education tab: free text and tags instead of roles. */
  description?: string;
  tags?: string[];
}

const ICESI_URL = 'https://www.icesi.edu.co';

/**
 * Builds the education tab from the first entry of data/education.ts, so the degree text lives
 * in one place. `tabLabel` is passed in because the tab says "Education"/"Formación" instead
 * of the university name.
 */
const educationTab = (lang: 'es' | 'en', tabLabel: string): ExperienceCompany => {
  const degree = education[lang][0];
  return {
    id: 'education',
    company: degree.institution,
    tabLabel,
    url: ICESI_URL,
    title: degree.degree,
    range: degree.year,
    roles: [],
    description: degree.description,
    tags: degree.highlights,
  };
};

/** Tabs per language. Both lists must keep the same order and ids. */
export const experience: Localized<ExperienceCompany[]> = {
  es: [
    {
      id: 'gases-de-occidente',
      company: 'Gases de Occidente',
      title: 'Practicante de Ingeniería y Proyectos',
      range: 'Agosto 2026 – Actualidad',
      roles: [
        {
          role: 'Practicante de Ingeniería y Proyectos',
          period: 'Agosto 2026 – Actualidad',
          highlight: true,
          tasks: [
            'Desarrollo una aplicación web que automatiza la preparación de la documentación de los trámites de permisos municipales, para reducir el trabajo manual y los errores',
            'Construyo tableros en Power BI para seguir la operación (órdenes de trabajo, solicitudes de clientes industriales y permisos municipales) y controlar los tiempos de servicio',
          ],
        },
      ],
    },
    {
      id: 'pistis-group',
      company: 'Pistis Group',
      title: 'Desarrollador Full Stack',
      range: 'Octubre 2025 – Febrero 2026',
      roles: [
        {
          role: 'Desarrollador Full Stack',
          period: 'Octubre 2025 – Febrero 2026',
          tasks: [
            'Desarrollé la vertical de Carpooling de la aplicación Pistis, cuidando la calidad del código, la integración de funcionalidades y el cumplimiento de los hitos de producto',
            'Implementé infraestructura con Terraform en Google Cloud Platform y configuré flujos de CI/CD para despliegues en staging y producción',
            'Gestioné las builds internas y de prueba en TestFlight y Google Play Console para validaciones internas y externas',
            'Coordiné y ejecuté la publicación oficial en App Store y Google Play, cumpliendo los requisitos de las tiendas, con un lanzamiento estable en febrero de 2026',
            'Entregué documentación técnica y repositorios organizados para la continuidad del proyecto y la transferencia de conocimiento al equipo',
          ],
        },
      ],
    },
    {
      id: 'icesi',
      company: 'Universidad Icesi',
      url: ICESI_URL,
      title: 'Monitor Académico',
      range: 'Enero 2024 – Julio 2026',
      roles: [
        {
          role: 'Monitor Académico - Monitoría general',
          period: 'Julio 2025 – Julio 2026',
          tasks: [
            'Brindé apoyo académico en Algoritmos y Programación, Ingeniería de Software, Estructuras Discretas, Sistemas Intensivos en Datos, Computación en Internet, Sistemas Operativos y Gestión de Proyectos, para fortalecer la comprensión técnica',
          ],
        },
        {
          role: 'Monitor Académico - Inteligencia Artificial I',
          period: 'Julio 2025 – Julio 2026',
          highlight: true,
          tasks: [
            'Apoyé a más de 90 estudiantes en proyectos de IA con la metodología CRISP-DM, guiando el análisis exploratorio de datos, el entrenamiento de modelos supervisados y su despliegue mediante API REST',
          ],
        },
        {
          role: 'Monitor Académico - Proyecto Integrador I',
          period: 'Julio 2024 – Julio 2026',
          tasks: [
            'Asesoré y guié a más de 150 estudiantes en más de 25 equipos, cada uno desarrollando una aplicación web full-stack con Python y Django',
            'Di retroalimentación técnica y de arquitectura en todas las fases: modelado de bases de datos, diseño de API RESTful y lógica modular de backend',
            'Revisé y asesoré más de 25 tableros de Jira, verificando historias de usuario escritas desde la perspectiva del usuario final y ligadas a las tareas de desarrollo',
            'Coordiné talleres de GitHub sobre branching, revisiones de pull requests, estándares de commits y flujos colaborativos',
            'Supervisé la calidad del código, las pruebas, la depuración y el despliegue para que los equipos entregaran aplicaciones funcionales y optimizadas al final del semestre',
          ],
        },
        {
          role: 'Monitor Académico - Computación en Internet I',
          period: 'Enero 2025 – Junio 2025',
          tasks: [
            'Acompañé a más de 30 estudiantes en el modelo OSI, la inspección de paquetes con Wireshark y la comunicación mediante sockets',
            'Impartí talleres prácticos sobre servicios RESTful y modelos cliente-servidor con JavaScript, Express.js, HTML y CSS',
          ],
        },
        {
          role: 'Monitor Académico - Matemáticas Aplicadas I',
          period: 'Enero 2024 – Junio 2024',
          tasks: [
            'Brindé apoyo personalizado a estudiantes que usaban Python para resolver problemas de series, secuencias, derivadas y optimización',
            'Desarrollé estrategias de enseñanza inclusivas, incluida la mentoría a un estudiante con discapacidad visual para que programara en Python con herramientas de asistencia',
          ],
        },
      ],
    },
    educationTab('es', 'Formación'),
  ],
  en: [
    {
      id: 'gases-de-occidente',
      company: 'Gases de Occidente',
      title: 'Engineering and Projects Intern',
      range: 'Aug 2026 – Present',
      roles: [
        {
          role: 'Engineering and Projects Intern',
          period: 'Aug 2026 – Present',
          highlight: true,
          tasks: [
            'Develop a web application that automates the documentation for municipal permit applications, to reduce manual work and errors',
            'Build Power BI dashboards to monitor operations (work orders, industrial customer requests, and municipal permits) and control service times',
          ],
        },
      ],
    },
    {
      id: 'pistis-group',
      company: 'Pistis Group',
      title: 'Full Stack Developer',
      range: 'Oct 2025 – Feb 2026',
      roles: [
        {
          role: 'Full Stack Developer',
          period: 'Oct 2025 – Feb 2026',
          tasks: [
            'Developed the Carpooling vertical of the Pistis app, ensuring code quality, feature integration, and delivery of product milestones',
            'Implemented infrastructure with Terraform on Google Cloud Platform and set up CI/CD pipelines for staging and production deployments',
            'Managed internal and test builds on TestFlight and Google Play Console for internal and external validation',
            'Coordinated and executed the official release on the App Store and Google Play, meeting store requirements, with a stable launch in February 2026',
            'Delivered technical documentation and well-organized repositories for project continuity and knowledge transfer to the team',
          ],
        },
      ],
    },
    {
      id: 'icesi',
      company: 'Universidad Icesi',
      url: ICESI_URL,
      title: 'Teaching Assistant',
      range: 'Jan 2024 – Jul 2026',
      roles: [
        {
          role: 'Teaching Assistant - General',
          period: 'Jul 2025 – Jul 2026',
          tasks: [
            'Provided academic support in Algorithms and Programming, Software Engineering, Discrete Structures, Data-Intensive Systems, Internet Computing, Operating Systems, and Project Management, strengthening technical understanding',
          ],
        },
        {
          role: 'Teaching Assistant - Artificial Intelligence I',
          period: 'Jul 2025 – Jul 2026',
          highlight: true,
          tasks: [
            'Supported 90+ students in AI projects using CRISP-DM, guiding exploratory data analysis, supervised model training, and deployment through REST APIs',
          ],
        },
        {
          role: 'Teaching Assistant - Integrative Project I',
          period: 'Jul 2024 – Jul 2026',
          tasks: [
            'Advised and mentored 150+ students in 25+ teams, each building a full-stack web application with Python and Django',
            'Gave technical and architectural feedback across every phase: database modeling, RESTful API design, and modular backend logic',
            'Reviewed and advised on 25+ Jira boards, checking that user stories were written from the end-user perspective and mapped to development tasks',
            'Led GitHub workshops on branching, pull request reviews, commit standards, and collaborative workflows',
            'Oversaw code quality, testing, debugging, and deployment so teams delivered functional, optimized applications by the end of the semester',
          ],
        },
        {
          role: 'Teaching Assistant - Internet Computing I',
          period: 'Jan 2025 – Jun 2025',
          tasks: [
            'Guided 30+ students through the OSI model, packet inspection with Wireshark, and socket communication',
            'Taught hands-on workshops on RESTful services and client-server models with JavaScript, Express.js, HTML, and CSS',
          ],
        },
        {
          role: 'Teaching Assistant - Applied Mathematics I',
          period: 'Jan 2024 – Jun 2024',
          tasks: [
            'Provided one-on-one support to students using Python for series, sequences, derivatives, and optimization problems',
            'Designed inclusive teaching strategies, including mentoring a visually impaired student to program in Python with assistive tools',
          ],
        },
      ],
    },
    educationTab('en', 'Education'),
  ],
};
