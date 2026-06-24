import { trpc } from '../react';

type MutOpts<T extends (...args: never[]) => unknown> = Parameters<T>[0];

export const useArticles = (
  input?: { clientId?: string; productId?: string; limit?: number },
  options?: { enabled?: boolean },
) => trpc.article.list.useQuery(input ?? {}, options);

export const useArticle = (id: string, options?: { enabled?: boolean }) =>
  trpc.article.getById.useQuery({ id }, options);

export const usePublishArticle = (
  options?: MutOpts<typeof trpc.article.publishToCms.useMutation>,
) => trpc.article.publishToCms.useMutation(options);

export const useUpdateArticleStatus = (
  options?: MutOpts<typeof trpc.article.updateStatus.useMutation>,
) => trpc.article.updateStatus.useMutation(options);

export const useUpdateArticleContent = (
  options?: MutOpts<typeof trpc.article.updateContent.useMutation>,
) => trpc.article.updateContent.useMutation(options);

export const useUpdateArticleWithPrompt = (
  options?: MutOpts<typeof trpc.article.updateWithPrompt.useMutation>,
) => trpc.article.updateWithPrompt.useMutation(options);
