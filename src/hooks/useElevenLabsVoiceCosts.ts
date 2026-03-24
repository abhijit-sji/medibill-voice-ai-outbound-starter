/**
 * React Query hooks for ElevenLabs Voice Agent Cost tracking.
 *
 * Provides real-time (30s refresh) access to cost summaries, per-agent
 * breakdowns, monthly timeline, and paginated conversation logs.
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  getElevenLabsAllPeriodSummaries,
  getElevenLabsPeriodSummary,
  getElevenLabsAgentBreakdown,
  getElevenLabsCostTimeline,
  getElevenLabsConversationLogs,
  getCostDateRange,
  type ElevenLabsPeriodSummary,
  type AgentCostBreakdown,
  type MonthlyCostData,
  type ConversationCostLog,
  type ConversationLogsResult,
} from '@/services/elevenlabs-voice-costs.service';
import { formatCurrency, formatNumber } from './useAICostStats';

export type CostPeriod = 'today' | 'week' | 'month' | 'all';

export {
  formatCurrency,
  formatNumber,
  type ElevenLabsPeriodSummary,
  type AgentCostBreakdown,
  type MonthlyCostData,
  type ConversationCostLog,
  type ConversationLogsResult,
};

// ─── All-period summaries (for quick-stat cards) ──────────────────────────────

export function useElevenLabsAllPeriodSummaries(clinicId?: string) {
  return useQuery({
    queryKey: ['elevenlabs-all-period-summaries', clinicId],
    queryFn: () => getElevenLabsAllPeriodSummaries(clinicId),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

// ─── Single-period summary ────────────────────────────────────────────────────

export function useElevenLabsPeriodSummary(period: CostPeriod, clinicId?: string) {
  return useQuery<ElevenLabsPeriodSummary>({
    queryKey: ['elevenlabs-period-summary', period, clinicId],
    queryFn: () => getElevenLabsPeriodSummary(period, clinicId),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

// ─── Per-agent breakdown ──────────────────────────────────────────────────────

export function useElevenLabsAgentBreakdown(period: CostPeriod, clinicId?: string) {
  const { start, end } = getCostDateRange(period);
  return useQuery<AgentCostBreakdown[]>({
    queryKey: ['elevenlabs-agent-breakdown', period, clinicId],
    queryFn: () => getElevenLabsAgentBreakdown(start, end, clinicId),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

// ─── Monthly cost timeline ────────────────────────────────────────────────────

export function useElevenLabsCostTimeline(months: number = 6, clinicId?: string) {
  return useQuery<MonthlyCostData[]>({
    queryKey: ['elevenlabs-cost-timeline', months, clinicId],
    queryFn: () => getElevenLabsCostTimeline(months, clinicId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

// ─── Paginated conversation logs ──────────────────────────────────────────────

export interface ConversationLogsFilters {
  startDate?: string;
  endDate?: string;
  agentId?: string;
  clinicId?: string;
}

export function useElevenLabsConversationLogs(
  filters: ConversationLogsFilters,
  page: number = 1,
  limit: number = 20
) {
  return useQuery<ConversationLogsResult>({
    queryKey: ['elevenlabs-conversation-logs', filters, page, limit],
    queryFn: () =>
      getElevenLabsConversationLogs({
        startDate: filters.startDate,
        endDate: filters.endDate,
        agentId: filters.agentId,
        clinicId: filters.clinicId,
        page,
        limit,
      }),
    staleTime: 15_000,
    placeholderData: (previousData) => previousData,
  });
}

// ─── Convenience: format minutes from seconds ────────────────────────────────

export function formatDuration(secs: number): string {
  if (!secs || secs <= 0) return '—';
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
