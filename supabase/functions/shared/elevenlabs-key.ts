import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Resolve ElevenLabs API key: first from integration_settings table, then fallback to env var.
 */
export async function getElevenLabsApiKey(clinicId?: string): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const targetClinicId = clinicId || '00000000-0000-0000-0000-000000000001';

  const { data: elSettings } = await supabase
    .from('integration_settings')
    .select('settings')
    .eq('integration_name', 'elevenlabs')
    .eq('clinic_id', targetClinicId)
    .single();

  const dbKey = (elSettings?.settings as Record<string, unknown>)?.api_key;
  const apiKey = (typeof dbKey === 'string' ? dbKey.trim() : '') || Deno.env.get('ELEVENLABS_API_KEY')?.trim() || '';

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured. Set it on the AI Providers page or as a Supabase secret.');
  }

  return apiKey;
}
