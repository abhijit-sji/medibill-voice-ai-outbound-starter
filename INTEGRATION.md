# Integration Guide — Voice AI Outbound Module

This guide walks through the complete setup for the ElevenLabs outbound voice calling feature, from account creation to placing your first test call.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Variables](#2-environment-variables)
3. [Database Migrations](#3-database-migrations)
4. [Deploy Edge Functions](#4-deploy-edge-functions)
5. [Configure ElevenLabs via Admin UI](#5-configure-elevenlabs-via-admin-ui)
6. [Configure Twilio for Outbound Calls](#6-configure-twilio-for-outbound-calls)
7. [Create an Outbound Agent](#7-create-an-outbound-agent)
8. [Configure Outbound Agent Settings](#8-configure-outbound-agent-settings)
9. [Test with an Outbound Call](#9-test-with-an-outbound-call)
10. [Verify Cost Logging](#10-verify-cost-logging)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

Before proceeding, ensure you have:

- **ElevenLabs account** with Conversational AI access (requires a paid plan that includes the `/v1/convai` API endpoints).
- **Twilio account** with a voice-enabled phone number. Outbound calls require the number to have Voice capability.
- **Supabase project** with the Medibill schema applied (see [Database Migrations](#3-database-migrations)).
- **Supabase CLI** installed and authenticated:
  ```bash
  npm install -g supabase
  supabase login
  ```
- Node.js 18+ and `npm` for the frontend.

---

## 2. Environment Variables

### Frontend (`.env.local`)

These variables are safe to expose to the browser (they are Supabase public keys only):

```bash
VITE_SUPABASE_URL=https://qdnpztafkuprifwwqcgj.supabase.co
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
VITE_STRIPE_PUBLISHABLE_KEY=<your_stripe_pk>
VITE_APP_URL=http://localhost:8080
```

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

### Supabase Edge Function Secrets

These are server-side secrets that are **never** sent to the browser. Set them once per project:

```bash
# ElevenLabs
supabase secrets set ELEVENLABS_API_KEY=<your_elevenlabs_api_key> \
  --project-ref qdnpztafkuprifwwqcgj

# Twilio
supabase secrets set TWILIO_ACCOUNT_SID=AC<your_account_sid> \
  --project-ref qdnpztafkuprifwwqcgj

supabase secrets set TWILIO_AUTH_TOKEN=<your_auth_token> \
  --project-ref qdnpztafkuprifwwqcgj

supabase secrets set TWILIO_PHONE_NUMBER=+1XXXXXXXXXX \
  --project-ref qdnpztafkuprifwwqcgj

# Supabase (these are automatically available inside edge functions)
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically
```

**Important:** The ElevenLabs API key and Twilio credentials can also be configured via the admin UI (see [Step 5](#5-configure-elevenlabs-via-admin-ui) and [Step 6](#6-configure-twilio-for-outbound-calls)). The UI stores them in the `integration_settings` table, which the edge functions prefer over the environment variables.

---

## 3. Database Migrations

Run migrations in chronological order via the Supabase Dashboard SQL Editor or Supabase CLI. The relevant migrations for the outbound module are:

| Migration File                                           | Adds                                                      |
|---------------------------------------------------------|-----------------------------------------------------------|
| `20251203000000_initial_schema.sql`                     | `call_logs`, `cost_logs`, `ai_interactions`, base tables  |
| `20251231000000_create_ai_agent_configurations.sql`     | `ai_agent_configurations` table                           |
| `20260213000000_elevenlabs_conversational_agent.sql`    | ElevenLabs columns on `call_logs` + `ai_agent_configurations`; `agent_activity_logs`; `elevenlabs_conversations` |
| `20260223195322_025b18f0-....sql`                       | `outbound_agent_settings`, `agent_run_logs`               |

To run via CLI:

```bash
supabase db push --project-ref qdnpztafkuprifwwqcgj
```

To verify the schema is correct, run the check script:

```bash
node scripts/testing/check-database.mjs
```

---

## 4. Deploy Edge Functions

Deploy all eight outbound-module edge functions:

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

Or deploy everything at once with the project script:

```bash
./scripts/deployment/deploy-functions.sh
```

Verify deployment:

```bash
supabase functions list --project-ref qdnpztafkuprifwwqcgj
```

---

## 5. Configure ElevenLabs via Admin UI

1. Log in to the Medibill admin portal.
2. Navigate to **Admin → ElevenLabs** (`/admin/elevenlabs`).
3. Enter your **ElevenLabs API Key** in the provided field.
4. Click **Save**. The key is stored in `integration_settings` and immediately used by all edge functions.
5. To verify the key is working, click **Test Connection** — it should return your account details.

The API key stored here takes precedence over the `ELEVENLABS_API_KEY` environment variable in all edge functions.

---

## 6. Configure Twilio for Outbound Calls

1. Navigate to **Admin → Twilio** (`/admin/twilio`).
2. Enter your **Account SID**, **Auth Token**, and **Phone Number**.
3. Click **Save**.
4. In the [Twilio Console](https://console.twilio.com), ensure the phone number has **Voice** capability enabled.
5. Set the phone number's **A Call Comes In** webhook URL to:
   ```
   https://qdnpztafkuprifwwqcgj.supabase.co/functions/v1/elevenlabs-call-handler
   ```
   This handles both inbound calls (from patients) and the answer webhook for outbound calls.

---

## 7. Create an Outbound Agent

1. Navigate to **Admin → Conversational Agent** (`/admin/conversational-agent`).
2. Click **Create New Agent**.
3. Fill in the agent configuration:
   - **Agent Name**: Displayed in logs and the UI (e.g., `Appointment Reminder Agent`)
   - **Voice**: Select a voice from the ElevenLabs voice library
   - **First Message**: The opening line spoken when the patient answers (e.g., `Hi, am I speaking with {{patient_name}}?`)
   - **System Prompt**: Full instructions for the agent's behaviour, knowledge, and constraints
4. Click **Create**. The function `create-elevenlabs-agent` will register the agent with ElevenLabs and save the `agent_id` to `ai_agent_configurations`.
5. After creation, navigate to the **Outbound Config** tab and note the agent's ElevenLabs Agent ID.

---

## 8. Configure Outbound Agent Settings

1. Navigate to **Admin → Outbound Agent** (`/admin/outbound-agent`).
2. Set the **ElevenLabs Agent ID** for outbound calls — this is the agent ID from Step 7.
3. Configure working hours, max items per run, and retry intervals.
4. Toggle **Enable Outbound Agent** to activate automated queue processing.
5. Click **Save**.

This stores configuration in the `outbound_agent_settings` table under `agent_type = 'outbound_call'`.

---

## 9. Test with an Outbound Call

### Option A: Manual Call from Admin UI

1. Navigate to **Outbound Calls** (`/outbound-calls`).
2. Select a patient or enter a phone number manually.
3. Click **Initiate Call**.
4. This calls `start-outbound-appointment-call` which dials the number via Twilio.
5. Answer the call — you should hear the agent's first message.

### Option B: API Test via cURL

```bash
curl -X POST \
  https://qdnpztafkuprifwwqcgj.supabase.co/functions/v1/start-outbound-appointment-call \
  -H "Authorization: Bearer <your_supabase_anon_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+15551234567",
    "patient_id": "<patient_uuid>"
  }'
```

Expected response:

```json
{
  "success": true,
  "call_sid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "queued",
  "call_log_id": "uuid"
}
```

### Verify in the Admin UI

1. Navigate to **Admin → Conversational Agent → Call History** to see the call log.
2. Navigate to **Admin → Conversational Agent → Live Monitoring** during the call for a real-time transcript.

---

## 10. Verify Cost Logging

After a completed call, verify that cost records were written:

1. Open the Supabase Dashboard → Table Editor → `cost_logs`.
2. Filter by `service = 'elevenlabs'`.
3. You should see a record with `amount`, `units` (call duration in seconds), and `metadata.conversation_id`.

Alternatively, query via the Supabase SQL editor:

```sql
SELECT
  cl.phone_to,
  cl.duration,
  cl.outcome,
  cl.elevenlabs_conversation_id,
  co.service,
  co.amount,
  co.units
FROM call_logs cl
LEFT JOIN cost_logs co ON co.call_log_id = cl.id
WHERE cl.ai_provider = 'elevenlabs'
ORDER BY cl.started_at DESC
LIMIT 10;
```

---

## 11. Troubleshooting

### Agent is not answering / no audio

1. Check `supabase functions logs elevenlabs-call-handler` — look for TwiML generation errors.
2. Verify the ElevenLabs agent ID in `outbound_agent_settings` matches an actual agent in your ElevenLabs account.
3. Check that `integration_settings` has valid Twilio and ElevenLabs entries with `is_enabled = true`.

### `start-outbound-appointment-call` returns 500

1. Check `supabase functions logs start-outbound-appointment-call`.
2. Common cause: `outbound_agent_settings` row does not exist for `agent_type = 'outbound_call'`. Create it via the admin UI (Step 8).
3. Another common cause: Twilio credentials are missing or incorrect.

### ElevenLabs token errors in the browser

| Error code         | Resolution                                                                          |
|-------------------|-------------------------------------------------------------------------------------|
| `invalid_api_key` | Update the ElevenLabs API key at `/admin/elevenlabs` or via `supabase secrets set`  |
| `quota_exceeded`  | Check your ElevenLabs plan limits at https://elevenlabs.io/app/subscription          |
| `agent_not_found` | Verify the agent ID exists in ElevenLabs; recreate the agent if necessary            |

### Webhook events not being received

1. Check that `elevenlabs-webhook` is deployed and has `verify_jwt = false` in `supabase/config.toml`.
2. In the ElevenLabs agent configuration, set the **Post-call webhook URL** to:
   ```
   https://qdnpztafkuprifwwqcgj.supabase.co/functions/v1/elevenlabs-webhook
   ```
3. Check `supabase functions logs elevenlabs-webhook` for any processing errors.

### Calls not being dequeued by `outbound-call-agent`

1. Confirm the agent is enabled: `SELECT is_enabled FROM outbound_agent_settings WHERE agent_type = 'outbound_call';`
2. Check that the current time is within `working_hours_start` and `working_hours_end`.
3. Verify `outbound_call_queue` has rows with `status = 'pending'` and `attempt_count < max_attempts`.
