import { BaseConnectorRepository } from './base';
import { AnalyticsProviderContract, KeywordMetric, AnalyticsDashboardData, UnifiedKeywordData } from '@deseo/types';

export class AnalyticsRepositoryImpl extends BaseConnectorRepository implements AnalyticsProviderContract {
  async listSites(): Promise<{ siteUrl: string; permissionLevel: string }[]> {
    return this.request('GET', '/api/feature/analytics/sites');
  }

  async fetchKeywordPerformance(params: {
    startDate: string;
    endDate: string;
    siteUrl: string;
  }): Promise<KeywordMetric[]> {
    return this.request('POST', '/api/feature/analytics/performance', params);
  }

  async getDashboardData(siteUrl: string): Promise<AnalyticsDashboardData> {
    return this.request('GET', '/api/feature/analytics/dashboard', { siteUrl });
  }

  async syncKeywords(params: { siteUrl: string; startDate: string; endDate: string }): Promise<UnifiedKeywordData[]> {
    return this.request('POST', '/api/feature/analytics/sync', params);
  }
}
