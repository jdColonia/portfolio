import type { Localized } from '@data/types';

export interface Certification {
  name: string;
  issuer: string;
  date: string;
  url?: string;
  /** Iconify id of the issuer, rendered at build time. */
  icon?: string;
  /** Group it is listed under: an exam-backed certification or a bootcamp. */
  kind: 'certification' | 'bootcamp';
}

export const certifications: Localized<Certification[]> = {
  es: [
    {
      name: 'Databricks Certified Data Engineer Associate',
      issuer: 'Databricks',
      date: 'Mayo 2026',
      url: 'https://credentials.databricks.com/759d6e1e-0f24-42d3-86f4-0e5c0825b9df',
      icon: 'simple-icons:databricks',
      kind: 'certification',
    },
    {
      name: 'Qversity 2026, Bootcamp de Ingeniería de Datos',
      issuer: 'Qubika en alianza con DataCamp',
      date: 'Febrero – Junio 2026',
      url: 'https://www.datacamp.com/completed/statement-of-accomplishment/track/41233f18190d8ab275634175bc0e5d60e9f890a1',
      icon: 'simple-icons:datacamp',
      kind: 'bootcamp',
    },
  ],
  en: [
    {
      name: 'Databricks Certified Data Engineer Associate',
      issuer: 'Databricks',
      date: 'May 2026',
      url: 'https://credentials.databricks.com/759d6e1e-0f24-42d3-86f4-0e5c0825b9df',
      icon: 'simple-icons:databricks',
      kind: 'certification',
    },
    {
      name: 'Qversity 2026, Data Engineering Bootcamp',
      issuer: 'Qubika in partnership with DataCamp',
      date: 'Feb – Jun 2026',
      url: 'https://www.datacamp.com/completed/statement-of-accomplishment/track/41233f18190d8ab275634175bc0e5d60e9f890a1',
      icon: 'simple-icons:datacamp',
      kind: 'bootcamp',
    },
  ],
};
