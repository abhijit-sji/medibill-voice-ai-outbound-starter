import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getIntegrationSettings } from '../shared/integration-settings.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const runId = crypto.randomUUID();
  let itemsProcessed = 0, itemsSucceeded = 0, itemsFailed = 0;
  const actions: string[] = [];

  try {
    // Log run start
    await supabase.from('agent_run_logs').insert({
      id: runId,
      agent_type: 'outbound_call',
      status: 'running',
      started_at: new Date().toISOString(),
    });

    // Check if within working hours
    const now = new Date();
    const hour = now.getUTCHours(); // Simplified — production should use clinic timezone
    const dayOfWeek = now.getUTCDay();

    // Get agent settings
    const { data: settings } = await supabase
      .from('outbound_agent_settings')
      .select('*')
      .eq('agent_type', 'outbound_call')
      .maybeSingle();

    const maxItems = settings?.max_items_per_run || 10;
    const maxAttempts = settings?.max_attempts || 3;

    // Fetch pending queue items ready for processing
    const { data: queueItems, error: queueError } = await supabase
      .from('outbound_call_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempt_count', maxAttempts)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(maxItems);

    if (queueError) throw queueError;

    if (!queueItems || queueItems.length === 0) {
      actions.push('No pending items found in call queue');
    }

    // Process each queue item
    for (const item of (queueItems || [])) {
      itemsProcessed++;
      try {
        const newAttemptCount = (item.attempt_count || 0) + 1;
        const retryIntervals = settings?.retry_interval_hours || [4, 24];
        const retryHours = retryIntervals[Math.min(newAttemptCount - 1, retryIntervals.length - 1)] || 24;
        const nextAttemptAt = new Date(Date.now() + retryHours * 3600000).toISOString();

        // Determine action based on call_type
        let actionTaken = 'voice_call';
        let outcome = 'attempted';

        if (item.call_type === 'recall') {
          // For recalls, try SMS first
          actionTaken = newAttemptCount === 1 ? 'sms' : 'voice_call';
        }

        if (actionTaken === 'sms' && item.phone_number) {
          // Attempt SMS via send-sms-reminder pattern
          try {
            const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms-reminder`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                test_mode: true,
                to: item.phone_number,
                message: `Hi ${item.contact_name || 'there'}, this is a reminder from your dental clinic. Please call us back at your earliest convenience.`,
              }),
            });
            const smsResult = await smsResponse.json();
            if (smsResult.success) {
              outcome = 'sms_sent';
              actions.push(`SMS sent to ${item.contact_name || item.phone_number}`);
            } else {
              outcome = 'sms_failed';
              actions.push(`SMS failed for ${item.contact_name || item.phone_number}: ${smsResult.error || 'unknown'}`);
            }
          } catch (smsErr) {
            outcome = 'sms_failed';
            actions.push(`SMS error for ${item.contact_name}: ${(smsErr as Error).message}`);
          }
        } else if (actionTaken === 'voice_call' && item.phone_number) {
          // Attempt voice call
          try {
            if (item.call_type === 'new_patient_follow_up' || item.call_type === 'reminder') {
              // For new patient follow-up and appointment reminders, use the ElevenLabs-powered call handler
              try {
                const response = await fetch(`${supabaseUrl}/functions/v1/start-outbound-appointment-call`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                  },
                  body: JSON.stringify({ queue_item_id: item.id }),
                });

                const result = await response.json().catch(() => ({}));

                if (response.ok && result.success && result.call_sid) {
                  outcome = 'call_initiated';
                  await supabase
                    .from('outbound_call_queue')
                    .update({ call_sid: result.call_sid })
                    .eq('id', item.id);
                  actions.push(`Outbound ElevenLabs call initiated to ${item.contact_name || item.phone_number} (SID: ${result.call_sid})`);
                } else {
                  outcome = 'call_failed';
                  actions.push(
                    `Outbound ElevenLabs call failed for ${item.contact_name || item.phone_number}: ${result.error || response.statusText}`,
                  );
                }
              } catch (outboundErr) {
                outcome = 'call_failed';
                actions.push(
                  `Error starting ElevenLabs outbound call for ${item.contact_name || item.phone_number}: ${(outboundErr as Error).message}`,
                );
              }
            } else {
              // Fallback: simple Twilio TTS call as before, using Twilio integration settings
              const twilioConfig = await getIntegrationSettings('twilio');
              const twilioSid = twilioConfig.account_sid;
              const twilioAuth = twilioConfig.auth_token;
              const twilioPhone = twilioConfig.phone_number;

              if (twilioSid && twilioAuth && twilioPhone) {
                let twimlMessage: string;

                if (item.call_type === 'payment_collection') {
                  twimlMessage = `Hello ${item.contact_name || ''}. This is a call from your dental office regarding an outstanding balance of $${item.amount_due || 0}. Please call us back to arrange payment. Thank you.`;
                } else {
                  twimlMessage = `Hello ${item.contact_name || ''}. This is a call from your dental office. We wanted to follow up with you. Please call us back at your earliest convenience. Thank you.`;
                }

                const twiml = `<Response><Say voice="Polly.Joanna">${twimlMessage}</Say></Response>`;

                const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`;
                const formData = new URLSearchParams();
                formData.append('To', item.phone_number);
                formData.append('From', twilioPhone);
                formData.append('Twiml', twiml);

                const callResponse = await fetch(twilioUrl, {
                  method: 'POST',
                  headers: {
                    'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`),
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: formData.toString(),
                });
                const callResult = await callResponse.json();

                if (callResult.sid) {
                  outcome = 'call_initiated';
                  // Update call_sid on queue item
                  await supabase.from('outbound_call_queue').update({ call_sid: callResult.sid }).eq('id', item.id);
                  actions.push(`Call initiated to ${item.contact_name || item.phone_number} (SID: ${callResult.sid})`);
                } else {
                  outcome = 'call_failed';
                  actions.push(`Call failed for ${item.contact_name}: ${callResult.message || 'unknown'}`);
                }
              } else {
                outcome = 'skipped_no_twilio';
                actions.push(`Skipped ${item.contact_name}: Twilio not configured`);
              }
            }
          } catch (callErr) {
            outcome = 'call_failed';
            actions.push(`Call error for ${item.contact_name}: ${(callErr as Error).message}`);
          }
        }

        // Update queue item
        const newStatus = newAttemptCount >= maxAttempts ? 'failed' : (outcome.includes('initiated') || outcome.includes('sent') ? 'in_progress' : 'pending');
        await supabase.from('outbound_call_queue').update({
          attempt_count: newAttemptCount,
          last_attempt_at: new Date().toISOString(),
          next_attempt_at: newStatus === 'pending' ? nextAttemptAt : null,
          status: newStatus,
          outcome: outcome,
          outcome_notes: actions[actions.length - 1],
        }).eq('id', item.id);

        // Update campaign counters if linked
        if (item.campaign_id) {
          // Direct update of campaign counters
          const { data: campaign } = await supabase.from('outbound_campaigns').select('contacted_count, success_count').eq('id', item.campaign_id).single();
          if (campaign) {
            await supabase.from('outbound_campaigns').update({
              contacted_count: (campaign.contacted_count || 0) + 1,
              success_count: outcome.includes('initiated') || outcome.includes('sent') ? (campaign.success_count || 0) + 1 : campaign.success_count,
            }).eq('id', item.campaign_id);
          }
        }

        if (outcome.includes('initiated') || outcome.includes('sent')) {
          itemsSucceeded++;
        } else {
          itemsFailed++;
        }
      } catch (itemErr) {
        itemsFailed++;
        actions.push(`Error processing item ${item.id}: ${(itemErr as Error).message}`);
      }
    }

    // Complete run log
    await supabase.from('agent_run_logs').update({
      status: 'completed',
      items_processed: itemsProcessed,
      items_succeeded: itemsSucceeded,
      items_failed: itemsFailed,
      summary: actions.join('; '),
      completed_at: new Date().toISOString(),
    }).eq('id', runId);

    return new Response(JSON.stringify({
      success: true,
      run_id: runId,
      items_processed: itemsProcessed,
      items_succeeded: itemsSucceeded,
      items_failed: itemsFailed,
      actions,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    await supabase.from('agent_run_logs').update({
      status: 'failed',
      error_message: (error as Error).message,
      completed_at: new Date().toISOString(),
      items_processed: itemsProcessed,
      items_succeeded: itemsSucceeded,
      items_failed: itemsFailed,
    }).eq('id', runId);

    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message,
      run_id: runId,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
