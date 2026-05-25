import { Redis as UpstashRedis } from '@upstash/redis';

type Provider = 'tcp' | 'upstash' | 'disabled';
type RedisLike = {
  get: (key: string) => Promise<unknown>;
  set: (...args: unknown[]) => Promise<unknown>;
  del: (...keys: string[]) => Promise<unknown>;
  publish: (channel: string, message: unknown) => Promise<unknown>;
};

type RedisState = {
  client: RedisLike | null;
  provider: Provider;
  promise: Promise<RedisLike | null> | null;
  warned: boolean;
};

const globalForRedis = globalThis as typeof globalThis & {
  __crackerRedis?: RedisState;
};

const state = globalForRedis.__crackerRedis ?? {
  client: null,
  provider: 'disabled' as Provider,
  promise: null,
  warned: false,
};
globalForRedis.__crackerRedis = state;

function warnOnce(message: string, error?: unknown) {
  if (state.warned) return;
  console.warn(message, error instanceof Error ? error.message : error ?? '');
  state.warned = true;
}

export function redisProvider(): Provider {
  if (process.env.REDIS_DISABLED === 'true') return 'disabled';
  if (process.env.REDIS_URL) return 'tcp';
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) return 'upstash';
  return 'disabled';
}

export function redisStatus() {
  return redisProvider() === 'disabled' ? 'disabled' : 'enabled';
}

async function createTcpRedis(): Promise<RedisLike | null> {
  const { createClient } = await import('redis');
  const client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? 750),
      reconnectStrategy: false,
    },
  });

  client.on('error', (error) => warnOnce('[redis] tcp error:', error));
  await client.connect();

  return {
    get: (key: string) => client.get(key),
    set: (...args: unknown[]) => (client.set as unknown as (...setArgs: unknown[]) => Promise<unknown>)(...args),
    del: (...keys: string[]) => client.del(keys),
    publish: (channel: string, message: unknown) => client.publish(channel, typeof message === 'string' ? message : JSON.stringify(message)),
  };
}

function createUpstashRedis(): RedisLike {
  const client = new UpstashRedis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  return {
    get: (key: string) => client.get(key),
    set: (...args: unknown[]) => (client.set as unknown as (...setArgs: unknown[]) => Promise<unknown>)(...args),
    del: (...keys: string[]) => client.del(...keys),
    publish: (channel: string, message: unknown) => client.publish(channel, message),
  };
}

async function getRedis(): Promise<RedisLike | null> {
  const provider = redisProvider();
  if (provider === 'disabled') return null;
  if (state.client && state.provider === provider) return state.client;
  if (state.promise && state.provider === provider) return state.promise;

  state.provider = provider;
  state.promise = (async () => {
    try {
      const client = provider === 'tcp' ? await createTcpRedis() : createUpstashRedis();
      state.client = client;
      return client;
    } catch (error) {
      warnOnce('[redis] disabled after init failure:', error);
      state.client = null;
      return null;
    } finally {
      state.promise = null;
    }
  })();

  return state.promise;
}

export function redisKey(key: string) {
  return `${process.env.REDIS_PREFIX ?? 'cracker:'}${key}`;
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  if (!redis) return null;

  try {
    const value = await redis.get(redisKey(key));
    if (value == null) return null;
    if (typeof value === 'string') return JSON.parse(value) as T;
    return value as T;
  } catch (error) {
    warnOnce('[redis] get failed:', error);
    return null;
  }
}

export async function redisSetJson<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;

  try {
    const fullKey = redisKey(key);
    const serialized = JSON.stringify(value);
    if (redisProvider() === 'tcp' && ttlSeconds) {
      await redis.set(fullKey, serialized, { EX: ttlSeconds });
    } else if (redisProvider() === 'tcp') {
      await redis.set(fullKey, serialized);
    } else if (ttlSeconds) {
      await redis.set(fullKey, value, { ex: ttlSeconds });
    } else {
      await redis.set(fullKey, value);
    }
    return true;
  } catch (error) {
    warnOnce('[redis] set failed:', error);
    return false;
  }
}

export async function redisSetNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;

  try {
    const fullKey = redisKey(key);
    if (redisProvider() === 'tcp') {
      const result = await redis.set(fullKey, value, { NX: true, EX: ttlSeconds });
      return result === 'OK';
    }
    const result = await redis.set(fullKey, value, { nx: true, ex: ttlSeconds });
    return result === 'OK';
  } catch (error) {
    warnOnce('[redis] set nx failed:', error);
    return false;
  }
}

export async function redisDel(...keys: string[]): Promise<void> {
  const redis = await getRedis();
  if (!redis || keys.length === 0) return;

  try {
    await redis.del(...keys.map(redisKey));
  } catch (error) {
    warnOnce('[redis] del failed:', error);
  }
}

export async function redisPublish(channel: string, message: unknown): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.publish(redisKey(channel), message);
  } catch (error) {
    warnOnce('[redis] publish failed:', error);
  }
}
