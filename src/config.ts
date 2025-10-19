export const SITE_CONFIG = {
  name: 'Juan David Colonia Aldana',
  title: {
    es: 'Juan David Colonia - Ingeniero de Software | DevOps & AI',
    en: 'Juan David Colonia - Software Engineer | DevOps & AI',
  },
  description: {
    es: 'Ingeniero de Sistemas especializado en DevOps, Cloud Computing e Inteligencia Artificial. Transformo infraestructuras complejas en sistemas eficientes y escalables que impulsan la innovación.',
    en: 'Systems Engineer specialized in DevOps, Cloud Computing and Artificial Intelligence. I transform complex infrastructures into efficient, scalable systems that drive innovation.',
  },
  email: 'juandavidcoloniaaldana@gmail.com',
  linkedin: 'https://www.linkedin.com/in/juan-david-colonia-aldana-733051209',
  github: 'https://github.com/jdColonia',
  medium: 'https://medium.com/@juandavidcoloniaaldana',
  image: '/me.png',
  logo: '/logo.svg',
  cvEs: '/CV-JUAN-DAVID-COLONIA-ALDANA-ES.pdf',
  cvEn: '/CV-JUAN-DAVID-COLONIA-ALDANA-EN.pdf',
};

export interface SocialMedia {
  name: string;
  url: string;
  icon: string;
}

export const SOCIAL_MEDIA: SocialMedia[] = [
  {
    name: 'GitHub',
    url: SITE_CONFIG.github,
    icon: 'github',
  },
  {
    name: 'LinkedIn',
    url: SITE_CONFIG.linkedin,
    icon: 'linkedin',
  },
  {
    name: 'Medium',
    url: SITE_CONFIG.medium,
    icon: 'medium',
  },
];
