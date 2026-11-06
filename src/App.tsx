import { useEffect, useState } from "react";
import { useStore, persistSettings } from "./store.js";
import { decompose } from "./llm/decompose.js";
import { AUTH_LABELS, type DecomposeResult } from "./schema/task.js";
import { exportMarkdown, download } from "./export.js";
import {
  listDecompositions,
  saveDecomposition,
  deleteDecomposition,
  type DecompositionRecord,
} from "./api.js";

type Phase = "idle" | "streaming" | "done" | "error";

export default function App() {
  const { settings, setSettings, requirement, setRequirement, dangerRules } = useStore();

  const [phase, setPhase] = useState<Phase>("idle");
  const [streamText, setStreamText] = useState("");
  const [result, setResult] = useState<DecomposeResult | null>(null);
  const [error, setError] = useState("");
  const [retries, setRetries] = useState(0);
  const [saveNote, setSaveNote] = useState(""); // 保存到后端的状态提示

  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  async function handleDecompose() {
    if (!requirement.trim()) return;
    if (!settings.apiKey) {
      setError("请先在设置中填写 API Key(仅存本机浏览器)");
      return;
    }
    setError("");
    setResult(null);
    setStreamText("");
    setSaveNote("");
    setPhase("streaming");

    const controller = new AbortController();
    (window as unknown as { __reqforgeAbort?: AbortController }).__reqforgeAbort = controller;

    try {
      const { result, retries: r } = await decompose({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: settings.model,
        requirement,
        dangerRules: dangerRules.filter((x) => x.level === "danger").map((x) => x.content),
        onDelta: (d) => setStreamText((t) => (t += d)),
        signal: controller.signal,
      });
      setResult(result);
      setRetries(r);
      setPhase("done");

      // 拆解成功后自动保存到 Go 后端(后端未启动则静默降级,不影响主流程)
      try {
        await saveDecomposition({
          requirement,
          result: JSON.stringify(result),
          model: settings.model,
        });
        setSaveNote("已保存到历史");
      } catch {
        setSaveNote("后端未启动,未保存历史(启动 req-forge-server 后可保存)");
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  function cancel() {
    (window as unknown as { __reqforgeAbort?: AbortController }).__reqforgeAbort?.abort();
    setPhase("idle");
  }

  const streaming = phase === "streaming";

  return (
    <div className="app">
      {/* 头部 */}
      <div className="header">
        <h1>ReqForge</h1>
        <span className="sub">AI 任务拆解工作台 — 把需求变成带授权级别、验收判据、依赖关系的可执行任务清单</span>
      </div>

      {/* 设置面板 */}
      <div className="panel">
        <h2>
          ⚙ 模型设置{" "}
          {settings.apiKey && <span className="tag">(已配置 · 仅存本机浏览器 localStorage)</span>}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <label>API Base URL(OpenAI 兼容)</label>
            <input
              value={settings.baseUrl}
              onChange={(e) => setSettings({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div>
            <label>模型</label>
            <input
              value={settings.model}
              onChange={(e) => setSettings({ model: e.target.value })}
              placeholder="gpt-4o / claude-xxx / glm-4 ..."
            />
          </div>
          <div>
            <label>API Key</label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ apiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>
        </div>
      </div>

      {/* 需求输入 */}
      <div className="panel">
        <h2>📋 需求</h2>
        <textarea
          rows={5}
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          placeholder={"粘贴需求描述 / PRD 片段 / 一句话需求…\n\n示例:给净化器配件增加滤芯寿命提醒:基于固件上报的寿命阈值弹提醒,配件信息页显示剩余时长"}
        />
        {error && <div className="error" style={{ marginTop: 12 }}>❌ {error}</div>}
        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={handleDecompose} disabled={streaming || !requirement.trim()}>
            {streaming ? "拆解中…" : "开始拆解"}
          </button>
          {streaming && (
            <button className="ghost" onClick={cancel}>
              取消
            </button>
          )}
          {result && (
            <button className="ghost" onClick={() => download("任务拆解.md", exportMarkdown(result))}>
              导出 Markdown
            </button>
          )}
          {saveNote && <span className="tag">{saveNote}</span>}
        </div>
      </div>

      {/* 拆解过程(流式原始输出) */}
      {streaming && (
        <div className="panel">
          <h2>⚡ AI 拆解中(原始输出)</h2>
          <div className="stream">{streamText || "连接模型中…"}</div>
        </div>
      )}

      {/* 结果 */}
      {result && (
        <div className="panel">
          <h2>🧩 拆解结果 {retries > 0 && <span className="tag">(schema 校验重试 {retries} 次)</span>}</h2>
          <div className="summary">
            <strong>需求理解:</strong> {result.summary}
          </div>
          <strong style={{ fontSize: 13 }}>影响面分析:</strong>
          <ul style={{ margin: "6px 0 12px", paddingLeft: 20 }}>
            {result.impact.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
          <strong style={{ fontSize: 13 }}>任务清单:</strong>
          <div style={{ marginTop: 8 }}>
            {result.tasks.map((t) => (
              <div key={t.id} className={`task ${t.authorization}`}>
                <div className="title">
                  <span className="id">{t.id}</span>
                  {t.title}
                </div>
                <span className={`auth ${t.authorization}`}>{AUTH_LABELS[t.authorization]}</span>
                {t.risk && <div className="risk">⚠ {t.risk}</div>}
                <ul className="criteria">
                  {t.acceptance.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
                {t.dependsOn.length > 0 && (
                  <div className="dep">依赖:{t.dependsOn.join("、")}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 历史记录(Go 后端) */}
      <HistoryPanel onLoad={(rec) => {
        setRequirement(rec.requirement);
        try {
          setResult(JSON.parse(rec.result));
          setPhase("done");
        } catch {
          // 结果解析失败则只回填需求
        }
      }} />

      {/* 危险地图 */}
      <DangerMapPanel />

      <div className="footer">
        ReqForge · AI 任务拆解工作台 · 授权分级 / 验收判据 / 依赖显式 — 拆解完成的那一刻,执行和质量就已经被保证了
      </div>
    </div>
  );
}

/* ================= 历史记录面板(对接 Go 后端) ================= */
function HistoryPanel({ onLoad }: { onLoad: (rec: DecompositionRecord) => void }) {
  const [items, setItems] = useState<DecompositionRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  async function refresh() {
    setStatus("loading");
    try {
      setItems(await listDecompositions());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDelete(id: number) {
    await deleteDecomposition(id);
    refresh();
  }

  return (
    <div className="panel">
      <h2>
        🕘 拆解历史(Go 后端)
        <button className="ghost small" style={{ marginLeft: "auto" }} onClick={refresh}>
          刷新
        </button>
      </h2>
      {status === "loading" && <div className="tag">加载中…</div>}
      {status === "error" && (
        <div className="error">
          无法连接后端 — 启动 req-forge-server 后可用(go run .)
        </div>
      )}
      {status === "ready" && items.length === 0 && <div className="tag">暂无历史记录</div>}
      {status === "ready" &&
        items.map((rec) => (
          <div key={rec.id} className="task" style={{ borderLeftColor: "var(--accent)" }}>
            <div className="title">{rec.requirement}</div>
            <div className="dep">
              {rec.model} · {new Date(rec.created_at).toLocaleString()}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button className="ghost small" onClick={() => onLoad(rec)}>
                加载
              </button>
              <button className="ghost small" onClick={() => handleDelete(rec.id)}>
                删除
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}

/* ================= 危险地图面板 ================= */
function DangerMapPanel() {
  const { dangerRules, addDangerRule, updateDangerRule, removeDangerRule } = useStore();
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="panel">
        <h2>
          🗺 项目危险地图
          <button className="ghost small" style={{ marginLeft: "auto" }} onClick={() => setEditing(true)}>
            编辑规则({dangerRules.length})
          </button>
        </h2>
        {dangerRules.length === 0 && <div className="error">尚未配置危险规则——拆解时 AI 将缺少领域约束</div>}
        {dangerRules.map((r, i) => (
          <div key={i} className="summary">
            <span className={`auth ${r.level === "danger" ? "human-led" : "review"}`}>
              {r.level === "danger" ? "危险" : "注意"}
            </span>{" "}
            <strong>{r.domain}</strong> — {r.content}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>🗺 项目危险地图(编辑)</h2>
      <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 12px" }}>
        这些规则会注入拆解 Prompt——AI 在拆任务时会遵守它们(如危险区任务强制 human-led)。
      </p>
      {dangerRules.map((r, i) => (
        <div key={i} className="danger-rule">
          <input
            value={r.domain}
            placeholder="区域名(如 支付模块)"
            onChange={(e) => updateDangerRule(i, { domain: e.target.value })}
          />
          <select
            value={r.level}
            onChange={(e) => updateDangerRule(i, { level: e.target.value as "danger" | "warn" })}
          >
            <option value="danger">危险</option>
            <option value="warn">注意</option>
          </select>
          <textarea
            rows={2}
            value={r.content}
            placeholder="规则内容(改这里必须做什么)"
            onChange={(e) => updateDangerRule(i, { content: e.target.value })}
          />
          <button className="ghost small" onClick={() => removeDangerRule(i)}>
            ✕
          </button>
        </div>
      ))}
      <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
        <button className="ghost small" onClick={addDangerRule}>
          + 添加规则
        </button>
        <button className="ghost small" onClick={() => setEditing(false)}>
          完成
        </button>
      </div>
    </div>
  );
}
