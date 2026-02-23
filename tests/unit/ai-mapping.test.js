import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIMappingError, suggestOpenAIMapping } from '../../src/domain/ai-mapping.js';

describe('AI Mapping - Unit Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return validated one-to-one mapping from OpenAI response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                mapping: [
                  { csvIndex: 0, targetSelector: 'id:field-a', confidence: 92, reason: 'exact match' },
                  { csvIndex: 1, targetSelector: 'id:field-b', confidence: 88, reason: 'semantic match' }
                ]
              })
            }
          }
        ]
      })
    })));

    const result = await suggestOpenAIMapping({
      apiKey: 'sk-test',
      csvHeaders: ['NRUA', 'Fecha de entrada'],
      targetFields: [
        { name: 'Número de Registro Único de Alquiler', selector: 'id:field-a' },
        { name: 'Fecha de entrada', selector: 'id:field-b' }
      ],
      threshold: 60
    });

    expect(result.mapping).toEqual({
      0: 'id:field-a',
      1: 'id:field-b'
    });
    expect(result.matches).toHaveLength(2);
    expect(result.provider).toBe('openai');
  });

  it('should drop invalid or low-confidence mappings', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                mapping: [
                  { csvIndex: 0, targetSelector: 'id:allowed', confidence: 55, reason: 'too low' },
                  { csvIndex: 1, targetSelector: 'id:not-allowed', confidence: 99, reason: 'invalid selector' }
                ]
              })
            }
          }
        ]
      })
    })));

    const result = await suggestOpenAIMapping({
      apiKey: 'sk-test',
      csvHeaders: ['A', 'B'],
      targetFields: [{ name: 'Allowed', selector: 'id:allowed' }],
      threshold: 60
    });

    expect(result.mapping).toEqual({});
    expect(result.matches).toEqual([]);
  });

  it('should throw with non-ok OpenAI responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({
        error: {
          message: 'Incorrect API key provided',
          type: 'invalid_request_error',
          code: 'invalid_api_key'
        }
      })
    })));

    await expect(
      suggestOpenAIMapping({
        apiKey: 'sk-test',
        csvHeaders: ['A'],
        targetFields: [{ name: 'Allowed', selector: 'id:allowed' }]
      })
    ).rejects.toMatchObject({
      name: 'AIMappingError',
      code: 'INVALID_API_KEY',
      status: 401
    });
  });

  it('should retry once on rate limit and then succeed', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(async () => ({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({
          error: {
            message: 'Rate limit exceeded',
            type: 'rate_limit_error',
            code: 'rate_limit_exceeded'
          }
        })
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  mapping: [
                    { csvIndex: 0, targetSelector: 'id:allowed', confidence: 97, reason: 'strong match' }
                  ]
                })
              }
            }
          ]
        })
      }));

    vi.stubGlobal('fetch', fetchMock);

    const result = await suggestOpenAIMapping({
      apiKey: 'sk-test',
      csvHeaders: ['NRUA'],
      targetFields: [{ name: 'Número de Registro Único de Alquiler', selector: 'id:allowed' }]
    });

    expect(result.mapping).toEqual({ 0: 'id:allowed' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should classify abort errors as timeout', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }));

    await expect(
      suggestOpenAIMapping({
        apiKey: 'sk-test',
        csvHeaders: ['NRUA'],
        targetFields: [{ name: 'NRUA', selector: 'id:allowed' }]
      })
    ).rejects.toMatchObject({
      name: 'AIMappingError',
      code: 'TIMEOUT'
    });
  });

  it('should classify malformed successful payloads as invalid provider response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not-json-response' } }]
      })
    })));

    try {
      await suggestOpenAIMapping({
        apiKey: 'sk-test',
        csvHeaders: ['NRUA'],
        targetFields: [{ name: 'NRUA', selector: 'id:allowed' }]
      });
      throw new Error('Expected suggestOpenAIMapping to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(AIMappingError);
      expect(error.code).toBe('INVALID_PROVIDER_RESPONSE');
    }
  });
});
