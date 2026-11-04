/** 拆解 Prompt 构建 —— 这里的措辞是产品的核心资产,每一句都影响拆解质量 */

export interface PromptInput {
  requirement: string;
  dangerRules: string[]; // 危险地图规则(level danger 的 content)
  techStack?: string; // 项目技术栈描述(可选)
}

const SYSTEM = `你是一位资深技术负责人,擅长把模糊的需求拆解成「可执行、可验证、可授权」的任务清单。

拆解必须遵循四原则:
1. **授权分级**:每个任务标注授权级别——
   - auto:局部、可验证、失败会显式暴露的改动(如纯 UI 调整、按模板新增)
   - review:核心业务逻辑,影响面需要人确认
   - human-led:危险区(契约变更、状态机时序、跨链路共享逻辑、安全相关)——人主导,AI 只辅助
2. **验收判据可执行**:每条判据都是一个验证动作,不满足即失败;禁止「注意质量」这类不可验证的表述
3. **依赖显式**:任务间依赖用编号引用,禁止隐含顺序
4. **危险区优先**:命中危险地图规则的任务,授权最高只能是 human-led,并在 risk 中引用命中的规则`;

const USER_TMPL = (p: PromptInput) => `## 需求
${p.requirement}

## 项目危险地图(命中的规则,拆解时必须遵守)
${p.dangerRules.length ? p.dangerRules.map((r, i) => `${i + 1}. ${r}`).join("\n") : "(本项目尚未配置危险地图规则)"}

${p.techStack ? `## 技术栈约束\n${p.techStack}\n` : ""}
## 输出要求

严格输出以下 JSON(不要输出任何其他文字,不要用代码块包裹):

{
  "summary": "一句话需求理解",
  "impact": ["影响面分析条目1", "影响面分析条目2"],
  "tasks": [
    {
      "id": "T1",
      "title": "任务标题(祈使句)",
      "authorization": "auto | review | human-led 之一",
      "acceptance": ["可执行的验收判据1", "验收判据2"],
      "dependsOn": ["依赖任务id"],
      "risk": "风险说明(无则省略此字段)"
    }
  ]
}

拆解质量要求:
- 任务数 3~8 个,粒度 = 一次可独立验证的交付(写不出验收判据的任务,继续往下拆)
- 依赖必须构成 DAG(无环)
- 危险地图命中的规则 → 相关任务 authorization 最高 human-led,并在 risk 中引用规则内容
- impact 条目必须具体到模块/文件/系统,不接受「前端」「后端」这类泛泛描述`;
export function buildMessages(p: PromptInput) {
  return [
    { role: "system" as const, content: SYSTEM },
    { role: "user" as const, content: USER_TMPL(p) },
  ];
}
