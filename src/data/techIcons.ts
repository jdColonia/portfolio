/**
 * Iconify ids keyed by the technology name shown in the UI (the same text used in data/stack.ts
 * and in the project stacks). It is the single source for the stack panels and the project
 * cards. The ids are collected by pages/tech-icons.svg.ts into one shared SVG sprite, so a new
 * technology only needs an entry here, as long as its icon set is installed. The keys are
 * grouped by area in the comments below, which is only for readability.
 */
export const techIcons: Record<string, string> = {
  // Software
  Java: 'devicon-plain:java',
  Kotlin: 'simple-icons:kotlin',
  TypeScript: 'simple-icons:typescript',
  JavaScript: 'simple-icons:javascript',
  Go: 'simple-icons:go',
  'Spring Boot': 'simple-icons:springboot',
  React: 'simple-icons:react',
  'React Native': 'simple-icons:react',
  'Next.js': 'simple-icons:nextdotjs',
  'Vue.js': 'simple-icons:vuedotjs',
  'Node.js': 'simple-icons:nodedotjs',
  NestJS: 'simple-icons:nestjs',
  'Express.js': 'simple-icons:express',
  Django: 'simple-icons:django',
  Flask: 'simple-icons:flask',
  FastAPI: 'simple-icons:fastapi',
  PostgreSQL: 'simple-icons:postgresql',
  MySQL: 'simple-icons:mysql',
  MongoDB: 'simple-icons:mongodb',
  // Cloud & DevOps
  GCP: 'simple-icons:googlecloud',
  Azure: 'devicon-plain:azure',
  AWS: 'devicon-plain:amazonwebservices',
  Terraform: 'simple-icons:terraform',
  Docker: 'simple-icons:docker',
  Kubernetes: 'simple-icons:kubernetes',
  'GitHub Actions': 'simple-icons:githubactions',
  Jenkins: 'simple-icons:jenkins',
  Ansible: 'simple-icons:ansible',
  SonarQube: 'simple-icons:sonarqubeserver',
  Prometheus: 'simple-icons:prometheus',
  Grafana: 'simple-icons:grafana',
  // Data and others
  SQL: 'tabler:sql',
  Python: 'simple-icons:python',
  Databricks: 'simple-icons:databricks',
  PySpark: 'simple-icons:apachespark',
  Airflow: 'simple-icons:apacheairflow',
  dbt: 'simple-icons:dbt',
  'Power BI': 'simple-icons:powerbi',
};
