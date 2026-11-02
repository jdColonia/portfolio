---
name: verify
description: Verifica que un cambio no rompió visuales ni comportamiento del portafolio. Úsalo después de cualquier cambio en componentes, estilos, lógica de scroll/animación (Lenis, GSAP, galería de proyectos), layout, i18n o configuración de build.
---

# Verificación del portafolio

Compara capturas antes/después y corre checks de comportamiento con Playwright sobre el build de producción. Usa el Edge/Chrome instalado (no descarga navegadores).

## Pasos

1. `npm run build` (incluye `astro check`).
2. Servidor de preview (reutilizar si ya está arriba):
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:4323/portfolio/   # 200 = ya está arriba
   npx astro preview --port 4323   # en segundo plano si no
   ```
   La base de producción es `/portfolio`: el preview sirve el build en `http://localhost:4323/portfolio/`.
3. Capturar el estado actual y compararlo con la línea base:
   ```bash
   node .claude/skills/verify/scripts/capture.mjs .verify/current
   node .claude/skills/verify/scripts/compare.mjs .verify/baseline .verify/current
   ```
4. Checks de comportamiento: `node .claude/skills/verify/scripts/checks.mjs` (todos) o con nombres: `checks.mjs gallery-pin icons`.
5. `npm run validate` (prettier check, eslint, astro check).

Variables opcionales: `VERIFY_URL` (por defecto `http://localhost:4323/portfolio/`) y `VERIFY_BROWSER` (`msedge` por defecto, o `chrome`).

## Línea base

Capturar ANTES de editar:

```bash
node .claude/skills/verify/scripts/capture.mjs .verify/baseline
```

Si se olvidó, construir el último commit en un worktree temporal y capturar desde su preview en otro puerto:

```bash
git worktree add .verify/head HEAD
cmd //c 'mklink /J .verify\head\node_modules node_modules'   # junction: reutiliza node_modules
(cd .verify/head && npm run build)
(cd .verify/head && npx astro preview --port 4324) &   # en segundo plano
VERIFY_URL=http://localhost:4324/portfolio/ node .claude/skills/verify/scripts/capture.mjs .verify/baseline
# detener el preview del 4324 y limpiar (--force quita solo el junction, no node_modules)
git worktree remove --force .verify/head
```

El worktree solo contiene lo commiteado y reutiliza `node_modules` actual: si `HEAD` tiene dependencias distintas a las instaladas (p. ej. tras una migración), el build puede fallar y no sirve como línea base.

## Cómo leer los resultados

- `capture.mjs`: 8 rutas (home, sobre-mi, stack, experiencia, proyectos, contacto, cv, no-existe) en ES y `en/`, a 390×664 y 1440×900, con movimiento reducido, más `texts.json` (texto visible a 1440).
- `compare.mjs`: % de píxeles distintos por imagen; tamaño distinto = 100%. Guarda `diff-<nombre>.png` en la carpeta actual si pasa de 0.5%. Falla (exit 1) si una imagen supera 1% o si algún texto cambió. Un cambio intencional también aparece como diferencia: revisar los `diff-*.png` y confirmar que es lo esperado.
- `checks.mjs` imprime `PASS`/`FAIL nombre — detalle` y sale con código distinto de 0 si algo falla:
  - `gallery-pin`: galería de proyectos en desktop (pin de ScrollTrigger, spacer, el track llega al final) tanto cargando a 1280 como redimensionando de 390 a 1280.
  - `gallery-wheel`: galería en móvil (sticky, sin pin, track avanza con la rueda) cargando a 390 y redimensionando de 1280 a 390.
  - `gallery-gap`: separación entre el título "Proyectos" y las tarjetas en móvil, y el stage pegado en su offset sticky.
  - `icons`: el sprite `tech-icons.svg` carga, los iconos tienen tamaño y se ponen naranja al hover.
  - `analytics`: Google Analytics vía Partytown; el iframe `partytown-sandbox` carga una sola vez, sin errores de consola, y se envían `page_view` en la carga y tras navegar con ClientRouter.
  - `not-found`: 404 en ES y EN (estado, `lang`, contenido).
  - `live`: con movimiento activo: cristal, hero, pins, pestañas de experiencia, navegación, home→cv→home con ClientRouter, menú móvil, 404 EN y errores de consola.

## Ruido conocido (NO es regresión)

- La página CV a 1440 puede diferir ~15% por la barra del visor PDF embebido del navegador (`compare.mjs` lo marca `NOTE`, sin fallar).
- En headless el cristal 3D puede quedar en `crystalAfterNav: 'fallback'` porque WebGL corre con render por software lento (el check lo acepta).
- El `page_view` de GA de la última navegación puede no enviarse antes de que termine el script (solo se informa como `INFO`).
- `analytics` necesita red (carga gtag de Google).

Si algo falla, primero repetir ese check solo (`checks.mjs <nombre>`): los tiempos dependen de la máquina.
