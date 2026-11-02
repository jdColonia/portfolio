// Interface text (menus, buttons, labels, meta tags) in Spanish and English.
// Longer content such as projects, experience or the manifesto lives in src/data instead, as
// `Localized` objects. Components read these strings through `useTranslations()` in ./utils.ts.

/** Language names as shown to visitors. Same list as `languages`; nothing imports it right now. */
export const locales = {
  es: 'Español',
  en: 'English',
};

/** Language names shown in the language picker, each written in its own language. */
export const languages = {
  es: 'Español',
  en: 'English',
};

/** Language used for URLs without a prefix, and as a fallback for missing strings. */
export const defaultLang = 'es';

/**
 * Dictionary of interface strings, one object per language. Keys are grouped by where they are
 * used and namespaced with dots (`nav.*`, `hero.*`, `cv.*`...).
 * The Spanish object defines the valid keys (see `useTranslations`), so every key added there
 * should also be added to the English one to keep both languages in sync.
 */
export const ui = {
  es: {
    'nav.about': 'Sobre mí',
    'nav.stack': 'Stack',
    'nav.experience': 'Experiencia',
    'nav.projects': 'Proyectos',
    'nav.contact': 'Contacto',
    'nav.cv': 'CV',

    'hero.badge': 'Disponible para trabajar',
    'hero.subtitle': 'Ingeniero de Sistemas · Datos y Software',
    'hero.tagline': 'Construir. Desplegar. Analizar.',
    'hero.description':
      'Construyo pipelines y tableros que convierten datos crudos en decisiones, y desarrollo aplicaciones web y móviles de punta a punta. Soy Databricks Certified Data Engineer Associate.',
    'hero.cta-projects': 'Ver proyectos',
    'hero.download-cv': 'Descargar CV',

    'section.experience': 'Experiencia',
    'section.projects': 'Proyectos',
    'section.stack': 'Con qué construyo',
    'section.certifications': 'Certificaciones y bootcamps',
    'certifications.group.certs': 'Certificaciones',
    'certifications.group.bootcamps': 'Bootcamps',

    // The metrics block is styled as a SQL result: a fake query above and a row count below.
    // The "4 rows" must match the number of entries in data/metrics.ts.
    'metrics.query': 'SELECT metric, value FROM juan.impacto;',
    'metrics.footnote': '4 rows · 0.02s',

    // Keys ending in ".aria" are accessible names read by screen readers, not visible text.
    'stack.aria': 'Herramientas por área',

    'experience.aria': 'Experiencia y formación',
    'experience.pending': 'Estoy documentando los proyectos de esta práctica. Detalles muy pronto.',

    'projects.intro': 'Proyectos de ingeniería de datos, desarrollo de software y cloud.',
    'projects.track.data': 'Datos',
    'projects.track.data.desc': 'Pipelines, modelos y tableros.',
    'projects.track.software': 'Software',
    'projects.track.software.desc': 'Aplicaciones web, móviles y APIs.',
    'projects.track.platform': 'Plataforma y cloud',
    'projects.track.platform.desc': 'Infraestructura, CI/CD y observabilidad.',
    'projects.soon': 'Próximamente',
    'projects.github': 'Repositorio en GitHub de',
    'projects.demo': 'Ver proyecto',

    'dock.social': 'Redes sociales y correo',
    'dock.mail': 'Enviar correo',

    'zoom.word': '¿Hablamos?',

    'contact.line1': 'Hablemos de',
    'contact.line2': 'tu próximo proyecto',
    'contact.description':
      'Busco mi siguiente rol en ingeniería de datos o desarrollo de software. Escríbeme y te respondo pronto.',
    'contact.copy': 'Copiar correo al portapapeles',
    'contact.copied': 'Copiado',

    'footer.links': 'Enlaces',

    'cv.meta-title': 'Hoja de vida — Juan David Colonia',
    'cv.meta-description':
      'Hoja de vida de Juan David Colonia, Ingeniero de Sistemas en datos y software.',
    'cv.title': 'Hoja de vida',
    'cv.lead': 'Ingeniero de Sistemas · Datos y Software. Descárgala o léela aquí.',
    'cv.open': 'Abrir en otra pestaña',
    'cv.fallback': 'Tu navegador no muestra PDF aquí.',
    'cv.back': '← Volver al inicio',
  },
  en: {
    'nav.about': 'About',
    'nav.stack': 'Stack',
    'nav.experience': 'Experience',
    'nav.projects': 'Projects',
    'nav.contact': 'Contact',
    'nav.cv': 'Resume',

    'hero.badge': 'Open to work',
    'hero.subtitle': 'Systems Engineer · Data & Software',
    'hero.tagline': 'Build. Deploy. Analyze.',
    'hero.description':
      "I build pipelines and dashboards that turn raw data into decisions, and I develop web and mobile apps end to end. I'm a Databricks Certified Data Engineer Associate.",
    'hero.cta-projects': 'See projects',
    'hero.download-cv': 'Download resume',

    'section.experience': 'Experience',
    'section.projects': 'Projects',
    'section.stack': 'What I build with',
    'section.certifications': 'Certifications & bootcamps',
    'certifications.group.certs': 'Certifications',
    'certifications.group.bootcamps': 'Bootcamps',

    'metrics.query': 'SELECT metric, value FROM juan.impact;',
    'metrics.footnote': '4 rows · 0.02s',

    'stack.aria': 'Tools by area',

    'experience.aria': 'Experience and education',
    'experience.pending': "I'm documenting the projects from this internship. Details coming soon.",

    'projects.intro': 'Data engineering, software development, and cloud projects.',
    'projects.track.data': 'Data',
    'projects.track.data.desc': 'Pipelines, models, and dashboards.',
    'projects.track.software': 'Software',
    'projects.track.software.desc': 'Web and mobile apps, and APIs.',
    'projects.track.platform': 'Platform and cloud',
    'projects.track.platform.desc': 'Infrastructure, CI/CD, and observability.',
    'projects.soon': 'Coming soon',
    'projects.github': 'GitHub repository for',
    'projects.demo': 'View project',

    'dock.social': 'Social links and email',
    'dock.mail': 'Send email',

    'zoom.word': "Let's talk",

    'contact.line1': "Let's talk about",
    'contact.line2': 'your next project',
    'contact.description':
      "I'm looking for my next role in data engineering or software development. Write to me and I'll reply soon.",
    'contact.copy': 'Copy email to clipboard',
    'contact.copied': 'Copied',

    'footer.links': 'Links',

    'cv.meta-title': 'Resume — Juan David Colonia',
    'cv.meta-description': 'Resume of Juan David Colonia, Systems Engineer in data and software.',
    'cv.title': 'Resume',
    'cv.lead': 'Systems Engineer · Data & Software. Download it or read it here.',
    'cv.open': 'Open in a new tab',
    'cv.fallback': "Your browser can't show the PDF here.",
    'cv.back': '← Back to home',
  },
} as const;
