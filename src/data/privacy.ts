/**
 * @file Content of the privacy policy page, in Spanish and English.
 *
 * Rendered by components/views/PrivacyPage.astro. The text `{email}` inside a paragraph is replaced
 * there with a mailto link built from `SITE_CONFIG.email`.
 */

import type { Localized } from '@data/types';

/** One section of the policy: an h2 followed by paragraphs, a bullet list and external links. */
export interface PrivacyBlock {
  /** Heading of the section. */
  title: string;
  /** Paragraphs shown before the list (or all of them when there is no list). */
  paragraphs?: string[];
  /** Bullet list shown after the paragraphs. */
  items?: string[];
  /** Paragraphs shown after the bullet list. */
  closing?: string[];
  /** External links shown at the end of the section. */
  links?: { label: string; url: string }[];
}

/** Whole policy for one language. */
export interface PrivacyContent {
  /** "Last updated" line. */
  updated: string;
  /** Short introduction under the title. */
  lead: string;
  /** Sections, in display order. */
  blocks: PrivacyBlock[];
}

/** The privacy policy, once per language. */
export const privacy: Localized<PrivacyContent> = {
  es: {
    updated: 'Última actualización: 4 de noviembre de 2026',
    lead: 'Cómo mido las visitas a este sitio y qué hago con esos datos.',
    blocks: [
      {
        title: 'Quién es el responsable',
        paragraphs: [
          'Este sitio es el portafolio personal de Juan David Colonia Aldana. Si tienes preguntas sobre esta política o sobre tus datos, escríbeme a {email}.',
        ],
      },
      {
        title: 'Qué herramienta uso',
        paragraphs: [
          'Uso Google Analytics 4, un servicio de Google LLC, para saber cuántas personas visitan el portafolio, desde dónde llegan y qué partes les interesan más.',
        ],
      },
      {
        title: 'Qué datos se recogen',
        paragraphs: ['Google Analytics registra datos de uso anónimos:'],
        items: [
          'Las páginas que visitas y las secciones del inicio que ves.',
          'Los clics en los enlaces de contacto, en los proyectos y en la hoja de vida (cuando la abres o la descargas).',
          'Datos técnicos que Google Analytics recoge por defecto: país y ciudad aproximados, tipo de dispositivo, navegador y el sitio desde el que llegaste.',
        ],
        closing: [
          'No recojo tu nombre, tu correo ni ningún dato que te identifique directamente. Google Analytics 4 no guarda tu dirección IP.',
        ],
      },
      {
        title: 'Cookies',
        paragraphs: [
          'Google Analytics guarda en tu navegador las cookies _ga y _ga_<ID> para distinguir una visita de otra. Duran hasta dos años, salvo que las borres antes. El sitio no usa cookies de publicidad ni de redes sociales.',
        ],
      },
      {
        title: 'Para qué uso los datos y cuánto tiempo se guardan',
        paragraphs: [
          'Solo para entender cómo se usa el portafolio y mejorarlo. No los uso para publicidad, no los vendo y no los comparto con nadie más. Google conserva los datos de eventos como máximo 14 meses y los trata según su propia política de privacidad.',
        ],
        links: [
          { label: 'Política de privacidad de Google', url: 'https://policies.google.com/privacy' },
          {
            label: 'Cómo usa Google los datos de los sitios que usan sus servicios',
            url: 'https://policies.google.com/technologies/partner-sites',
          },
        ],
      },
      {
        title: 'Cómo evitar el seguimiento',
        paragraphs: ['Puedes navegar el sitio sin que se registre tu visita; todo funciona igual:'],
        items: [
          'Bloquea o borra las cookies desde la configuración de tu navegador.',
          'Instala el complemento oficial de inhabilitación de Google Analytics.',
          'Usa un navegador o una extensión que bloquee los rastreadores.',
        ],
        links: [
          {
            label: 'Complemento de inhabilitación de Google Analytics',
            url: 'https://tools.google.com/dlpage/gaoptout',
          },
        ],
      },
      {
        title: 'Tus derechos',
        paragraphs: [
          'De acuerdo con la Ley 1581 de 2012 de Colombia, puedes pedir conocer, actualizar, corregir o eliminar los datos que tenga sobre ti. Escríbeme a {email} y te respondo.',
        ],
      },
      {
        title: 'Cambios en esta política',
        paragraphs: [
          'Si cambio la forma de medir las visitas, actualizaré esta página y su fecha.',
        ],
      },
    ],
  },
  en: {
    updated: 'Last updated: November 4, 2026',
    lead: 'How I measure visits to this site and what I do with that data.',
    blocks: [
      {
        title: 'Who is responsible',
        paragraphs: [
          'This site is the personal portfolio of Juan David Colonia Aldana. If you have questions about this policy or your data, email me at {email}.',
        ],
      },
      {
        title: 'What tool I use',
        paragraphs: [
          'I use Google Analytics 4, a service by Google LLC, to learn how many people visit the portfolio, where they come from, and which parts interest them most.',
        ],
      },
      {
        title: 'What data is collected',
        paragraphs: ['Google Analytics records anonymous usage data:'],
        items: [
          'The pages you visit and the home page sections you see.',
          'Clicks on the contact links, the projects, and the resume (when you open or download it).',
          'Technical data that Google Analytics collects by default: approximate country and city, device type, browser, and the site you came from.',
        ],
        closing: [
          'I do not collect your name, your email, or any data that identifies you directly. Google Analytics 4 does not store your IP address.',
        ],
      },
      {
        title: 'Cookies',
        paragraphs: [
          'Google Analytics stores the _ga and _ga_<ID> cookies in your browser to tell one visit from another. They last up to two years unless you delete them sooner. The site does not use advertising or social media cookies.',
        ],
      },
      {
        title: 'What I use the data for and how long it is kept',
        paragraphs: [
          'Only to understand how the portfolio is used and to improve it. I do not use it for advertising, I do not sell it, and I do not share it with anyone else. Google keeps event data for at most 14 months and handles it under its own privacy policy.',
        ],
        links: [
          { label: 'Google Privacy Policy', url: 'https://policies.google.com/privacy' },
          {
            label: 'How Google uses data from sites that use its services',
            url: 'https://policies.google.com/technologies/partner-sites',
          },
        ],
      },
      {
        title: 'How to opt out',
        paragraphs: [
          'You can browse the site without your visit being recorded; everything works the same:',
        ],
        items: [
          'Block or delete cookies in your browser settings.',
          'Install the official Google Analytics opt-out browser add-on.',
          'Use a browser or extension that blocks trackers.',
        ],
        links: [
          {
            label: 'Google Analytics opt-out add-on',
            url: 'https://tools.google.com/dlpage/gaoptout',
          },
        ],
      },
      {
        title: 'Your rights',
        paragraphs: [
          'Under Colombian Law 1581 of 2012, you can ask to know, update, correct, or delete any data I hold about you. Email me at {email} and I will reply.',
        ],
      },
      {
        title: 'Changes to this policy',
        paragraphs: ['If I change how visits are measured, I will update this page and its date.'],
      },
    ],
  },
};
