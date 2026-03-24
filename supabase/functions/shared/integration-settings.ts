/**
 * Shared helper to fetch integration settings
 * Always fetches fresh settings from database (no caching)
 * Falls back to environment variables if database settings not found
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const DEFAULT_CLINIC_ID = '00000000-0000-0000-0000-000000000001';

export interface IntegrationSettings {
  api_key?: string;
  from_email?: string;
  from_name?: string;
  account_sid?: string;
  auth_token?: string;
  phone_number?: string;
  voice_id?: string;
  model?: string;
  [key: string]: any;
}

/**
 * Get integration settings from database, fallback to environment variables
 * Always fetches fresh (no caching) to ensure updated credentials are used
 */
export async function getIntegrationSettings(
  integrationName: string,
  clinicId: string = DEFAULT_CLINIC_ID
): Promise<IntegrationSettings> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not configured, using environment variables only');
    return getEnvSettings(integrationName);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: settingsData, error } = await supabase
      .from('integration_settings')
      .select('settings, is_enabled')
      .eq('integration_name', integrationName)
      .eq('clinic_id', clinicId)
      .single();

    if (error || !settingsData || !settingsData.is_enabled) {
      console.log(`Integration ${integrationName} not found in database or disabled, using env vars`);
      return getEnvSettings(integrationName);
    }

    const dbSettings = settingsData.settings || {};
    const envSettings = getEnvSettings(integrationName);

    // Merge: DB settings take precedence if present, otherwise use env
    return {
      ...envSettings,
      ...dbSettings,
    };
  } catch (error) {
    console.error(`Error fetching ${integrationName} settings:`, error);
    return getEnvSettings(integrationName);
  }
}

/**
 * Get settings from environment variables
 */
function getEnvSettings(integrationName: string): IntegrationSettings {
  const settings: IntegrationSettings = {};

  switch (integrationName) {
    case 'openai':
      settings.api_key = Deno.env.get('OPENAI_API_KEY') || undefined;
      settings.model = Deno.env.get('OPENAI_MODEL') || undefined;
      break;
    case 'elevenlabs':
      settings.api_key = Deno.env.get('ELEVENLABS_API_KEY') || undefined;
      settings.voice_id = Deno.env.get('ELEVENLABS_VOICE_ID') || undefined;
      break;
    case 'twilio':
      settings.account_sid = Deno.env.get('TWILIO_ACCOUNT_SID') || undefined;
      settings.auth_token = Deno.env.get('TWILIO_AUTH_TOKEN') || undefined;
      settings.phone_number = Deno.env.get('TWILIO_PHONE_NUMBER') || undefined;
      break;
    case 'resend':
      settings.api_key = Deno.env.get('RESEND_API_KEY') || undefined;
      settings.from_email = Deno.env.get('RESEND_FROM_EMAIL') || undefined;
      break;
    case 'sendgrid':
      settings.api_key = Deno.env.get('SENDGRID_API_KEY') || undefined;
      settings.from_email = Deno.env.get('SENDGRID_FROM_EMAIL') || undefined;
      settings.from_name = Deno.env.get('SENDGRID_FROM_NAME') || undefined;
      break;
    case 'nexhealth':
      settings.api_key = Deno.env.get('NEXHEALTH_API_KEY') || undefined;
      settings.subdomain = Deno.env.get('NEXHEALTH_SUBDOMAIN') || undefined;
      settings.location_id = Deno.env.get('NEXHEALTH_LOCATION_ID') || undefined;
      break;
    case 'stedi':
      settings.api_key = Deno.env.get('STEDI_API_KEY') || undefined;
      break;
    case 'eclinicalworks':
      settings.client_id = Deno.env.get('ECW_CLIENT_ID') || undefined;
      settings.client_secret = Deno.env.get('ECW_CLIENT_SECRET') || undefined;
      settings.practice_id = Deno.env.get('ECW_PRACTICE_ID') || undefined;
      settings.base_url = Deno.env.get('ECW_BASE_URL') || undefined;
      settings.fhir_endpoint = Deno.env.get('ECW_FHIR_ENDPOINT') || undefined;
      settings.healow_endpoint = Deno.env.get('ECW_HEALOW_ENDPOINT') || undefined;
      break;
  }

  return settings;
}

