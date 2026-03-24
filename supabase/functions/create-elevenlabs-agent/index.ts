import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getElevenLabsApiKey } from "../shared/elevenlabs-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Shared function/tool definitions for the ElevenLabs agent.
 *
 * These names MUST match what `elevenlabs-webhook` expects in
 * `executeFunction`:
 *   - get_current_datetime
 *   - send_registration_form
 *   - find_patient / lookup_patient
 *   - verify_insurance / check_insurance
 *   - check_availability / get_available_slots
 *   - book_appointment / schedule_appointment
 *
 * ElevenLabs will emit `conversation.function_call` events with
 * these names, which are then routed to our Supabase Edge
 * Function `elevenlabs-webhook`.
 */
const ELEVENLABS_FUNCTIONS = [
  {
    name: "log_transcript",
    description:
      "Log a transcript message for live monitoring. You MUST call this tool after every user message AND after every one of your own responses, passing the exact text and role ('user' or 'agent'). This is critical for real-time transcript display.",
    parameters: {
      type: "object",
      properties: {
        conversation_id: {
          type: "string",
          description: "The current conversation ID.",
        },
        role: {
          type: "string",
          description: "Who said this message: 'user' for the caller or 'agent' for you (the AI).",
          enum: ["user", "agent"],
        },
        message: {
          type: "string",
          description: "The exact text that was said.",
        },
      },
      required: ["conversation_id", "role", "message"],
    },
  },
  {
    name: "get_current_datetime",
    description:
      "Get the current date and time (clinic timezone). Use when discussing dates or times, e.g. 'what day is it?', 'can I book for today?', or to avoid booking in the past.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "send_registration_form",
    description:
      "For NEW patients only. Send a one-time registration form link to the patient's email. Collect first name, last name, email, and phone before calling. The link expires in 72 hours; after they complete the form they must call back to book.",
    parameters: {
      type: "object",
      properties: {
        first_name: {
          type: "string",
          description: "Patient first name.",
        },
        last_name: {
          type: "string",
          description: "Patient last name.",
        },
        email: {
          type: "string",
          description: "Patient email address where the registration form link will be sent.",
        },
        phone: {
          type: "string",
          description: "Patient phone number including country code.",
        },
      },
      required: ["first_name", "last_name", "email", "phone"],
    },
  },
  {
    name: "find_patient",
    description:
      "Find an existing patient by patient_id (if already known), name and date of birth, or phone number. For outbound calls, the patient_id may already be available in the conversation context — use it directly if provided.",
    parameters: {
      type: "object",
      properties: {
        patient_id: {
          type: "string",
          description: "Patient UUID if already known from conversation context or previous lookup. If provided, skips name/DOB search.",
        },
        first_name: {
          type: "string",
          description: "Patient first name (ask for spelling).",
        },
        last_name: {
          type: "string",
          description: "Patient last name (always confirm spelling).",
        },
        dob: {
          type: "string",
          description: "Date of birth in YYYY-MM-DD format.",
        },
        phone: {
          type: "string",
          description:
            "Phone number including country code. Used as a fallback lookup if name/DOB search fails.",
        },
      },
      required: [],
    },
  },
  {
    name: "create_patient",
    description:
      "Create a new patient record during a live call. Use ONLY for new patients after you have collected their basic details. " +
      "Required fields: first_name, last_name, dob (YYYY-MM-DD), phone, and email.",
    parameters: {
      type: "object",
      properties: {
        first_name: {
          type: "string",
          description: "Patient first name (ask for spelling and confirm).",
        },
        last_name: {
          type: "string",
          description: "Patient last name (ask for spelling and confirm).",
        },
        dob: {
          type: "string",
          description: "Date of birth in YYYY-MM-DD format.",
        },
        phone: {
          type: "string",
          description: "Patient phone number including area code.",
        },
        email: {
          type: "string",
          description: "Patient email address for confirmations and reminders.",
        }
      },
      required: ["first_name", "last_name", "dob", "phone", "email"],
    },
  },
  {
    name: "verify_insurance",
    description:
      "Verify insurance details for an existing patient. Use AFTER find_patient succeeds.",
    parameters: {
      type: "object",
      properties: {
        patient_id: {
          type: "string",
          description: "Patient UUID returned by find_patient.",
        },
      },
      required: ["patient_id"],
    },
  },
  {
    name: "check_availability",
    description:
      "Check available appointment slots for a provider on a given date.",
    parameters: {
      type: "object",
      properties: {
        provider_name: {
          type: "string",
          description:
            'Provider display name (for example: "Dr. Emily Chen"). Ask the caller which provider they prefer.',
        },
        provider_id: {
          type: "string",
          description:
            "Optional internal provider UUID if already known. If not provided, name will be used.",
        },
        date: {
          type: "string",
          description: "Appointment date in YYYY-MM-DD format.",
        },
        appointment_type: {
          type: "string",
          description:
            "Type of appointment (for example: Annual Physical, Sick Visit, Follow-Up).",
        },
        duration: {
          type: "number",
          description:
            "Duration in minutes. If not provided, the backend will default (typically 30).",
        },
      },
      required: ["provider_name", "date"],
    },
  },
  {
    name: "book_appointment",
    description:
      "Book an appointment after confirming date, time, provider, and reason with the patient.",
    parameters: {
      type: "object",
      properties: {
        patient_id: {
          type: "string",
          description:
            "Patient UUID from find_patient or patient creation flow.",
        },
        provider_id: {
          type: "string",
          description: "Provider UUID from check_availability result.",
        },
        appointment_date: {
          type: "string",
          description: "Date in YYYY-MM-DD format.",
        },
        start_time: {
          type: "string",
          description: "Start time in 24-hour HH:MM format (clinic local time).",
        },
        appointment_type: {
          type: "string",
          description:
            "Type of appointment (for example: Annual Physical, Sick Visit).",
        },
        reason: {
          type: "string",
          description: "Short reason for visit, in the caller's own words.",
        },
        duration: {
          type: "number",
          description:
            "Duration in minutes. If omitted, the backend will use a default.",
        },
        notes: {
          type: "string",
          description:
            "Optional internal notes for staff. Do not include sensitive or offensive language; summarize politely.",
        },
      },
      required: [
        "patient_id",
        "provider_id",
        "appointment_date",
        "start_time",
        "appointment_type",
      ],
    },
  },
  {
    name: "update_call_outcome",
    description:
      "Update real-time call outcomes on the live dashboard. " +
      "Call with patient_validated:true immediately after find_patient succeeds. " +
      "Call with insurance_verified:true immediately after verify_insurance succeeds. " +
      "Call with appointment_booked:true immediately after book_appointment succeeds. " +
      "Always include a brief outcome_notes summary.",
    parameters: {
      type: "object",
      properties: {
        patient_validated: { type: "boolean" },
        insurance_verified: { type: "boolean" },
        appointment_booked: { type: "boolean" },
        outcome_notes: {
          type: "string",
          description:
            "Brief summary, e.g. 'Patient John Smith verified, DOB confirmed'",
        },
      },
      required: [],
    },
  },
];

/**
 * Normalize the requested ElevenLabs TTS model based on language.
 *
 * ElevenLabs now requires that **English** agents use either
 * `eleven_turbo_v2` or `eleven_flash_v2`. If an English agent is
 * configured with an incompatible model (for example v2.5 or
 * multilingual models), the API will reject the request with:
 *
 *   "English Agents must use turbo or flash v2."
 *
 * To keep existing configs working, we:
 * - For English (`en`), coerce anything that is not an allowed
 *   model to `eleven_turbo_v2`.
 * - For non‑English, we keep the requested model when provided,
 *   and otherwise default to `eleven_multilingual_v2`.
 */
function normalizeTtsModel(model: string | undefined, language: string | undefined): string {
  const lang = (language || "en").toLowerCase();
  const requested = model || "";

  // English agents must use turbo or flash v2.
  if (lang === "en" || lang.startsWith("en-")) {
    if (requested === "eleven_turbo_v2" || requested === "eleven_flash_v2") {
      return requested;
    }
    // Fallback for any legacy / incompatible English configs
    return "eleven_turbo_v2";
  }

  // Non-English: keep explicit choice if present, otherwise use multilingual v2.
  if (requested) {
    return requested;
  }

  return "eleven_multilingual_v2";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, voice_id, model, first_message, system_prompt, language, voice_settings, agent_id: existingAgentId, llm_model, delete: deleteAgent, knowledge_base_ids, knowledge_base_docs } = await req.json();

    // Build knowledge_base entries — ElevenLabs requires { type, id, name }
    const VALID_KB_TYPES = ["file", "url", "text", "folder"];
    const buildKbEntries = () => {
      if (knowledge_base_docs?.length) {
        return knowledge_base_docs.map((doc: { id: string; name: string; type?: string }) => ({
          type: doc.type && VALID_KB_TYPES.includes(doc.type) ? doc.type : "file",
          id: doc.id,
          name: doc.name || doc.id,
        }));
      }
      if (knowledge_base_ids?.length) {
        return knowledge_base_ids.map((id: string) => ({ type: "file", id, name: id }));
      }
      return null;
    };

    const apiKey = await getElevenLabsApiKey();

    // Delete agent
    if (deleteAgent && existingAgentId) {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${existingAgentId}`,
        {
          method: "DELETE",
          headers: { "xi-api-key": apiKey },
        }
      );

      if (!response.ok && response.status !== 404 && response.status !== 403) {
        const errorText = await response.text();
        console.error("ElevenLabs delete error:", errorText);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to delete agent: ${errorText}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, deleted: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If updating an existing agent
    if (existingAgentId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';

      // Fetch current agent so we can merge — partial PATCH may not reliably update knowledge_base
      const getRes = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${existingAgentId}`,
        { headers: { "xi-api-key": apiKey } }
      );
      if (!getRes.ok) {
        const errText = await getRes.text();
        return new Response(
          JSON.stringify({ success: false, error: `Failed to fetch agent: ${errText}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const currentAgent = await getRes.json();
      const existingConvConfig = currentAgent.conversation_config || {};
      const existingAgentConfig = existingConvConfig.agent || {};
      const existingPrompt = existingAgentConfig.prompt || {};

      // Build merged conversation_config — preserve existing structure, override with our values
      const mergedPrompt = { ...existingPrompt };
      if (system_prompt !== undefined) mergedPrompt.prompt = system_prompt;
      if (llm_model !== undefined) mergedPrompt.llm = llm_model;

      const kbEntries = buildKbEntries();
      mergedPrompt.knowledge_base = kbEntries ?? [];

      const mergedAgentConfig = {
        ...existingAgentConfig,
        ...(Object.keys(mergedPrompt).length ? { prompt: mergedPrompt } : {}),
        ...(first_message !== undefined ? { first_message } : {}),
        ...(language !== undefined ? { language } : {}),
      };

      const mergedConvConfig = {
        ...Object.fromEntries(Object.entries(existingConvConfig).filter(([k]) => k !== "tool_ids" && k !== "tools")),
        agent: mergedAgentConfig,
        ...(voice_id && {
          tts: {
            voice_id,
            model_id: normalizeTtsModel(model, language),
            ...(voice_settings && {
              stability: voice_settings.stability,
              similarity_boost: voice_settings.similarity_boost,
              style: voice_settings.style,
            }),
          },
        }),
      };

      // Strip tool_ids from anywhere — ElevenLabs rejects "both tools and tool_ids"
      const stripToolIds = (obj: unknown): void => {
        if (obj && typeof obj === "object") {
          const o = obj as Record<string, unknown>;
          delete o.tool_ids;
          Object.values(o).forEach(stripToolIds);
        }
      };
      stripToolIds(mergedConvConfig);

      // Do NOT send tools — agent already has tools/tool_ids; sending both causes "both_tools_and_tool_ids_provided"
      const updateBody: Record<string, unknown> = {
        name: name ?? currentAgent.name,
        platform_settings: {
          webhook: {
            url: `${supabaseUrl}/functions/v1/elevenlabs-webhook`,
            events: ['conversation.started', 'conversation.ended', 'conversation.function_call', 'conversation.error'],
          },
        },
        conversation_config: mergedConvConfig,
      };

      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${existingAgentId}`,
        {
          method: "PATCH",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("ElevenLabs update error:", errorText);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to update agent: ${errorText}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ agent_id: existingAgentId, updated: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new agent
    const agentLanguage = language || "en";
    const normalizedModel = normalizeTtsModel(model, agentLanguage);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';

    const createBody = {
      name: name || "Clinic Voice Agent",
      // Top-level tools definition for ConvAI agents
      tools: ELEVENLABS_FUNCTIONS,
      // Webhook URL so ElevenLabs sends lifecycle events to our webhook handler
      platform_settings: {
        webhook: {
          url: `${supabaseUrl}/functions/v1/elevenlabs-webhook`,
          events: ['conversation.started', 'conversation.ended', 'conversation.function_call', 'conversation.error'],
        },
      },
      conversation_config: {
        agent: {
          prompt: {
            prompt: system_prompt || "",
            ...(llm_model ? { llm: llm_model } : {}),
            ...(buildKbEntries() ? { knowledge_base: buildKbEntries() } : {}),
          },
          first_message: first_message || "Hello! How can I help you today?",
          language: agentLanguage,
        },
        tts: {
          voice_id: voice_id || "EXAVITQu4vr4xnSDxMaL",
          model_id: normalizedModel,
          ...(voice_settings && {
            stability: voice_settings.stability ?? 0.5,
            similarity_boost: voice_settings.similarity_boost ?? 0.8,
            style: voice_settings.style ?? 0.0,
          }),
        },
        // Client events tell ElevenLabs which events to send back to us.
        client_events: [
          "user_transcript",
          "agent_response",
          "agent_response_correction",
        ],
        // Tools definition inside conversation_config for compatibility
        tools: ELEVENLABS_FUNCTIONS,
      },
    };

    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/agents/create",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs create error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create agent: ${errorText}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ agent_id: result.agent_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
