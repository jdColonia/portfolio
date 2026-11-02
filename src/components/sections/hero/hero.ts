/**
 * @file Scroll effect for the hero: the name drifts up and fades as the hero scrolls out of view.
 *
 * The intro animation (letters rising, text fading in) is pure CSS in HeroName.astro and
 * Hero.astro; this file only adds the scroll-linked part. GSAP is the animation library;
 * ScrollTrigger ties animations to the scroll position.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onDestroy, prefersReducedMotion } from '@lib/motion';

gsap.registerPlugin(ScrollTrigger);

/**
 * Sets up the hero's scroll effect. Call it on `astro:page-load`, which fires on the first load and
 * after every client-side navigation (ClientRouter); it is undone through `onDestroy`. It does
 * nothing when the user prefers reduced motion.
 */
export function initHero() {
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!hero || prefersReducedMotion()) return;

  const name = hero.querySelector<HTMLElement>('.hero-name');
  const section = hero.closest('section');
  if (!name) return;

  // gsap.context records everything created inside it, so `ctx.revert()` can undo it all.
  const ctx = gsap.context(() => {
    // A single "scrubbed" tween, meaning its progress follows the scrollbar directly: the name
    // moves up a little and dims between the section's top reaching the viewport top and its
    // bottom reaching it. Linear easing keeps the motion proportional to the scroll.
    gsap.to(name, {
      yPercent: -15,
      opacity: 0.3,
      ease: 'none',
      scrollTrigger: {
        trigger: section ?? hero,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }, hero);

  onDestroy(() => ctx.revert());
}
