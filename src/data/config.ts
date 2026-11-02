export const SITE_CONFIG = {
  name: 'Juan David Colonia Aldana',
  title: {
    es: 'Juan David Colonia — Datos y Software',
    en: 'Juan David Colonia — Data & Software',
  },
  description: {
    es: 'Ingeniero de Sistemas. Construyo pipelines y tableros de datos, y desarrollo aplicaciones web y móviles.',
    en: 'Systems Engineer. I build data pipelines and dashboards, and develop web and mobile apps.',
  },
  email: 'juandavidcoloniaaldana@gmail.com',
  linkedin: 'https://www.linkedin.com/in/juan-david-colonia-aldana-733051209',
  github: 'https://github.com/jdColonia',
  medium: 'https://medium.com/@juandavidcoloniaaldana',
  logo: '/logo.svg',
  cvEs: '/CV-JUAN-DAVID-COLONIA-ALDANA-ES.pdf',
  cvEn: '/CV-JUAN-DAVID-COLONIA-ALDANA-EN.pdf',
};

export interface SocialLink {
  name: string;
  url: string;
  /** astro-icon id. */
  icon: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { name: 'GitHub', url: SITE_CONFIG.github, icon: 'tabler:brand-github' },
  { name: 'LinkedIn', url: SITE_CONFIG.linkedin, icon: 'tabler:brand-linkedin' },
  { name: 'Medium', url: SITE_CONFIG.medium, icon: 'tabler:brand-medium' },
];

/** Clean-URL slugs of the home page sections. Each one is generated as a static route. */
export const SECTION_SLUGS = ['sobre-mi', 'stack', 'experiencia', 'proyectos', 'contacto'] as const;
