import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, RefreshCw, Eye, EyeOff, Save, Info, Phone } from 'lucide-react';
import {
  getIntegrationSettings,
  toggleIntegration,
  testIntegration,
  updateIntegrationSetting,
  type IntegrationSetting
} from '@/services/integrations.service';

const ElevenLabsConfiguration = () => {
  const [settings, setSettings] = useState<IntegrationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingIntegration, setTestingIntegration] = useState(false);
  const [togglingIntegration, setTogglingIntegration] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [agentPhoneNumberId, setAgentPhoneNumberId] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [charQuota, setCharQuota] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getIntegrationSettings();
        setSettings(data);
        const s = data.find(s => s.integration_name === 'elevenlabs');
        if (s?.settings) {
          const settings = s.settings as Record<string, any>;
          if (settings.api_key) setApiKey(settings.api_key);
          if (settings.agent_phone_number_id) setAgentPhoneNumberId(settings.agent_phone_number_id);
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
        toast.error('Failed to load ElevenLabs settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getIntegrationSettings();
      setSettings(data);
      const s = data.find(s => s.integration_name === 'elevenlabs');
      if (s?.settings) {
        const settings = s.settings as Record<string, any>;
        if (settings.api_key) setApiKey(settings.api_key);
        if (settings.agent_phone_number_id) setAgentPhoneNumberId(settings.agent_phone_number_id);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const validateKey = (key: string): boolean => {
    if (!key.trim()) { setKeyError('API key is required'); return false; }
    if (key.length < 10) { setKeyError('API key is too short'); return false; }
    setKeyError('');
    return true;
  };

  const handleSave = async () => {
    if (!validateKey(apiKey)) { toast.error('Please fix validation errors before saving'); return; }
    setSaving(true);
    try {
      const currentSetting = settings.find(s => s.integration_name === 'elevenlabs');
      const existingSettings = (currentSetting?.settings || {}) as Record<string, any>;
      await updateIntegrationSetting('elevenlabs', {
        settings: {
          ...existingSettings,
          api_key: apiKey.trim(),
          agent_phone_number_id: agentPhoneNumberId.trim(),
        },
      });
      toast.success('ElevenLabs configuration saved successfully');
      await loadSettings();
    } catch (error) {
      console.error('Error saving ElevenLabs settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save ElevenLabs configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (currentValue: boolean) => {
    setTogglingIntegration(true);
    try {
      await toggleIntegration('elevenlabs', !currentValue);
      setSettings(prev => prev.map(s => s.integration_name === 'elevenlabs' ? { ...s, is_enabled: !currentValue } : s));
      toast.success(`ElevenLabs ${!currentValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update integration');
    } finally {
      setTogglingIntegration(false);
    }
  };

  const handleTest = async () => {
    setTestingIntegration(true);
    try {
      const result = await testIntegration('elevenlabs') as any;
      if (result.success) {
        if (result.characterQuota !== undefined) setCharQuota(result.characterQuota);
        toast.success('ElevenLabs connection successful!');
        setSettings(prev => prev.map(s => s.integration_name === 'elevenlabs' ? { ...s, last_tested_at: new Date().toISOString(), last_test_status: 'success' } : s));
      } else {
        toast.error(`ElevenLabs test failed: ${result.message}`);
        setSettings(prev => prev.map(s => s.integration_name === 'elevenlabs' ? { ...s, last_tested_at: new Date().toISOString(), last_test_status: 'failed' } : s));
      }
    } catch (error) {
      toast.error('Failed to test integration');
    } finally {
      setTestingIntegration(false);
    }
  };

  const setting = settings.find(s => s.integration_name === 'elevenlabs');

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatLastTested = (date: string | null) => {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const getStatusBadge = () => {
    if (!setting) return <Badge variant="outline" className="bg-muted text-muted-foreground">Not Configured</Badge>;
    if (!setting.is_enabled) return <Badge variant="secondary">Disabled</Badge>;
    if (setting.last_test_status === 'success') return <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Connected</Badge>;
    if (setting.last_test_status === 'failed') return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Connection Failed</Badge>;
    return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">Enabled</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-3">
          <span className="text-3xl">🔊</span>
          ElevenLabs Configuration
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure ElevenLabs for text-to-speech voice synthesis
        </p>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>Current ElevenLabs integration status</CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status</span>
              <div className="flex items-center gap-2 mt-1">
                {setting?.is_enabled ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                <span className="font-medium">{setting?.is_enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
            {charQuota !== null && (
              <div>
                <span className="text-muted-foreground">Character Quota Remaining</span>
                <p className="font-medium mt-1">{formatNumber(charQuota)}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Last Tested</span>
              <p className="font-medium mt-1">{formatLastTested(setting?.last_tested_at || null)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Credentials</CardTitle>
          <CardDescription>Your ElevenLabs account credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="elevenlabs-key">API Key</Label>
            <div className="relative">
              <Input
                id="elevenlabs-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); if (keyError) validateKey(e.target.value); }}
                placeholder="Enter ElevenLabs API key..."
                className={keyError ? 'border-destructive pr-10' : 'pr-10'}
              />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {keyError && <p className="text-xs text-destructive">{keyError}</p>}
          </div>

          <Alert className="bg-muted/50 border-border/50">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Voice selection is configured in the <strong>Conversational Agent</strong> page.
              This ensures voices are properly linked to each agent.
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-2 pt-2">
            <Switch checked={setting?.is_enabled ?? false} onCheckedChange={() => handleToggle(setting?.is_enabled ?? false)} disabled={togglingIntegration} />
            <span className="text-sm">{setting?.is_enabled ? 'Enabled' : 'Disabled'}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Configuration
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testingIntegration}>
              {testingIntegration ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Outbound Calling */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-emerald-500" />
            <div>
              <CardTitle>Outbound Calling (Twilio Integration)</CardTitle>
              <CardDescription>Configure the phone number used by ElevenLabs to make outbound AI calls</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-emerald-500/10 border-emerald-500/30">
            <Info className="h-4 w-4 text-emerald-500" />
            <AlertDescription className="text-xs">
              ElevenLabs manages your outbound number directly via its Twilio integration.
              To find the <strong>Agent Phone Number ID</strong>, go to your{' '}
              <strong>ElevenLabs Dashboard → Conversational AI → Phone Numbers</strong>, click your outbound number, and copy the <em>Phone Number ID</em> shown.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="agent_phone_number_id" className="flex items-center gap-2">
              Agent Phone Number ID
              <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Required for outbound calls</span>
            </Label>
            <Input
              id="agent_phone_number_id"
              value={agentPhoneNumberId}
              onChange={(e) => setAgentPhoneNumberId(e.target.value)}
              placeholder="e.g. PhN1a2b3c4d5e6f..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This is the internal ElevenLabs ID for your outbound phone number — not the actual phone number itself.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Outbound Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ElevenLabsConfiguration;
