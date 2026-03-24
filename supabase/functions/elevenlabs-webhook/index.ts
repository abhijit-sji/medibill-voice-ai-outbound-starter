/**
 * ElevenLabs Webhook Handler
 * Handles webhooks from ElevenLabs Conversational AI
 *
 * Events:
 * - conversation.started
 * - conversation.message
 * - conversation.function_call
 * - conversation.ended
 * - conversation.error
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { findPatient as sharedFindPatient, findPatientByPhone } from '../shared/patient-lookup.ts';
import { checkAvailability as sharedCheckAvailability } from '../shared/availability.ts';
import { bookAppointment as sharedBookAppointment } from '../shared/booking.ts';
import { getElevenLabsApiKey } from '../shared/elevenlabs-key.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_CLINIC_ID = '00000000-0000-0000-0000-000000000001';

interface ElevenLabsWebhookEvent {
  event_type: string;
  conversation_id: string;
  agent_id: string;
  timestamp: string;
  data: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const event: ElevenLabsWebhookEvent = await req.json();

    // Direct tool call: body is only tool arguments (e.g. from ElevenLabs custom webhook tool).
    // Must include conversation_id (in body or header) so we can find the call_log.
    const conversationIdFromHeader = req.headers.get('x-conversation-id') ?? req.headers.get('X-Conversation-Id');
    const hasEventType = event && typeof (event as any).event_type === 'string';
    const directOutcomeBody =
      !hasEventType &&
      (event?.patient_validated !== undefined ||
        event?.insurance_verified !== undefined ||
        event?.appointment_booked !== undefined ||
        event?.outcome_notes !== undefined);

    if (directOutcomeBody) {
      const conversationId = (event as any).conversation_id ?? conversationIdFromHeader;
      if (!conversationId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'conversation_id required (body or x-conversation-id header)',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      const { data: callLog } = await supabase
        .from('call_logs')
        .select('id, outcome_details')
        .eq('elevenlabs_conversation_id', conversationId)
        .maybeSingle();
      if (!callLog) {
        return new Response(
          JSON.stringify({ success: false, error: 'Call log not found for this conversation.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
      const updates: Record<string, unknown> = {};
      if (typeof (event as any).patient_validated === 'boolean') updates.patient_validated = (event as any).patient_validated;
      if (typeof (event as any).insurance_verified === 'boolean') updates.insurance_verified = (event as any).insurance_verified;
      if (typeof (event as any).appointment_booked === 'boolean') updates.appointment_booked = (event as any).appointment_booked;
      if ((event as any).outcome_notes) {
        const existing = (callLog.outcome_details as Record<string, unknown>) || {};
        updates.outcome_details = {
          ...existing,
          notes: (event as any).outcome_notes,
          updated_at: new Date().toISOString(),
        };
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('call_logs').update(updates).eq('id', callLog.id);
      }
      return new Response(
        JSON.stringify({ success: true, updated_fields: Object.keys(updates) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('Received ElevenLabs webhook:', event.event_type);

    let functionCallResult: unknown = undefined;

    // Route to appropriate handler based on event type
    switch (event.event_type) {
      case 'conversation.started':
        await handleConversationStarted(supabase, event);
        break;

      case 'conversation.message':
        await handleConversationMessage(supabase, event);
        break;

      case 'conversation.function_call':
        functionCallResult = await handleFunctionCall(supabase, event);
        break;

      case 'conversation.ended':
        await handleConversationEnded(supabase, event);
        break;

      case 'conversation.error':
        await handleConversationError(supabase, event);
        break;

      default:
        console.log('Unknown event type:', event.event_type);
    }

    // For function_call, return the result so ElevenLabs can inject it into the conversation
    const responseBody = event.event_type === 'conversation.function_call' && functionCallResult !== undefined
      ? functionCallResult
      : { success: true };

    return new Response(
      JSON.stringify(responseBody),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error handling webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function handleConversationStarted(supabase: any, event: ElevenLabsWebhookEvent) {
  console.log('Conversation started:', event.conversation_id);

  // ElevenLabs may include the Twilio call_sid in the event data so we can
  // link this conversation to the call_log row that elevenlabs-call-handler
  // created (which already has from_number and metadata.lead_id).
  const callSidFromEvent: string | null =
    event.data?.call_sid ??
    event.data?.metadata?.call_sid ??
    event.data?.twilio_call_sid ??
    null;

  // Check whether there is already a row for this elevenlabs_conversation_id
  const { data: existingByConvId } = await supabase
    .from('call_logs')
    .select('id')
    .eq('elevenlabs_conversation_id', event.conversation_id)
    .maybeSingle();

  if (existingByConvId) {
    // Already handled (e.g. duplicate webhook delivery) — nothing to do.
    return;
  }

  // Try to link to the row created by elevenlabs-call-handler via call_sid.
  if (callSidFromEvent) {
    const { data: existingBySid } = await supabase
      .from('call_logs')
      .select('id, metadata')
      .eq('call_sid', callSidFromEvent)
      .maybeSingle();

    if (existingBySid) {
      // Update the existing row to attach the ElevenLabs conversation id.
      await supabase
        .from('call_logs')
        .update({
          elevenlabs_conversation_id: event.conversation_id,
          elevenlabs_agent_id: event.agent_id,
          status: 'in-progress',
          started_at: new Date().toISOString(),
          workflow_status: {
            greeting: 'in_progress',
            validation: 'pending',
            insurance: 'pending',
            availability: 'pending',
            booking: 'pending',
            confirmation: 'pending',
          },
        })
        .eq('id', existingBySid.id);

      // Also ensure an elevenlabs_conversations record exists.
      await supabase
        .from('elevenlabs_conversations')
        .upsert({
          call_log_id: existingBySid.id,
          conversation_id: event.conversation_id,
          agent_id: event.agent_id,
          clinic_id: DEFAULT_CLINIC_ID,
          status: 'active',
        });

      await supabase.rpc('log_agent_activity', {
        p_call_log_id: existingBySid.id,
        p_clinic_id: null,
        p_activity_type: 'greeting',
        p_activity_name: 'Greeting Patient',
        p_activity_status: 'in_progress',
      });

      // Also link the outbound_call_queue item (if any) to this conversation so that
      // conversation.ended / conversation.error handlers can reliably find it later.
      try {
        const { data: queueItem } = await supabase
          .from('outbound_call_queue')
          .select('id, metadata')
          .eq('call_sid', callSidFromEvent)
          .maybeSingle();

        if (queueItem) {
          const existingQueueMetadata = (queueItem.metadata || {}) as Record<string, unknown>;
          await supabase
            .from('outbound_call_queue')
            .update({
              metadata: {
                ...existingQueueMetadata,
                elevenlabs_conversation_id: event.conversation_id,
              },
              status: 'in_progress',
            })
            .eq('id', queueItem.id);
          console.log(
            'handleConversationStarted: linked conversation to outbound_call_queue',
            queueItem.id,
          );
        }
      } catch (queueErr) {
        console.error('handleConversationStarted: failed to link outbound_call_queue', queueErr);
      }

      console.log('handleConversationStarted: linked conversation to existing call_log', existingBySid.id);
      return;
    }
  }

  // ── Try to find a row created by log-call-activity (Server Tools) ──
  // log-call-activity creates rows with call_sid = "el-{fake_id}" and a
  // fake elevenlabs_conversation_id generated by the LLM. We can match
  // by from_number + recent creation time + in-progress status.
  const callerNumber: string | null =
    event.data?.caller_number ?? event.data?.from_number ?? null;

  if (callerNumber) {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: serverToolRow } = await supabase
      .from('call_logs')
      .select('id, metadata, call_sid')
      .eq('from_number', callerNumber)
      .eq('status', 'in-progress')
      .eq('ai_provider', 'elevenlabs')
      .like('call_sid', 'el-%')
      .gte('created_at', twoMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (serverToolRow) {
      // Update the existing row with the REAL ElevenLabs conversation ID
      await supabase
        .from('call_logs')
        .update({
          elevenlabs_conversation_id: event.conversation_id,
          elevenlabs_agent_id: event.agent_id,
        })
        .eq('id', serverToolRow.id);

      // Also create/update elevenlabs_conversations record
      await supabase
        .from('elevenlabs_conversations')
        .upsert({
          call_log_id: serverToolRow.id,
          conversation_id: event.conversation_id,
          agent_id: event.agent_id,
          clinic_id: DEFAULT_CLINIC_ID,
          status: 'active',
        });

      console.log('handleConversationStarted: linked real conversation ID to server-tool row', serverToolRow.id, event.conversation_id);
      return;
    }
  }

  // No existing row found — create a new one and also ensure a minimal lead.
  const { data: callLog, error } = await supabase
    .from('call_logs')
    .insert({
      call_sid: `el-${event.conversation_id}`,
      from_number: event.data?.caller_number || 'elevenlabs-inbound',
      to_number: event.data?.called_number || 'elevenlabs-agent',
      started_at: new Date().toISOString(),
      call_type: 'inbound',
      direction: 'inbound',
      status: 'in-progress',
      ai_provider: 'elevenlabs',
      elevenlabs_conversation_id: event.conversation_id,
      elevenlabs_agent_id: event.agent_id,
      clinic_id: '00000000-0000-0000-0000-000000000001',
      workflow_status: {
        greeting: 'in_progress',
        validation: 'pending',
        insurance: 'pending',
        availability: 'pending',
        booking: 'pending',
        confirmation: 'pending',
      },
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating call log:', error);
    return;
  }

  // Create elevenlabs_conversations entry
  await supabase
    .from('elevenlabs_conversations')
    .insert({
      call_log_id: callLog.id,
      conversation_id: event.conversation_id,
      agent_id: event.agent_id,
      clinic_id: DEFAULT_CLINIC_ID,
      status: 'active',
    });

  // Log initial activity
  await supabase.rpc('log_agent_activity', {
    p_call_log_id: callLog.id,
    p_clinic_id: null,
    p_activity_type: 'greeting',
    p_activity_name: 'Greeting Patient',
    p_activity_status: 'in_progress',
  });

  // Safety-net: create a minimal lead since we have no from_number here.
  // The lead will be enriched later when find_patient / send_registration_form fires.
  try {
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert({
        first_name: 'Unknown',
        last_name: 'Caller',
        phone: null,
        email: null,
        source: 'phone',
        status: 'new',
        clinic_id: DEFAULT_CLINIC_ID,
        notes: `Inbound call — no caller ID available (conversation: ${event.conversation_id})`,
        metadata: { call_log_id: callLog.id, elevenlabs_conversation_id: event.conversation_id },
      })
      .select('id')
      .single();

    if (leadError) {
      console.error('handleConversationStarted: failed to create fallback lead', leadError);
    } else if (newLead) {
      await supabase
        .from('call_logs')
        .update({ metadata: { lead_id: newLead.id } })
        .eq('id', callLog.id);
      console.log('handleConversationStarted: fallback lead created', newLead.id);
    }
  } catch (leadErr) {
    console.error('handleConversationStarted: error creating fallback lead', leadErr);
  }
}

async function handleConversationMessage(supabase: any, event: ElevenLabsWebhookEvent) {
  console.log('Conversation message:', event.data);

  // Find call log
  const { data: callLog } = await supabase
    .from('call_logs')
    .select('id, transcript')
    .eq('elevenlabs_conversation_id', event.conversation_id)
    .single();

  if (!callLog) {
    console.error('Call log not found for conversation:', event.conversation_id);
    return;
  }

  // Update transcript — use JSON array format for consistency with log-call-activity
  let transcriptArray: Array<{ role: string; message: string; timestamp?: string }> = [];
  const currentTranscript = callLog.transcript || '';
  if (currentTranscript) {
    try {
      const parsed = JSON.parse(currentTranscript);
      if (Array.isArray(parsed)) {
        transcriptArray = parsed;
      }
    } catch {
      // Convert existing plain-text lines to JSON entries
      const lines = currentTranscript.split('\n').filter((l: string) => l.trim());
      for (const line of lines) {
        const isAgent = /^agent:/i.test(line);
        const text = line.replace(/^(agent|patient|caller|user|ai|assistant):\s*/i, '');
        if (text) {
          transcriptArray.push({ role: isAgent ? 'agent' : 'user', message: text });
        }
      }
    }
  }
  transcriptArray.push({
    role: event.data.role === 'agent' ? 'agent' : 'user',
    message: event.data.message,
    timestamp: event.timestamp || new Date().toISOString(),
  });

  await supabase
    .from('call_logs')
    .update({ transcript: JSON.stringify(transcriptArray) })
    .eq('id', callLog.id);

  // Update elevenlabs_conversations transcript
  const { data: conversation } = await supabase
    .from('elevenlabs_conversations')
    .select('transcript')
    .eq('conversation_id', event.conversation_id)
    .single();

  if (conversation) {
    const transcriptArray = conversation.transcript || [];
    transcriptArray.push({
      role: event.data.role,
      message: event.data.message,
      timestamp: event.timestamp
    });

    await supabase
      .from('elevenlabs_conversations')
      .update({ transcript: transcriptArray })
      .eq('conversation_id', event.conversation_id);
  }
}

async function handleFunctionCall(supabase: any, event: ElevenLabsWebhookEvent) {
  console.log('Function call:', event.data.function_name);

  // Find call log
  const { data: callLog } = await supabase
    .from('call_logs')
    .select('id, clinic_id, metadata, patient_id')
    .eq('elevenlabs_conversation_id', event.conversation_id)
    .single();

  if (!callLog) {
    console.error('Call log not found for conversation:', event.conversation_id);
    return { error: 'Call session not found. Please try again.' };
  }

  const functionName = event.data.function_name;
  const functionArgs = event.data.arguments;

  // Determine activity type based on function name
  let activityType = 'function_call';
  let activityName = functionName;

  if (functionName === 'get_current_datetime') {
    activityType = 'function_call';
    activityName = 'Getting current date and time';
  } else if (functionName === 'send_registration_form') {
    activityType = 'function_call';
    activityName = 'Sending registration form to new patient';
  } else if (functionName === 'update_call_outcome') {
    activityType = 'outcome_update';
    activityName = 'Updating call outcome';
  } else if (functionName.includes('patient')) {
    activityType = 'patient_lookup';
    activityName = 'Looking up patient information';
  } else if (functionName.includes('insurance')) {
    activityType = 'insurance_check';
    activityName = 'Verifying insurance coverage';
  } else if (functionName.includes('availability') || functionName.includes('check_slots')) {
    activityType = 'availability_check';
    activityName = 'Checking provider availability';
  } else if (functionName.includes('book') || functionName.includes('schedule')) {
    activityType = 'booking';
    activityName = 'Booking appointment';
  }

  // Log the activity
  const { data: activity } = await supabase.rpc('log_agent_activity', {
    p_call_log_id: callLog.id,
    p_clinic_id: callLog.clinic_id,
    p_activity_type: activityType,
    p_activity_name: activityName,
    p_activity_status: 'in_progress',
    p_input_data: functionArgs,
    p_function_name: functionName,
    p_function_arguments: functionArgs
  });

  // Execute the function
  let result;
  try {
    result = await executeFunction(supabase, functionName, functionArgs, callLog);

    // Update activity as completed
    await supabase.rpc('complete_agent_activity', {
      p_activity_id: activity,
      p_activity_status: 'completed',
      p_output_data: result,
      p_function_result: result
    });

    // Update workflow status
    await updateWorkflowStatus(supabase, callLog.id, activityType, 'completed');

  } catch (error) {
    console.error('Function execution error:', error);

    // Update activity as failed
    await supabase.rpc('complete_agent_activity', {
      p_activity_id: activity,
      p_activity_status: 'failed',
      p_error_message: error.message
    });

    // Update workflow status
    await updateWorkflowStatus(supabase, callLog.id, activityType, 'failed');

    result = { error: error.message };
  }

  // When the agent successfully finds an existing patient on an inbound call,
  // update or create a lead so the caller is tracked in the Lead Management pipeline.
  if (functionName === 'find_patient' && result && (result as any).found && (result as any).patient) {
    try {
      const patientResult = (result as any).patient as {
        id: string;
        name?: string;
        dob?: string;
        phone?: string | null;
        email?: string | null;
      };

      const clinicId = callLog.clinic_id || DEFAULT_CLINIC_ID;
      const existingMetadata = (callLog.metadata || {}) as Record<string, unknown>;
      const nameParts = (patientResult.name || '').trim().split(' ');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'Patient';
      const patientId = callLog.patient_id || patientResult.id;

      // Priority 1: update the lead that was already linked to this call (created at call start)
      if (existingMetadata.lead_id) {
        await supabase
          .from('leads')
          .update({
            first_name: firstName,
            last_name: lastName,
            phone: patientResult.phone || undefined,
            email: patientResult.email || undefined,
            patient_id: patientId || undefined,
            status: 'contacted',
            last_contacted_at: new Date().toISOString(),
          })
          .eq('id', existingMetadata.lead_id as string);
        console.log('elevenlabs-webhook: updated linked lead on find_patient', existingMetadata.lead_id);
      } else {
        // Priority 2: try to find any existing lead for this patient or phone/email
        const orParts: string[] = [];
        if (patientResult.phone) orParts.push(`phone.eq.${patientResult.phone}`);
        if (patientResult.email) orParts.push(`email.eq.${patientResult.email}`);
        if (patientId) orParts.push(`patient_id.eq.${patientId}`);
        const orFilter = orParts.join(',');

        let leadIdToLink: string | null = null;

        if (orFilter) {
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('clinic_id', clinicId)
            .or(orFilter)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingLead) {
            leadIdToLink = existingLead.id;
            await supabase
              .from('leads')
              .update({
                first_name: firstName,
                last_name: lastName,
                patient_id: patientId || undefined,
                status: 'contacted',
                last_contacted_at: new Date().toISOString(),
              })
              .eq('id', existingLead.id);
          }
        }

        // Priority 3: create a new lead
        if (!leadIdToLink) {
          const { data: newLead, error: leadError } = await supabase
            .from('leads')
            .insert({
              first_name: firstName,
              last_name: lastName,
              phone: patientResult.phone || null,
              email: patientResult.email || null,
              source: 'phone',
              status: 'contacted',
              clinic_id: clinicId,
              patient_id: patientId || null,
              notes: 'Inbound call — existing patient identified by AI agent',
              metadata: { call_log_id: callLog.id },
              last_contacted_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (leadError) {
            console.error('elevenlabs-webhook: failed to create lead for existing patient', leadError);
          } else if (newLead) {
            console.log('elevenlabs-webhook: lead created for existing patient', newLead.id);
            leadIdToLink = newLead.id;
          }
        }

        // Link the lead back to the call log metadata
        if (leadIdToLink) {
          await supabase
            .from('call_logs')
            .update({ metadata: { ...existingMetadata, lead_id: leadIdToLink } })
            .eq('id', callLog.id);
        }
      }
    } catch (leadErr) {
      console.error('elevenlabs-webhook: lead link/creation error for find_patient', leadErr);
    }
  }

  // When the agent successfully sends a registration form to a new patient,
  // update the existing linked lead (enriching it with real name/contact info)
  // or create a new one if none exists.
  if (functionName === 'send_registration_form' && result?.success) {
    try {
      const { first_name, last_name, phone, email } = functionArgs || {};
      const clinicId = callLog.clinic_id || DEFAULT_CLINIC_ID;
      const existingMetadata = (callLog.metadata || {}) as Record<string, unknown>;

      // Priority 1: update the lead already linked to this call
      if (existingMetadata.lead_id) {
        const updatePayload: Record<string, unknown> = { status: 'new', last_contacted_at: new Date().toISOString() };
        // Only overwrite name/contact if we now have real data
        if (first_name && first_name !== 'Unknown') updatePayload.first_name = first_name;
        if (last_name && last_name !== 'Caller') updatePayload.last_name = last_name;
        if (phone) updatePayload.phone = phone;
        if (email) updatePayload.email = email;
        await supabase
          .from('leads')
          .update(updatePayload)
          .eq('id', existingMetadata.lead_id as string);
        console.log('elevenlabs-webhook: updated linked lead on send_registration_form', existingMetadata.lead_id);
      } else {
        // Priority 2: dedup by phone/email
        const orFilter = [
          phone ? `phone.eq.${phone}` : '',
          email ? `email.eq.${email}` : '',
        ].filter(Boolean).join(',');

        const { data: existingLead } = orFilter
          ? await supabase.from('leads').select('id').eq('clinic_id', clinicId).or(orFilter).limit(1).maybeSingle()
          : { data: null };

        if (existingLead) {
          const updatePayload: Record<string, unknown> = { status: 'new', last_contacted_at: new Date().toISOString() };
          if (first_name && first_name !== 'Unknown') updatePayload.first_name = first_name;
          if (last_name && last_name !== 'Caller') updatePayload.last_name = last_name;
          await supabase.from('leads').update(updatePayload).eq('id', existingLead.id);
          await supabase
            .from('call_logs')
            .update({ metadata: { ...existingMetadata, lead_id: existingLead.id } })
            .eq('id', callLog.id);
        } else if (first_name && last_name) {
          // Priority 3: create new lead
          const { data: newLead, error: leadError } = await supabase
            .from('leads')
            .insert({
              first_name,
              last_name,
              phone: phone || null,
              email: email || null,
              source: 'phone',
              status: 'new',
              clinic_id: clinicId,
              notes: 'Called in — registration form sent by AI agent',
              metadata: { call_log_id: callLog.id },
              last_contacted_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (leadError) {
            console.error('elevenlabs-webhook: failed to create lead', leadError);
          } else if (newLead) {
            console.log('elevenlabs-webhook: lead created', newLead.id);
            await supabase
              .from('call_logs')
              .update({ metadata: { ...existingMetadata, lead_id: newLead.id } })
              .eq('id', callLog.id);
          }
        }
      }
    } catch (leadErr) {
      console.error('elevenlabs-webhook: lead creation/update error for send_registration_form', leadErr);
    }
  }

  // When an appointment is successfully booked during the call, advance the lead
  // associated with this call (if any) to the "booked" stage and attach appointment_id.
  if (functionName === 'book_appointment' && result && (result as any).success) {
    try {
      const appointmentId = (result as any).appointment_id as string | undefined;
      const patientIdFromArgs = (functionArgs && (functionArgs as any).patient_id) as string | undefined;
      const clinicId = callLog.clinic_id || DEFAULT_CLINIC_ID;
      const existingMetadata = (callLog.metadata || {}) as Record<string, unknown>;

      let leadId: string | null = (existingMetadata.lead_id as string | null) || null;

      // If there is no explicit lead_id on the call yet, try to find one by patient_id.
      if (!leadId && (callLog.patient_id || patientIdFromArgs)) {
        const lookupPatientId = callLog.patient_id || patientIdFromArgs;
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('clinic_id', clinicId)
          .eq('patient_id', lookupPatientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingLead) {
          leadId = existingLead.id;
        }
      }

      if (leadId) {
        const updatePayload: Record<string, unknown> = {
          status: 'booked',
          last_contacted_at: new Date().toISOString(),
        };
        if (appointmentId) {
          updatePayload.appointment_id = appointmentId;
        }

        await supabase
          .from('leads')
          .update(updatePayload)
          .eq('id', leadId);

        // Ensure the call log metadata is back-linked to this lead.
        await supabase
          .from('call_logs')
          .update({
            metadata: { ...existingMetadata, lead_id: leadId },
          })
          .eq('id', callLog.id);

        // Also mark the outbound_call_queue item (if any) as booked/completed so that
        // the outbound calls dashboard reflects the final outcome.
        if (callLog.call_sid) {
          try {
            const { data: queueItem } = await supabase
              .from('outbound_call_queue')
              .select('id')
              .eq('call_sid', callLog.call_sid)
              .maybeSingle();

            if (queueItem) {
              await supabase
                .from('outbound_call_queue')
                .update({
                  outcome: 'booked',
                  status: 'completed',
                  last_attempt_at: new Date().toISOString(),
                })
                .eq('id', queueItem.id);
            }
          } catch (queueErr) {
            console.error(
              'elevenlabs-webhook: failed to update outbound_call_queue on book_appointment',
              queueErr,
            );
          }
        }
      }
    } catch (leadErr) {
      console.error('elevenlabs-webhook: failed to update lead on book_appointment', leadErr);
    }
  }

  // Log function call
  await supabase
    .from('function_call_logs')
    .insert({
      call_log_id: callLog.id,
      activity_log_id: activity,
      clinic_id: callLog.clinic_id,
      function_name: functionName,
      function_arguments: functionArgs,
      function_result: result,
      execution_status: result.error ? 'error' : 'success',
      error_message: result.error || null
    });

  // Return result to ElevenLabs (if this is a webhook that expects a response)
  return result;
}

async function executeFunction(supabase: any, functionName: string, args: any, callLog: any) {
  // Route to appropriate function handler
  switch (functionName) {
    case 'get_current_datetime':
      return await getCurrentDatetime();

    case 'send_registration_form':
      return await sendRegistrationForm(args);

    case 'find_patient':
    case 'lookup_patient':
      return await findPatient(supabase, args, callLog);

    case 'create_patient':
      return await createPatientOnCall(supabase, args, callLog);

    case 'verify_insurance':
    case 'check_insurance':
      return await verifyInsurance(supabase, args, callLog);

    case 'check_availability':
    case 'get_available_slots':
      return await checkAvailability(supabase, args, callLog);

    case 'book_appointment':
    case 'schedule_appointment':
      return await bookAppointment(supabase, args, callLog);

    case 'update_call_outcome': {
      const updates: Record<string, unknown> = {};
      if (typeof args?.patient_validated === 'boolean') {
        updates.patient_validated = args.patient_validated;
      }
      if (typeof args?.insurance_verified === 'boolean') {
        updates.insurance_verified = args.insurance_verified;
      }
      if (typeof args?.appointment_booked === 'boolean') {
        updates.appointment_booked = args.appointment_booked;
      }
      if (args?.outcome_notes) {
        const existing =
          (callLog.outcome_details as Record<string, unknown> | null) || {};
        updates.outcome_details = {
          ...existing,
          notes: args.outcome_notes,
          updated_at: new Date().toISOString(),
        };
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from('call_logs').update(updates).eq('id', callLog.id);
      }

      return {
        success: true,
        updated_fields: Object.keys(updates),
      };
    }

    case 'log_transcript': {
      // Server tool for live transcript logging — route to log-call-activity
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      try {
        const logRes = await fetch(`${supabaseUrl}/functions/v1/log-call-activity`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            action: 'message',
            conversation_id: args.conversation_id || callLog?.elevenlabs_conversation_id,
            role: args.role || 'agent',
            message: args.message || '',
          }),
        });
        const logResult = await logRes.json();
        return { success: true, logged: true, ...logResult };
      } catch (logErr) {
        console.error('log_transcript routing error:', logErr);
        return { success: true, logged: false };
      }
    }

    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}

function getCurrentDatetime(): Record<string, string> {
  const timezone = Deno.env.get('CLINIC_TIMEZONE') || 'America/New_York';
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const dateIso = `${get('year')}-${get('month')}-${get('day')}`;
  const timeIso = `${get('hour')}:${get('minute')}`;
  return {
    date_iso: dateIso,
    time_iso: timeIso,
    timezone,
    message: `Current date is ${dateIso}, time is ${timeIso} (${timezone}).`,
  };
}

async function sendRegistrationForm(args: any): Promise<Record<string, unknown>> {
  const { first_name, last_name, email, phone, send_via } = args || {};

  // Require basic identity, but allow either email, phone, or both.
  if (!first_name || !last_name) {
    return {
      success: false,
      error: 'Missing required fields. Please provide first name and last name.',
    };
  }

  if (!email && !phone) {
    return {
      success: false,
      error: 'Missing contact information. Please provide at least a phone number or an email address.',
    };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const clinicName = Deno.env.get('CLINIC_NAME') || 'Sunnyville Medical Center';
  const expiresInHours = 72;
  const patientName = `${first_name} ${last_name}`.trim();

  // Determine how the link should be delivered.
  let sendVia: 'sms' | 'email' | 'both';

  // If the ElevenLabs tool explicitly provided a send_via value, honor it when valid.
  if (send_via === 'sms' || send_via === 'email' || send_via === 'both') {
    sendVia = send_via;
  } else {
    // Fallbacks based on which contact fields are available.
    if (phone && email) {
      sendVia = 'both';
    } else if (phone) {
      sendVia = 'sms';
    } else {
      sendVia = 'email';
    }
  }

  try {
    // send-registration-link internally calls generate-registration-token, so we invoke it directly.
    const linkRes = await fetch(`${supabaseUrl}/functions/v1/send-registration-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        patientName,
        patientEmail: email || null,
        patientPhone: phone || null,
        sendVia,
        clinicName,
      }),
    });

    if (!linkRes.ok) {
      const err = await linkRes.json().catch(() => ({}));
      const msg = err?.error || err?.emailError || linkRes.statusText;
      return {
        success: false,
        error: `Registration link was created but we could not send the email: ${msg}. Please confirm your email address or contact the clinic.`,
      };
    }

    const linkData = await linkRes.json();
    const sentChannels: Array<{ type: string }> = linkData.sent || [];
    const anySent = sentChannels.length > 0;

    if (!anySent) {
      const errMsg = linkData.smsError || linkData.emailError || 'We could not send the registration link. Please contact the clinic.';
      return {
        success: false,
        error: errMsg,
      };
    }

    // Build a human-readable delivery summary for the agent to read back to the caller.
    const deliveredVia = sentChannels.map((s) => {
      if (s.type === 'sms') return `SMS to ${phone}`;
      if (s.type === 'email') return `email to ${email}`;
      return s.type;
    }).join(' and ');

    return {
      success: true,
      message: `I've sent a registration form via ${deliveredVia}. The link expires in ${expiresInHours} hours. Once you complete the form, please call us back to book your appointment.`,
      expires_in_hours: expiresInHours,
      delivered_via: sentChannels.map((s) => s.type),
    };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : 'Unknown error';
    return {
      success: false,
      error: `Something went wrong while sending the form: ${errMsg}. Please try again or contact the clinic.`,
    };
  }
}

async function findPatient(supabase: any, args: any, callLog: any) {
  const { first_name, last_name, dob, phone, patient_id } = args;

  // If patient_id is already known (e.g. from outbound call context), look up directly
  if (patient_id) {
    const { data: directPatient } = await supabase
      .from('patients')
      .select('id, first_name, last_name, phone, email, dob, is_active')
      .eq('id', patient_id)
      .eq('is_active', true)
      .single();

    if (directPatient) {
      console.log('findPatient: found patient directly by patient_id', patient_id);
      await supabase
        .from('call_logs')
        .update({
          patient_id: directPatient.id,
          clinic_id: '00000000-0000-0000-0000-000000000001',
          patient_validated: true
        })
        .eq('id', callLog.id);

      return {
        found: true,
        patient: {
          id: directPatient.id,
          name: `${directPatient.first_name} ${directPatient.last_name}`,
          dob: directPatient.dob,
          phone: directPatient.phone,
          email: directPatient.email,
        }
      };
    }
  }

  let result;

  if (phone && !first_name && !last_name) {
    // Phone-only lookup
    result = await findPatientByPhone(phone);
  } else if (first_name && last_name && dob) {
    // Name + DOB lookup (primary path)
    result = await sharedFindPatient(first_name, last_name, dob);
    // Fallback to phone if name+DOB didn't match (handles typos from registration)
    if (!result.found && phone) {
      result = await findPatientByPhone(phone);
    }
  } else if (first_name && last_name) {
    // Name-only lookup with optional phone fallback
    result = await sharedFindPatient(first_name, last_name, '');
    if (!result.found && phone) {
      result = await findPatientByPhone(phone);
    }
  } else {
    return { found: false, message: 'Please provide patient name and date of birth.' };
  }

  // If still not found and this is an outbound call, try phone from call_logs.to_number
  if (!result.found && callLog) {
    const toNumber = callLog.to_number || callLog.from_number;
    if (toNumber && toNumber !== 'elevenlabs-agent') {
      console.log('findPatient: trying phone fallback from call_logs number', toNumber);
      result = await findPatientByPhone(toNumber);
    }
    // Also check if call_log already has a patient_id linked
    if (!result.found && callLog.patient_id) {
      const { data: linkedPatient } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone, email, dob, is_active')
        .eq('id', callLog.patient_id)
        .eq('is_active', true)
        .single();
      if (linkedPatient) {
        console.log('findPatient: found patient via call_log.patient_id', linkedPatient.id);
        result = {
          found: true,
          patient_id: linkedPatient.id,
          first_name: linkedPatient.first_name,
          last_name: linkedPatient.last_name,
          phone: linkedPatient.phone,
          email: linkedPatient.email || undefined,
          dob: linkedPatient.dob,
        };
      }
    }
  }

  if (result.found && result.patient_id) {
    // Update call log with patient info
    await supabase
      .from('call_logs')
      .update({
        patient_id: result.patient_id,
        clinic_id: '00000000-0000-0000-0000-000000000001',
        patient_validated: true
      })
      .eq('id', callLog.id);

    return {
      found: true,
      patient: {
        id: result.patient_id,
        name: `${result.first_name} ${result.last_name}`,
        dob: result.dob,
        phone: result.phone,
        email: result.email,
      }
    };
  }

  return { found: false, message: 'Patient not found in our records. Please verify the information.' };
}

async function createPatientOnCall(supabase: any, args: any, callLog: any) {
  const {
    first_name,
    last_name,
    dob,
    phone,
    email,
    address,
    city,
    state,
    zip,
    insurance_provider,
    insurance_id,
    insurance_group,
  } = args || {};

  if (!first_name || !last_name || !dob || !phone || !email) {
    return {
      success: false,
      error:
        'Missing required fields. Please collect first name, last name, date of birth, phone, and email before creating a patient.',
    };
  }

  const clinicId = callLog.clinic_id || DEFAULT_CLINIC_ID;

  // Try to find an existing active patient in this clinic by phone/email so we do not create duplicates.
  const orParts: string[] = [];
  if (phone) orParts.push(`phone.eq.${phone}`);
  if (email) orParts.push(`email.eq.${email}`);
  const orFilter = orParts.join(',');

  let existingPatientId: string | null = null;

  if (orFilter) {
    const { data: existingPatient, error: existingError } = await supabase
      .from('patients')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .or(orFilter)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error('createPatientOnCall: existing patient lookup error', existingError);
      return {
        success: false,
        error: 'Failed to check existing patient records. Please try again or contact the clinic.',
      };
    }

    if (existingPatient?.id) {
      existingPatientId = existingPatient.id;
    }
  }

  const patientPayload = {
    clinic_id: clinicId,
    first_name: String(first_name).trim(),
    last_name: String(last_name).trim(),
    dob,
    phone,
    email,
    address: address || null,
    city: city || null,
    state: state || null,
    zip: zip || null,
    insurance_provider: insurance_provider || null,
    insurance_id: insurance_id || null,
    insurance_group: insurance_group || null,
    is_active: true,
  };

  let patientId: string | null = existingPatientId;

  if (existingPatientId) {
    const { data: updated, error: updateError } = await supabase
      .from('patients')
      .update(patientPayload)
      .eq('id', existingPatientId)
      .select('id')
      .maybeSingle();

    if (updateError || !updated) {
      console.error('createPatientOnCall: patient update error', updateError);
      return {
        success: false,
        error: 'Failed to update existing patient record.',
      };
    }

    patientId = updated.id;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('patients')
      .insert(patientPayload)
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error('createPatientOnCall: patient insert error', insertError);
      return {
        success: false,
        error: 'Failed to create patient record.',
      };
    }

    patientId = inserted.id;
  }

  if (!patientId) {
    return {
      success: false,
      error: 'Unable to determine patient record after creation.',
    };
  }

  try {
    await supabase
      .from('call_logs')
      .update({
        patient_id: patientId,
        clinic_id: clinicId,
        patient_validated: true,
      })
      .eq('id', callLog.id);
  } catch (updateCallErr) {
    console.error('createPatientOnCall: failed to update call_logs with patient_id', updateCallErr);
  }

  return {
    success: true,
    patient_id: patientId,
    message: 'Patient record created or updated successfully.',
  };
}

async function verifyInsurance(supabase: any, args: any, callLog: any) {
  const { patient_id } = args;

  // Get full insurance details from patient record
  const { data: patient, error } = await supabase
    .from('patients')
    .select('insurance_provider, insurance_id, insurance_group')
    .eq('id', patient_id)
    .eq('is_active', true)
    .single();

  if (error) throw error;

  const hasProvider = !!patient?.insurance_provider;
  const hasId = !!patient?.insurance_id;
  const hasGroup = !!patient?.insurance_group;
  const verified = hasProvider && hasId;

  if (verified) {
    await supabase
      .from('call_logs')
      .update({ insurance_verified: true })
      .eq('id', callLog.id);
  }

  return {
    verified,
    insurance_provider: patient?.insurance_provider || null,
    insurance_id: patient?.insurance_id || null,
    insurance_group: patient?.insurance_group || null,
    message: verified
      ? `Insurance verified: ${patient.insurance_provider}`
      : 'No insurance information on file for this patient.'
  };
}

async function checkAvailability(supabase: any, args: any, callLog: any) {
  const { provider_name, provider_id, date, appointment_type, duration } = args;

  // Date validation: reject past dates
  if (isDateTimeInPast(date)) {
    return {
      available_slots: [],
      message: 'The requested date is in the past. Please choose today or a future date.'
    };
  }

  // Resolve provider name - use provider_name if given, otherwise look up by ID
  let resolvedProviderName = provider_name;
  if (!resolvedProviderName && provider_id) {
    const { data: prov } = await supabase
      .from('providers')
      .select('name')
      .eq('id', provider_id)
      .eq('is_active', true)
      .single();
    if (!prov) {
      return { available_slots: [], message: 'Provider not found or inactive.' };
    }
    resolvedProviderName = prov.name;
  }

  if (!resolvedProviderName) {
    return { available_slots: [], message: 'Please specify a provider name.' };
  }

  try {
    const result = await sharedCheckAvailability(
      resolvedProviderName,
      date,
      appointment_type,
      duration || 30
    );

    // Filter out past time slots if the date is today
    let slots = result.available_slots;
    if (isToday(date)) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      slots = slots.filter(slot => {
        const [h, m] = slot.split(':').map(Number);
        return (h * 60 + m) > nowMinutes;
      });
    }

    return {
      provider_id: result.provider_id,
      provider_name: result.provider_name,
      date: result.date,
      available_slots: slots.map(time => ({ time, duration: duration || 30 })),
      total_slots: slots.length,
      message: slots.length > 0
        ? `Found ${slots.length} available slot(s) for ${result.provider_name} on ${date}.`
        : `No available slots for ${result.provider_name} on ${date}. Please try another date.`
    };
  } catch (err) {
    return {
      available_slots: [],
      message: err.message || 'Could not check availability.'
    };
  }
}

async function bookAppointment(supabase: any, args: any, callLog: any) {
  const { patient_id, provider_id, appointment_date, start_time, duration, appointment_type, reason, notes } = args;

  // Past date/time validation
  if (isDateTimeInPast(appointment_date, start_time)) {
    return {
      success: false,
      error: 'Cannot book an appointment in the past. Please choose a future date and time.'
    };
  }

  const result = await sharedBookAppointment({
    patient_id,
    provider_id,
    appointment_date,
    start_time,
    appointment_type: appointment_type || 'consultation',
    reason,
    duration: duration || 30,
    notes,
  });

  if (result.success && result.appointment_id) {
    // Update call log with appointment info
    await supabase
      .from('call_logs')
      .update({
        appointment_id: result.appointment_id,
        appointment_booked: true
      })
      .eq('id', callLog.id);
  }

  return {
    success: result.success,
    appointment_id: result.appointment_id,
    confirmation_number: result.confirmation_number,
    appointment_date,
    start_time,
    error: result.error,
    message: result.success
      ? `Appointment booked! Confirmation number: ${result.confirmation_number}`
      : result.error
  };
}

// === Date/Time Validation Helpers ===

function isDateTimeInPast(date: string, time?: string): boolean {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  // Date is before today
  if (date < todayStr) return true;
  
  // Date is today - check time
  if (time && date === todayStr) {
    const [h, m] = time.split(':').map(Number);
    const slotMinutes = h * 60 + m;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return slotMinutes <= nowMinutes;
  }
  
  return false;
}

function isToday(date: string): boolean {
  return date === new Date().toISOString().split('T')[0];
}

async function updateWorkflowStatus(supabase: any, callLogId: string, activityType: string, status: string) {
  const { data: callLog } = await supabase
    .from('call_logs')
    .select('workflow_status')
    .eq('id', callLogId)
    .single();

  if (!callLog) return;

  const workflowStatus = callLog.workflow_status || {};

  // Map activity type to workflow step
  const stepMap: any = {
    'greeting': 'greeting',
    'patient_lookup': 'validation',
    'insurance_check': 'insurance',
    'availability_check': 'availability',
    'booking': 'booking',
    'validation': 'validation'
  };

  const step = stepMap[activityType];
  if (step) {
    workflowStatus[step] = status;

    // If this step completed, mark next step as in_progress
    if (status === 'completed') {
      const steps = ['greeting', 'validation', 'insurance', 'availability', 'booking', 'confirmation'];
      const currentIndex = steps.indexOf(step);
      if (currentIndex >= 0 && currentIndex < steps.length - 1) {
        const nextStep = steps[currentIndex + 1];
        if (workflowStatus[nextStep] === 'pending') {
          workflowStatus[nextStep] = 'in_progress';
        }
      }
    }

    await supabase
      .from('call_logs')
      .update({ workflow_status: workflowStatus })
      .eq('id', callLogId);
  }
}

async function handleConversationEnded(supabase: any, event: ElevenLabsWebhookEvent) {
  console.log('Conversation ended:', event.conversation_id);

  // Load the call log so we can both update it and derive lead information.
  const { data: callLog } = await supabase
    .from('call_logs')
    .select('id, clinic_id, patient_id, from_number, metadata, appointment_id, appointment_booked')
    .eq('elevenlabs_conversation_id', event.conversation_id)
    .single();

  if (!callLog) {
    console.error('handleConversationEnded: call log not found for conversation', event.conversation_id);
    return;
  }

  // Update call log status/timing and derive a simple outcome
  const derivedOutcome =
    (callLog.appointment_id != null || callLog.appointment_booked === true)
      ? 'booked'
      : 'no-booking';

  await supabase
    .from('call_logs')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      duration: event.data.duration || 0,
      outcome: derivedOutcome,
    })
    .eq('id', callLog.id);

  // Update elevenlabs_conversations
  await supabase
    .from('elevenlabs_conversations')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      analysis: event.data.analysis || {},
      evaluation: event.data.evaluation || {}
    })
    .eq('conversation_id', event.conversation_id);

  // If this call was for an appointment reminder, update the reminder record based on outcome.
  try {
    const callMetadata = (callLog.metadata || {}) as Record<string, unknown>;
    const reminderId = callMetadata.reminder_id as string | undefined;

    // Also check the outbound_call_queue for reminder metadata
    let resolvedReminderId = reminderId;
    if (!resolvedReminderId) {
      const { data: queueItem } = await supabase
        .from('outbound_call_queue')
        .select('metadata')
        .eq('elevenlabs_conversation_id', event.conversation_id)
        .maybeSingle();
      if (queueItem?.metadata?.reminder_id) {
        resolvedReminderId = queueItem.metadata.reminder_id as string;
      }
    }

    if (resolvedReminderId) {
      // Determine response from conversation analysis
      const analysis = event.data?.analysis || {};
      const summary = (analysis.transcript_summary || analysis.summary || '').toLowerCase();
      let reminderResponse: string | null = null;

      if (summary.includes('confirm') || summary.includes('yes') || summary.includes('attend')) {
        reminderResponse = 'confirmed';
      } else if (summary.includes('cancel') || summary.includes('not coming') || summary.includes('decline')) {
        reminderResponse = 'cancelled';
      } else if (summary.includes('reschedule') || summary.includes('different time') || summary.includes('another time')) {
        reminderResponse = 'reschedule';
      }

      const callOutcome = derivedOutcome === 'booked' ? 'confirmed' : (reminderResponse || null);
      const reminderStatus = callOutcome ? 'responded' : 'sent';

      await supabase
        .from('reminders')
        .update({
          status: reminderStatus,
          response: callOutcome,
          sent_at: callOutcome ? undefined : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', resolvedReminderId);

      console.log('handleConversationEnded: updated reminder', resolvedReminderId, 'status:', reminderStatus, 'response:', callOutcome);
    }
  } catch (reminderErr) {
    console.error('handleConversationEnded: failed to update reminder status', reminderErr);
  }

  // ── Cost & usage sync: fetch actual token/cost data directly from ElevenLabs API ──
  // This is done eagerly (no retries) because metadata is available as soon as the call ends.
  try {
    const elevenLabsApiKeyForCost = await getElevenLabsApiKey(DEFAULT_CLINIC_ID);
    if (event.conversation_id) {
      const costRes = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${event.conversation_id}`,
        { headers: { 'xi-api-key': elevenLabsApiKeyForCost } }
      );
      if (costRes.ok) {
        const costConvData = await costRes.json();
        const meta = costConvData.metadata || {};
        const lmTokensIn = meta.lm_tokens_in || 0;
        const lmTokensOut = meta.lm_tokens_out || 0;
        const ttsChars = meta.tts_characters_used || 0;
        const costUsd = typeof meta.cost === 'number' ? meta.cost : 0;
        const durationSecs = meta.call_duration_secs || event.data?.duration || 0;
        const agentName = meta.agent_name || null;

        // Store actual ElevenLabs usage in elevenlabs_conversations
        await supabase
          .from('elevenlabs_conversations')
          .update({
            lm_tokens_in: lmTokensIn,
            lm_tokens_out: lmTokensOut,
            tts_characters_used: ttsChars,
            elevenlabs_cost_usd: costUsd,
            agent_name: agentName,
            call_duration_secs: durationSecs,
            usage_synced_at: new Date().toISOString(),
          })
          .eq('conversation_id', event.conversation_id);

        // Upsert cost_logs with actual API cost (replaces any estimated entry)
        const clinicIdForCost = callLog.clinic_id || DEFAULT_CLINIC_ID;
        await supabase
          .from('cost_logs')
          .upsert({
            clinic_id: clinicIdForCost,
            call_log_id: callLog.id,
            service_provider: 'elevenlabs',
            service_type: 'voice_agent',
            quantity: ttsChars,
            unit: 'characters',
            unit_cost: ttsChars > 0 ? costUsd / ttsChars : 0,
            total_cost: costUsd,
            metadata: {
              lm_tokens_in: lmTokensIn,
              lm_tokens_out: lmTokensOut,
              tts_characters_used: ttsChars,
              agent_id: event.agent_id,
              agent_name: agentName,
              conversation_id: event.conversation_id,
              call_duration_secs: durationSecs,
              currency: meta.currency || 'USD',
              source: 'elevenlabs_api',
            },
          }, { onConflict: 'call_log_id,service_provider' });

        console.log(
          'handleConversationEnded: synced usage — tokens_in:', lmTokensIn,
          'tokens_out:', lmTokensOut, 'tts_chars:', ttsChars, 'cost_usd:', costUsd
        );
      } else {
        console.warn('handleConversationEnded: cost sync API call failed', costRes.status);
      }
    }
  } catch (costErr) {
    console.error('handleConversationEnded: cost sync error', costErr);
  }

  // ── Post-call transcript sync: fetch complete transcript from ElevenLabs API ──
  // Phone call transcripts may not be available immediately, so retry with delays.
  try {
    const elevenLabsApiKey = await getElevenLabsApiKey(DEFAULT_CLINIC_ID);
    if (event.conversation_id) {
      const delays = [10_000, 30_000, 60_000]; // 10s, 30s, 60s
      let synced = false;

      for (let attempt = 0; attempt < delays.length; attempt++) {
        // Wait before attempting (ElevenLabs needs time to process phone call transcripts)
        console.log(`handleConversationEnded: waiting ${delays[attempt] / 1000}s before transcript fetch attempt ${attempt + 1}/${delays.length}`);
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));

        try {
          const transcriptRes = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversations/${event.conversation_id}`,
            { headers: { 'xi-api-key': elevenLabsApiKey } }
          );

          if (transcriptRes.ok) {
            const convData = await transcriptRes.json();
            if (convData.transcript?.length) {
              const fullTranscript = convData.transcript.map((t: any) => ({
                role: t.role === 'agent' ? 'agent' : 'user',
                message: t.message,
                timestamp: t.time_in_call_secs?.toString(),
              }));
              await supabase
                .from('call_logs')
                .update({ transcript: JSON.stringify(fullTranscript) })
                .eq('id', callLog.id);
              console.log('handleConversationEnded: synced full transcript with', fullTranscript.length, 'messages on attempt', attempt + 1);
              synced = true;
              break;
            } else {
              console.log('handleConversationEnded: transcript empty on attempt', attempt + 1, '— will retry');
            }
          } else {
            const errText = await transcriptRes.text();
            console.warn(`handleConversationEnded: transcript fetch attempt ${attempt + 1} failed (${transcriptRes.status}):`, errText);
          }
        } catch (fetchErr) {
          console.warn(`handleConversationEnded: transcript fetch attempt ${attempt + 1} error:`, (fetchErr as Error).message);
        }
      }

      if (!synced) {
        console.error('handleConversationEnded: failed to sync transcript after all retry attempts for', event.conversation_id);
      }
    }
  } catch (transcriptErr) {
    console.error('handleConversationEnded: transcript sync error', transcriptErr);
  }

  // Safety net: ensure there is a lead in the pipeline for this inbound call.
  try {
    const clinicId = callLog.clinic_id || DEFAULT_CLINIC_ID;
    const existingMetadata = (callLog.metadata || {}) as Record<string, unknown>;

    // If a lead is already linked, we are done.
    if (existingMetadata.lead_id) {
      return;
    }

    let leadId: string | null = null;

    // If we know which patient this call belongs to, prefer creating/updating a lead for that patient.
    if (callLog.patient_id) {
      const { data: patient } = await supabase
        .from('patients')
        .select('first_name, last_name, phone, email')
        .eq('id', callLog.patient_id)
        .single();

      const orParts: string[] = [];
      if (callLog.patient_id) {
        orParts.push(`patient_id.eq.${callLog.patient_id}`);
      }
      if (patient?.phone) {
        orParts.push(`phone.eq.${patient.phone}`);
      }
      if (patient?.email) {
        orParts.push(`email.eq.${patient.email}`);
      }
      const orFilter = orParts.join(',');

      if (orFilter) {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('clinic_id', clinicId)
          .or(orFilter)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingLead) {
          leadId = existingLead.id;
        }
      }

      if (!leadId && patient) {
        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert({
            first_name: patient.first_name,
            last_name: patient.last_name,
            phone: patient.phone || null,
            email: patient.email || null,
            source: 'phone',
            status: 'follow_up',
            clinic_id: clinicId,
            patient_id: callLog.patient_id,
            notes: 'Inbound call — follow-up required after AI conversation',
            metadata: { call_log_id: callLog.id },
          })
          .select('id')
          .single();

        if (leadError) {
          console.error('elevenlabs-webhook: failed to create follow-up lead on conversation end', leadError);
        } else if (newLead) {
          console.log('elevenlabs-webhook: follow-up lead created on conversation end', newLead.id);
          leadId = newLead.id;
        }
      }
    } else if (callLog.from_number) {
      // No patient attached; fall back to a phone-only lead if we do not already have one.
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('phone', callLog.from_number)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingLead) {
        leadId = existingLead.id;
      } else {
        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert({
            first_name: 'Unknown',
            last_name: 'Caller',
            phone: callLog.from_number,
            email: null,
            source: 'phone',
            status: 'new',
            clinic_id: clinicId,
            notes: 'Inbound call from unknown caller — captured for follow-up',
            metadata: { call_log_id: callLog.id },
          })
          .select('id')
          .single();

        if (leadError) {
          console.error('elevenlabs-webhook: failed to create phone-only lead on conversation end', leadError);
        } else if (newLead) {
          console.log('elevenlabs-webhook: phone-only lead created on conversation end', newLead.id);
          leadId = newLead.id;
        }
      }
    } else {
      // Third branch: no patient_id AND no from_number — create a completely anonymous
      // placeholder lead so the call is still surfaced in Lead Management.
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          first_name: 'Unknown',
          last_name: 'Caller',
          phone: null,
          email: null,
          source: 'phone',
          status: 'new',
          clinic_id: clinicId,
          notes: `Inbound call — no caller ID available (conversation: ${event.conversation_id})`,
          metadata: { call_log_id: callLog.id, elevenlabs_conversation_id: event.conversation_id },
        })
        .select('id')
        .single();

      if (leadError) {
        console.error('elevenlabs-webhook: failed to create anonymous lead on conversation end', leadError);
      } else if (newLead) {
        console.log('elevenlabs-webhook: anonymous lead created on conversation end', newLead.id);
        leadId = newLead.id;
      }
    }

    // If we created or found a lead, make sure the call log metadata points to it.
    if (leadId) {
      await supabase
        .from('call_logs')
        .update({
          metadata: { ...existingMetadata, lead_id: leadId },
        })
        .eq('id', callLog.id);
    }
  } catch (leadErr) {
    console.error('elevenlabs-webhook: error ensuring lead on conversation end', leadErr);
  }

  // Update the outbound_call_queue record if this was an outbound registration call.
  // The conversation_id was stored in metadata when the call was initiated.
  try {
    let queueItem: { id: string; attempt_count: number | null } | null = null;

    // Primary lookup: metadata.elevenlabs_conversation_id (for newly-initiated calls)
    const { data: byMetadata } = await supabase
      .from('outbound_call_queue')
      .select('id, attempt_count')
      .filter('metadata->>elevenlabs_conversation_id', 'eq', event.conversation_id)
      .maybeSingle();

    if (byMetadata) {
      queueItem = byMetadata;
    } else {
      // Fallback: go via call_logs to find call_sid, then map back to queue item.
      const { data: callLogForConv } = await supabase
        .from('call_logs')
        .select('call_sid')
        .eq('elevenlabs_conversation_id', event.conversation_id)
        .maybeSingle();

      if (callLogForConv?.call_sid) {
        const { data: byCallSid } = await supabase
          .from('outbound_call_queue')
          .select('id, attempt_count')
          .eq('call_sid', callLogForConv.call_sid)
          .maybeSingle();
        if (byCallSid) {
          queueItem = byCallSid;
        }
      }
    }

    if (queueItem) {
      await supabase
        .from('outbound_call_queue')
        .update({
          status: 'completed',
          outcome: 'completed',
          last_attempt_at: new Date().toISOString(),
          attempt_count: (queueItem.attempt_count || 0) + 1,
        })
        .eq('id', queueItem.id);
      console.log('Updated outbound_call_queue on conversation end:', queueItem.id);
    }
  } catch (err) {
    console.error('Failed to update outbound_call_queue on conversation end:', err);
  }
}

async function handleConversationError(supabase: any, event: ElevenLabsWebhookEvent) {
  console.error('Conversation error:', event.data);

  const endedAt = new Date().toISOString();

  // Fetch started_at to compute duration
  const { data: callLogRecord } = await supabase
    .from('call_logs')
    .select('started_at')
    .eq('elevenlabs_conversation_id', event.conversation_id)
    .maybeSingle();

  const startedAt = callLogRecord?.started_at;
  const duration = startedAt
    ? Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
    : null;

  // Update call log
  await supabase
    .from('call_logs')
    .update({
      status: 'failed',
      ended_at: endedAt,
      ...(duration !== null ? { duration } : {}),
    })
    .eq('elevenlabs_conversation_id', event.conversation_id);

  // Update elevenlabs_conversations
  await supabase
    .from('elevenlabs_conversations')
    .update({
      status: 'failed',
      metadata: { error: event.data }
    })
    .eq('conversation_id', event.conversation_id);

  // Mark outbound_call_queue record as failed
  try {
    let queueItem: { id: string; attempt_count: number | null } | null = null;

    // Primary lookup by metadata.elevenlabs_conversation_id
    const { data: byMetadata } = await supabase
      .from('outbound_call_queue')
      .select('id, attempt_count')
      .filter('metadata->>elevenlabs_conversation_id', 'eq', event.conversation_id)
      .maybeSingle();

    if (byMetadata) {
      queueItem = byMetadata;
    } else {
      // Fallback via call_logs.call_sid
      const { data: callLogForConv } = await supabase
        .from('call_logs')
        .select('call_sid')
        .eq('elevenlabs_conversation_id', event.conversation_id)
        .maybeSingle();

      if (callLogForConv?.call_sid) {
        const { data: byCallSid } = await supabase
          .from('outbound_call_queue')
          .select('id, attempt_count')
          .eq('call_sid', callLogForConv.call_sid)
          .maybeSingle();
        if (byCallSid) {
          queueItem = byCallSid;
        }
      }
    }

    if (queueItem) {
      await supabase
        .from('outbound_call_queue')
        .update({
          status: 'failed',
          outcome: 'call_failed',
          last_attempt_at: new Date().toISOString(),
          attempt_count: (queueItem.attempt_count || 0) + 1,
        })
        .eq('id', queueItem.id);
    }
  } catch (err) {
    console.error('Failed to update outbound_call_queue on conversation error:', err);
  }
}
