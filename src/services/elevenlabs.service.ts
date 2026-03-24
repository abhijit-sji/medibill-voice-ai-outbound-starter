/**
 * ElevenLabs Conversational AI Service
 * Handles ElevenLabs agent creation, management, and monitoring
 */

import { supabase } from "@/integrations/supabase/client";

export interface ElevenLabsAgent {
  agent_id: string;
  name: string;
  description?: string;
  voice_id: string;
  model: string;
  first_message?: string;
  system_prompt?: string;
  language?: string;
  settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
  };
}

export interface ConversationData {
  conversation_id: string;
  agent_id: string;
  status: string;
  transcript: any[];
  started_at: string;
  ended_at?: string;
  analysis?: any;
}

/**
 * Create a new ElevenLabs conversational agent
 */
export async function createElevenLabsAgent(config: {
  name: string;
  voiceId: string;
  model?: string;
  firstMessage?: string;
  systemPrompt?: string;
  language?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}): Promise<ElevenLabsAgent> {
  const { data, error } = await supabase.functions.invoke("create-elevenlabs-agent", {
    body: {
      name: config.name,
      voice_id: config.voiceId,
      model: config.model || 'eleven_turbo_v2',
      first_message: config.firstMessage,
      system_prompt: config.systemPrompt,
      language: config.language || 'en',
      voice_settings: {
        stability: config.stability ?? 0.5,
        similarity_boost: config.similarityBoost ?? 0.8,
        style: config.style ?? 0.0,
      },
    },
  });

  if (error) {
    throw new Error(`Failed to create ElevenLabs agent: ${error.message}`);
  }

  if (data?.error || data?.success === false) {
    throw new Error(data?.error || 'Failed to create ElevenLabs agent');
  }

  // Map response to ElevenLabsAgent interface
  return {
    agent_id: data.agent_id,
    name: config.name,
    voice_id: config.voiceId,
    model: config.model || 'eleven_turbo_v2',
    first_message: config.firstMessage,
    system_prompt: config.systemPrompt,
    language: config.language || 'en',
    settings: {
      stability: config.stability ?? 0.5,
      similarity_boost: config.similarityBoost ?? 0.8,
      style: config.style ?? 0.0,
    },
  };
}

/**
 * Update an existing ElevenLabs agent
 */
export async function updateElevenLabsAgent(
  agentId: string,
  config: Partial<{
    name: string;
    voiceId: string;
    model: string;
    firstMessage: string;
    systemPrompt: string;
    language: string;
    stability: number;
    similarityBoost: number;
    style: number;
  }>
): Promise<void> {
  const { data, error } = await supabase.functions.invoke("create-elevenlabs-agent", {
    body: {
      agent_id: agentId,
      name: config.name,
      voice_id: config.voiceId,
      model: config.model,
      first_message: config.firstMessage,
      system_prompt: config.systemPrompt,
      language: config.language,
      voice_settings: config.stability !== undefined ? {
        stability: config.stability,
        similarity_boost: config.similarityBoost,
        style: config.style,
      } : undefined,
    },
  });

  if (error) {
    throw new Error(`Failed to update ElevenLabs agent: ${error.message}`);
  }

  if (data?.error || data?.success === false) {
    throw new Error(data?.error || 'Failed to update ElevenLabs agent');
  }
}

/**
 * Delete an ElevenLabs agent
 */
export async function deleteElevenLabsAgent(agentId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("create-elevenlabs-agent", {
    body: {
      agent_id: agentId,
      delete: true,
    },
  });

  if (error) {
    throw new Error(`Failed to delete ElevenLabs agent: ${error.message}`);
  }

  if (data?.error || (data?.success === false && !data?.deleted)) {
    throw new Error(data?.error || 'Failed to delete ElevenLabs agent');
  }
}

/**
 * Get ElevenLabs agent details
 */
export async function getElevenLabsAgent(agentId: string): Promise<ElevenLabsAgent> {
  const { data, error } = await supabase.functions.invoke("get-elevenlabs-agent", {
    body: { agent_id: agentId },
  });

  if (error) {
    throw new Error(`Failed to get ElevenLabs agent: ${error.message}`);
  }

  if (data?.error || data?.success === false) {
    throw new Error(data?.error || 'Failed to get ElevenLabs agent');
  }

  return data as ElevenLabsAgent;
}

/**
 * List all ElevenLabs agents
 */
export async function listElevenLabsAgents(): Promise<ElevenLabsAgent[]> {
  const { data, error } = await supabase.functions.invoke("list-elevenlabs-agents", {
    body: {},
  });

  if (error) {
    throw new Error(`Failed to list ElevenLabs agents: ${error.message}`);
  }

  if (data?.error || data?.success === false) {
    throw new Error(data?.error || 'Failed to list ElevenLabs agents');
  }

  return data?.agents || [];
}

/**
 * Get conversation details
 */
export async function getConversation(conversationId: string): Promise<ConversationData> {
  const { data, error } = await supabase.functions.invoke("get-elevenlabs-conversation", {
    body: { conversation_id: conversationId },
  });

  if (error) {
    throw new Error(`Failed to get conversation: ${error.message}`);
  }

  if (data?.error || data?.success === false) {
    throw new Error(data?.error || 'Failed to get conversation');
  }

  return data as ConversationData;
}

/**
 * Get conversation transcript
 */
export async function getConversationTranscript(conversationId: string): Promise<any[]> {
  const { data, error } = await supabase.functions.invoke("get-elevenlabs-conversation-transcript", {
    body: { conversation_id: conversationId },
  });

  if (error) {
    throw new Error(`Failed to get conversation transcript: ${error.message}`);
  }

  if (data?.error || data?.success === false) {
    throw new Error(data?.error || 'Failed to get conversation transcript');
  }

  return data?.messages || [];
}

/**
 * Get conversation audio recording
 */
export async function getConversationAudio(conversationId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("get-elevenlabs-conversation-audio", {
    body: { conversation_id: conversationId },
  });

  if (error) {
    throw new Error(`Failed to get conversation audio: ${error.message}`);
  }

  if (data?.error || data?.success === false) {
    throw new Error(data?.error || 'Failed to get conversation audio');
  }

  // Convert base64 audio to blob URL
  if (data?.audio_base64) {
    const binaryString = atob(data.audio_base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: data.content_type || 'audio/mpeg' });
    return URL.createObjectURL(blob);
  }

  throw new Error('No audio data received from Edge Function');
}

/**
 * Initiate a test call via Twilio to ElevenLabs agent
 */
export async function initiateTestCall(phoneNumber: string, agentId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("initiate-test-call", {
    body: {
      phone_number: phoneNumber,
      agent_id: agentId,
    },
  });

  if (error) {
    throw new Error(`Failed to initiate call: ${error.message}`);
  }

  if (data?.error || data?.success === false) {
    throw new Error(data?.error || 'Failed to initiate call');
  }

  return data?.call_sid || '';
}

/**
 * Get conversation analytics
 */
export async function getConversationAnalytics(dateRange: {
  start: string;
  end: string;
}): Promise<any> {
  const { data, error } = await supabase
    .from('v_elevenlabs_conversation_analytics')
    .select('*')
    .gte('started_at', dateRange.start)
    .lte('started_at', dateRange.end);

  if (error) throw error;

  return data;
}

/**
 * Get active conversations
 */
export async function getActiveConversations(): Promise<any[]> {
  const { data, error } = await supabase
    .from('elevenlabs_conversations')
    .select('*, call_logs(*)')
    .eq('status', 'active')
    .order('started_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Get call workflow progress
 */
export async function getCallWorkflowProgress(callLogId: string): Promise<any> {
  const { data, error } = await supabase.rpc('get_call_workflow_progress', {
    p_call_log_id: callLogId,
  });

  if (error) throw error;

  return data;
}

/**
 * Get agent activity logs for a call
 */
export async function getAgentActivityLogs(callLogId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('agent_activity_logs')
    .select('*')
    .eq('call_log_id', callLogId)
    .order('sequence_number', { ascending: true });

  if (error) throw error;

  return data || [];
}
