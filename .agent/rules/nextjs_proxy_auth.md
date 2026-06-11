# Next.js 16 Proxy & Auth.js

## Overview
In Next.js 16, the `middleware.ts` convention has been deprecated in favor of **`proxy.ts`**. This layer acts as the request gateway/network boundary of the application.

## Key Changes
- **Filename:** `src/middleware.ts` → `src/proxy.ts`
- **Function Name:** `export function middleware()` → `export function proxy()`
- **Runtime:** Defaults to **Node.js runtime** instead of Edge, allowing for more robust logic.

## Usage with Auth.js (NextAuth.js)

### Pattern: Named Export
The framework expects a named export called `proxy`.

```typescript
// apps/web/src/proxy.ts
import { default as middleware } from 'next-auth/middleware';
import { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  // Use the standard NextAuth middleware logic
  return (middleware as any)(req);
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

### Best Practices
1. **Lightweight Logic:** Even though it runs in Node.js, keep the proxy thin. Use it for redirects and "optimistic" auth checks (checking for cookie presence).
2. **Double-Layer Security:** Always perform final session validation inside Server Components or API Routes. The proxy is a routing guard, not a final security barrier.
3. **Paths:** Use the `config.matcher` to ensure the proxy only runs on protected routes to avoid performance overhead on static assets.

## Why "Proxy"?
The term "Proxy" more accurately describes the single-entry-point gateway behavior of Next.js, as opposed to the chained function pattern implied by "Middleware."
