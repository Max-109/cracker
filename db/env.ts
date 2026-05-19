function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value && value.trim()) return value;
  }
  return undefined;
}

export function getDatabaseUrl(): string {
  const url = firstNonEmpty(
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
  );

  if (!url) {
    throw new Error(
      'Missing database connection string. Set `DATABASE_URL` (preferred) or `POSTGRES_URL`.',
    );
  }

  return url;
}
