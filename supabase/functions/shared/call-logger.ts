/**
 * Call Logger
 * Logs voice calls and AI interactions to database
 * Medibill Voice Sync Health - Phase 1
 * 
 * IMPORTANT: Column names match the actual database schema:
 * - call_logs: started_at, ended_at, duration, outcome (not start_time, end_time, duration_seconds)
 * - cost_logs: total_cost, service_provider, service_type (not cost_usd, service)
 * - ai_interactions: call_log_id, input_text, output_text (not call_id, user_message, ai_response)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_CLINIC_ID = '00000000-0000-0000-0000-000000000001';

export interface CallLogData {
  call_sid: string;
  from_number: string;
  to_number: string;
  started_at: string; // ISO timestamp (DB column name)
  ended_at?: string; // ISO timestamp (DB column name)
  duration?: number; // seconds (DB column name)
  status: 'initiated' | 'in-progress' | 'completed' | 'failed' | 'no-answer';
  patient_id?: string;
  appointment_id?: string;
  transcript?: string;
  direction: 'inbound' | 'outbound';
  call_type: string;
  outcome?: string;
}

export interface AIInteractionData {
  call_log_id: string; // DB column name (not call_id)
  interaction_type: string;
  input_text?: string; // DB column name (not user_message)
  output_text?: string; // DB column name (not ai_response)
  function_calls?: any[]; // JSON array for function call data
  intent?: string;
  confidence?: number;
  model_used?: string;
  tokens_used?: number;
  latency_ms?: number;
}

export interface CostLogData {
  call_log_id: string; // DB column name (not call_id)
  service_provider: string; // DB column name (not service)
  service_type: string;
  quantity?: number;
  unit?: string;
  unit_cost?: number;
  total_cost: number; // DB column name (not cost_usd)
  metadata?: Record<string, any>;
}

/**
 * Find existing call log by call_sid
 */
export async function findCallLogByCallSid(callSid: string): Promise<string | null> {
  console.log('Looking for existing call log:', callSid);

  try {
    const { data, error } = await supabase
      .from('call_logs')
      .select('id')
      .eq('call_sid', callSid)
      .maybeSingle();

    if (error) {
      console.error('Error finding call log:', error);
      return null;
    }

    if (data) {
      console.log('Found existing call log:', data.id);
      return data.id;
    }

    console.log('No existing call log found for:', callSid);
    return null;

  } catch (error) {
    console.error('Error in findCallLogByCallSid:', error);
    return null;
  }
}

/**
 * Find or create a call log entry (prevents duplicates)
 */
export async function findOrCreateCallLog(data: CallLogData): Promise<string> {
  // First check if a call log already exists for this call_sid
  const existingId = await findCallLogByCallSid(data.call_sid);
  if (existingId) {
    console.log('Using existing call log:', existingId);
    return existingId;
  }

  // Create new call log if none exists
  return await createCallLog(data);
}

/**
 * Create a new call log entry
 */
export async function createCallLog(data: CallLogData): Promise<string> {
  console.log('Creating call log:', data.call_sid);

  try {
    const { data: callLog, error } = await supabase
      .from('call_logs')
      .insert({
        clinic_id: DEFAULT_CLINIC_ID,
        call_sid: data.call_sid,
        from_number: data.from_number,
        to_number: data.to_number,
        started_at: data.started_at,
        ended_at: data.ended_at,
        duration: data.duration,
        status: data.status,
        patient_id: data.patient_id,
        appointment_id: data.appointment_id,
        transcript: data.transcript,
        direction: data.direction,
        call_type: data.call_type,
        outcome: data.outcome,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating call log:', error);
      throw new Error('Failed to create call log');
    }

    console.log('Call log created:', callLog.id);
    return callLog.id;

  } catch (error) {
    console.error('Error in createCallLog:', error);
    throw error;
  }
}

/**
 * Update an existing call log
 */
export async function updateCallLog(
  callSid: string,
  updates: Partial<CallLogData>
): Promise<void> {
  console.log('Updating call log:', callSid, updates);

  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.ended_at !== undefined) updateData.ended_at = updates.ended_at;
    if (updates.duration !== undefined) updateData.duration = updates.duration;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.patient_id !== undefined) updateData.patient_id = updates.patient_id;
    if (updates.appointment_id !== undefined) updateData.appointment_id = updates.appointment_id;
    if (updates.transcript !== undefined) updateData.transcript = updates.transcript;
    if (updates.outcome !== undefined) updateData.outcome = updates.outcome;

    const { error } = await supabase
      .from('call_logs')
      .update(updateData)
      .eq('call_sid', callSid);

    if (error) {
      console.error('Error updating call log:', error);
      throw new Error('Failed to update call log');
    }

    console.log('Call log updated successfully');

  } catch (error) {
    console.error('Error in updateCallLog:', error);
    throw error;
  }
}

/**
 * Log an AI interaction
 */
export async function logAIInteraction(data: AIInteractionData): Promise<void> {
  console.log('Logging AI interaction:', data.interaction_type);

  try {
    const { error } = await supabase
      .from('ai_interactions')
      .insert({
        clinic_id: DEFAULT_CLINIC_ID,
        call_log_id: data.call_log_id,
        interaction_type: data.interaction_type,
        input_text: data.input_text,
        output_text: data.output_text,
        function_calls: data.function_calls || [],
        intent: data.intent,
        confidence: data.confidence,
        model_used: data.model_used,
        tokens_used: data.tokens_used,
        latency_ms: data.latency_ms,
      });

    if (error) {
      console.error('Error logging AI interaction:', error);
      // Don't throw - logging failures shouldn't break the call
    }

  } catch (error) {
    console.error('Error in logAIInteraction:', error);
  }
}

/**
 * Log API costs
 */
export async function logCost(data: CostLogData): Promise<void> {
  console.log('Logging cost:', { service: data.service_provider, cost: data.total_cost });

  try {
    const { error } = await supabase
      .from('cost_logs')
      .insert({
        clinic_id: DEFAULT_CLINIC_ID,
        call_log_id: data.call_log_id,
        service_provider: data.service_provider,
        service_type: data.service_type,
        quantity: data.quantity,
        unit: data.unit,
        unit_cost: data.unit_cost,
        total_cost: data.total_cost,
        metadata: data.metadata || {},
      });

    if (error) {
      console.error('Error logging cost:', error);
      // Don't throw - cost logging failures shouldn't break the call
    }

  } catch (error) {
    console.error('Error in logCost:', error);
  }
}

/**
 * Calculate ElevenLabs TTS cost based on characters
 * Pricing: ~$0.30 per 1000 characters (Starter plan)
 * Twilio-hosted ElevenLabs may have different rates
 */
export function calculateElevenLabsCost(characterCount: number): number {
  // ElevenLabs pricing: ~$0.0003 per character ($0.30/1000 chars)
  return characterCount * 0.0003;
}

/**
 * Calculate OpenAI cost based on tokens
 * Pricing varies by model
 */
export function calculateOpenAICost(inputTokens: number, outputTokens: number, model: string = 'gpt-4o-mini'): number {
  // Pricing per 1M tokens (as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  };
  
  const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
  const inputCost = (inputTokens / 1000000) * modelPricing.input;
  const outputCost = (outputTokens / 1000000) * modelPricing.output;
  
  return inputCost + outputCost;
}

/**
 * Log ElevenLabs TTS usage
 */
export async function logElevenLabsCost(
  callLogId: string, 
  characterCount: number, 
  voiceId?: string
): Promise<void> {
  const cost = calculateElevenLabsCost(characterCount);
  
  await logCost({
    call_log_id: callLogId,
    service_provider: 'elevenlabs',
    service_type: 'text-to-speech',
    quantity: characterCount,
    unit: 'characters',
    unit_cost: 0.0003,
    total_cost: cost,
    metadata: { voice_id: voiceId || 'unknown' },
  });
}

/**
 * Log OpenAI API usage
 */
export async function logOpenAICost(
  callLogId: string,
  inputTokens: number,
  outputTokens: number,
  model: string
): Promise<void> {
  const totalTokens = inputTokens + outputTokens;
  const cost = calculateOpenAICost(inputTokens, outputTokens, model);
  
  await logCost({
    call_log_id: callLogId,
    service_provider: 'openai',
    service_type: 'chat-completion',
    quantity: totalTokens,
    unit: 'tokens',
    total_cost: cost,
    metadata: { model, input_tokens: inputTokens, output_tokens: outputTokens },
  });
}

/**
 * Get call statistics for a date range
 */
export async function getCallStats(startDate: string, endDate: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('clinic_id', DEFAULT_CLINIC_ID)
      .gte('started_at', startDate)
      .lte('started_at', endDate);

    if (error) {
      console.error('Error fetching call stats:', error);
      throw new Error('Failed to fetch call statistics');
    }

    // Calculate statistics
    const totalCalls = data.length;
    const completedCalls = data.filter(c => c.status === 'completed').length;
    const bookedAppointments = data.filter(c => c.outcome === 'booked' || c.appointment_id != null).length;
    const avgDuration = totalCalls > 0 
      ? data.reduce((sum, c) => sum + (c.duration || 0), 0) / totalCalls
      : 0;

    return {
      total_calls: totalCalls,
      completed_calls: completedCalls,
      booked_appointments: bookedAppointments,
      success_rate: totalCalls > 0 ? (bookedAppointments / totalCalls * 100).toFixed(1) + '%' : '0%',
      avg_duration_seconds: Math.round(avgDuration),
    };

  } catch (error) {
    console.error('Error in getCallStats:', error);
    throw error;
  }
}
