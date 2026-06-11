import { router } from './trpc';
import { articleRouter } from './routers/article';
import { clientRouter } from './routers/client';
import { jobRouter } from './routers/job';
import { registryRouter } from './routers/registry';
import { authRouter } from './routers/auth';

export const appRouter = router({
  article: articleRouter,
  clients: clientRouter,
  job: jobRouter,
  registry: registryRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
