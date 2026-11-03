# Roadmap

Open work, taken from the code and the progress notes.

## Command-line tool (`packages/cli/src/index.ts`)
Ten commands are stubs marked TODO:
- Fetch repository data from a provider using stored tokens, and implement pull-request creation
- Fetch dashboard data from providers and from the CMS
- Convert an article AST and publish it to the CMS
- Fetch existing CMS content in the `UnifiedPost` format (content must be Lexical JSON)
- Search Console: list sites, query analytics data, fetch historical data in the `UnifiedKeywordData` format

## Workflows
- The Temporal activities for article generation, repository SEO optimization and keyword research are scaffolded (`PROGRESS.md`); replace the scaffolding with full implementations and tests

## Platform
- Remaining phases and the product direction are in [`PROGRESS.md`](PROGRESS.md), [`TASK_LOG.md`](TASK_LOG.md) and [`STRATEGY.md`](STRATEGY.md)
