import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onDestroy, prefersReducedMotion } from '@lib/motion';

gsap.registerPlugin(ScrollTrigger);

export function initHero() {
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!hero || prefersReducedMotion()) return;

  const name = hero.querySelector<HTMLElement>('.hero-name');
  const section = hero.closest('section');
  if (!name) return;

  const ctx = gsap.context(() => {
    // Single scrubbed effect: the name drifts up and dims as the hero leaves.
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
