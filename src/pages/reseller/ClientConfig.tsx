import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Copy,
  Palette,
  MessageSquare,
  Settings,
  Upload,
  Code,
  Eye,
} from 'lucide-react';

interface WidgetConfig {
  branding: {
    primaryColor: string;
    primaryGold: string;
    logoUrl: string;
    font: string;
    headerImage?: string; // Custom header background image URL
  };
  ai_config: {
    mood: string;
    temperature: number;
    aiName: string;
    greeting: string;
    systemPrompt: string;
  };
  offerings: {
    treatments: string[];
    prices: Record<string, number>;
    preferences: string[];
    currency: string;
  };
  addons: {
    voiceEnabled: boolean;
    analyticsEnabled: boolean;
    whatsappEnabled: boolean;
    emailNotifications: boolean;
  };
  special_offers: string | null;
}

const AI_MOODS = [
  { value: 'luxurious', label: '✨ Luxurious', description: 'Elegant, premium, high-end tone' },
  { value: 'professional', label: '💼 Professional', description: 'Clean, efficient, business-like' },
  { value: 'friendly', label: '😊 Friendly', description: 'Warm, approachable, casual' },
  { value: 'minimal', label: '🎯 Minimal', description: 'Direct, concise, to-the-point' },
  { value: 'playful', label: '🎉 Playful', description: 'Fun, energetic, engaging' },
];

const PRESET_COLORS = [
  '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#22c55e',
  '#eab308', '#f97316', '#ef4444', '#06b6d4', '#84cc16',
  '#D4AF37', '#be185d', '#7c3aed', '#0891b2', '#059669',
];

export default function ClientConfig() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [config, setConfig] = useState<WidgetConfig>({
    branding: {
      primaryColor: '#ec4899',
      primaryGold: '#D4AF37',
      logoUrl: '',
      font: 'Inter, sans-serif',
      headerImage: '',
    },
    ai_config: {
      mood: 'professional',
      temperature: 0.7,
      aiName: 'Assistant',
      greeting: 'Welcome! How can I help you today?',
      systemPrompt: '',
    },
    offerings: {
      treatments: ['Consultation'],
      prices: { Consultation: 100 },
      preferences: ['Water'],
      currency: '$',
    },
    addons: {
      voiceEnabled: true,
      analyticsEnabled: true,
      whatsappEnabled: true,
      emailNotifications: false,
    },
    special_offers: '',
  });

  useEffect(() => {
    if (tenantId) {
      loadTenantData(tenantId);
    }
  }, [tenantId]);

  const loadTenantData = async (id: string) => {
    // Load tenant info
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (!tenantData) {
      toast.error('Client not found');
      navigate('/reseller/dashboard');
      return;
    }

    setTenant(tenantData);

    // Load widget config
    const { data: configData, error: configError } = await supabase
      .from('widget_configs')
      .select('*')
      .eq('tenant_id', id)
      .maybeSingle();

    if (configError) {
      console.error('Error loading widget config:', configError);
    }

    if (configData) {
      setConfig({
        branding: (configData as any).branding as WidgetConfig['branding'],
        ai_config: (configData as any).ai_config as WidgetConfig['ai_config'],
        offerings: (configData as any).offerings as WidgetConfig['offerings'],
        addons: (configData as any).addons as WidgetConfig['addons'],
        special_offers: (configData as any).special_offers,
      });
    }

    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);

    if (!tenantId) return;

    const { error } = await supabase
      .from('widget_configs')
      .upsert({
        tenant_id: tenantId,
        branding: config.branding as any,
        ai_config: config.ai_config as any,
        offerings: config.offerings as any,
        addons: config.addons as any,
        special_offers: config.special_offers as any,
      }, {
        onConflict: 'tenant_id',
      });

    if (error) {
      toast.error('Failed to save configuration');
      console.error(error);
    } else {
      toast.success('Configuration saved successfully!');
    }

    setIsSaving(false);
  };

  const copyEmbedCode = () => {
    const embedCode = `<script>
  window.ovgConfig = {
    tenantId: "${tenantId}",
    widgetUrl: "https://ovg-engage.vercel.app"
  };
</script>
<script src="https://ovg-engage.vercel.app/src/loader.js"></script>`;

    navigator.clipboard.writeText(embedCode);
    toast.success('Embed code copied to clipboard!');
  };

  const updateBranding = (key: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      branding: { ...prev.branding, [key]: value },
    }));
  };

  const handleFileUpload = (key: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPG, PNG, WebP, or SVG)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Convert to base64 for immediate preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      updateBranding(key, base64String);
      toast.success('Image uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const updateAiConfig = (key: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      ai_config: { ...prev.ai_config, [key]: value },
    }));
  };

  const updateAddons = (key: string, value: boolean) => {
    setConfig((prev) => ({
      ...prev,
      addons: { ...prev.addons, [key]: value },
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0505] flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0505]">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/reseller/dashboard')}
              className="text-white/60 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">
                {tenant?.name || 'Client Configuration'}
              </h1>
              <p className="text-xs text-white/40">
                {tenant?.industry} • {tenant?.domain || 'No domain'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={copyEmbedCode}
              className="border-white/10 text-white hover:bg-white/5"
            >
              <Code className="h-4 w-4 mr-2" />
              Copy Embed Code
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-pink-500 to-gold-500 hover:from-pink-600 hover:to-gold-600"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="bg-white/5 p-1">
            <TabsTrigger
              value="branding"
              className="data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white"
            >
              <Palette className="h-4 w-4 mr-2" />
              Branding
            </TabsTrigger>
            <TabsTrigger
              value="ai"
              className="data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              AI Settings
            </TabsTrigger>
            <TabsTrigger
              value="addons"
              className="data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white"
            >
              <Settings className="h-4 w-4 mr-2" />
              Add-ons
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Colors</CardTitle>
                  <CardDescription className="text-white/60">
                    Customize the widget colors to match your brand
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-white/80">Primary Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={config.branding.primaryColor}
                        onChange={(e) =>
                          updateBranding('primaryColor', e.target.value)
                        }
                        className="h-10 w-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={config.branding.primaryColor}
                        onChange={(e) =>
                          updateBranding('primaryColor', e.target.value)
                        }
                        className="flex-1 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">Accent Color (Gold)</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={config.branding.primaryGold}
                        onChange={(e) =>
                          updateBranding('primaryGold', e.target.value)
                        }
                        className="h-10 w-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={config.branding.primaryGold}
                        onChange={(e) =>
                          updateBranding('primaryGold', e.target.value)
                        }
                        className="flex-1 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">Quick Colors</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => updateBranding('primaryColor', color)}
                          className="h-8 w-8 rounded-full border border-white/10 hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Logo & Font</CardTitle>
                  <CardDescription className="text-white/60">
                    Upload your logo and choose a font
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Logo URL</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://example.com/logo.png"
                        value={config.branding.logoUrl}
                        onChange={(e) =>
                          updateBranding('logoUrl', e.target.value)
                        }
                        className="flex-1 bg-white/5 border-white/10 text-white"
                      />
                      <Button 
                        variant="outline" 
                        className="border-white/10"
                        onClick={() => {
                          const input = document.getElementById('logo-upload-input') as HTMLInputElement;
                          input?.click();
                        }}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      <input
                        id="logo-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('logoUrl', e)}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">Header Background Image URL</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://example.com/header-bg.jpg"
                        value={config.branding.headerImage || ''}
                        onChange={(e) =>
                          updateBranding('headerImage', e.target.value)
                        }
                        className="flex-1 bg-white/5 border-white/10 text-white"
                      />
                      <Button 
                        variant="outline" 
                        className="border-white/10"
                        onClick={() => {
                          const input = document.getElementById('header-upload-input') as HTMLInputElement;
                          input?.click();
                        }}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      <input
                        id="header-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('headerImage', e)}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-white/40">
                      Recommended: 800x200px image. Used as the chat widget header background.
                    </p>
                    {config.branding.headerImage && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-white/10">
                        <img 
                          src={config.branding.headerImage} 
                          alt="Header preview" 
                          className="w-full h-20 object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">Font Family</Label>
                    <select
                      value={config.branding.font}
                      onChange={(e) => updateBranding('font', e.target.value)}
                      className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2"
                    >
                      <option value="Inter, sans-serif">Inter</option>
                      <option value="Roboto, sans-serif">Roboto</option>
                      <option value="Playfair Display, serif">Playfair Display</option>
                      <option value="Lato, sans-serif">Lato</option>
                      <option value="Montserrat, sans-serif">Montserrat</option>
                      <option value="Open Sans, sans-serif">Open Sans</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Settings Tab */}
          <TabsContent value="ai" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">AI Personality</CardTitle>
                  <CardDescription className="text-white/60">
                    Choose the AI mood and configure its behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-white/80">AI Name</Label>
                    <Input
                      placeholder="e.g. Kim, Assistant"
                      value={config.ai_config.aiName}
                      onChange={(e) => updateAiConfig('aiName', e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-white/80">AI Mood</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {AI_MOODS.map((mood) => (
                        <button
                          key={mood.value}
                          onClick={() => updateAiConfig('mood', mood.value)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            config.ai_config.mood === mood.value
                              ? 'border-pink-500 bg-pink-500/10'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="font-medium text-white">{mood.label}</div>
                          <div className="text-xs text-white/40 mt-1">
                            {mood.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">
                      Temperature: {config.ai_config.temperature}
                    </Label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.ai_config.temperature}
                      onChange={(e) =>
                        updateAiConfig('temperature', parseFloat(e.target.value))
                      }
                      className="w-full accent-pink-500"
                    />
                    <p className="text-xs text-white/40">
                      Lower = more focused, Higher = more creative
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Messages & Prompts</CardTitle>
                  <CardDescription className="text-white/60">
                    Customize the AI greeting and system prompt
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Welcome Greeting</Label>
                    <Textarea
                      placeholder="Welcome! How can I help you today?"
                      value={config.ai_config.greeting}
                      onChange={(e) =>
                        updateAiConfig('greeting', e.target.value)
                      }
                      className="bg-white/5 border-white/10 text-white min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">Special Offers</Label>
                    <Textarea
                      placeholder="Enter any special offers or promotions to include..."
                      value={config.special_offers || ''}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          special_offers: e.target.value,
                        }))
                      }
                      className="bg-white/5 border-white/10 text-white min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">System Prompt Addition</Label>
                    <Textarea
                      placeholder="Add custom instructions for the AI..."
                      value={config.ai_config.systemPrompt}
                      onChange={(e) =>
                        updateAiConfig('systemPrompt', e.target.value)
                      }
                      className="bg-white/5 border-white/10 text-white min-h-[120px] font-mono text-sm"
                    />
                    <p className="text-xs text-white/40">
                      This will be appended to the AI's system prompt
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Add-ons Tab */}
          <TabsContent value="addons" className="space-y-6">
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Feature Toggles</CardTitle>
                <CardDescription className="text-white/60">
                  Enable or disable widget features for this client
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white">Voice Input</Label>
                    <p className="text-sm text-white/40">
                      Allow users to speak their messages
                    </p>
                  </div>
                  <Switch
                    checked={config.addons.voiceEnabled}
                    onCheckedChange={(checked) =>
                      updateAddons('voiceEnabled', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white">Voice Output (TTS)</Label>
                    <p className="text-sm text-white/40">
                      AI reads responses aloud to users
                    </p>
                  </div>
                  <Switch
                    checked={config.addons.analyticsEnabled}
                    onCheckedChange={(checked) =>
                      updateAddons('analyticsEnabled', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white">WhatsApp Confirmations</Label>
                    <p className="text-sm text-white/40">
                      Send booking confirmations via WhatsApp
                    </p>
                  </div>
                  <Switch
                    checked={config.addons.whatsappEnabled}
                    onCheckedChange={(checked) =>
                      updateAddons('whatsappEnabled', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white">Email Notifications</Label>
                    <p className="text-sm text-white/40">
                      Send email notifications for new leads
                    </p>
                  </div>
                  <Switch
                    checked={config.addons.emailNotifications}
                    onCheckedChange={(checked) =>
                      updateAddons('emailNotifications', checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Widget Preview</CardTitle>
                <CardDescription className="text-white/60">
                  See how your widget will look on the client's website
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative h-[500px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden">
                  {/* Simulated website background */}
                  <div className="absolute inset-0 p-8">
                    <div className="h-8 w-32 bg-white/10 rounded mb-8" />
                    <div className="h-4 w-64 bg-white/5 rounded mb-4" />
                    <div className="h-4 w-48 bg-white/5 rounded mb-8" />
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-32 bg-white/5 rounded" />
                      <div className="h-32 bg-white/5 rounded" />
                      <div className="h-32 bg-white/5 rounded" />
                    </div>
                  </div>

                  {/* Widget preview */}
                  <div
                    className="absolute bottom-6 right-6 w-80 rounded-2xl border-2 overflow-hidden shadow-2xl"
                    style={{ borderColor: config.branding.primaryColor }}
                  >
                    {/* Widget header */}
                    <div
                      className="p-4 flex items-center gap-3"
                      style={{
                        background: `linear-gradient(135deg, ${config.branding.primaryColor}, ${config.branding.primaryGold})`,
                      }}
                    >
                      <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm">
                          {tenant?.name || 'Client Name'}
                        </div>
                        <div className="text-white/60 text-xs">
                          {config.ai_config.aiName} is online
                        </div>
                      </div>
                    </div>

                    {/* Widget messages */}
                    <div className="p-4 bg-gray-900/90 h-48">
                      <div className="bg-white/10 rounded-lg p-3 text-sm text-white/80">
                        {config.ai_config.greeting}
                      </div>
                    </div>

                    {/* Voice controls (shown when enabled) */}
                    {(config.addons.voiceEnabled || config.addons.analyticsEnabled) && (
                      <div className="px-3 py-2 bg-gray-850 flex gap-2 border-t border-white/5">
                        {config.addons.voiceEnabled && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-full border-white/20"
                            disabled
                          >
                            <svg className="h-4 w-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                          </Button>
                        )}
                        {config.addons.analyticsEnabled && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-full border-white/20"
                            disabled
                          >
                            <svg className="h-4 w-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Widget input */}
                    <div className="p-3 bg-gray-800 flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        className="flex-1 bg-white/5 border-white/10 text-white text-sm"
                        disabled
                      />
                      <Button
                        size="sm"
                        style={{ backgroundColor: config.branding.primaryColor }}
                        disabled
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-white/5 rounded-lg">
                  <h4 className="text-white font-medium mb-2">Embed Code</h4>
                  <pre className="text-xs text-white/60 font-mono overflow-x-auto">
{`<script>
  window.ovgConfig = {
    tenantId: "${tenantId}",
    widgetUrl: "https://ovg-engage.vercel.app"
  };
</script>
<script src="https://ovg-engage.vercel.app/src/loader.js"></script>`}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyEmbedCode}
                    className="mt-3 border-white/10 text-white hover:bg-white/5"
                  >
                    <Copy className="h-3 w-3 mr-2" />
                    Copy Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}