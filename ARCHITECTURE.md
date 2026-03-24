# Architecture — Voice AI Outbound Module

## Overview

The voice-ai-outbound module uses ElevenLabs Conversational AI to make proactive outbound calls to patients. It supports appointment reminders, registration follow-ups, and custom AI outreach campaigns. All calls are placed via Twilio, with ElevenLabs supplying the natural-language conversation engine. Call metadata, transcripts, and costs are persisted to Supabase.

---

## System Components

### Frontend (React + Vite + TypeScript)

| Component                  | Location                                                             | Purpose                                                      |
|---------------------------|----------------------------------------------------------------------|--------------------------------------------------------------|
| `ConversationalAgent`      | `src/pages/ConversationalAgent.tsx`                                  | Main page at `/admin/conversational-agent` — agent management hub |
| `AgentListSidebar`         | `src/components/conversational-agent/AgentListSidebar.tsx`           | Lists all configured `ai_agent_configurations` records       |
| `AgentConfigurationTab`    | `src/components/conversational-agent/AgentConfigurationTab.tsx`      | Edit agent name, voice, system prompt, ElevenLabs settings   |
| `OutboundAgentConfigTab`   | `src/components/conversational-agent/OutboundAgentConfigTab.tsx`     | Configure outbound-specific agent ID and working hours        |
| `AgentTestingTab`          | `src/components/conversational-agent/AgentTestingTab.tsx`            | Live in-browser test conversation with the ElevenLabs agent   |
| `CallAuditTab`             | `src/components/conversational-agent/CallAuditTab.tsx`               | Browse and filter call history from `call_logs`              |
| `LiveMonitoringTab`        | `src/components/conversational-agent/LiveMonitoringTab.tsx`          | Real-time transcript and workflow status for active calls     |
| `CreateAgentDialog`        | `src/components/conversational-agent/CreateAgentDialog.tsx`          | Dialog to create a new agent via `create-elevenlabs-agent`   |
| `ElevenLabsConfiguration`  | `src/pages/ElevenLabsConfiguration.tsx`                              | API key and global ElevenLabs settings at `/admin/elevenlabs`|
| `OutboundCalls`            | `src/pages/OutboundCalls.tsx`                                        | Queue view and manual call trigger at `/outbound-calls`      |
| `OutboundAgent`            | `src/pages/OutboundAgent.tsx`                                        | Outbound agent run monitor at `/admin/outbound-agent`        |

### Service Layer

| File                                            | Responsibility                                                         |
|------------------------------------------------|------------------------------------------------------------------------|
| `src/services/elevenlabs.service.ts`            | Agent CRUD, conversation data retrieval, token generation              |
| `src/services/elevenlabs-voice-costs.service.ts`| Query `cost_logs` for ElevenLabs call cost reporting                   |

### State & Data Fetching

| File                                        | Responsibility                                              |
|--------------------------------------------|-------------------------------------------------------------|
| `src/hooks/useElevenLabsVoiceCosts.ts`     | React Query wrapper for ElevenLabs cost data                |
| `src/hooks/useRealtimeAgentActivity.ts`    | Supabase Realtime subscription to `agent_activity_logs`     |
| `src/hooks/useRealtimeCalls.ts`            | Supabase Realtime subscription to `call_logs`               |

### Supabase Edge Functions (Deno Runtime)

| Function                          | Trigger                               | Responsibility                                                      |
|----------------------------------|---------------------------------------|---------------------------------------------------------------------|
| `create-elevenlabs-agent`         | Frontend button (admin)               | POST to ElevenLabs API to create a new conversational agent         |
| `sync-elevenlabs-agent`           | Frontend save action                  | PATCH local config to ElevenLabs (keeps DB and API in sync)         |
| `get-elevenlabs-agent`            | Frontend config page load             | Fetch live agent config from ElevenLabs API                         |
| `elevenlabs-conversation-token`   | Frontend `AgentTestingTab`            | Generate a signed, short-lived conversation token for SDK use       |
| `elevenlabs-call-handler`         | Twilio webhook on call connect        | Detect inbound vs. outbound; return TwiML to connect ElevenLabs     |
| `elevenlabs-webhook`              | ElevenLabs webhook callbacks          | Handle conversation events; execute function calls; persist records  |
| `outbound-call-agent`             | pg_cron / manual trigger              | Poll `outbound_call_queue`; initiate voice or SMS for each item     |
| `start-outbound-appointment-call` | Frontend button / reminder system     | Resolve queue item, look up agent config, call Twilio to dial out   |

### ElevenLabs Conversational AI

ElevenLabs hosts the agent brain. When Twilio connects a call to the `elevenlabs-call-handler`, it receives TwiML containing a `<Connect><Stream>` pointing to ElevenLabs' WebSocket endpoint. ElevenLabs then:

1. Manages the full audio conversation (ASR → LLM → TTS)
2. Executes configured tools by posting webhook events to `elevenlabs-webhook`
3. Sends a `conversation.ended` event with the final transcript on call completion

### Twilio

Twilio handles:
- Placing outbound calls (`start-outbound-appointment-call` calls the Twilio API)
- Connecting call audio to the ElevenLabs WebSocket stream
- Posting `CallStatus` events to `call-status-callback` (shared with inbound)

---

## Data Flow

### 1. Admin Configures Agent

```
Admin UI (/admin/elevenlabs)
    │
    ├── Save API key → integration_settings table
    │
Admin UI (/admin/conversational-agent)
    │
    ├── Create agent → create-elevenlabs-agent → ElevenLabs API
    │                                           → ai_agent_configurations (DB)
    │
    └── Edit config → sync-elevenlabs-agent → ElevenLabs API (PATCH)
                                            → ai_agent_configurations (DB)
```

### 2. Outbound Call Initiated

```
Trigger: Frontend button OR reminder-scheduler pg_cron job
    │
    ▼
start-outbound-appointment-call
    │
    ├── Read outbound_call_queue item (if queue_item_id provided)
    ├── Look up outbound_agent_settings → elevenlabs_agent_id
    ├── Read Twilio credentials from integration_settings
    ├── POST to Twilio API: create outbound call
    │     statusCallback → call-status-callback
    │     url           → elevenlabs-call-handler?direction=outbound&agent_id=...
    │
    └── Twilio dials patient's phone number
```

### 3. ElevenLabs Handles Conversation

```
Twilio connects call audio
    │
    ▼
elevenlabs-call-handler (Twilio webhook)
    │
    ├── Detect direction=outbound from URL param
    ├── Look up outbound agent ID
    ├── Return TwiML:
    │     <Connect>
    │       <Stream url="wss://api.elevenlabs.io/v1/convai/...">
    │         <Parameter name="xi-agent-id" value="<agentId>" />
    │       </Stream>
    │     </Connect>
    │
    └── ElevenLabs conducts full conversation with patient
            │
            ├── Tool call: log_transcript → elevenlabs-webhook
            ├── Tool call: find_patient → elevenlabs-webhook → patient-lookup.ts
            ├── Tool call: check_availability → elevenlabs-webhook → availability.ts
            └── Tool call: book_appointment → elevenlabs-webhook → booking.ts
```

### 4. Transcript Stored

```
ElevenLabs fires conversation.ended webhook
    │
    ▼
elevenlabs-webhook
    │
    ├── Match elevenlabs_conversation_id → call_logs row
    ├── Store final transcript
    ├── Set outcome (booked / no-booking)
    ├── Update patient_validated, insurance_verified, appointment_booked flags
    └── Write cost record to cost_logs
```

### 5. Cost Logged

```
elevenlabs-webhook (conversation.ended)
    │
    └── INSERT cost_logs
          service         = 'elevenlabs'
          cost_type       = 'voice_minutes'
          amount          = <calculated from duration>
          call_log_id     = <call_logs.id>

call-status-callback (Twilio terminal status)
    │
    └── UPDATE call_logs
          status    = completed / failed / abandoned
          ended_at  = now()
          duration  = <seconds>
          outcome   = booked / no-booking / ...
```

---

## Shared Utilities

All edge functions in the outbound path use utilities from `supabase/functions/shared/`:

| Utility File            | Exports                                      | Used By                                          |
|------------------------|----------------------------------------------|--------------------------------------------------|
| `patient-lookup.ts`    | `findPatient`, `findPatientByPhone`           | `elevenlabs-webhook`, `voice-process`            |
| `availability.ts`      | `checkAvailability`                          | `elevenlabs-webhook`, `voice-stream`             |
| `booking.ts`           | `bookAppointment`                            | `elevenlabs-webhook`, `voice-stream`             |
| `call-logger.ts`       | `createCallLog`, `updateCallLog`, `logAIInteraction` | `voice-process`, `elevenlabs-webhook`    |
| `elevenlabs-key.ts`    | `getElevenLabsApiKey`                        | All `elevenlabs-*` functions                     |
| `integration-settings.ts`| `getIntegrationSettings`                  | `outbound-call-agent`, `start-outbound-appointment-call` |

---

## Security

- All admin-facing edge functions require a valid Supabase JWT (`Authorization: Bearer <token>`).
- Webhook-receiving functions (`elevenlabs-call-handler`, `elevenlabs-webhook`) have `verify_jwt = false` in `supabase/config.toml` to allow unauthenticated Twilio and ElevenLabs callbacks.
- The `SUPABASE_SERVICE_ROLE_KEY` is used only inside edge functions — never exposed to the browser.
- ElevenLabs API key is stored in `integration_settings` (DB) and/or `ELEVENLABS_API_KEY` (secret). The `getElevenLabsApiKey()` helper prefers the DB value.

---

## Constraints and Limits

| Constraint                  | Value / Notes                                                    |
|----------------------------|------------------------------------------------------------------|
| Max calls per agent run     | Configurable via `outbound_agent_settings.max_items_per_run` (default 10) |
| Max call attempts           | Configurable via `outbound_agent_settings.max_attempts` (default 3)       |
| Retry interval              | Configurable via `outbound_agent_settings.retry_interval_hours` (default `[4, 24]`) |
| Working hours               | `outbound_agent_settings.working_hours_start/end` + `working_days`        |
| ElevenLabs agent model      | `eleven_turbo_v2_5` (default) or `eleven_multilingual_v2`                 |
| `DEFAULT_CLINIC_ID`         | `00000000-0000-0000-0000-000000000001` across all edge functions           |
