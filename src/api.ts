// ReqForge 后端 API 封装 —— 对应 req-forge-server(Go/Gin)
// 后端地址:默认本机 8080,部署时改成你的服务地址
const BASE = "http://localhost:8080";
const TOKEN_KEY = "reqforge.token";

export interface DecompositionRecord {
  id: number;
  requirement: string;
  result: string; // 拆解结果 JSON 字符串
  model: string;
  created_at: string;
}

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function headers(json = false): Record<string, string> {
  const h: Record<string, string> = json ? { "Content-Type": "application/json" } : {};
  const t = getToken();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error ?? `登录失败 ${res.status}`);
  }
  const data = await res.json();
  setToken(data.token);
  return data.token;
}

export async function listDecompositions(): Promise<DecompositionRecord[]> {
  const res = await fetch(`${BASE}/api/decompositions`, { headers: headers() });
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
    headers: headers(true),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`后端响应 ${res.status}`);
  return res.json();
}

export async function deleteDecomposition(id: number): Promise<void> {
  await fetch(`${BASE}/api/decompositions/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
}
