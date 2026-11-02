/**
 * @file Language types shared by the site data and the interface text.
 */

/** Languages of the site: Spanish (default, no URL prefix) and English (under `/en/`). */
export type Lang = 'es' | 'en';
/** A value that exists once per language: `Localized<string>` is `{ es: '...', en: '...' }`. */
export type Localized<T> = Record<Lang, T>;
