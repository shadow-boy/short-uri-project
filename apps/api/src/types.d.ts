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


