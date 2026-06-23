import { proxyActivities, executeChild } from '@temporalio/workflow';
import type * as pipelineActivities from '../activities/article-pipeline';
import type { BlueprintSection, ImageSpec, LexicalNode } from '@deseo/ai';
import type { gitCmsPublishWorkflow } from './gitCmsPublish';

const {
  runDirectorActivity,
  runVisualPlannerActivity,
  runSectionWriterActivity,
  generateImageActivity,
  assembleArticleActivity,
  runEditorActivity,
  saveArticleV2,
  getProductContextV2,
  getPipelineModelConfig,
  fetchVerticalPageActivity,
} = proxyActivities<typeof pipelineActivities>({
  startToCloseTimeout: '15 minutes',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 2,
    initialInterval: '5s',
  },
});

export interface GenerateArticleV2Input {
  topic: string;
  keywords?: string[];
  clientId: string;
  productId?: string;
  targetCMS?: string;
  generateImages?: boolean;
  suggestionId?: string;
  verticalUrl?: string;
  suggestionContext?: { title: string; description: string; angle?: string; hook?: string; targetAudience?: string; keySubheadings?: string[]; whyNow?: string; productVertical?: string; productVerticalUrl?: string; callToAction?: string };
  userId?: string;
}

/**
 * V2 multi-agent article generation workflow.
 *
 * Uses a 5-stage pipeline:
 * 1. Director: plans the full article blueprint
 * 2. Visual Planner: enriches image specs
 * 3. Writers (per section) + Image Generators (per image) — run in parallel
 * 4. Assembler: deterministic assembly of Lexical JSON
 * 5. Editor: holistic quality review and polish
 */
export async function generateArticleWorkflowV2(
  input: GenerateArticleV2Input
): Promise<string> {
  const { topic, keywords = [], clientId, productId, targetCMS = '', generateImages = true, suggestionId, verticalUrl, suggestionContext, userId = '' } = input;

  // --- Fetch context ---
  const { productContext, targetAudience, productDomain } = await getProductContextV2(productId);
  const { smartModel, writerModel, fastModel, imageModel } = await getPipelineModelConfig(clientId);

  // --- Optionally extend context with the target vertical page ---
  let enrichedProductContext = productContext;
  if (verticalUrl && productDomain) {
    const pageContext = await fetchVerticalPageActivity({
      url: verticalUrl,
      productDomain,
    });
    if (pageContext) {
      enrichedProductContext = `${productContext}\n\n${pageContext}`;
    }
    // If pageContext is empty (fetch failed), enrichedProductContext stays as productContext
  }

  // --- Stage 1: Director ---
  const blueprint = await runDirectorActivity({
    topic,
    keywords,
    productContext: enrichedProductContext,
    targetAudience,
    smartModel,
    suggestionContext,
  });

  // --- Stage 2: Visual Planner ---
  const visualPlan = generateImages
    ? await runVisualPlannerActivity({ blueprint, productContext: enrichedProductContext, fastModel })
    : { images: [] };

  // --- Stage 3: Writers + Image Generators in parallel ---
  //
  // We launch all section writers AND all image generators concurrently.
  // Temporal's proxyActivities handles the actual parallelism.
  const sectionPromises = blueprint.sections.map((section: BlueprintSection, i: number) =>
    runSectionWriterActivity({
      section,
      context: {
        articleTitle: blueprint.title,
        articleAngle: blueprint.angle,
        articleTone: blueprint.tone,
        productContext: enrichedProductContext,
        keywords,
        prevSectionSummary: blueprint.sections[i - 1]?.heading || blueprint.sections[i - 1]?.id,
        nextSectionHint: blueprint.sections[i + 1]?.heading || blueprint.sections[i + 1]?.role,
        productVertical: suggestionContext?.productVertical,
        productVerticalUrl: suggestionContext?.productVerticalUrl,
        callToAction: suggestionContext?.callToAction,
      },
      writerModel,
    }).then((nodes: LexicalNode[]) => ({ sectionId: section.id, nodes }))
  );

  const imagePromises = generateImages
    ? visualPlan.images.map((spec: ImageSpec) =>
        generateImageActivity({ spec, imageModel }).then((url: string | null) => ({ sectionId: spec.sectionId, url }))
      )
    : [];

  // Await all parallel work
  const [sectionResults, imageResults] = await Promise.all([
    Promise.all(sectionPromises),
    Promise.all(imagePromises),
  ]);

  // Convert to serializable maps (arrays of key-value pairs)
  const sectionEntries = sectionResults.map((r: { sectionId: string; nodes: LexicalNode[] }) => [r.sectionId, r.nodes] as [string, LexicalNode[]]);
  const imageEntries = imageResults
    .filter((r: { sectionId: string; url: string | null }) => r.url !== null)
    .map((r: { sectionId: string; url: string | null }) => [r.sectionId, r.url!] as [string, string]);

  // --- Stage 4: Assemble ---
  const assembled = await assembleArticleActivity({
    blueprint,
    sectionEntries,
    imageEntries,
  });

  // --- Stage 5: Editor ---
  const finalRoot = await runEditorActivity({
    lexicalRoot: assembled,
    blueprint,
    smartModel,
  });

  // --- Save ---
  const articleId = await saveArticleV2({
    blueprint,
    lexicalRoot: finalRoot,
    heroImageUrl: imageEntries.find(([id]: [string, string]) => id === 'hero')?.[1],
    clientId,
    productId,
    targetCMS,
    suggestionId,
  });

  if (targetCMS === 'github-cms' && userId) {
    await executeChild<typeof gitCmsPublishWorkflow>('gitCmsPublishWorkflow', {
      args: [{
        userId,
        appSlug: 'github-cms',
        astContent: finalRoot,
        productConfig: { productContext: enrichedProductContext },
        targetRepo: '', // The agent will determine this or it should be in product config
        branchName: `deseo-article-${blueprint.slug}-${Date.now()}`
      }],
      workflowId: `git-cms-${blueprint.slug}-${Date.now()}`,
    });
  }

  return articleId;
}
