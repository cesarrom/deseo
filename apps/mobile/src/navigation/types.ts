export type OnboardingStackParamList = {
  Welcome: undefined;
  CreateClient: undefined;
  Connectors: { clientId: string; clientName: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  CreateTab: undefined;
  ContentTab: undefined;
  MetricsTab: undefined;
  SettingsTab: undefined;
};

export type CreateStackParamList = {
  Create: undefined;
  Ideas: { prompt: string };
  PostEditor: { ideaTitle: string; ideaDescription: string; prompt: string };
  Publish: { postId: string; postTitle: string; content: string };
};

export type ContentStackParamList = {
  Content: undefined;
  ProductDetail: { productId: string; productTitle: string };
};

export type SettingsStackParamList = {
  Settings: undefined;
  Clients: undefined;
  Connectors: undefined;
  ConnectorDetail: { connectorId: string; connectorName: string };
};
