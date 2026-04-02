/**
 * NexChat — API Module
 *
 * Requests go to /api/chat/completions — proxied by server.js to NVIDIA.
 * WHY A PROXY? NVIDIA's API has no CORS headers; browsers block direct calls.
 * The local Express server (server.js) forwards them server-side.
 */

const IS_PROD = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const PROXY_URL = IS_PROD ? '/.netlify/functions/chat' : '/api/chat/completions';



const NvidiaAPI = {
  /**
   * Send a streaming chat completion request.
   * @param {Object} opts
   * @param {string} opts.apiKey
   * @param {string} opts.model
   * @param {Array}  opts.messages  - [{role, content}, ...]
   * @param {number} opts.temperature
   * @param {number} opts.topP
   * @param {number} opts.maxTokens
   * @param {Function} opts.onToken  - called with each text chunk
   * @param {Function} opts.onDone   - called when stream ends
   * @param {Function} opts.onError  - called with Error object on failure
   * @returns {AbortController} - call .abort() to cancel
   */
  async streamChat({ apiKey, model, messages, temperature, topP, maxTokens, onToken, onDone, onError }) {
    const controller = new AbortController();

    try {
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': IS_PROD ? 'application/json' : 'text/event-stream',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: temperature ?? 0.2,
          top_p: topP ?? 0.7,
          max_tokens: maxTokens ?? 1024,
          stream: !IS_PROD,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `API Error ${response.status}`;
        if (response.status === 401) errMsg = 'Invalid API key. Please check your key in Settings.';
        else if (response.status === 429) errMsg = 'Rate limit reached. Please wait a moment and try again.';
        else if (response.status === 400) errMsg = `Bad request: ${errText}`;
        else if (response.status === 404) errMsg = `Model "${model}" not found. Try a different model in Settings.`;
        throw new Error(errMsg);
      }

      // Production (Netlify): full JSON response
      if (IS_PROD) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        onToken?.(content);
        onDone?.();
        return controller;
      }

      // Local: SSE streaming
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let doneCalled = false; // guard — onDone must fire exactly once

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete last line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === 'data: [DONE]') {
            if (!doneCalled) { doneCalled = true; onDone?.(); }
            continue;
          }
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const token = json.choices?.[0]?.delta?.content;
              if (token) onToken?.(token);
            } catch {
              // skip malformed SSE line
            }
          }
        }
      }

      if (!doneCalled) { doneCalled = true; onDone?.(); }

    } catch (err) {
      if (err.name === 'AbortError') return; // user cancelled
      onError?.(err);
    }

    return controller;
  },

  
  async getModels(apiKey) {
    const DEFAULTS = [
      { id: 'google/gemma-7b', label: 'Gemma 7B (Default)' },
      { id: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B' },
      { id: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
      { id: 'mistralai/mistral-7b-instruct-v0.3', label: 'Mistral 7B' },
    ];

    try {
      const res = await fetch(`${PROXY_BASE}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!res.ok) return DEFAULTS;
      const data = await res.json();
      return (data.data || []).map(m => ({ id: m.id, label: m.id }));
    } catch {
      return DEFAULTS;
    }
  },
};

export default NvidiaAPI;
