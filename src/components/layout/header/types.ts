/** One link in the navigation bars (desktop pill, CV button and mobile menu). */
export interface NavItem {
  /** Visible text, already translated. */
  title: string;
  /** Section id (e.g. 'stack') or 'cv'. Used for the data-section / data-nav attributes. */
  label: string;
  /** Final URL including the deployment base and the language prefix. */
  url: string;
}
