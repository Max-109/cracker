import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

declare global {
  var postgresClient: postgres.Sql | undefined;
}

const connectionString = process.env.DATABASE_URL!;

// Production: Use connection pooling with proper configuration
// Development: Reuse connection for HMR
const poolConfig = process.env.NODE_ENV === 'production' ? {
  max: 20, // Connection pool size
  idle_timeout: 30, // Seconds before idle connections are closed
  max_lifetime: 60 * 30, // 30 minutes max connection lifetime
  connect_timeout: 10, // Timeout for establishing new connections
  prepare: false, // Disable prepared statements for compatibility
  onnotice: () => { }, // Silence NOTICE messages in production
} : {
  prepare: false // Development: disable prepare for HMR compatibility
};

const client = globalThis.postgresClient || postgres(connectionString, poolConfig);

if (process.env.NODE_ENV !== 'production') {
  globalThis.postgresClient = client;
}

export const db = drizzle(client, { schema });
