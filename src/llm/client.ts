/** OpenAI 兼容 LLM 客户端(流式),零依赖 fetch 实现。
 *  baseURL 形如 https://api.openai.com/v1 —— 兼容 Claude(经网关)/GLM/DeepSeek/本地等。 */

export interface ChatOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  onDelta?: (delta: string) => void; // 每段增量文本回调(用于流式展示)
  signal?: AbortSignal;
}

export interface ChatResult {
  text: string;
}

export async function chatStream(opts: ChatOptions): Promise<ChatResult> {
  const res = await fetch(`${opts.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.2,
      stream: true,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LLM API ${res.status}: ${body.slice(0, 300)}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop()!;
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const data = t.slice(5).trim();
      if (data === "[DONE]") return { text };
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          text += delta;
          opts.onDelta?.(delta);
        }
      } catch {
        // 忽略无法解析的行(如注释/空行)
      }
    }
  }
  return { text };
}
