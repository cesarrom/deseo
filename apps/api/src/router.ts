import { router } from './trpc';
import { articleRouter } from './routers/article';
import { clientRouter } from './routers/client';
import { jobRouter } from './routers/job';
import { registryRouter } from './routers/registry';
import { authRouter } from './routers/auth';
import { dashboardRouter } from './routers/dashboard';
import { productRouter } from './routers/product';
import { intelligenceRouter } from './routers/intelligence';

export const appRouter = router({
  article: articleRouter,
  clients: clientRouter,
  job: jobRouter,
  registry: registryRouter,
  auth: authRouter,
  dashboard: dashboardRouter,
  products: productRouter,
  intelligence: intelligenceRouter,
});

export type AppRouter = typeof appRouter;
