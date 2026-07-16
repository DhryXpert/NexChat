import { useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export function useStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(null);
  const { getIdToken } = useAuth();

  const streamMessage = useCallback(async ({ model, messages, temperature, topP, maxTokens, onToken, onDone, onError }) => {
    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await getIdToken();

      const response = await fetch(`${BACKEND_URL}/api/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: temperature ?? 0.2,
          top_p: topP ?? 0.7,
          max_tokens: maxTokens ?? 1024,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `API Error ${response.status}`;
        if (response.status === 401) errMsg = 'Authentication failed. Please log in again.';
        else if (response.status === 429) errMsg = 'Rate limit reached. Please wait a moment.';
        else if (response.status === 400) errMsg = `Bad request: ${errText}`;
        else if (response.status === 404) errMsg = `Model not found. Try a different model.`;
        throw new Error(errMsg);
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let doneCalled = false;

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
              const tokenText = json.choices?.[0]?.delta?.content;
              if (tokenText) onToken?.(tokenText);
            } catch {
              // skip malformed SSE line
            }
          }
        }
      }

      if (!doneCalled) { doneCalled = true; onDone?.(); }
    } catch (err) {
      if (err.name === 'AbortError') return;
      onError?.(err);
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [getIdToken]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { streamMessage, isStreaming, cancel };
}
