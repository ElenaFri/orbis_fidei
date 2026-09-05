import type { AIProvider, AnalysisResult, SourceItemForAnalysis } from './analyzer.js';

const JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    language: { type: 'string', enum: ['FR', 'EN', 'RU'] },
    suggestedTitle: { type: 'string' },
    suggestedSummary: { type: 'string' },
    suggestedCategory: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['language', 'suggestedTitle', 'suggestedSummary', 'suggestedCategory', 'confidence'],
} as const;

export class FakeAIProvider implements AIProvider {
  async analyze(item: SourceItemForAnalysis): Promise<AnalysisResult> {
    const content = item.originalContent.trim();
    return {
      language: item.originalLanguage,
      suggestedTitle: item.originalTitle,
      suggestedSummary: content.slice(0, 500) || item.originalTitle,
      suggestedCategory: 'other',
      confidence: 0.5,
    };
  }
}

export class OpenAIProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = 'gpt-4o-mini',
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async analyze(item: SourceItemForAnalysis): Promise<AnalysisResult> {
    const response = await this.fetcher('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'article_analysis', strict: true, schema: JSON_SCHEMA },
        },
        messages: [
          {
            role: 'system',
            content:
              'Analyze the source item. Return JSON only. Preserve factual meaning, write a concise summary, choose one editorial category, and never publish anything.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              title: item.originalTitle,
              content: item.originalContent,
              language: item.originalLanguage,
            }),
          },
        ],
      }),
    });

    if (!response.ok) throw new Error(`OpenAI returned HTTP ${response.status}`);
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned no analysis content');
    return JSON.parse(content) as AnalysisResult;
  }
}

export function createAIProvider(env: NodeJS.ProcessEnv = process.env): AIProvider {
  if ((env.AI_PROVIDER ?? 'fake').toLowerCase() === 'openai') {
    if (!env.AI_API_KEY) throw new Error('AI_API_KEY is required when AI_PROVIDER=openai');
    return new OpenAIProvider(env.AI_API_KEY, env.AI_MODEL ?? 'gpt-4o-mini');
  }
  return new FakeAIProvider();
}
