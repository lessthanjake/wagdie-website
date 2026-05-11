type StartupEnv = Record<string, string | undefined>;

const REQUIRED_TOKEN_ENV = [
  'ELIZA_SERVER_AUTH_TOKEN',
  'WAGDIE_KNOWLEDGE_INGESTION_TOKEN',
  'SERVER_API_KEY',
  'VENICE_API_KEY',
] as const;

const DATABASE_ENV = ['DATABASE_URL', 'POSTGRES_URL'] as const;

const LOCAL_ENV_NAMES = new Set(['local', 'localhost', 'test']);
const DEPLOYMENT_MARKERS = [
  'VERCEL_ENV',
  'RAILWAY_ENVIRONMENT',
  'RENDER',
  'RENDER_SERVICE_ID',
  'K_SERVICE',
  'FLY_APP_NAME',
  'NETLIFY',
];

export class StartupEnvValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`ElizaOS startup environment validation failed: ${issues.join('; ')}`);
    this.name = 'StartupEnvValidationError';
    this.issues = issues;
  }
}

export type StartupEnvValidationResult = {
  environment: string;
  isLocalDevelopment: boolean;
  warnings: string[];
};

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
}

function hasValue(env: StartupEnv, name: string): boolean {
  return Boolean(env[name]?.trim());
}

function getEnvironmentName(env: StartupEnv): string {
  return (
    normalize(env.ELIZAOS_ENV) ||
    normalize(env.WAGDIE_DEPLOY_ENV) ||
    normalize(env.APP_ENV) ||
    normalize(env.VERCEL_ENV) ||
    normalize(env.NODE_ENV) ||
    'local'
  );
}

export function isLocalDevelopmentEnvironment(env: StartupEnv = process.env): boolean {
  const explicitEnvironment =
    normalize(env.ELIZAOS_ENV) || normalize(env.WAGDIE_DEPLOY_ENV) || normalize(env.APP_ENV);

  if (explicitEnvironment) {
    return LOCAL_ENV_NAMES.has(explicitEnvironment);
  }

  if (DEPLOYMENT_MARKERS.some((name) => hasValue(env, name))) {
    return false;
  }

  if (normalize(env.CI) === 'true') {
    return false;
  }

  const nodeEnv = normalize(env.NODE_ENV);
  return nodeEnv !== 'production';
}

export function validateStartupEnvironment(
  env: StartupEnv = process.env
): StartupEnvValidationResult {
  const environment = getEnvironmentName(env);
  const isLocalDevelopment = isLocalDevelopmentEnvironment(env);
  const missingTokenEnv = REQUIRED_TOKEN_ENV.filter((name) => !hasValue(env, name));
  const hasDatabaseUrl = DATABASE_ENV.some((name) => hasValue(env, name));
  const allowUnauthenticatedLocal = env.WAGDIE_KNOWLEDGE_ALLOW_UNAUTHENTICATED_LOCAL === 'true';
  const issues: string[] = [];
  const warnings: string[] = [];

  if (allowUnauthenticatedLocal && !isLocalDevelopment) {
    issues.push(
      'WAGDIE_KNOWLEDGE_ALLOW_UNAUTHENTICATED_LOCAL=true is only allowed for local development'
    );
  }

  if (!isLocalDevelopment) {
    if (missingTokenEnv.length > 0) {
      issues.push(`missing required env vars: ${missingTokenEnv.join(', ')}`);
    }

    if (!hasDatabaseUrl) {
      issues.push('missing required database env var: DATABASE_URL or POSTGRES_URL');
    }
  } else {
    if (missingTokenEnv.length > 0) {
      warnings.push(
        `local development startup is missing ${missingTokenEnv.join(
          ', '
        )}; protected service paths or provider-backed chat may fail unless intentionally unused`
      );
    }

    if (!hasDatabaseUrl) {
      warnings.push(
        'local development startup is missing DATABASE_URL/POSTGRES_URL; using local-only persistence is acceptable only for throwaway development'
      );
    }

    if (allowUnauthenticatedLocal) {
      warnings.push(
        'WAGDIE_KNOWLEDGE_ALLOW_UNAUTHENTICATED_LOCAL=true permits unauthenticated knowledge ingestion only for local development when no ingestion/server token is configured'
      );
    }
  }

  if (issues.length > 0) {
    throw new StartupEnvValidationError(issues);
  }

  return {
    environment,
    isLocalDevelopment,
    warnings,
  };
}
