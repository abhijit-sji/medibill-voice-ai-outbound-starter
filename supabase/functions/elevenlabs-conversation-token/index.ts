import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getElevenLabsApiKey } from '../shared/elevenlabs-key.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let ELEVENLABS_API_KEY: string;
    try {
      ELEVENLABS_API_KEY = await getElevenLabsApiKey();
    } catch {
      return new Response(
        JSON.stringify({ error: "invalid_api_key", message: "ElevenLabs API key is not configured. Set it on the AI Providers page." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { agent_id } = await req.json();
    if (!agent_id) {
      return new Response(
        JSON.stringify({ error: "agent_not_found", message: "agent_id is required in the request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agent_id}`,
      {
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs token error:", response.status, errorText);

      // Parse error details
      let parsedMessage = errorText;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.detail?.message) {
          parsedMessage = parsed.detail.message;
        } else if (parsed.detail && typeof parsed.detail === "string") {
          parsedMessage = parsed.detail;
        }
      } catch {
        // keep raw text
      }

      // Classify the error
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ success: false, error: "invalid_api_key", message: "Your ElevenLabs API key is invalid or expired. Update it in Supabase Edge Function secrets.", details: parsedMessage }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402 || response.status === 429 || parsedMessage.toLowerCase().includes("quota")) {
        return new Response(
          JSON.stringify({ success: false, error: "quota_exceeded", message: parsedMessage, details: errorText }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 404) {
        return new Response(
          JSON.stringify({ success: false, error: "agent_not_found", message: `The ElevenLabs agent ID "${agent_id}" was not found. Check your Configuration tab.`, details: parsedMessage }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "elevenlabs_error", message: `ElevenLabs API error (${response.status}): ${parsedMessage}`, details: errorText }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ token: data.token }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating conversation token:", error);
    return new Response(
      JSON.stringify({ error: "server_error", message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
