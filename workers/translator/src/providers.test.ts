import { describe, expect, it, vi } from 'vitest';

import {
  FakeTranslationProvider,
  OpenAITranslationProvider,
  createTranslationProvider,
} from './providers.js';

const content = { title: 'Title', summary: 'Summary', analysis: 'Analysis' };

describe('FakeTranslationProvider', () => {
  it('returns deterministic machine-markable content', async () => {
    const result = await new FakeTranslationProvider().translate(content, 'FR', 'EN');
    expect(result).toEqual({
      title: '[EN] Title',
      summary: '[EN] Summary',
      analysis: '[EN] Analysis',
    });
  });
});

describe('OpenAITranslationProvider', () => {
  it('parses a structured OpenAI response', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: 'Title EN',
                  summary: 'Summary EN',
                  analysis: 'Analysis EN',
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const result = await new OpenAITranslationProvider('test-key', 'test-model', fetcher).translate(
      content,
      'FR',
      'EN',
    );
    expect(result.title).toBe('Title EN');
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on provider HTTP errors', async () => {
    const provider = new OpenAITranslationProvider(
      'test-key',
      'test-model',
      vi.fn().mockResolvedValue(new Response(null, { status: 429 })),
    );
    await expect(provider.translate(content, 'FR', 'EN')).rejects.toThrow('HTTP 429');
  });

  it('selects fake by default and requires a key for OpenAI', () => {
    expect(createTranslationProvider({ AI_PROVIDER: 'fake' })).toBeInstanceOf(
      FakeTranslationProvider,
    );
    expect(() => createTranslationProvider({ AI_PROVIDER: 'openai' })).toThrow(
      'AI_API_KEY is required',
    );
  });
});
