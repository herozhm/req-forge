import { z } from "zod";

/** 授权级别:决定任务的执行与验收方式 */
export const AUTH_LEVELS = ["auto", "review", "human-led"] as const;
export type AuthLevel = (typeof AUTH_LEVELS)[number];

export const AUTH_LABELS: Record<AuthLevel, string> = {
  auto: "AI 全自动",
  review: "AI 产出 + 人审",
  "human-led": "人主导 + AI 辅助",
};

/** 单个任务 */
export const TaskSchema = z.object({
  id: z.string().describe("任务编号,T1/T2/…"),
  title: z.string().describe("任务标题(祈使句,一句话说清做什么)"),
  authorization: z.enum(AUTH_LEVELS).describe("授权级别:auto=AI 全自动;review=AI 产出 + 人重点审;human-led=人主导 + AI 辅助(危险区/契约/跨链路)"),
  acceptance: z.array(z.string()).describe("验收判据(可执行的验证动作,不满足即失败)"),
  dependsOn: z.array(z.string()).describe("依赖的任务编号列表(如 [\"T1\"])"),
  risk: z.string().optional().describe("风险/危险区说明(无则省略)"),
});

export type Task = z.infer<typeof TaskSchema>;

export const DecomposeResultSchema = z.object({
  summary: z.string().describe("一句话需求理解(确认用)"),
  impact: z.array(z.string()).describe("影响面分析(改哪些模块/文件/系统)"),
  tasks: z.array(TaskSchema).describe("任务清单"),
});
export type DecomposeResult = z.infer<typeof DecomposeResultSchema>;
