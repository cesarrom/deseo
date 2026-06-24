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
  FeedTab: undefined;
  SettingsTab: undefined;
};

export type CreateStackParamList = {
  Create: undefined;
  Ideas: { prompt: string; productId?: string };
  PostEditor: {
    suggestionId?: string;
    title: string;
    description: string;
    topic: string;
    keywords: string[];
    productId?: string;
  };
};

export type ContentStackParamList = {
  Content: undefined;
  ArticleDetail: { articleId: string; articleTitle: string };
};

export type SettingsStackParamList = {
  Settings: undefined;
};
