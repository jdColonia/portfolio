---
name: add-project
description: Agrega o actualiza un proyecto en la galería de proyectos del portafolio (datos bilingües, imagen, iconos del stack). Úsalo cuando Juan pida añadir, editar, reordenar o quitar un proyecto.
---

# Agregar o actualizar un proyecto

Los proyectos viven en `src/data/projects.ts` como `Localized<Project[]>` (arrays `es` y `en`). La galería (`src/components/sections/projects/`) los agrupa y pinta; no hay que tocar componentes.

## 1. Pedir los datos que falten (no inventar)

Pregunta a Juan lo que no tengas: título y resumen en **es y en**, stack, URL del repo (`github`), URL de demo (`demo`), si es `live` o `upcoming`, y la imagen. No inventes métricas, cifras ni URLs. El resumen sigue las reglas de contenido de `CLAUDE.md`: sin teléfono, nada de "apps que luego se vuelven tableros", y en ambos idiomas con el mismo significado (1–2 frases, dentro del estilo de los existentes).

## 2. Campos de `Project` (`src/data/projects.ts`)

- `id`: string, igual en es y en (kebab-case).
- `track`: `'data'` | `'software'` | `'platform'`. La galería agrupa en ese orden fijo (data, software, platform) y pone un `TrackDivider` por grupo; un grupo sin proyectos no se muestra. El orden dentro del grupo es el del array. Etiquetas en `ui.ts`: `projects.track.*`.
- `title`, `summary`: **localizados** (cada idioma su valor). `stack`, `image`, `github`, `demo`, `status` son iguales en ambos: comparte constantes (`const miStack = [...]`, la imagen importada) entre las dos entradas, como hacen las existentes.
- `stack`: nombres de tecnología (ver paso 4).
- `image?`: `ImageMetadata` importado. Sin imagen, la tarjeta muestra un recuadro punteado.
- `github?`, `demo?`: cada uno muestra su icono de enlace solo si existe.
- `status`: `'live'` o `'upcoming'`; `upcoming` añade la etiqueta "Próximamente / Coming soon" (`projects.soon`).

Agrega el proyecto a **ambos** arrays (`es` y `en`).

## 3. Imagen

- Guárdala en `src/assets/projects/<id>.webp` e impórtala arriba: `import xImage from '@assets/projects/<id>.webp';`. Nunca en `public/`.
- `ProjectCard.astro` usa `<Image>` de `astro:assets` con `widths={[480, 800, 1200]}`, `format="webp"`, `loading="lazy"` y `object-fit: cover` centrado. Astro no escala por encima del original: entrega **webp de al menos 1200 px de ancho**, relación 16:9 (ejemplo existente: 1200×648).
- El recorte real es muy apaisado (franja de ~19svh en desktop, ~16svh en móvil): pon lo importante en el **centro vertical** y evita texto pequeño cerca de los bordes.
- Mantén el archivo liviano (≈50 KB como las actuales). El alt es el título.

## 4. Iconos del stack

Cada nombre de `stack` se busca tal cual (sensible a mayúsculas) en `src/data/techIcons.ts`. Si no existe, el nombre se muestra **sin icono** (no falla). Para añadir icono:

1. Busca el id en los sets instalados: `simple-icons:`, `devicon-plain:` o `tabler:` (iconify; p. ej. `simple-icons:trivy`).
2. Agrega `Nombre: 'prefijo:icono'` en `techIcons` (en su grupo). El sprite `tech-icons.svg` (`src/pages/tech-icons.svg.ts`) lo toma solo de ahí y el build **falla** si el id no existe en el set.
3. Si el nombre ya existe con otra grafía, reutilízalo en vez de duplicar.

## 5. Verificar

1. `npm run validate` (prettier, eslint, `astro check`).
2. `/verify`, con atención a la galería en desktop (pin horizontal) y móvil (stage sticky), ambos idiomas (`/` y `/en/`).
3. No hagas commit salvo que Juan lo pida.
