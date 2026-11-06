// ReqForge 后端 API 封装 —— 对应 req-forge-server(Go/Gin)
// 后端地址:默认本机 8080,部署时改成你的服务地址
const BASE = "http://localhost:8080";

export interface DecompositionRecord {
  id: number;
  requirement: string;
  result: string; // 拆解结果 JSON 字符串
  model: string;
  created_at: string;
}

export async function listDecompositions(): Promise<DecompositionRecord[]> {
  const res = await fetch(`${BASE}/api/decompositions`);
  if (!res.ok) throw new Error(`后端响应 ${res.status}`);
  return res.json();
}

export async function saveDecomposition(data: {
  requirement: string;
  result: string;
  model: string;
}): Promise<DecompositionRecord> {
  const res = await fetch(`${BASE}/api/decompositions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`后端响应 ${res.status}`);
  return res.json();
}

export async function deleteDecomposition(id: number): Promise<void> {
  await fetch(`${BASE}/api/decompositions/${id}`, { method: "DELETE" });
}
