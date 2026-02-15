// Minimal TypeScript declarations for the `pg` package.
// Next.js' type-checking fails on Koyeb without this unless you add `@types/pg`.
// This approach avoids changing package-lock.json.

declare module "pg" {
  export interface PoolConfig {
    [key: string]: any;
  }

  export interface PoolClient {
    query: (...args: any[]) => any;
    release: (...args: any[]) => any;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    query(...args: any[]): any;
    connect(...args: any[]): Promise<PoolClient>;
    end(...args: any[]): Promise<void>;
  }
}
