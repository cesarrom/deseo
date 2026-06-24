'use client';

import { useArticles } from '@deseo/api-client';

export default function TestTRPCPage() {
  const hello = useArticles();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">tRPC Connectivity Test</h1>
      {hello.isLoading ? (
        <p>Loading...</p>
      ) : hello.error ? (
        <p className="text-red-500">Error: {hello.error.message}</p>
      ) : (
        <div>
          <p className="text-green-500">✅ Successfully connected to API!</p>
          <pre className="mt-4 p-4 bg-gray-100 rounded">
            {JSON.stringify(hello.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
