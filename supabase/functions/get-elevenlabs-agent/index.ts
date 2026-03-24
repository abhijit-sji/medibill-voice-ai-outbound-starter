import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getElevenLabsApiKey } from "../shared/elevenlabs-key.ts";

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
    const { agent_id } = await req.json();

    if (!agent_id) {
      return new Response(
        JSON.stringify({ success: false, error: "agent_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = await getElevenLabsApiKey();

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agent_id}`,
      {
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to get agent: ${errorText}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const agent = await response.json();

    // Map ElevenLabs response to our interface format
    const convConfig = agent.conversation_config || {};
    const agentConfig = convConfig.agent || {};
    const promptConfig = agentConfig.prompt || {};
    const ttsConfig = convConfig.tts || {};

    const result: any = {
      agent_id: agent.agent_id,
      name: agent.name || "",
      description: agent.description,
      voice_id: ttsConfig.voice_id || "",
      model: ttsConfig.model_id || "eleven_turbo_v2_5",
      first_message: agentConfig.first_message || "",
      system_prompt: promptConfig.prompt || "",
      language: agentConfig.language || "en",
      llm_model: promptConfig.llm || "",
      settings: {
        stability: ttsConfig.stability ?? 0.5,
        similarity_boost: ttsConfig.similarity_boost ?? 0.8,
        style: ttsConfig.style ?? 0.0,
      },
      // Return the live knowledge_base documents attached to this agent on ElevenLabs
      knowledge_base: (promptConfig.knowledge_base || []).map((kb: any) => ({
        id: kb.id,
        name: kb.name || kb.id,
        type: kb.type || "file",
      })),
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

