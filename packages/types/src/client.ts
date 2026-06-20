export interface Client {
  id: string;
  slug: string;
  name: string;
  userId: string;
  payloadInstanceUrl?: string;
  payloadApiKey?: string;
  aiModelPreference: string;
  customData?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
