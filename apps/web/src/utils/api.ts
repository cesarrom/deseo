import { auth } from '@/lib/auth';

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  token?: string;
  provider?: string;
  providerAccountId?: string;
  activeClientId?: string | null;
  isTrpc?: boolean;
  body?: any;
}

export async function apiFetch(endpoint: string, options: ApiFetchOptions = {}) {
  const { token: manualToken, provider, providerAccountId, activeClientId, isTrpc, body, headers, ...rest } = options;
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const url = endpoint.startsWith('http') ? endpoint : `${apiUrl}${endpoint}`;

  // 1. Resolve Authentication Context
  let authToken = manualToken;
  if (!authToken) {
    // Attempt to grab the session if we are in a server context and no token was manually provided
    try {
      const session = await auth();
      // In a real JWT setup, you might pass the raw JWT or the user ID
      // Here we pass the User ID as a basic bearer token for internal resolution, 
      // or you could extract the raw cookie.
      if (session?.user?.id) {
         authToken = session.user.id; 
      }
    } catch (e) {
      // Silently fail if auth() cannot be called (e.g., outside server context)
    }
  }

  // 2. Construct Headers
  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has('Content-Type') && body) {
    finalHeaders.set('Content-Type', 'application/json');
  }
  
  // Inject internal communication secret to prove the request came from our own Next.js server
  const internalSecret = process.env.AUTH_SECRET || 'development_secret_123_fallback';
  finalHeaders.set('x-internal-secret', internalSecret);
  
  if (endpoint.includes('syncUser')) {
     console.log('📡 SYNCING USER WITH SECRET:', internalSecret.substring(0, 4) + '...');
  }

  if (authToken) {
    finalHeaders.set('Authorization', `Bearer ${authToken}`);
  }
  
  if (provider) {
    finalHeaders.set('x-auth-provider', provider);
  }
  
  if (providerAccountId) {
    finalHeaders.set('x-auth-provider-id', providerAccountId);
  }

  if (activeClientId) {
    finalHeaders.set('x-active-client-id', activeClientId);
  }

  // 3. Format Body for tRPC SuperJSON if needed
  let finalBody = body;
  if (isTrpc && body && typeof body === 'object') {
    finalBody = JSON.stringify({ json: body });
  } else if (body && typeof body === 'object') {
    finalBody = JSON.stringify(body);
  }

  // 4. Execute Fetch
  return fetch(url, {
    ...rest,
    headers: finalHeaders,
    body: finalBody as BodyInit,
  });
}
