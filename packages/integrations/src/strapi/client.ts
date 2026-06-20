import axios, { type AxiosInstance } from 'axios';
import type { ArticleAST } from '@deseo/types';
import { astToStrapiContent } from '@deseo/ast/converters/strapi';

export interface StrapiConfig {
  apiUrl: string;
  apiToken: string;
}

export class StrapiClient {
  private client: AxiosInstance;

  constructor(config: StrapiConfig) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async publishArticle(params: {
    contentType: string;
    article: ArticleAST;
  }) {
    const { contentType, article } = params;
    
    const strapiContent = astToStrapiContent(article);

    const { data } = await this.client.post(`/api/${contentType}`, {
      data: {
        title: article.metadata.title,
        slug: article.metadata.slug,
        description: article.metadata.description,
        content: strapiContent,
        publishedAt: new Date().toISOString(),
      },
    });

    return data;
  }

  async updateArticle(params: {
    contentType: string;
    id: number;
    article: ArticleAST;
  }) {
    const { contentType, id, article } = params;

    const strapiContent = astToStrapiContent(article);

    const { data } = await this.client.put(`/api/${contentType}/${id}`, {
      data: {
        title: article.metadata.title,
        slug: article.metadata.slug,
        description: article.metadata.description,
        content: strapiContent,
      },
    });

    return data;
  }

  async getContentTypes() {
    const { data } = await this.client.get('/api/content-type-builder/content-types');
    return data;
  }
}
