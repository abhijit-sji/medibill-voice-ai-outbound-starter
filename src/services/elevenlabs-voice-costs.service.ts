/**
 * ElevenLabs Voice Agent Cost Service
 *
 * Queries actual ElevenLabs usage data (LLM tokens, TTS characters, cost)
 * stored in the elevenlabs_conversations table, which is populated directly
 * from the ElevenLabs API when a conversation ends.
 */

import { supabase } from '@/integrations/supabase/client';

const DEFAULT_CLINIC_ID = '00000000-0000-0000-0000-000000000001';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentCostBreakdown {
  agent_id: string;
  agent_name: string;
  conversation_count: number;
  lm_tokens_in: number;
  lm_tokens_out: number;
  lm_tokens_total: number;
  tts_characters_used: number;
  total_cost: number;
  avg_cost_per_conversation: number;
  last_active: string | null;
}

export interface MonthlyCostData {
  month: string;         // 'YYYY-MM'
  month_label: string;   // 'Jan 2026'
  total_cost: number;
  conversation_count: number;
  lm_tokens_total: number;
  tts_characters_total: number;
}

export interface ConversationCostLog {
  id: string;
  conversation_id: string;
  agent_id: string;
  agent_name: string | null;
  started_at: string | null;
  call_duration_secs: number;
  lm_tokens_in: number;
  lm_tokens_out: number;
  tts_characters_used: number;
  elevenlabs_cost_usd: number;
  status: string;
  usage_synced_at: string | null;
}

export interface ElevenLabsPeriodSummary {
  total_cost: number;
  conversation_count: number;
  lm_tokens_in: number;
  lm_tokens_out: number;
  lm_tokens_total: number;
  tts_characters_used: number;
  avg_cost_per_conversation: number;
  unsynced_count: number;
}

export interface ConversationLogsResult {
  data: ConversationCostLog[];
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns ISO start/end strings for a given period relative to "now".
 */
export function getCostDateRange(period: 'today' | 'week' | 'month' | 'all') {
  const now = new Date();
  const end = now.toISOString();

  switch (period) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start: start.toISOString(), end };
    }
    case 'week': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start: start.toISOString(), end };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: start.toISOString(), end };
    }
    case 'all':
    default:
      return { start: new Date(0).toISOString(), end };
  }
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Returns aggregate totals for a period (today / week / month / all-time).
 */
export async function getElevenLabsPeriodSummary(
  period: 'today' | 'week' | 'month' | 'all',
  clinicId: string = DEFAULT_CLINIC_ID
): Promise<ElevenLabsPeriodSummary> {
  const { start, end } = getCostDateRange(period);

  const { data, error } = await supabase
    .from('elevenlabs_conversations')
    .select('lm_tokens_in, lm_tokens_out, tts_characters_used, elevenlabs_cost_usd, usage_synced_at')
    .eq('clinic_id', clinicId)
    .gte('started_at', start)
    .lte('started_at', end);

  if (error) console.error('getElevenLabsPeriodSummary error:', error);

  const rows = data || [];
  const totalCost = rows.reduce((s, r) => s + (r.elevenlabs_cost_usd || 0), 0);
  const tokensIn = rows.reduce((s, r) => s + (r.lm_tokens_in || 0), 0);
  const tokensOut = rows.reduce((s, r) => s + (r.lm_tokens_out || 0), 0);
  const ttsChars = rows.reduce((s, r) => s + (r.tts_characters_used || 0), 0);
  const count = rows.length;
  const unsynced = rows.filter(r => !r.usage_synced_at).length;

  return {
    total_cost: totalCost,
    conversation_count: count,
    lm_tokens_in: tokensIn,
    lm_tokens_out: tokensOut,
    lm_tokens_total: tokensIn + tokensOut,
    tts_characters_used: ttsChars,
    avg_cost_per_conversation: count > 0 ? totalCost / count : 0,
    unsynced_count: unsynced,
  };
}

/**
 * Returns a list of all-time period summaries for quick-stat cards.
 */
export async function getElevenLabsAllPeriodSummaries(
  clinicId: string = DEFAULT_CLINIC_ID
): Promise<{
  today: ElevenLabsPeriodSummary;
  week: ElevenLabsPeriodSummary;
  month: ElevenLabsPeriodSummary;
  all: ElevenLabsPeriodSummary;
}> {
  const [today, week, month, all] = await Promise.all([
    getElevenLabsPeriodSummary('today', clinicId),
    getElevenLabsPeriodSummary('week', clinicId),
    getElevenLabsPeriodSummary('month', clinicId),
    getElevenLabsPeriodSummary('all', clinicId),
  ]);
  return { today, week, month, all };
}

/**
 * Returns a per-agent breakdown for the given date range.
 * Groups conversations by agent_id and aggregates all usage metrics.
 */
export async function getElevenLabsAgentBreakdown(
  startDate: string,
  endDate: string,
  clinicId: string = DEFAULT_CLINIC_ID
): Promise<AgentCostBreakdown[]> {
  const { data, error } = await supabase
    .from('elevenlabs_conversations')
    .select('agent_id, agent_name, lm_tokens_in, lm_tokens_out, tts_characters_used, elevenlabs_cost_usd, started_at')
    .eq('clinic_id', clinicId)
    .gte('started_at', startDate)
    .lte('started_at', endDate)
    .order('started_at', { ascending: false });

  if (error) console.error('getElevenLabsAgentBreakdown error:', error);

  const rows = data || [];

  // Group by agent_id
  const map = new Map<string, AgentCostBreakdown>();
  for (const row of rows) {
    const agentId = row.agent_id || 'unknown';
    const existing = map.get(agentId);
    if (existing) {
      existing.conversation_count++;
      existing.lm_tokens_in += row.lm_tokens_in || 0;
      existing.lm_tokens_out += row.lm_tokens_out || 0;
      existing.lm_tokens_total += (row.lm_tokens_in || 0) + (row.lm_tokens_out || 0);
      existing.tts_characters_used += row.tts_characters_used || 0;
      existing.total_cost += row.elevenlabs_cost_usd || 0;
      // Keep the most recent started_at as last_active
      if (row.started_at && (!existing.last_active || row.started_at > existing.last_active)) {
        existing.last_active = row.started_at;
      }
      existing.avg_cost_per_conversation = existing.total_cost / existing.conversation_count;
    } else {
      map.set(agentId, {
        agent_id: agentId,
        agent_name: row.agent_name || agentId,
        conversation_count: 1,
        lm_tokens_in: row.lm_tokens_in || 0,
        lm_tokens_out: row.lm_tokens_out || 0,
        lm_tokens_total: (row.lm_tokens_in || 0) + (row.lm_tokens_out || 0),
        tts_characters_used: row.tts_characters_used || 0,
        total_cost: row.elevenlabs_cost_usd || 0,
        avg_cost_per_conversation: row.elevenlabs_cost_usd || 0,
        last_active: row.started_at || null,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total_cost - a.total_cost);
}

/**
 * Returns month-by-month cost totals for the last `months` calendar months.
 * Each entry contains: month key, label, total cost, conversation count, tokens.
 */
export async function getElevenLabsCostTimeline(
  months: number = 6,
  clinicId: string = DEFAULT_CLINIC_ID
): Promise<MonthlyCostData[]> {
  // Build the start of the oldest month we care about
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const { data, error } = await supabase
    .from('elevenlabs_conversations')
    .select('started_at, lm_tokens_in, lm_tokens_out, tts_characters_used, elevenlabs_cost_usd')
    .eq('clinic_id', clinicId)
    .gte('started_at', startDate.toISOString())
    .order('started_at', { ascending: true });

  if (error) console.error('getElevenLabsCostTimeline error:', error);

  // Pre-build empty month buckets
  const monthMap = new Map<string, MonthlyCostData>();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthMap.set(key, {
      month: key,
      month_label: label,
      total_cost: 0,
      conversation_count: 0,
      lm_tokens_total: 0,
      tts_characters_total: 0,
    });
  }

  // Aggregate rows into buckets
  for (const row of data || []) {
    if (!row.started_at) continue;
    const d = new Date(row.started_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = monthMap.get(key);
    if (!bucket) continue;
    bucket.total_cost += row.elevenlabs_cost_usd || 0;
    bucket.conversation_count++;
    bucket.lm_tokens_total += (row.lm_tokens_in || 0) + (row.lm_tokens_out || 0);
    bucket.tts_characters_total += row.tts_characters_used || 0;
  }

  return Array.from(monthMap.values());
}

/**
 * Returns paginated conversation logs, optionally filtered by agent_id and date range.
 */
export async function getElevenLabsConversationLogs(options: {
  startDate?: string;
  endDate?: string;
  agentId?: string;
  page?: number;
  limit?: number;
  clinicId?: string;
}): Promise<ConversationLogsResult> {
  const {
    startDate,
    endDate,
    agentId,
    page = 1,
    limit = 20,
    clinicId = DEFAULT_CLINIC_ID,
  } = options;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('elevenlabs_conversations')
    .select(
      'id, conversation_id, agent_id, agent_name, started_at, call_duration_secs, lm_tokens_in, lm_tokens_out, tts_characters_used, elevenlabs_cost_usd, status, usage_synced_at',
      { count: 'exact' }
    )
    .eq('clinic_id', clinicId)
    .order('started_at', { ascending: false })
    .range(from, to);

  if (startDate) query = query.gte('started_at', startDate);
  if (endDate) query = query.lte('started_at', endDate);
  if (agentId) query = query.eq('agent_id', agentId);

  const { data, count, error } = await query;

  if (error) console.error('getElevenLabsConversationLogs error:', error);

  return {
    data: (data || []).map(r => ({
      id: r.id,
      conversation_id: r.conversation_id || '',
      agent_id: r.agent_id || '',
      agent_name: r.agent_name || null,
      started_at: r.started_at || null,
      call_duration_secs: r.call_duration_secs || 0,
      lm_tokens_in: r.lm_tokens_in || 0,
      lm_tokens_out: r.lm_tokens_out || 0,
      tts_characters_used: r.tts_characters_used || 0,
      elevenlabs_cost_usd: r.elevenlabs_cost_usd || 0,
      status: r.status || 'unknown',
      usage_synced_at: r.usage_synced_at || null,
    })),
    total: count || 0,
  };
}
