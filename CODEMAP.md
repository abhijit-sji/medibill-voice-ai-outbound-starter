# Code Map — Voice AI Outbound Module

This document shows how the source files in the voice-ai-outbound module relate to one another. Arrows indicate import / invocation direction.

---

## Frontend Dependency Graph

```
src/pages/ConversationalAgent.tsx
│
├── src/components/conversational-agent/AgentListSidebar.tsx
│   └── src/integrations/supabase/client.ts        (direct Supabase query — agent list)
│
├── src/components/conversational-agent/AgentConfigurationTab.tsx
│   ├── src/services/elevenlabs.service.ts
│   │   └── src/integrations/supabase/client.ts    (supabase.functions.invoke)
│   └── src/integrations/supabase/client.ts        (direct DB update)
│
├── src/components/conversational-agent/OutboundAgentConfigTab.tsx
│   └── src/integrations/supabase/client.ts        (outbound_agent_settings table)
│
├── src/components/conversational-agent/AgentTestingTab.tsx
│   └── src/services/elevenlabs.service.ts
│       └── src/integrations/supabase/client.ts    (invoke elevenlabs-conversation-token)
│
├── src/components/conversational-agent/CallAuditTab.tsx
│   └── src/integrations/supabase/client.ts        (call_logs + cost_logs query)
│
├── src/components/conversational-agent/LiveMonitoringTab.tsx
│   ├── src/hooks/useRealtimeAgentActivity.ts
│   │   └── src/integrations/supabase/client.ts    (Realtime subscription: agent_activity_logs)
│   └── src/hooks/useRealtimeCalls.ts
│       └── src/integrations/supabase/client.ts    (Realtime subscription: call_logs)
│
└── src/components/conversational-agent/CreateAgentDialog.tsx
    └── src/services/elevenlabs.service.ts
        └── src/integrations/supabase/client.ts    (invoke create-elevenlabs-agent)

src/pages/ElevenLabsConfiguration.tsx
└── src/integrations/supabase/client.ts            (integration_settings table read/write)

src/pages/OutboundCalls.tsx
└── src/integrations/supabase/client.ts            (invoke start-outbound-appointment-call;
                                                    outbound_call_queue table query)

src/pages/OutboundAgent.tsx
└── src/integrations/supabase/client.ts            (outbound_agent_settings;
                                                    agent_run_logs table query;
                                                    invoke outbound-call-agent)
```

---

## Service Layer

```
src/services/elevenlabs.service.ts
│
├── createElevenLabsAgent()
│   └── supabase.functions.invoke('create-elevenlabs-agent', { body: {...} })
│
├── syncElevenLabsAgent()
│   └── supabase.functions.invoke('sync-elevenlabs-agent', { body: { agent_id } })
│
├── getElevenLabsAgent()
│   └── supabase.functions.invoke('get-elevenlabs-agent', { body: { agent_id } })
│
├── getConversationToken()
│   └── supabase.functions.invoke('elevenlabs-conversation-token', { body: { agent_id } })
│
└── getConversationData() / getConversationTranscript()
    └── supabase.functions.invoke('get-elevenlabs-conversation', ...)

src/services/elevenlabs-voice-costs.service.ts
└── supabase.from('cost_logs').select(...)         (filter: service = 'elevenlabs')
```

---

## Hooks

```
src/hooks/useElevenLabsVoiceCosts.ts
└── src/services/elevenlabs-voice-costs.service.ts
    └── src/integrations/supabase/client.ts

src/hooks/useRealtimeAgentActivity.ts
└── src/integrations/supabase/client.ts
    └── supabase.channel('agent_activity_logs').on('postgres_changes', ...)

src/hooks/useRealtimeCalls.ts
└── src/integrations/supabase/client.ts
    └── supabase.channel('call_logs').on('postgres_changes', ...)
```

---

## Backend: Edge Function Dependency Graph

```
supabase/functions/start-outbound-appointment-call/index.ts
│
├── supabase/functions/shared/integration-settings.ts  (Twilio credentials)
├── outbound_agent_settings (Supabase DB query)
└── Twilio REST API  →  calls back to:
        supabase/functions/elevenlabs-call-handler/index.ts
        supabase/functions/call-status-callback/index.ts

supabase/functions/elevenlabs-call-handler/index.ts
│
├── supabase/functions/shared/elevenlabs-key.ts
│   └── integration_settings (DB query: integration_name = 'elevenlabs')
│
├── integration_settings (DB query: integration_name = 'twilio')
├── outbound_agent_settings (DB query)
└── Returns TwiML → ElevenLabs WebSocket  →  fires:
        supabase/functions/elevenlabs-webhook/index.ts

supabase/functions/elevenlabs-webhook/index.ts
│
├── supabase/functions/shared/patient-lookup.ts
│   └── patients, appointments (DB queries)
│
├── supabase/functions/shared/availability.ts
│   └── providers, appointments, provider_availability_exceptions (DB queries)
│
├── supabase/functions/shared/booking.ts
│   └── appointments (DB INSERT)
│
├── supabase/functions/shared/elevenlabs-key.ts
├── call_logs (DB UPSERT / UPDATE)
├── cost_logs (DB INSERT)
├── ai_interactions (DB INSERT)
└── agent_activity_logs (DB INSERT)

supabase/functions/elevenlabs-conversation-token/index.ts
└── supabase/functions/shared/elevenlabs-key.ts
    └── ElevenLabs API: GET /v1/convai/conversation/token?agent_id=...

supabase/functions/create-elevenlabs-agent/index.ts
└── supabase/functions/shared/elevenlabs-key.ts
    └── ElevenLabs API: POST /v1/convai/agents

supabase/functions/sync-elevenlabs-agent/index.ts
└── supabase/functions/shared/elevenlabs-key.ts
    └── ElevenLabs API: PATCH /v1/convai/agents/<id>
    └── ai_agent_configurations (DB SELECT — reads local config to push)

supabase/functions/get-elevenlabs-agent/index.ts
└── supabase/functions/shared/elevenlabs-key.ts
    └── ElevenLabs API: GET /v1/convai/agents/<id>

supabase/functions/outbound-call-agent/index.ts
│
├── supabase/functions/shared/integration-settings.ts
├── outbound_agent_settings (DB SELECT)
├── outbound_call_queue (DB SELECT + UPDATE)
├── agent_run_logs (DB INSERT + UPDATE)
└── Internal fetch → start-outbound-appointment-call
                   → send-sms-reminder (for recall type)
```

---

## Shared Utilities Used by Outbound Functions

```
supabase/functions/shared/
│
├── elevenlabs-key.ts
│   └── getElevenLabsApiKey()
│       └── integration_settings (DB) → ELEVENLABS_API_KEY (env fallback)
│
├── integration-settings.ts
│   └── getIntegrationSettings(name)
│       └── integration_settings (DB)
│
├── patient-lookup.ts
│   └── findPatient(name, dob, phone)
│   └── findPatientByPhone(phone)
│       └── patients (DB)
│
├── availability.ts
│   └── checkAvailability(provider, date, type, duration)
│       └── providers, appointments, provider_availability_exceptions (DB)
│
├── booking.ts
│   └── bookAppointment(params)
│       └── appointments (DB INSERT)
│
└── call-logger.ts
    └── createCallLog(data)
    └── updateCallLog(id, data)
    └── logAIInteraction(data)
        └── call_logs, ai_interactions (DB)
```

---

## Database Tables Accessed by This Module

```
integration_settings         ← API keys and enabled flags (ElevenLabs, Twilio)
ai_agent_configurations      ← Agent config including ElevenLabs agent ID and voice settings
outbound_agent_settings      ← Outbound-specific settings (working hours, max attempts)
outbound_call_queue          ← Pending outbound calls awaiting processing
agent_run_logs               ← Log of each outbound-call-agent run
call_logs                    ← Call records (shared with inbound; ai_provider = 'elevenlabs')
cost_logs                    ← Per-call cost tracking (service = 'elevenlabs')
ai_interactions              ← Turn-by-turn conversation log
agent_activity_logs          ← Step-level workflow activity for live monitoring
elevenlabs_conversations     ← ElevenLabs conversation metadata
patients                     ← Patient lookup during calls
appointments                 ← Booking and availability checking
providers                    ← Provider availability checking
clinics                      ← Clinic name and configuration
```

---

## Key Type Definitions

```typescript
// src/services/elevenlabs.service.ts
interface ElevenLabsAgent {
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

interface ConversationData {
  conversation_id: string;
  agent_id: string;
  status: string;
  transcript: any[];
  started_at: string;
  ended_at?: string;
  analysis?: any;
}

// src/components/conversational-agent/AgentListSidebar.tsx
interface AgentListItem {
  id: string;
  agent_name: string;
  agent_type: string;
  elevenlabs_agent_id: string | null;
  is_active: boolean;
}
```
