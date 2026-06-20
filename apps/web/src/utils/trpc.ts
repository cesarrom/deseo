import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@deseo/api/src/router';

export const trpc = createTRPCReact<AppRouter>();
