function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value && value.trim()) return value;
  }
  return undefined;
}

export function getDatabaseUrl(): string {
  const url = firstNonEmpty(
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
  );

  if (!url) {
    throw new Error(
      'Missing database connection string. Set `POSTGRES_URL` (preferred) or `DATABASE_URL`.',
    );
  }

  return url;
}
