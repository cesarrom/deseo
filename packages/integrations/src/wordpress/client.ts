import axios, { type AxiosInstance } from 'axios';
import type { ArticleAST } from '@deseo/types';
import { astToWordPressBlocks } from '@deseo/ast/converters/wordpress';

export interface WordPressConfig {
  siteUrl: string;
  username: string;
  applicationPassword: string;
}

export class WordPressClient {
  private client: AxiosInstance;

  constructor(config: WordPressConfig) {
    this.client = axios.create({
      baseURL: `${config.siteUrl}/wp-json/wp/v2`,
      auth: {
        username: config.username,
        password: config.applicationPassword,
      },
    });
  }

  async publishArticle(params: {
    article: ArticleAST;
    status?: 'publish' | 'draft';
    categories?: number[];
    tags?: number[];
  }) {
    const { article, status = 'draft', categories = [], tags = [] } = params;

    const blocks = astToWordPressBlocks(article);

    const { data } = await this.client.post('/posts', {
      title: article.metadata.title,
      content: blocks,
      slug: article.metadata.slug,
      excerpt: article.metadata.description,
      status,
      categories,
      tags,
      meta: {
        _yoast_wpseo_title: article.seo.metaTitle,
        _yoast_wpseo_metadesc: article.seo.metaDescription,
      },
    });

    return data;
  }

  async updateArticle(params: {
    id: number;
    article: ArticleAST;
    status?: 'publish' | 'draft';
  }) {
    const { id, article, status } = params;

    const blocks = astToWordPressBlocks(article);

    const { data } = await this.client.put(`/posts/${id}`, {
      title: article.metadata.title,
      content: blocks,
      slug: article.metadata.slug,
      excerpt: article.metadata.description,
      status,
      meta: {
        _yoast_wpseo_title: article.seo.metaTitle,
        _yoast_wpseo_metadesc: article.seo.metaDescription,
      },
    });

    return data;
  }

  async getPost(id: number) {
    const { data } = await this.client.get(`/posts/${id}`);
    return data;
  }

  async listPosts() {
    const { data } = await this.client.get('/posts', {
      params: { per_page: 100 },
    });
    return data;
  }
}
