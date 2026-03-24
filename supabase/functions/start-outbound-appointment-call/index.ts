
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationSettings } from "../shared/integration-settings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const DEFAULT_CLINIC_ID = "00000000-0000-0000-0000-000000000001";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { queue_item_id, phone_number, patient_id, lead_id: bodyLeadId } = body as {
      queue_item_id?: string;
      phone_number?: string;
      patient_id?: string;
      lead_id?: string;
    };

    let targetPhone = (phone_number || "").trim();
    let outboundQueueItem: any = null;
    let clinicId: string | null = null;
    let resolvedPatientId: string | null = patient_id || null;
    let resolvedLeadId: string | null = bodyLeadId || null;

    if (queue_item_id) {
      const { data, error } = await supabase
        .from("outbound_call_queue")
        .select("id, clinic_id, patient_id, lead_id, phone_number, call_type, metadata")
        .eq("id", queue_item_id)
        .maybeSingle();

      if (error) {
        console.error("start-outbound-appointment-call: failed to load queue item", error);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to load outbound queue item." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!data) {
        return new Response(
          JSON.stringify({ success: false, error: "Queue item not found." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      outboundQueueItem = data;
      clinicId = outboundQueueItem.clinic_id || DEFAULT_CLINIC_ID;
      targetPhone = targetPhone || (outboundQueueItem.phone_number || "").trim();
      resolvedPatientId = resolvedPatientId || outboundQueueItem.patient_id || null;
      resolvedLeadId = resolvedLeadId || outboundQueueItem.lead_id || null;
    }

    if (!targetPhone) {
      return new Response(
        JSON.stringify({ success: false, error: "A phone number is required to start an outbound call." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Look up the outbound agent configured in the database
    const { data: outboundAgent } = await supabase
      .from("outbound_agent_settings")
      .select("elevenlabs_agent_id")
      .eq("agent_type", "outbound_call")
      .limit(1)
      .maybeSingle();

    const outboundAgentId = outboundAgent?.elevenlabs_agent_id?.trim();

    if (!outboundAgentId) {
      console.error("start-outbound-appointment-call: No ElevenLabs outbound agent configured");
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "No ElevenLabs outbound agent configured. Please configure an outbound_call agent in the Admin Portal.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load ElevenLabs configuration (API key + agent phone number id linked to Twilio)
    const elevenlabsConfig = await getIntegrationSettings(
      "elevenlabs",
      clinicId || DEFAULT_CLINIC_ID,
    );
    const elevenlabsApiKey =
      (elevenlabsConfig as any).api_key || Deno.env.get("ELEVENLABS_API_KEY");
    const agentPhoneNumberId =
      (elevenlabsConfig as any).agent_phone_number_id ||
      (elevenlabsConfig as any).twilio_agent_phone_number_id;

    if (!elevenlabsApiKey || !agentPhoneNumberId) {
      console.error("start-outbound-appointment-call: Missing ElevenLabs configuration", {
        hasApiKey: !!elevenlabsApiKey,
        hasAgentPhoneNumberId: !!agentPhoneNumberId,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "ElevenLabs outbound calling is not fully configured. " +
            "Please set api_key and agent_phone_number_id in the ElevenLabs integration settings.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch patient details so we can inject them into the conversation context.
    // This allows the outbound agent to skip find_patient and proceed directly to booking.
    let patientContext: Record<string, string> = {};
    if (resolvedPatientId) {
      const { data: patientRecord } = await supabase
        .from("patients")
        .select("id, first_name, last_name, dob, phone, email, insurance_provider")
        .eq("id", resolvedPatientId)
        .maybeSingle();

      if (patientRecord) {
        patientContext = {
          patient_id: patientRecord.id,
          patient_first_name: patientRecord.first_name || "",
          patient_last_name: patientRecord.last_name || "",
          patient_dob: patientRecord.dob || "",
          patient_phone: patientRecord.phone || "",
          patient_email: patientRecord.email || "",
          patient_insurance: patientRecord.insurance_provider || "",
        };
        console.log("start-outbound-appointment-call: patient context loaded", {
          patient_id: patientRecord.id,
          name: `${patientRecord.first_name} ${patientRecord.last_name}`,
        });
      }
    }

    // Use ElevenLabs Twilio outbound-call API so they manage the media stream internally.
    // This avoids the WebSocket protocol mismatch (Twilio 31921) that occurs when pointing
    // a Twilio <Connect><Stream> directly at the ElevenLabs Convai WebSocket endpoint.
    const elevenlabsUrl = "https://api.elevenlabs.io/v1/convai/twilio/outbound-call";
    const elevenlabsBody: Record<string, unknown> = {
      agent_id: outboundAgentId,
      agent_phone_number_id: agentPhoneNumberId,
      to_number: targetPhone,
      metadata: {
        queue_item_id,
        clinic_id: clinicId,
        patient_id: resolvedPatientId,
      },
    };

    // Pass patient context as dynamic variables so the agent has patient info immediately
    if (Object.keys(patientContext).length > 0) {
      elevenlabsBody.dynamic_variables = patientContext;
      // Also pass as conversation_initiation_client_data for newer API versions
      elevenlabsBody.conversation_initiation_client_data = patientContext;
    }

    console.log("start-outbound-appointment-call: calling ElevenLabs outbound API", {
      agent_id: outboundAgentId,
      to_number: targetPhone,
    });

    const elevenlabsResponse = await fetch(elevenlabsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": String(elevenlabsApiKey),
      },
      body: JSON.stringify(elevenlabsBody),
    });

    const elevenlabsResult = await elevenlabsResponse.json().catch(() => ({} as any));

    if (!elevenlabsResponse.ok) {
      console.error(
        "start-outbound-appointment-call: ElevenLabs outbound-call error",
        elevenlabsResponse.status,
        elevenlabsResult,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: elevenlabsResult.message || "Failed to start outbound call via ElevenLabs.",
          elevenlabs_status: elevenlabsResponse.status,
          elevenlabs_detail: elevenlabsResult,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract identifiers from ElevenLabs response
    const conversationId = elevenlabsResult.conversation_id ?? null;
    const twilioCallSid =
      elevenlabsResult.twilio_call_sid ??
      elevenlabsResult.call_sid ??
      elevenlabsResult.call_id ??
      null;

    console.log("start-outbound-appointment-call: ElevenLabs call initiated", {
      conversation_id: conversationId,
      twilio_call_sid: twilioCallSid,
    });

    // Mark matching lead as "contacted" now that the outbound call is live.
    // Resolves by: explicit lead_id → patient_id → phone number.
    // We do NOT downgrade leads that are already "booked" or "lost".
    {
      const orParts: string[] = [];
      if (resolvedLeadId) orParts.push(`id.eq.${resolvedLeadId}`);
      if (resolvedPatientId) orParts.push(`patient_id.eq.${resolvedPatientId}`);
      if (targetPhone) orParts.push(`phone.eq.${targetPhone}`);

      if (orParts.length > 0) {
        const { error: leadErr } = await supabase
          .from("leads")
          .update({
            status: "contacted",
            last_contacted_at: new Date().toISOString(),
            last_auto_action: `Outbound call placed at ${new Date().toISOString()}`,
          })
          .or(orParts.join(","))
          .not("status", "in", '("booked","lost")');

        if (leadErr) {
          console.error("start-outbound-appointment-call: failed to update lead to contacted", leadErr);
        }
      }
    }

    // Update queue item with identifiers for tracking
    if (outboundQueueItem) {
      await supabase
        .from("outbound_call_queue")
        .update({
          call_sid: twilioCallSid,
          status: "in_progress",
          metadata: {
            ...(outboundQueueItem.metadata || {}),
            elevenlabs_conversation_id: conversationId,
            elevenlabs_outbound_result: elevenlabsResult,
            outbound_call_sid: twilioCallSid,
            clinic_id: clinicId,
            patient_id: resolvedPatientId,
          },
        })
        .eq("id", outboundQueueItem.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id: conversationId,
        call_sid: twilioCallSid,
        clinic_id: clinicId,
        patient_id: resolvedPatientId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("start-outbound-appointment-call: unexpected error", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Unexpected error while starting outbound appointment call.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
