import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities';

const { fetchPageContent, analyzeProductAndSave, getProductContext, getClientModelPreference } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    maximumAttempts: 2,
  }
});

interface AnalyzeProductInput {
  productId: string;
  domain: string;
  urls: string[];
}

export async function analyzeProductWorkflow(input: AnalyzeProductInput): Promise<any> {
  const MAX_PAGES = 20; // Increased from 15
  const collectedPages: { url: string; content: string }[] = [];
  const visited = new Set<string>();
  const discoveredSubdomains = new Set<string>();
  
  // Normalize domain to a fetchable URL
  const domainUrl = input.domain.startsWith('sc-domain:') 
    ? `https://${input.domain.replace('sc-domain:', '')}` 
    : input.domain;

  const parsedBase = new URL(domainUrl);
  // Get the base domain (e.g., askn.us from www.askn.us)
  const baseHost = parsedBase.hostname.replace(/^www\./, '');
  
  // Seed the queue with initial URLs. Prioritize the main domain URL.
  const queue = Array.from(new Set([domainUrl, ...input.urls]));

  // Fetch model preference
  let model: string = 'openai/gpt-4o';
  try {
    const product = await getProductContext(input.productId);
    if (product && product.clientId) {
      model = await getClientModelPreference(product.clientId);
    }
  } catch (error) {
    console.warn(`❌ [Workflow] Could not fetch client model preference, using default.`);
  }

  while (queue.length > 0 && collectedPages.length < MAX_PAGES) {
    const url = queue.shift()!;
    // Standardize URL for visited tracking (lowercase, no trailing slash)
    const normUrl = url.toLowerCase().replace(/\/$/, '');
    if (visited.has(normUrl)) continue;
    visited.add(normUrl);

    try {
      const { content, links } = await fetchPageContent(url);
      
      if (content && content.length > 200) {
        collectedPages.push({ url, content });
      }

      // Discover new links for the queue
      for (const link of links) {
        try {
          const linkUrl = new URL(link);
          const linkHost = linkUrl.hostname.replace(/^www\./, '');

          // 1. Subdomain Discovery: Check if it's a subdomain of the baseHost
          if (linkHost.endsWith(baseHost)) {
            // If it's a different subdomain than the one we are currently crawling
            if (linkHost !== baseHost && !linkHost.startsWith('www.')) {
              discoveredSubdomains.add(linkHost);
            }

            // 2. Crawling Decision: Stay on the SAME domain (ignoring www)
            const isSameDomain = linkHost === baseHost;
            const isPagination = /\/page\/\d+/.test(linkUrl.pathname) || /[\?&]p=\d+/.test(linkUrl.search);
            const isAssets = /\.(jpg|jpeg|png|gif|pdf|zip|css|js|svg|woff2?|ico)$/i.test(linkUrl.pathname);
            
            if (isSameDomain && !isPagination && !isAssets) {
              const normLink = link.toLowerCase().replace(/\/$/, '');
              if (!visited.has(normLink)) {
                queue.push(link);
              }
            }
          }
        } catch (e) {
          // Ignore invalid link URLs
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${url} during workflow`, error);
    }
  }

  if (collectedPages.length === 0) {
    return { success: false, reason: 'No content could be fetched for analysis' };
  }

  console.log(`🤖 [Workflow] Analysis for ${input.domain} using ${collectedPages.length} pages and model: ${model}`);

  return await analyzeProductAndSave({
    productId: input.productId,
    domain: input.domain,
    pages: collectedPages,
    model,
    discoveredSubdomains: Array.from(discoveredSubdomains),
  });
}
