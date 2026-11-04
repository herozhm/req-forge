# ReqForge · AI 任务拆解工作台

> 输入一段需求,AI 按「四维度授权 + 可执行验收判据 + 显式依赖」输出结构化的可执行任务清单——
> 把「AI 时代怎么拆任务」这个全行业都在纠结的问题,做成一个可用的工具。

![License](https://img.shields.io/badge/license-MIT-blue)
![Stack](https://img.shields.io/badge/stack-React__Vite__TS-blue)
![Zero-backend](https://img.shields.io/badge/backend-none__BYOK-green)

## 它解决什么问题

AI 编码时代,「一个需求怎么交给 AI 做」成了新的纠结:哪些任务敢交给 AI 全自动?
哪些必须人审?哪些是危险区人主导?验收标准怎么写才算「可验证」?

ReqForge 把这套判断**产品化**:输入需求,AI 按「四维度授权分级(失败可见性 / 影响面 /
验证覆盖 / 是否契约)」输出结构化任务清单——每个任务自带授权级别、可执行验收判据、
依赖关系与风险标注。**拆解完成的那一刻,后面的执行和质量就已经被保证了。**

## 核心概念

### 授权级别(每个任务的核心属性)

| 级别 | 含义 | 判定依据(四维度) |
| --- | --- | --- |
| `auto` AI 全自动 | 局部、可验证、失败显式 | 纯 UI、模板新增、失败会显式暴露的改动 |
| `review` AI 产出 + 人审 | 核心业务逻辑 | 影响面需人确认、有验证手段 |
| `human-led` 人主导 + AI 辅助 | 危险区 | 契约变更、状态机时序、跨链路共享逻辑、安全相关 |

### 危险地图

项目级规则(内置编辑器维护),注入拆解 Prompt——AI 在拆任务时遵守你项目的领域约束,
危险区任务强制降级为 `human-led`。规则格式:

```json
{ "domain": "支付模块", "level": "danger", "content": "改折扣必须双链路验证" }
```

## 快速开始

```bash
npm install
npm run dev
```

打开后点右上「模型设置」填入 OpenAI 兼容 API(Base URL / Model / Key,**仅存本机 localStorage,不上传**)。

### 技术要点(给面试官/工程师)

- **结构化输出**:zod schema 定义任务模型 → LLM 输出 zod 校验 → 不合格带错误反馈自动重试一次
- **流式渲染**:SSE 增量解析,原始输出实时展示(AI 思考过程可视化)
- **BYOK 架构**:无后端,API Key 仅存 localStorage——零服务器成本,数据不出本机
- **危险地图注入**:项目领域规则以 Prompt 注入方式参与拆解,危险区任务强制 human-led

## License

MIT
