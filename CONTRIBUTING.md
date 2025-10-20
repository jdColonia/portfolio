# 🤝 Guía de Contribución

## Conventional Commits

Este proyecto usa [Conventional Commits](https://www.conventionalcommits.org/) para generar el changelog automáticamente y versionar el proyecto.

### Formato de Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Tipos de Commits

- **feat**: Nueva funcionalidad
  - Incrementa la versión MINOR (1.X.0)
  - Ejemplo: `feat(projects): add new project section`

- **fix**: Corrección de bugs
  - Incrementa la versión PATCH (1.0.X)
  - Ejemplo: `fix(header): correct navigation links`

- **docs**: Cambios en documentación
  - No incrementa versión
  - Ejemplo: `docs(readme): update installation steps`

- **style**: Cambios de formato (no afectan el código)
  - No incrementa versión
  - Ejemplo: `style(hero): adjust spacing in hero section`

- **refactor**: Refactorización de código
  - No incrementa versión
  - Ejemplo: `refactor(experience): simplify tab logic`

- **perf**: Mejoras de rendimiento
  - Incrementa la versión PATCH (1.0.X)
  - Ejemplo: `perf(images): optimize image loading`

- **test**: Añadir o modificar tests
  - No incrementa versión
  - Ejemplo: `test(contact): add form validation tests`

- **chore**: Tareas de mantenimiento
  - No incrementa versión
  - Ejemplo: `chore(deps): update dependencies`

- **ci**: Cambios en CI/CD
  - No incrementa versión
  - Ejemplo: `ci(release): update semantic-release config`

### Breaking Changes

Para cambios que rompen compatibilidad:

```
feat(api)!: change response format

BREAKING CHANGE: The API now returns data in a new format
```

Esto incrementará la versión MAJOR (X.0.0)

### Ejemplos

#### Añadir nueva funcionalidad

```bash
git commit -m "feat(projects): add filter by technology"
```

#### Corregir un bug

```bash
git commit -m "fix(header): resolve mobile menu not closing"
```

#### Actualizar documentación

```bash
git commit -m "docs(readme): add deployment instructions"
```

#### Breaking change

```bash
git commit -m "feat(config)!: restructure configuration file

BREAKING CHANGE: Config structure has changed. See migration guide."
```

## 🔄 Flujo de Trabajo

1. Crear una rama para tu feature/fix:

   ```bash
   git checkout -b feat/new-feature
   # o
   git checkout -b fix/bug-fix
   ```

2. Hacer tus cambios y commits siguiendo Conventional Commits

3. Push a tu rama:

   ```bash
   git push origin feat/new-feature
   ```

4. Crear un Pull Request a `main`

5. Una vez aprobado y mergeado, semantic-release generará automáticamente:
   - Nueva versión en `package.json`
   - Actualización de `CHANGELOG.md`
   - Tag de Git
   - Release en GitHub

## 📝 Versionado

Este proyecto sigue [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Cambios incompatibles
- **MINOR** (0.1.0): Nueva funcionalidad compatible
- **PATCH** (0.0.1): Correcciones de bugs

## 🚀 Release Automático

El proyecto usa GitHub Actions para:

1. **Release**: Generar versiones automáticamente en cada push a `main`
2. **Deploy**: Desplegar el sitio a GitHub Pages

No necesitas crear releases manualmente, todo se hace automáticamente basado en tus commits.
