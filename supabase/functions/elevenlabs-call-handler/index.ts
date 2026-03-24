/**
 * ElevenLabs Call Handler
 * Handles incoming Twilio calls and connects them to ElevenLabs Conversational AI
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_CLINIC_ID = "00000000-0000-0000-0000-000000000001";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse Twilio webhook data
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callStatus = formData.get('CallStatus') as string;

    console.log('Incoming call:', { callSid, from, to, callStatus });

    // Get ElevenLabs API key (used for both inbound and outbound)
    const { data: integration } = await supabase
      .from('integration_settings')
      .select('settings')
      .eq('integration_name', 'elevenlabs')
      .eq('clinic_id', DEFAULT_CLINIC_ID)
      .eq('is_enabled', true)
      .single();

    const apiKey = integration?.settings?.api_key || elevenlabsApiKey;

    if (!apiKey) {
      console.error('ElevenLabs API key not configured');
      return new Response(
        generateTwiMLError('ElevenLabs API key not configured'),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // --- Outbound detection ---
    const normalizePhone = (s: string) => (s || '').replace(/\s/g, '');

    // Check URL params first (passed by start-outbound-appointment-call)
    const url = new URL(req.url);
    const urlDirection = url.searchParams.get('direction');
    const urlAgentId = url.searchParams.get('agent_id');

    // Resolve Twilio phone from integration_settings (same source as start-outbound-appointment-call)
    const { data: twilioSettings } = await supabase
      .from('integration_settings')
      .select('settings')
      .eq('integration_name', 'twilio')
      .eq('clinic_id', DEFAULT_CLINIC_ID)
      .eq('is_enabled', true)
      .maybeSingle();

    const twilioPhone = (twilioSettings?.settings as any)?.phone_number || Deno.env.get('TWILIO_PHONE_NUMBER');

    // URL param is primary signal; phone comparison is fallback
    const isOutbound = urlDirection === 'outbound' ||
      (twilioPhone && normalizePhone(from) === normalizePhone(twilioPhone));

    console.log('Direction detection:', { urlDirection, urlAgentId, twilioPhone, from, isOutbound });

    if (isOutbound) {
      // Use agent_id from URL if available, otherwise query DB
      let outboundAgentId = urlAgentId?.trim() || null;

      if (!outboundAgentId) {
        const { data: outboundSettings, error: outboundError } = await supabase
          .from('outbound_agent_settings')
          .select('id, elevenlabs_agent_id')
          .eq('agent_type', 'outbound_call')
          .limit(1)
          .maybeSingle();

        if (outboundError || !outboundSettings?.elevenlabs_agent_id?.trim()) {
          console.error('Outbound call but no outbound agent configured', outboundError);
          return new Response(
            generateTwiMLError('Outbound agent not configured'),
            { headers: { 'Content-Type': 'text/xml' } }
          );
        }
        outboundAgentId = outboundSettings.elevenlabs_agent_id.trim();
      }

      console.log('Using outbound agent:', outboundAgentId);

      // Best effort: log call, but don't let failures break the call
      const { error: callErrorOutbound } = await supabase
        .from('call_logs')
      .upsert({
          call_sid: callSid,
          from_number: from,
          to_number: to,
          call_type: 'outbound',
          direction: 'outbound',
        status: 'in-progress',
        ai_provider: 'elevenlabs',
        elevenlabs_agent_id: outboundAgentId,
        clinic_id: DEFAULT_CLINIC_ID
      });

    if (callErrorOutbound) {
      console.error('Error creating call log (outbound):', callErrorOutbound);
    }

      // Let ElevenLabs create the conversation when the WebSocket connects.
      const twimlOutbound = generateTwiMLForElevenLabs(
        { elevenlabs_agent_id: outboundAgentId },
        null
      );

      return new Response(twimlOutbound, {
        headers: { 'Content-Type': 'text/xml' },
        status: 200
      });
    }

    // --- Inbound path: use ai_agent_configurations and immediately capture a lead ---
    const { data: agentConfig, error: configError } = await supabase
      .from('ai_agent_configurations')
      .select('*')
      .eq('use_elevenlabs', true)
      .eq('is_active', true)
      .single();

    if (configError || !agentConfig) {
      console.error('No active ElevenLabs agent found');
      return new Response(
        generateTwiMLError('No active ElevenLabs agent configured'),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Create or update call log and get its id/metadata
    const { data: callLogRow, error: callError } = await supabase
      .from('call_logs')
      .upsert({
        call_sid: callSid,
        from_number: from,
        to_number: to,
        call_type: 'inbound',
        direction: 'inbound',
        status: 'in-progress',
        ai_provider: 'elevenlabs',
        elevenlabs_agent_id: agentConfig.elevenlabs_agent_id,
        clinic_id: DEFAULT_CLINIC_ID
      })
      .select('id, metadata')
      .maybeSingle();

    if (callError) {
      console.error('Error creating call log:', callError);
    }

    // Best-effort: ensure there is a lead record for this inbound caller
    if (from && callLogRow) {
      try {
        const clinicId = DEFAULT_CLINIC_ID;

        // Try to find an existing lead for this phone number
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('clinic_id', clinicId)
          .eq('phone', from)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let leadId: string | null = existingLead?.id ?? null;

        // If no existing lead, create a minimal one
        if (!leadId) {
          const { data: newLead, error: leadError } = await supabase
            .from('leads')
            .insert({
              first_name: 'Unknown',
              last_name: 'Caller',
              phone: from,
              email: null,
              source: 'phone',
              status: 'new',
              clinic_id: clinicId,
              notes: 'Inbound call received — lead auto-created by call handler',
              metadata: { call_sid: callSid, call_log_id: callLogRow.id },
            })
            .select('id')
            .single();

          if (leadError) {
            console.error('elevenlabs-call-handler: failed to create inbound lead', leadError);
          } else if (newLead) {
            leadId = newLead.id;
          }
        }

        // Link the lead back to the call log metadata if we have one
        if (leadId) {
          const existingMetadata = (callLogRow.metadata || {}) as Record<string, unknown>;
          await supabase
            .from('call_logs')
            .update({
              metadata: { ...existingMetadata, lead_id: leadId },
            })
            .eq('id', callLogRow.id);
        }
      } catch (leadErr) {
        console.error('elevenlabs-call-handler: error ensuring lead for inbound caller', leadErr);
      }
    }

    // Generate TwiML to connect call to ElevenLabs (conversation will be created on connect)
    const twiml = generateTwiMLForElevenLabs(agentConfig, null);

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
      status: 200
    });

  } catch (error) {
    console.error('Error handling call:', error);
    return new Response(
      generateTwiMLError('An error occurred processing your call'),
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
});


function generateTwiMLForElevenLabs(agentConfig: any, conversationId: string | null): string {
  // Generate TwiML that connects to ElevenLabs WebSocket
  const websocketUrl = conversationId
    ? `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentConfig.elevenlabs_agent_id}&conversation_id=${conversationId}`
    : `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentConfig.elevenlabs_agent_id}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${websocketUrl}">
      <Parameter name="agent_id" value="${agentConfig.elevenlabs_agent_id}"/>
      ${conversationId ? `<Parameter name="conversation_id" value="${conversationId}"/>` : ''}
    </Stream>
  </Connect>
</Response>`;
}

function generateTwiMLError(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    ${message}. Please try again later.
  </Say>
  <Hangup/>
</Response>`;
}
