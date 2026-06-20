import axios from 'axios';

export interface ConnectorActionParams {
  userId: string;
  appSlug: string;
  actionPath: string;
  method: 'GET' | 'POST';
  payload?: any;
}

/**
 * Generic activity to call any Deseo Connector via the Hub's proxy.
 * This ensures workflows remain provider-agnostic.
 */
export async function callConnectorAction(params: ConnectorActionParams): Promise<any> {
  const HUB_URL = process.env.HUB_URL || 'http://localhost:3001/trpc';
  const internalSecret = process.env.AUTH_SECRET || 'development_secret_123_fallback';

  try {
    // We call the Hub's executeAction endpoint
    const response = await axios.post(
      `${HUB_URL}/registry.executeAction`,
      {
        json: {
          appSlug: params.appSlug,
          actionPath: params.actionPath,
          method: params.method,
          payload: params.payload,
        },
      },
      {
        headers: {
          'x-internal-secret': internalSecret,
          Authorization: `Bearer ${params.userId}`,
        },
      }
    );

    if (response.data.error) {
      throw new Error(`Hub error: ${response.data.error.json.message}`);
    }

    return response.data.result.data.json;
  } catch (error: any) {
    console.error('Connector activity failed:', error.response?.data || error.message);
    throw new Error(`Failed to execute connector action: ${error.message}`);
  }
}
