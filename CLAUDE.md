# Portfolio de Juan David Colonia

Portafolio personal de Juan David Colonia Aldana. El pilar es la ingeniería de datos y el desarrollo de software va en segundo lugar ("Ingeniero de Sistemas · Datos y Software"). Es bilingüe: español por defecto (sin prefijo) e inglés en `/en/`. Astro 5 + Tailwind 4, sitio estático desplegado en GitHub Pages bajo la base `/portfolio` (en dev la base es `/`) con cada push a `main`.

## Comandos

- `npm run dev`: servidor de desarrollo (puerto 4321).
- `npm run build`: `astro check && astro build` (es lo que corre el deploy).
- `npm run preview`: sirve `dist/`.
- `npm run validate`: `format:check` + `lint` + `type-check`. Correrlo antes de dar algo por terminado.
- `npm run lint` / `lint:fix`, `npm run format` / `format:check`, `npm run type-check`.

No hay tests automatizados: la verificación es `validate` + `/verify`.

## Estructura (`src/`)

```
components/
  layout/          Header (header.ts), Footer, SideDock, Logo
  sections/<x>/    una carpeta por sección del home (hero, about, stack, experience,
                   projects, certifications, contact, zoom)
  crystal/         DataCrystal (canvas del cristal) + crystal-mount.ts
  ui/              piezas reutilizables (Button, Badge, TechIcon, TitleSection...)
  views/           páginas completas que usan las rutas (HomePage, CvPage, NotFound)
layouts/Layout.astro   <head>, ClientRouter, analytics, init del motor de scroll
lib/                   lógica de navegador compartida que no es componente
  motion/index.ts      motor de scroll: Lenis + GSAP ScrollTrigger
  crystal/scene.ts     escena three.js (se carga con import dinámico)
  urls.ts              withBase() / localizePath()
data/                  contenido en TS (projects, experience, stack, techIcons, config...)
i18n/                  ui.ts (textos de interfaz es/en) y utils.ts
styles/global.css      Tailwind 4 + tokens
assets/                imágenes procesadas por astro:assets (assets/projects/)
pages/                 solo rutas delgadas: renderizan una vista; sitemap.xml.ts, tech-icons.svg.ts
```

Patrón: la lógica de cliente de un componente vive en un `.ts` hermano con funciones `init…()` (p. ej. `gallery.ts`, `hero.ts`); el `<script>` del `.astro` solo la importa y la conecta a `astro:page-load`.

## Imports y URLs

- Alias de `tsconfig`: `@components/*`, `@layouts/*`, `@lib/*`, `@data/*`, `@i18n/*`, `@styles/*`, `@assets/*`. No usar imports relativos entre carpetas (sí dentro de la misma).
- Las URLs se construyen con `withBase()` / `localizePath(lang, path)` de `@lib/urls`; nunca concatenando `import.meta.env.BASE_URL` a mano.
- Rutas `[section].astro` (`/stack`, `/en/proyectos`...) renderizan el home y su canonical apunta al home.

## Reglas de contenido (no negociables)

- Nunca poner el teléfono de Juan en el sitio.
- Sin nombres de empresas en la descripción del hero.
- Todo texto visible existe en es y en: `Localized<T>` en `src/data/*` y `ui.ts` en `src/i18n`. Mantener ambos idiomas sincronizados.
- Nunca encadenar "construyo apps y luego convierto sus datos en tableros": fueron trabajos distintos. No poner destacados de "más usado" en el stack. Cloud no es titular.
- El contenido sale de la hoja de vida. Fuente de verdad: `C:\Users\juanc\Dev\job-search\cv\content.md` y `content_en.md`. Los PDFs de `public/CV-*.pdf` son copias: si cambia el CV, actualizar `src/data/*` y los PDFs juntos.
- Nunca subir archivos Excel, datos reales de empresas ni configuraciones con datos de empresa.

## Gotchas técnicos

- **ClientRouter**: las páginas no se recargan. La lógica se inicializa en `astro:page-load` y debe limpiarse en `astro:before-swap` (ver `initMotion`/`destroyMotion` en Layout; registrar limpiezas con `onDestroy`). Evitar listeners y animaciones duplicados tras navegar.
- **Google Analytics** corre en Partytown (`type="text/partytown"`). `sandboxParent: 'html'` deja el iframe del sandbox fuera de `<body>`: el router cambia el body y mover el iframe lo recargaría. Un script que necesite el DOM en vivo no puede correr en Partytown.
- **Eventos de analytics**: se declaran con `data-track="evento"` + `data-track-*` en el elemento (un solo listener delegado en `@lib/analytics`, `initAnalytics`) o con `track()` desde TS. Eventos: `cv_download`, `cv_open`, `contact_click`, `project_click`, `section_view` (una vez por sección y carga, desde `header.ts`) y `page_view`. No usar `language` como nombre de parámetro: GA lo toma como idioma del usuario (`ul`); se usa `cv_language`.
- **`page_view` manual**: ClientRouter no recarga, así que `initAnalytics` manda `page_view` en cada navegación (la primera la manda `gtag('config')`). Los `page_view` por historial de GA están desactivados en el admin (Enhanced measurement): `header.ts` hace `replaceState` al recorrer secciones y los inflaría. No reactivarlos.
- **Tráfico interno**: los hits llevan `traffic_type: 'internal'` (llega como `tt=internal`; el filtro "Internal Traffic" de GA lo excluye) si el host no es `jdcolonia.github.io` o si existe `localStorage.ga_internal`. `?interno=1` lo crea y `?interno=0` lo borra: lo lee un `<script is:inline>` normal en `Layout.astro` al parsear, porque `header.ts` reescribe la URL (sin query) antes de que corra el worker de Partytown.
- **CSS en línea** (`inlineStylesheets: 'always'`). Los iconos de tecnologías salen del sprite estático `tech-icons.svg` que genera `pages/tech-icons.svg.ts` a partir de `data/techIcons.ts` (y de `certifications`): un icono nuevo se registra ahí, no importándolo suelto.
- **Fuentes**: solo subsets latin; JetBrains Mono trae un único peso (400), no hay negrita real.
- **Sitemap**: se genera al compilar con `lastmod` desde el historial de git; por eso el deploy usa `fetch-depth: 0`. Una ruta indexable nueva debe agregarse a `entries` en `sitemap.xml.ts` (con sus fuentes para `lastmod`).
- Cada sección del home debe caber en 100svh a 1280×720. Respetar `prefers-reduced-motion`.
- La galería de proyectos en móvil/tablet (<1024px) es un stage con CSS sticky + tween con scrub (`--stage-top` se calcula en JS); en desktop es un pin de ScrollTrigger. El motor solo hace `ScrollTrigger.refresh()` cuando cambia el ancho. Es frágil: correr `/verify` después de tocarla.
- three.js debe seguir cargándose de forma perezosa (`import()` dinámico en `crystal-mount.ts`).

## Flujo de trabajo

- Tras cualquier cambio: `npm run validate` y `/verify`.
- Para agregar o actualizar un proyecto: `/add-project`.

## Git

- Conventional Commits en inglés, validados por commitlint (hook `commit-msg` de husky; `pre-commit` corre lint-staged con eslint/prettier). Encabezado y líneas del cuerpo ≤ 100 caracteres.
- Commits directos a `main`. Commit y push solo cuando Juan lo pida.
- semantic-release corre en `main`: `feat` → minor, `fix`/`perf` → patch, el resto no publica release. Corre en `release.yml`, escribe `CHANGELOG.md`, sube la versión de `package.json` (no editarlos a mano) y hace un commit `chore(release)` a `main`: hacer `git pull` antes del siguiente push.
- Sin líneas de atribución a IA en los commits.
