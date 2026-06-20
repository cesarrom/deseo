import axios from 'axios';
import jwt from 'jsonwebtoken';

export interface ConnectorConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  userId: string;
}

export abstract class BaseConnectorRepository {
  constructor(protected config: ConnectorConfig) {}

  protected async request<T>(method: 'GET' | 'POST', path: string, data?: any): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    
    // Sign the request with the connector's clientSecret
    const token = jwt.sign(
      { 
        userId: this.config.userId, 
        clientId: this.config.clientId 
      }, 
      this.config.clientSecret, 
      { expiresIn: '5m' }
    );

    const headers = {
      'x-deseo-token': token,
    };

    try {
      const response = await axios({
        method,
        url,
        data,
        params: method === 'GET' ? data : undefined,
        headers,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || `Request to ${url} failed`);
      }

      return response.data.data;
    } catch (error: any) {
      console.error(`[Connector Error] ${method} ${path}:`, error.response?.data || error.message);
      throw error;
    }
  }
}
