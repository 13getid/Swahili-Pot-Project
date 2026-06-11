// Calls a streaming SSE AI endpoint via fetch (axios can't stream response
// bodies in the browser). The server emits lines of `data: {json}`.
//
// onChunk(text)  — called for each `{ chunk }` event
// onDone(data)   — called once with the final `{ done: true, ... }` event
// onError(msg)   — called on any error (HTTP or `{ error }` event)
export async function streamAIRequest({ url, body, onChunk, onDone, onError }) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    // Non-streaming error responses (e.g. 503 disabled) come back as JSON.
    const ct = response.headers.get('content-type') || '';
    if (!response.ok && !ct.includes('text/event-stream')) {
      const data = await response.json().catch(() => ({}));
      onError && onError(data.error || 'Request failed');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.chunk) onChunk && onChunk(parsed.chunk);
          if (parsed.error) onError && onError(parsed.error);
          if (parsed.done) onDone && onDone(parsed);
        } catch {
          /* skip malformed SSE line */
        }
      }
    }
  } catch (err) {
    onError && onError(err.message || 'Stream failed');
  }
}
