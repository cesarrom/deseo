import { BaseConnectorRepository } from './base';
import { CMSProviderContract, CMSCollection, CMSDashboardData, UnifiedPost } from '@deseo/types';

export class CMSRepositoryImpl extends BaseConnectorRepository implements CMSProviderContract {
  async listCollections(): Promise<CMSCollection[]> {
    return this.request('GET', '/api/feature/cms/collections');
  }

  async publishArticle(params: {
    collection: string;
    title: string;
    slug: string;
    content: any;
    metadata?: Record<string, any>;
  }): Promise<{ id: string; url?: string }> {
    return this.request('POST', '/api/feature/cms/publish', params);
  }

  async getDashboardData(): Promise<CMSDashboardData> {
    return this.request('GET', '/api/feature/cms/dashboard');
  }

  async syncPosts(params: { collection: string; limit?: number; offset?: number }): Promise<UnifiedPost[]> {
    return this.request('GET', '/api/feature/cms/sync', params);
  }
}
