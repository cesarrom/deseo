import axios, { type AxiosInstance } from 'axios';
import type { ArticleAST } from '@deseo/types';
import { astToPayloadBlocks } from '@deseo/ast/converters/payload';

export interface PayloadConfig {
  apiUrl: string;
  apiKey: string;
}

export class PayloadClient {
  private client: AxiosInstance;

  constructor(config: PayloadConfig) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async publishArticle(params: {
    collection: string;
    article: ArticleAST;
  }) {
    const { collection, article } = params;

    const payloadBlocks = astToPayloadBlocks(article);

    const { data } = await this.client.post(`/api/${collection}`, {
      title: article.metadata.title,
      slug: article.metadata.slug,
      description: article.metadata.description,
      content: payloadBlocks,
      seo: {
        title: article.seo.metaTitle,
        description: article.seo.metaDescription,
        ogImage: article.seo.ogImage,
      },
      _status: 'draft',
    });

    return data;
  }

  async updateArticle(params: {
    collection: string;
    id: string;
    article: ArticleAST;
  }) {
    const { collection, id, article } = params;

    const payloadBlocks = astToPayloadBlocks(article);

    const { data } = await this.client.patch(`/api/${collection}/${id}`, {
      title: article.metadata.title,
      slug: article.metadata.slug,
      description: article.metadata.description,
      content: payloadBlocks,
      seo: {
        title: article.seo.metaTitle,
        description: article.seo.metaDescription,
        ogImage: article.seo.ogImage,
      },
    });

    return data;
  }

  async getCollections() {
    const { data } = await this.client.get('/api');
    return data.collections;
  }

  async getDocument(collection: string, id: string) {
    const { data } = await this.client.get(`/api/${collection}/${id}`);
    return data;
  }
}
