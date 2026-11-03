/**
 * @file Site-wide settings: identity, contact links, resume files and the list of home section
 * slugs.
 *
 * Text that depends on the language is a `Localized` object ({ es, en }); the rest is shared.
 */

/**
 * Identity and contact data used by the page <head>, the footer, the dock and the hero.
 * `title` and `description` are the default meta tags of the home page (see HomePage.astro).
 */
export const SITE_CONFIG = {
  name: 'Juan David Colonia Aldana',
  title: {
    es: 'Juan David Colonia Aldana — Datos y Software',
    en: 'Juan David Colonia Aldana — Data & Software',
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
  // Resume PDFs, served from public/. The paths start with "/", so strip it before passing them
  // to withBase(), which adds the deployment base. Keep them in sync with the CV sources.
  cvEs: '/CV-JUAN-DAVID-COLONIA-ALDANA-ES.pdf',
  cvEn: '/CV-JUAN-DAVID-COLONIA-ALDANA-EN.pdf',
};

/** A profile link shown in the footer, the contact section and the side dock. */
export interface SocialLink {
  name: string;
  url: string;
  /** Iconify id rendered by astro-icon (the `Icon` component), e.g. `tabler:brand-github`. */
  icon: string;
}

/** Social profiles, in the default display order (the contact section picks its own order). */
export const SOCIAL_LINKS: SocialLink[] = [
  { name: 'GitHub', url: SITE_CONFIG.github, icon: 'tabler:brand-github' },
  { name: 'LinkedIn', url: SITE_CONFIG.linkedin, icon: 'tabler:brand-linkedin' },
  { name: 'Medium', url: SITE_CONFIG.medium, icon: 'tabler:brand-medium' },
];

/**
 * Clean-URL slugs of the home page sections. Each one becomes a static route, in both languages
 * (pages/[section].astro and pages/en/[section].astro). They match the section ids that the
 * header uses to scroll and to highlight the active link.
 */
export const SECTION_SLUGS = ['sobre-mi', 'stack', 'experiencia', 'proyectos', 'contacto'] as const;
