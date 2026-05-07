import type {
  FavoriteFilters,
  PlanHistoryEntry,
  PlanRequest,
  PlanResponse,
} from "./types";

const KEY = "horarios:plan-history";
const MAX_ENTRIES = 10;

export function loadHistory(): PlanHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(entries: PlanHistoryEntry[]) {
  let toSave = entries.slice(0, MAX_ENTRIES);
  while (toSave.length > 0) {
    try {
      localStorage.setItem(KEY, JSON.stringify(toSave));
      return;
    } catch {
      // Quota exceeded: drop oldest and retry.
      toSave = toSave.slice(0, -1);
    }
  }
}

export function pushHistory(input: {
  request: PlanRequest;
  filters: FavoriteFilters;
  response: PlanResponse;
}): PlanHistoryEntry[] {
  const list = loadHistory();
  const sig = JSON.stringify(input.request);
  const prevSig = list[0] ? JSON.stringify(list[0].request) : null;
  const entry: PlanHistoryEntry = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(36).slice(2),
    createdAt: Date.now(),
    request: input.request,
    filters: input.filters,
    response: input.response,
  };
  const next = sig === prevSig ? [entry, ...list.slice(1)] : [entry, ...list];
  save(next);
  return next;
}

export function removeHistory(id: string): PlanHistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id);
  save(next);
  return next;
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}
