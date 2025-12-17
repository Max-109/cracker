import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value && value.trim()) return value;
  }
  return undefined;
}

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: (() => {
      const url = firstNonEmpty(
        process.env.POSTGRES_URL,
        process.env.POSTGRES_PRISMA_URL,
        process.env.POSTGRES_URL_NON_POOLING,
        process.env.DATABASE_URL,
      );
      if (!url) throw new Error('Missing `POSTGRES_URL` (or `DATABASE_URL`) for drizzle-kit.');
      return url;
    })(),
  },
} satisfies Config;
