import type { ArticleContent, Language, TranslationProvider } from './translator.js';

export class FakeTranslationProvider implements TranslationProvider {
  async translate(
    content: ArticleContent,
    sourceLang: Language,
    targetLang: Language,
  ): Promise<ArticleContent> {
    return {
      title: `[${targetLang}] ${content.title}`,
      summary: `[${targetLang}] ${content.summary}`,
      analysis: `[${targetLang}] ${content.analysis}`,
    };
  }
}

export class OpenAITranslationProvider implements TranslationProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = 'gpt-4o-mini',
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async translate(
    content: ArticleContent,
    sourceLang: Language,
    targetLang: Language,
  ): Promise<ArticleContent> {
    const response = await this.fetcher('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Translate the title, summary, and analysis from ${sourceLang} to ${targetLang}. Return JSON only with title, summary, and analysis. Preserve meaning and editorial tone.`,
          },
          { role: 'user', content: JSON.stringify(content) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`OpenAI returned HTTP ${response.status}`);
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = body.choices?.[0]?.message?.content;
    if (!raw) throw new Error('OpenAI returned no translation content');
    return JSON.parse(raw) as ArticleContent;
  }
}

export function createTranslationProvider(
  env: NodeJS.ProcessEnv = process.env,
): TranslationProvider {
  if ((env.AI_PROVIDER ?? 'fake').toLowerCase() === 'openai') {
    if (!env.AI_API_KEY) throw new Error('AI_API_KEY is required when AI_PROVIDER=openai');
    return new OpenAITranslationProvider(env.AI_API_KEY, env.AI_MODEL ?? 'gpt-4o-mini');
  }
  return new FakeTranslationProvider();
}
