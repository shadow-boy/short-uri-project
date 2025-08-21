export {};

declare module 'hono' {
  interface Context {
    env: {
      SHORT_URI_KV: KVNamespace;
      JWT_SECRET: string;
      ADMIN_USERNAME?: string;
      ADMIN_PASSWORD?: string;
    };
  }
}

// Cloudflare Workers types
declare global {
  interface KVNamespace {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
  }
}


