import { z } from "zod";
import { chatStream } from "./client.js";
import { buildMessages, type PromptInput } from "./prompt.js";
import { DecomposeResultSchema, type DecomposeResult } from "../schema/task.js";

/** 一次拆解 = 流式收集 → 提取 JSON → schema 校验 → 失败带错误反馈重试一次 */

const MAX_RETRIES = 1;

export interface DecomposeOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  requirement: string;
  dangerRules: string[];
  techStack?: string;
  onDelta?: (delta: string) => void;
  signal?: AbortSignal;
}

export interface DecomposeOutcome {
  result: DecomposeResult;
  /** 原始输出(用于展示「AI 原始输出」面板) */
  raw: string;
  retries: number;
}

function extractJson(text: string): unknown {
  // 容错:优先取 ```json 代码块,否则找第一个 { 到最后一个 }
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("输出中未找到 JSON 对象");
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function decompose(opts: DecomposeOptions): Promise<DecomposeOutcome> {
  const baseMessages = buildMessages({
    requirement: opts.requirement,
    dangerRules: opts.dangerRules,
    techStack: opts.techStack,
  });

  let retries = 0;
  let raw = "";
  let lastError = "";

  type Msg = { role: "system" | "user" | "assistant"; content: string };
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const msgs: Msg[] = [...baseMessages];
    if (retries > 0) {
      // 带错误反馈重试:让模型看到自己的错误输出与 schema 报错
      msgs.push({ role: "assistant", content: raw });
      msgs.push({
        role: "user",
        content: `你上次输出的 JSON 不符合 schema:${lastError}\n请修正后重新输出完整 JSON,不要输出任何其他文字。`,
      });
    }

    raw = "";
    const { text } = await chatStream({
      baseUrl: opts.baseUrl,
      apiKey: opts.apiKey,
      model: opts.model,
      messages: msgs,
      onDelta: (d) => {
        raw += d;
        opts.onDelta?.(d);
      },
      signal: opts.signal,
    });

    try {
      const parsed = DecomposeResultSchema.parse(extractJson(raw));
      return { result: parsed, raw, retries };
    } catch (e) {
      lastError = e instanceof z.ZodError ? e.message : String(e);
      raw = ""; // 重试时清空展示区
      if (attempt === MAX_RETRIES) {
        throw new Error(`拆解失败(schema 校验未通过): ${lastError}`);
      }
    }
  }
  throw new Error("unreachable");
}
