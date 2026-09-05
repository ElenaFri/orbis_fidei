import { describe, expect, it, vi } from 'vitest';

import { FakeAIProvider, OpenAIProvider, createAIProvider } from './providers.js';

const item = {
  id: 'item_1',
  originalTitle: 'A title',
  originalContent: 'A source content',
  originalLanguage: 'FR' as const,
};

describe('FakeAIProvider', () => {
  it('returns deterministic editorial suggestions without a network call', async () => {
    const result = await new FakeAIProvider().analyze(item);
    expect(result).toMatchObject({
      language: 'FR',
      suggestedTitle: 'A title',
      suggestedCategory: 'other',
      confidence: 0.5,
    });
  });
});

describe('OpenAIProvider', () => {
  it('sends a structured JSON request and parses the response', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  language: 'FR',
                  suggestedTitle: 'Title',
                  suggestedSummary: 'Summary',
                  suggestedCategory: 'theology',
                  confidence: 0.9,
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const provider = new OpenAIProvider('test-key', 'test-model', fetcher);

    const result = await provider.analyze(item);

    expect(result.suggestedCategory).toBe('theology');
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws when OpenAI returns an HTTP error', async () => {
    const provider = new OpenAIProvider(
      'test-key',
      'test-model',
      vi.fn().mockResolvedValue(new Response(null, { status: 429 })),
    );
    await expect(provider.analyze(item)).rejects.toThrow('HTTP 429');
  });

  it('selects the fake provider by default and requires a key for OpenAI', () => {
    expect(createAIProvider({ AI_PROVIDER: 'fake' }).constructor.name).toBe('FakeAIProvider');
    expect(() => createAIProvider({ AI_PROVIDER: 'openai' })).toThrow('AI_API_KEY is required');
    expect(createAIProvider({ AI_PROVIDER: 'openai', AI_API_KEY: 'key' }).constructor.name).toBe(
      'OpenAIProvider',
    );
  });
});
