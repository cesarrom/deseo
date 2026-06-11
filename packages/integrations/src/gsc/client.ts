import axios, { type AxiosInstance } from 'axios';

export interface GSCConfig {
  accessToken: string;
}

export interface SearchQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export class GSCClient {
  private client: AxiosInstance;

  constructor(config: GSCConfig) {
    this.client = axios.create({
      baseURL: 'https://www.googleapis.com/webmasters/v3',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    });
  }

  async getSearchQueries(params: {
    siteUrl: string;
    startDate: string;
    endDate: string;
    rowLimit?: number;
  }): Promise<SearchQuery[]> {
    const { siteUrl, startDate, endDate, rowLimit = 1000 } = params;

    const { data } = await this.client.post(
      `/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit,
      }
    );

    return (data.rows || []).map((row: any) => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  }

  async getPagePerformance(params: {
    siteUrl: string;
    startDate: string;
    endDate: string;
    page: string;
  }) {
    const { siteUrl, startDate, endDate, page } = params;

    const { data } = await this.client.post(
      `/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        startDate,
        endDate,
        dimensions: ['page'],
        dimensionFilterGroups: [
          {
            filters: [
              {
                dimension: 'page',
                expression: page,
              },
            ],
          },
        ],
      }
    );

    return data.rows?.[0] || null;
  }

  async listSites() {
    const { data } = await this.client.get('/sites');
    return data.siteEntry || [];
  }
}
