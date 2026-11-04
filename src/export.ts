import type { DecomposeResult } from "./schema/task.js";
import { AUTH_LABELS } from "./schema/task.js";

/** 导出 Markdown 任务清单(贴 PR / 项目管理工具) */
export function exportMarkdown(result: DecomposeResult): string {
  const lines: string[] = [];
  lines.push(`# 任务拆解:${result.summary}`);
  lines.push("");
  lines.push(`## 影响面`);
  for (const i of result.impact) lines.push(`- ${i}`);
  lines.push("");
  lines.push(`## 任务清单(${result.tasks.length})`);
  for (const t of result.tasks) {
    lines.push("");
    lines.push(`### ${t.id} ${t.title}【${AUTH_LABELS[t.authorization]}】`);
    if (t.risk) lines.push(`> ⚠ 风险:${t.risk}`);
    lines.push(`- 验收判据:`);
    for (const a of t.acceptance) lines.push(`  - [ ] ${a}`);
    if (t.dependsOn.length) lines.push(`- 依赖:${t.dependsOn.join(", ")}`);
  }
  lines.push("");
  lines.push(`> 由 ReqForge 生成 · ${new Date().toLocaleString()}`);
  return lines.join("\n");
}

export function download(filename: string, content: string, type = "text/markdown") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
