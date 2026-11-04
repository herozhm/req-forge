import { create } from "zustand";

export interface DangerRule {
  domain: string; // 命中的区域/模块名(如 支付模块、通信协议层)
  level: "danger" | "warn";
  content: string;
}

export interface Settings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface AppState {
  settings: Settings;
  setSettings: (s: Partial<Settings>) => void;
  requirement: string;
  setRequirement: (r: string) => void;
  dangerRules: DangerRule[];
  setDangerRules: (r: DangerRule[]) => void;
  addDangerRule: () => void;
  updateDangerRule: (i: number, patch: Partial<DangerRule>) => void;
  removeDangerRule: (i: number) => void;
}

const DEFAULT_RULES: DangerRule[] = [
  {
    domain: "支付模块",
    level: "danger",
    content: "折扣计算在展示与结算两条链路各有一份,改折扣必须双链路验证;退款幂等键必须来自业务单号",
  },
  {
    domain: "通信协议层",
    level: "danger",
    content: "改动消息结构影响所有下游,必须先与消费方确认契约",
  },
];

export const useStore = create<AppState>((set) => ({
  settings: {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4o",
  },
  setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
  requirement: "",
  setRequirement: (r) => set({ requirement: r }),
  dangerRules: DEFAULT_RULES,
  setDangerRules: (r) => set({ dangerRules: r }),
  addDangerRule: () =>
    set((st) => ({
      dangerRules: [...st.dangerRules, { domain: "", level: "warn", content: "" }],
    })),
  updateDangerRule: (i, patch) =>
    set((st) => ({
      dangerRules: st.dangerRules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    })),
  removeDangerRule: (i) =>
    set((st) => ({ dangerRules: st.dangerRules.filter((_, idx) => idx !== i) })),
}));

/** 设置持久化到 localStorage(key 不上传,仅存本机) */
export function loadPersisted() {
  try {
    const raw = localStorage.getItem("reqforge.settings");
    if (raw) useStore.getState().setSettings(JSON.parse(raw));
  } catch {
    // ignore
  }
}
export function persistSettings(s: Settings) {
  localStorage.setItem("reqforge.settings", JSON.stringify(s));
}
