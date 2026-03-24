# Edge Functions — Voice AI Outbound Module

This document describes the eight Supabase Edge Functions that power the outbound voice AI pipeline. All functions run on the Deno runtime and are deployed to the `qdnpztafkuprifwwqcgj` Supabase project.

---

## Table of Contents

1. [elevenlabs-call-handler](#1-elevenlabs-call-handler)
2. [elevenlabs-conversation-token](#2-elevenlabs-conversation-token)
3. [elevenlabs-webhook](#3-elevenlabs-webhook)
4. [create-elevenlabs-agent](#4-create-elevenlabs-agent)
5. [sync-elevenlabs-agent](#5-sync-elevenlabs-agent)
6. [get-elevenlabs-agent](#6-get-elevenlabs-agent)
7. [outbound-call-agent](#7-outbound-call-agent)
8. [start-outbound-appointment-call](#8-start-outbound-appointment-call)

---

## 1. `elevenlabs-call-handler`

**Twilio webhook that connects an answered call to ElevenLabs Conversational AI.** Receives Twilio form data, detects whether the call is inbound or outbound (via URL param `direction=outbound` or by comparing `From` to the clinic's Twilio number), looks up the appropriate ElevenLabs agent ID, and returns TwiML connecting the call to the ElevenLabs WebSocket stream.

### Method & Authentication

```
POST  /functions/v1/elevenlabs-call-handler
Auth: none (verify_jwt = false)
Content-Type: application/x-www-form-urlencoded  (sent by Twilio)
Response Content-Type: text/xml
```

### Query Parameters

| Parameter    | Type   | Required | Description                                                               |
|-------------|--------|----------|---------------------------------------------------------------------------|
| `direction`  | string | no       | `outbound` — primary signal that this call was dialled by the clinic      |
| `agent_id`   | string | no       | ElevenLabs agent ID to use; overrides DB lookup for outbound calls        |

### Twilio Request Body Parameters

| Parameter     | Type   | Required | Description                          |
|--------------|--------|----------|--------------------------------------|
| `CallSid`    | string | yes      | Unique Twilio call identifier        |
| `From`       | string | yes      | Originating E.164 phone number       |
| `To`         | string | yes      | Destination E.164 phone number       |
| `CallStatus` | string | yes      | Current Twilio call status           |

### Direction Detection Logic

1. If `?direction=outbound` is present in the URL → outbound.
2. Otherwise, compare `From` to the clinic's Twilio phone number from `integration_settings`. If they match → outbound.
3. Everything else → inbound.

### Success Response — TwiML (outbound)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://api.elevenlabs.io/v1/convai/conversation/websocket">
      <Parameter name="xi-agent-id" value="AgentXYZ123" />
    </Stream>
  </Connect>
</Response>
```

### Error Response — TwiML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We're sorry, the outbound agent is not configured. Please contact your administrator.</Say>
  <Hangup />
</Response>
```

### Configuration Sources

| Setting               | Source                                                                  |
|----------------------|-------------------------------------------------------------------------|
| ElevenLabs API key   | `integration_settings` (`integration_name = 'elevenlabs'`) → env var   |
| Outbound agent ID    | `?agent_id=` URL param → `outbound_agent_settings.elevenlabs_agent_id` |
| Inbound agent ID     | `ai_agent_configurations.elevenlabs_agent_id` (`is_active = true`)     |
| Twilio phone number  | `integration_settings` (`integration_name = 'twilio'`) → env var       |

---

## 2. `elevenlabs-conversation-token`

**Generates a signed, short-lived conversation token for the ElevenLabs SDK.** Used by the frontend `AgentTestingTab` to start an in-browser test conversation without exposing the ElevenLabs API key to the client.

### Method & Authentication

```
POST  /functions/v1/elevenlabs-conversation-token
Auth: JWT required (Authorization: Bearer <token>)
Content-Type: application/json
```

### Request Body

```json
{
  "agent_id": "AgentXYZ123"
}
```

| Field      | Type   | Required | Description                              |
|-----------|--------|----------|------------------------------------------|
| `agent_id` | string | yes      | ElevenLabs agent ID to generate token for |

### Success Response

```json
{
  "token": "eyJ...",
  "expires_at": 1740000000
}
```

### Error Responses

| HTTP | `error` field         | Cause                                                  |
|------|-----------------------|--------------------------------------------------------|
| 400  | `agent_not_found`     | `agent_id` not provided in request body               |
| 200  | `invalid_api_key`     | ElevenLabs API key missing or invalid (401 from API)  |
| 200  | `quota_exceeded`      | ElevenLabs character/call quota exhausted             |
| 200  | `agent_not_found`     | Agent ID not found in ElevenLabs (404 from API)       |

### Notes

- The token is fetched from `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=<id>`.
- Tokens are short-lived (typically 30 minutes); the frontend should not cache them.
- API key is resolved via `shared/elevenlabs-key.ts` → `integration_settings` table first, then `ELEVENLABS_API_KEY` env var.

---

## 3. `elevenlabs-webhook`

**Receives ElevenLabs conversation lifecycle events and executes AI function calls.** This is the most complex function in the outbound module — it handles all ElevenLabs webhook event types, dispatches tool calls (patient lookup, insurance verification, appointment booking), persists transcripts and outcomes to `call_logs`, and can also receive direct outcome updates from ElevenLabs custom tools.

### Method & Authentication

```
POST  /functions/v1/elevenlabs-webhook
Auth: none (verify_jwt = false)
Content-Type: application/json
```

### Event Types

| `event_type`                  | Description                                                              |
|-----------------------------|--------------------------------------------------------------------------|
| `conversation.started`       | New conversation opened; create or link `call_logs` row                  |
| `conversation.message`       | New utterance from patient or AI; append to transcript                   |
| `conversation.function_call` | AI wants to call a tool; execute and return result                       |
| `conversation.ended`         | Conversation complete; store final transcript, update outcome, log cost  |
| `conversation.error`         | ElevenLabs error; set `call_logs.status = 'failed'`                      |

### Standard Webhook Payload

```json
{
  "event_type": "conversation.function_call",
  "conversation_id": "conv_abc123",
  "agent_id": "AgentXYZ123",
  "timestamp": "2026-03-16T10:30:00Z",
  "data": {
    "function_name": "book_appointment",
    "arguments": {
      "patient_id": "uuid",
      "provider_id": "uuid",
      "appointment_date": "2026-03-20",
      "appointment_time": "14:30",
      "appointment_type": "checkup"
    }
  }
}
```

### Direct Outcome Payload (custom tool mode)

ElevenLabs can also POST structured outcomes directly (without a top-level `event_type`). The function detects this when `patient_validated`, `insurance_verified`, `appointment_booked`, or `outcome_notes` fields are present at the top level:

```json
{
  "conversation_id": "conv_abc123",
  "patient_validated": true,
  "insurance_verified": false,
  "appointment_booked": true,
  "outcome_notes": "Booked for Tuesday 2:30 PM with Dr. Smith"
}
```

The `x-conversation-id` header is also accepted as an alternative to the body `conversation_id` field.

### Supported Function Calls

| Function Name              | Handler                                 | Description                                              |
|---------------------------|------------------------------------------|----------------------------------------------------------|
| `find_patient`            | `shared/patient-lookup.ts`               | Look up patient by name, DOB, or phone                   |
| `lookup_patient`          | `shared/patient-lookup.ts` (alias)       | Alias for `find_patient`                                 |
| `verify_insurance`        | Inline                                   | Check insurance eligibility for a patient                |
| `check_insurance`         | Inline (alias)                           | Alias for `verify_insurance`                             |
| `check_availability`      | `shared/availability.ts`                 | Return available appointment slots                       |
| `get_available_slots`     | `shared/availability.ts` (alias)         | Alias for `check_availability`                           |
| `book_appointment`        | `shared/booking.ts`                      | Create a confirmed appointment                           |
| `schedule_appointment`    | `shared/booking.ts` (alias)              | Alias for `book_appointment`                             |
| `get_current_datetime`    | Inline                                   | Return current date/time in clinic timezone              |
| `log_transcript`          | Inline                                   | Store a single transcript turn for live monitoring       |
| `send_registration_form`  | Inline                                   | Trigger patient registration link delivery               |

### Database Operations

| Table                    | Operation | Trigger                                                    |
|-------------------------|-----------|-------------------------------------------------------------|
| `call_logs`             | UPSERT    | On `conversation.started` — match via `elevenlabs_conversation_id` |
| `call_logs`             | UPDATE    | On `conversation.ended` — transcript, outcome, boolean flags|
| `cost_logs`             | INSERT    | On `conversation.ended`                                     |
| `ai_interactions`       | INSERT    | On `conversation.message`                                   |
| `agent_activity_logs`   | INSERT    | On each function call execution                             |
| `appointments`          | INSERT    | When `book_appointment` function call succeeds              |

### Response

```json
{ "success": true }
```

---

## 4. `create-elevenlabs-agent`

**Creates a new ElevenLabs Conversational AI agent via the ElevenLabs API.** Sends the full agent configuration (name, voice, model, system prompt, first message, tools) to ElevenLabs and returns the created agent's ID. Persists the agent ID to `ai_agent_configurations` in the database.

### Method & Authentication

```
POST  /functions/v1/create-elevenlabs-agent
Auth: JWT required (Authorization: Bearer <token>)
Content-Type: application/json
```

### Request Body

```json
{
  "name": "Patient Outreach Agent",
  "voice_id": "EXAVITQu4vr4xnSDxMaL",
  "model": "eleven_turbo_v2_5",
  "first_message": "Hi! This is Sarah calling from Sunrise Medical Center. Am I speaking with John?",
  "system_prompt": "You are a friendly medical receptionist...",
  "language": "en",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.8,
    "style": 0.0
  }
}
```

| Field           | Type   | Required | Description                                                   |
|----------------|--------|----------|---------------------------------------------------------------|
| `name`          | string | yes      | Human-readable agent name                                     |
| `voice_id`      | string | yes      | ElevenLabs voice ID                                           |
| `model`         | string | no       | ElevenLabs model (default: `eleven_turbo_v2`)                 |
| `first_message` | string | no       | Opening message                                               |
| `system_prompt` | string | no       | Full system instructions for the agent                        |
| `language`      | string | no       | BCP-47 language code (default: `en`)                          |
| `voice_settings`| object | no       | `{ stability, similarity_boost, style }` (all 0.00–1.00)      |

### Success Response

```json
{
  "agent_id": "AgentXYZ123",
  "name": "Patient Outreach Agent",
  "voice_id": "EXAVITQu4vr4xnSDxMaL",
  "model": "eleven_turbo_v2_5"
}
```

### Notes

- The function registers all shared tool definitions from `ELEVENLABS_FUNCTIONS` (including `log_transcript`, `find_patient`, `book_appointment`, etc.) on the new agent automatically.
- The `xi-api-key` header is set using `getElevenLabsApiKey()` from `shared/elevenlabs-key.ts`.
- After the ElevenLabs API call succeeds, the frontend should save the returned `agent_id` to `ai_agent_configurations` via a subsequent Supabase client call.

---

## 5. `sync-elevenlabs-agent`

**Syncs a locally-edited agent configuration to the ElevenLabs API.** When an admin updates the system prompt, voice, or first message in the Medibill UI, this function PATCHes the corresponding ElevenLabs agent via the API to keep the two in sync.

### Method & Authentication

```
POST  /functions/v1/sync-elevenlabs-agent
Auth: JWT required (Authorization: Bearer <token>)
Content-Type: application/json
```

### Request Body

```json
{
  "agent_id": "AgentXYZ123"
}
```

| Field      | Type   | Required | Description                              |
|-----------|--------|----------|------------------------------------------|
| `agent_id` | string | yes      | ElevenLabs agent ID to sync              |

### Processing

1. Resolve ElevenLabs API key via `getElevenLabsApiKey()`.
2. Fetch the agent's current configuration from `ai_agent_configurations` in the database (using `elevenlabs_agent_id = agent_id`).
3. Build the ElevenLabs API payload from local DB values (name, voice, model, first_message, system_prompt, voice settings, language).
4. Re-register all tool definitions from `ELEVENLABS_FUNCTIONS`.
5. PATCH `https://api.elevenlabs.io/v1/convai/agents/<agent_id>`.

### Success Response

```json
{
  "success": true,
  "agent_id": "AgentXYZ123",
  "name": "Patient Outreach Agent",
  "voice_id": "EXAVITQu4vr4xnSDxMaL"
}
```

### Error Response

```json
{
  "success": false,
  "error": "agent_id is required"
}
```

---

## 6. `get-elevenlabs-agent`

**Fetches the live configuration of an ElevenLabs agent directly from the ElevenLabs API.** Used by the frontend configuration page to display the current agent state and detect drift between the local database and ElevenLabs.

### Method & Authentication

```
POST  /functions/v1/get-elevenlabs-agent
Auth: JWT required (Authorization: Bearer <token>)
Content-Type: application/json
```

### Request Body

```json
{
  "agent_id": "AgentXYZ123"
}
```

### Success Response

```json
{
  "success": true,
  "agent_id": "AgentXYZ123",
  "name": "Patient Outreach Agent",
  "description": null,
  "voice_id": "EXAVITQu4vr4xnSDxMaL",
  "model": "eleven_turbo_v2_5",
  "first_message": "Hi! This is Sarah...",
  "system_prompt": "You are a friendly medical receptionist...",
  "tools": [...],
  "knowledge_base": [...]
}
```

### Error Response

```json
{
  "success": false,
  "error": "Failed to get agent: ..."
}
```

### Notes

- The function maps ElevenLabs' nested `conversation_config.agent.prompt.prompt` → `system_prompt` and `conversation_config.tts.voice_id` → `voice_id` for consistent response shape.
- An HTTP 200 is always returned even on ElevenLabs API errors, with `success: false` in the body.

---

## 7. `outbound-call-agent`

**Automated outbound call queue processor.** Designed to be invoked by a pg_cron job or a manual trigger from the admin portal. Dequeues pending items from `outbound_call_queue`, checks working hour constraints, and for each item either sends an SMS (first attempt for `recall` call types) or initiates a voice call via `start-outbound-appointment-call`.

### Method & Authentication

```
POST  /functions/v1/outbound-call-agent
Auth: JWT required (Authorization: Bearer <token>)
Content-Type: application/json
```

### Request Body

No required fields — the function fetches all pending queue items automatically.

```json
{}
```

### Processing Steps

1. Log a new run to `agent_run_logs` with `status = 'running'`.
2. Check current time against `outbound_agent_settings.working_hours_start/end` and `working_days`.
3. Fetch up to `max_items_per_run` items from `outbound_call_queue` where `status = 'pending'` and `attempt_count < max_attempts`, ordered by `priority DESC`, `created_at ASC`.
4. For each item:
   - If `call_type = 'recall'` and `attempt_count = 0` → send SMS via `send-sms-reminder`.
   - Otherwise → POST to `start-outbound-appointment-call` to initiate a voice call.
5. Update each queue item's `status`, `outcome`, `last_attempt_at`, `attempt_count`, and `next_attempt_at`.
6. Update `agent_run_logs` with final counts and `status = 'completed'`.

### Queue Item States

| `status`     | Meaning                                           |
|-------------|---------------------------------------------------|
| `pending`    | Waiting to be processed                           |
| `in_progress`| Currently being called                            |
| `completed`  | Final status reached (success or max attempts)    |
| `failed`     | Call failed / no-answer / busy                    |

### Success Response

```json
{
  "success": true,
  "run_id": "uuid",
  "items_processed": 5,
  "items_succeeded": 4,
  "items_failed": 1,
  "actions": [
    "Voice call initiated for Jane Doe (+15551234567)",
    "SMS sent to John Smith (+15559876543)"
  ]
}
```

### Configuration

All limits are read from `outbound_agent_settings` where `agent_type = 'outbound_call'`:

| Setting               | Default | Description                                    |
|----------------------|---------|------------------------------------------------|
| `max_items_per_run`  | 10      | Max queue items processed per invocation       |
| `max_attempts`       | 3       | Max attempts before item is marked exhausted   |
| `retry_interval_hours`| `[4,24]`| Hours to wait between attempt 1→2 and 2→3     |
| `working_hours_start`| `09:00` | Do not initiate calls before this time         |
| `working_hours_end`  | `18:00` | Do not initiate calls after this time          |
| `working_days`       | `[1–5]` | Days of week (0=Sun, 1=Mon, ..., 6=Sat)        |

---

## 8. `start-outbound-appointment-call`

**Initiates a single outbound call via Twilio to a patient.** Resolves the target phone number (from request body or `outbound_call_queue`), looks up the configured outbound ElevenLabs agent, reads Twilio credentials from `integration_settings`, and calls the Twilio REST API to dial the patient. Twilio then calls `elevenlabs-call-handler` when the patient answers.

### Method & Authentication

```
POST  /functions/v1/start-outbound-appointment-call
Auth: JWT required (Authorization: Bearer <token>)
Content-Type: application/json
```

### Request Body

```json
{
  "phone_number": "+15551234567",
  "patient_id": "uuid",
  "queue_item_id": "uuid"
}
```

| Field           | Type   | Required | Description                                                              |
|----------------|--------|----------|--------------------------------------------------------------------------|
| `phone_number`  | string | no*      | E.164 phone number to dial; required if `queue_item_id` not provided    |
| `patient_id`    | string | no       | Patient UUID; linked to `call_logs` row                                  |
| `lead_id`       | string | no       | Lead UUID; linked to `call_logs` row                                     |
| `queue_item_id` | string | no*      | If provided, phone/patient/lead are loaded from `outbound_call_queue`   |

\* At least one of `phone_number` or `queue_item_id` must be provided.

### Processing Steps

1. Resolve target phone number from body or `outbound_call_queue` row.
2. Look up `outbound_agent_settings.elevenlabs_agent_id` for `agent_type = 'outbound_call'`.
3. Read Twilio credentials from `integration_settings` (`integration_name = 'twilio'`).
4. Call `POST https://api.twilio.com/2010-04-01/Accounts/<SID>/Calls.json` with:
   - `To` = patient phone number
   - `From` = clinic's Twilio phone number
   - `Url` = `<supabase_url>/functions/v1/elevenlabs-call-handler?direction=outbound&agent_id=<id>`
   - `StatusCallback` = `<supabase_url>/functions/v1/call-status-callback`
5. Insert a `call_logs` row with `status = 'initiated'` and `call_type = 'outbound_reminder'`.

### Success Response

```json
{
  "success": true,
  "call_sid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "queued",
  "call_log_id": "uuid"
}
```

### Error Responses

| HTTP | `error`                              | Cause                                      |
|------|--------------------------------------|--------------------------------------------|
| 400  | `A phone number is required...`      | No phone number resolved                   |
| 404  | `Queue item not found.`              | `queue_item_id` does not exist             |
| 500  | `No ElevenLabs outbound agent configured` | `outbound_agent_settings` not set up   |
| 500  | `Twilio credentials not configured`  | Missing SID, token, or phone number        |

---

## Deployment

Deploy all eight functions:

```bash
supabase functions deploy elevenlabs-call-handler        --project-ref qdnpztafkuprifwwqcgj
supabase functions deploy elevenlabs-conversation-token  --project-ref qdnpztafkuprifwwqcgj
supabase functions deploy elevenlabs-webhook             --project-ref qdnpztafkuprifwwqcgj
supabase functions deploy create-elevenlabs-agent        --project-ref qdnpztafkuprifwwqcgj
supabase functions deploy sync-elevenlabs-agent          --project-ref qdnpztafkuprifwwqcgj
supabase functions deploy get-elevenlabs-agent           --project-ref qdnpztafkuprifwwqcgj
supabase functions deploy outbound-call-agent            --project-ref qdnpztafkuprifwwqcgj
supabase functions deploy start-outbound-appointment-call --project-ref qdnpztafkuprifwwqcgj
```

## Required Secrets

```bash
supabase secrets set ELEVENLABS_API_KEY=...         --project-ref qdnpztafkuprifwwqcgj
supabase secrets set TWILIO_ACCOUNT_SID=AC...       --project-ref qdnpztafkuprifwwqcgj
supabase secrets set TWILIO_AUTH_TOKEN=...          --project-ref qdnpztafkuprifwwqcgj
supabase secrets set TWILIO_PHONE_NUMBER=+1...      --project-ref qdnpztafkuprifwwqcgj
```

The ElevenLabs API key can also be managed via the admin UI at `/admin/elevenlabs`, which stores it in `integration_settings`. Edge functions prefer the database value over the environment variable.
