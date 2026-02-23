const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_TIMEOUT_MS = 15000;
const OPENAI_MAX_ATTEMPTS = 2;
const RETRYABLE_ERROR_CODES = new Set(['RATE_LIMITED', 'SERVER_ERROR', 'NETWORK_ERROR', 'TIMEOUT']);

export class AIMappingError extends Error {
  constructor({ code, message, status = null, providerMessage = '' }) {
    super(message);
    this.name = 'AIMappingError';
    this.code = code || 'UNKNOWN';
    this.status = status;
    this.providerMessage = providerMessage;
  }
}

function truncateText(value, length = 200) {
  return String(value || '').trim().slice(0, length);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseJSONSafe(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function normalizeProviderError({ status, providerCode, providerType, providerMessage }) {
  if (providerCode === 'invalid_api_key') {
    return 'INVALID_API_KEY';
  }

  if (providerCode === 'insufficient_quota') {
    return 'QUOTA_EXCEEDED';
  }

  if (providerCode === 'rate_limit_exceeded' || status === 429) {
    return 'RATE_LIMITED';
  }

  if (providerCode === 'context_length_exceeded') {
    return 'INPUT_TOO_LARGE';
  }

  if (providerCode === 'model_not_found') {
    return 'MODEL_NOT_FOUND';
  }

  if (status === 401) {
    return 'UNAUTHORIZED';
  }

  if (status === 403) {
    return 'FORBIDDEN';
  }

  if (status >= 500) {
    return 'SERVER_ERROR';
  }

  if (providerType === 'invalid_request_error') {
    return 'INVALID_REQUEST';
  }

  if (status === 0 && providerMessage) {
    return 'NETWORK_ERROR';
  }

  return 'REQUEST_FAILED';
}

function buildErrorMessage(code, status, providerMessage) {
  const suffix = providerMessage ? `: ${providerMessage}` : '';
  return `OpenAI mapping error (${code}${status ? `, ${status}` : ''})${suffix}`;
}

function normalizeFetchError(error) {
  if (error?.name === 'AbortError') {
    return new AIMappingError({
      code: 'TIMEOUT',
      message: buildErrorMessage('TIMEOUT', null, 'Request timed out')
    });
  }

  return new AIMappingError({
    code: 'NETWORK_ERROR',
    message: buildErrorMessage('NETWORK_ERROR', null, truncateText(error?.message || 'Network request failed')),
    providerMessage: truncateText(error?.message || 'Network request failed')
  });
}

function parseResponseError(status, responseText) {
  const parsed = parseJSONSafe(responseText);
  const providerError = parsed?.error || {};
  const providerCode = String(providerError.code || '').trim() || null;
  const providerType = String(providerError.type || '').trim() || null;
  const providerMessage = truncateText(providerError.message || responseText || 'Request failed');
  const code = normalizeProviderError({
    status,
    providerCode,
    providerType,
    providerMessage
  });

  return new AIMappingError({
    code,
    status,
    providerMessage,
    message: buildErrorMessage(code, status, providerMessage)
  });
}

function shouldRetry(error) {
  return error instanceof AIMappingError && RETRYABLE_ERROR_CODES.has(error.code);
}

function extractAssistantContent(messageContent) {
  if (typeof messageContent === 'string') {
    return messageContent;
  }

  if (Array.isArray(messageContent)) {
    return messageContent
      .map((chunk) => {
        if (typeof chunk === 'string') {
          return chunk;
        }
        if (chunk && typeof chunk.text === 'string') {
          return chunk.text;
        }
        if (chunk?.type === 'output_text' && typeof chunk?.text === 'string') {
          return chunk.text;
        }
        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

function extractJSONObject(text) {
  if (typeof text !== 'string') {
    return null;
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch (_error) {
    return null;
  }
}

function sanitizeTargetFields(targetFields = []) {
  return targetFields
    .map((field) => {
      if (!field || typeof field !== 'object') {
        return null;
      }

      const selector = String(field.selector || field.name || '').trim();
      const name = String(field.name || field.selector || '').trim();
      const type = String(field.type || 'text').trim();

      if (!selector || !name) {
        return null;
      }

      return { selector, name, type };
    })
    .filter(Boolean);
}

function validateAIResponse(rawResult, csvHeaders, targetFields, threshold) {
  const responseObject = extractJSONObject(rawResult);
  if (!responseObject || !Array.isArray(responseObject.mapping)) {
    throw new AIMappingError({
      code: 'INVALID_PROVIDER_RESPONSE',
      message: buildErrorMessage('INVALID_PROVIDER_RESPONSE', null, 'Malformed JSON mapping response')
    });
  }

  const allowedSelectors = new Set(targetFields.map((field) => field.selector));
  const usedColumns = new Set();
  const usedSelectors = new Set();
  const mapping = {};
  const matches = [];

  responseObject.mapping.forEach((candidate) => {
    const csvIndex = Number.parseInt(candidate.csvIndex, 10);
    const targetSelector = String(candidate.targetSelector || '').trim();
    const confidence = Number.parseInt(candidate.confidence ?? 0, 10);
    const reason = String(candidate.reason || '').trim();

    if (!Number.isInteger(csvIndex) || csvIndex < 0 || csvIndex >= csvHeaders.length) {
      return;
    }

    if (!targetSelector || !allowedSelectors.has(targetSelector)) {
      return;
    }

    if (!Number.isInteger(confidence) || confidence < threshold) {
      return;
    }

    if (usedColumns.has(csvIndex) || usedSelectors.has(targetSelector)) {
      return;
    }

    usedColumns.add(csvIndex);
    usedSelectors.add(targetSelector);
    mapping[csvIndex] = targetSelector;
    matches.push({
      csvIndex,
      csvHeader: csvHeaders[csvIndex],
      targetSelector,
      confidence,
      reason
    });
  });

  return { mapping, matches };
}

function buildPromptPayload(csvHeaders, targetFields) {
  return {
    csvHeaders,
    targetFields
  };
}

async function requestOpenAICompletion({ apiKey, model, userPayload }) {
  let lastError = null;

  for (let attempt = 1; attempt <= OPENAI_MAX_ATTEMPTS; attempt += 1) {
    let timeoutId = null;
    const abortController = new AbortController();

    try {
      timeoutId = setTimeout(() => {
        abortController.abort();
      }, OPENAI_TIMEOUT_MS);

      const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        signal: abortController.signal,
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content: [
                'You map CSV headers to form fields.',
                'Return only a JSON object with property "mapping".',
                'Each mapping item must contain csvIndex, targetSelector, confidence (0-100), reason.',
                'Use only target selectors provided by the user.',
                'Prefer one-to-one mappings and skip uncertain matches.'
              ].join(' ')
            },
            {
              role: 'user',
              content: [
                'Match CSV columns to target fields by semantic similarity.',
                'Do not infer data from outside this payload.',
                'Payload:',
                JSON.stringify(userPayload)
              ].join('\n')
            }
          ]
        })
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw parseResponseError(response.status, responseText);
      }

      const body = await response.json();
      return body;
    } catch (error) {
      const normalizedError = error instanceof AIMappingError ? error : normalizeFetchError(error);
      lastError = normalizedError;

      if (attempt < OPENAI_MAX_ATTEMPTS && shouldRetry(normalizedError)) {
        await sleep(350 * attempt);
        continue;
      }

      throw normalizedError;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  throw lastError || new AIMappingError({
    code: 'UNKNOWN',
    message: buildErrorMessage('UNKNOWN', null, 'Unknown request failure')
  });
}

/**
 * Suggest column mapping with OpenAI.
 * Sends only CSV headers and target field metadata (no CSV row values).
 *
 * @param {Object} params
 * @param {string} params.apiKey
 * @param {string[]} params.csvHeaders
 * @param {Array<{name: string, selector: string, type?: string}>} params.targetFields
 * @param {number} [params.threshold=62]
 * @param {string} [params.model='gpt-4o-mini']
 * @returns {Promise<{mapping: Object, matches: Array, threshold: number, provider: string}>}
 */
export async function suggestOpenAIMapping({
  apiKey,
  csvHeaders,
  targetFields,
  threshold = 62,
  model = DEFAULT_OPENAI_MODEL
}) {
  const normalizedApiKey = String(apiKey || '').trim();
  if (!normalizedApiKey) {
    throw new Error('OpenAI API key is required');
  }

  if (!Array.isArray(csvHeaders) || csvHeaders.length === 0) {
    return { mapping: {}, matches: [], threshold, provider: 'openai' };
  }

  const normalizedTargetFields = sanitizeTargetFields(targetFields);
  if (normalizedTargetFields.length === 0) {
    return { mapping: {}, matches: [], threshold, provider: 'openai' };
  }

  const userPayload = buildPromptPayload(csvHeaders, normalizedTargetFields);
  const body = await requestOpenAICompletion({
    apiKey: normalizedApiKey,
    model,
    userPayload
  });

  const rawContent = extractAssistantContent(body?.choices?.[0]?.message?.content);
  if (!rawContent) {
    throw new AIMappingError({
      code: 'INVALID_PROVIDER_RESPONSE',
      message: buildErrorMessage('INVALID_PROVIDER_RESPONSE', null, 'Missing content in OpenAI response')
    });
  }

  const { mapping, matches } = validateAIResponse(
    typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent || {}),
    csvHeaders,
    normalizedTargetFields,
    threshold
  );

  return {
    mapping,
    matches,
    threshold,
    provider: 'openai'
  };
}
