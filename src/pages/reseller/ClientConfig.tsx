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
  Palette,
  MessageSquare,
  Settings,
  Upload,
  Code,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';

const AI_MOODS = [
  { value: 'luxurious', label: '✨ Luxurious' },
  { value: 'professional', label: '💼 Professional' },
  { value: 'friendly', label: '😊 Friendly' },
  { value: 'minimal', label: '🎯 Minimal' },
  { value: 'playful', label: '🎉 Playful' },
];

const PRESET_COLORS = [
  '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#22c55e',
  '#eab308', '#f97316', '#ef4444', '#06b6d4', '#84cc16',
  '#D4AF37', '#be185d', '#7c3aed', '#0891b2', '#059669',
];

const FONTS = [
  { family: 'Inter, sans-serif', label: 'Inter (Modern/Tech)' },
  { family: 'Montserrat, sans-serif', label: 'Montserrat (Bold/Clean)' },
  { family: 'Playfair Display, serif', label: 'Playfair Display (High-end/Serif)' },
  { family: 'Roboto, sans-serif', label: 'Roboto (Universal/Clean)' },
  { family: 'Open Sans, sans-serif', label: 'Open Sans (Friendly/Readable)' },
  { family: 'Poppins, sans-serif', label: 'Poppins (Geometric/Elegant)' },
  { family: 'Lora, serif', label: 'Lora (Sophisticated/Serif)' },
  { family: 'Fira Code, monospace', label: 'Fira Code (Technical/Monospace)' },
  { family: 'system-ui, sans-serif', label: 'System Sans (Standard/Fast)' },
];

export default function ClientConfig() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  
  const [config, setConfig] = useState<any>({
    branding: { 
      primaryColor: '#ec4899', 
      primaryGold: '#D4AF37', 
      logoUrl: '', 
      font: 'Inter, sans-serif', 
      headerImage: '', 
      footerImage: '',
      headerOverlayOpacity: 20,
      footerOverlayOpacity: 20,
      chatBubblePosition: 'bottom-right' 
    },
    ai_config: { mood: 'professional', temperature: 0.7, aiName: 'Assistant', greeting: 'Welcome!', systemPrompt: '' },
    offerings: { treatments: ['Consultation'], prices: { Consultation: 100 }, currency: '$' },
    addons: { voiceEnabled: true, analyticsEnabled: true, whatsappEnabled: true, emailNotifications: false },
    allowed_domains: [],
    special_offers: '',
  });

  useEffect(() => {
    if (tenantId) loadTenantData(tenantId);
  }, [tenantId]);

  const loadTenantData = async (id: string) => {
    const { data: tenantData } = await supabase.from('tenants').select('*').eq('id', id).single();
    if (!tenantData) { toast.error('Client not found'); navigate('/reseller/dashboard'); return; }
    setTenant(tenantData);

    const { data: configData } = await (supabase as any).from('widget_configs').select('*').eq('tenant_id', id).maybeSingle();
    if (configData) {
      setConfig({
        branding: { 
          primaryColor: '#ec4899', 
          primaryGold: '#D4AF37', 
          logoUrl: '', 
          font: 'Inter, sans-serif', 
          headerImage: '', 
          footerImage: '',
          headerOverlayOpacity: 20,
          footerOverlayOpacity: 20,
          chatBubblePosition: 'bottom-right',
          ...configData.branding 
        },
        ...configData 
      });
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    if (!tenantId) return;
    const { error } = await (supabase as any).from('widget_configs').upsert({ tenant_id: tenantId, ...config }, { onConflict: 'tenant_id' });
    if (error) {
      toast.error('Failed to save');
    } else {
      toast.success('Configuration saved!');
    }
    setIsSaving(false);
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(`<script>window.ovgConfig={tenantId:"${tenantId}",widgetUrl:"https://ovg-engage.vercel.app"};</script><script src="https://ovg-engage.vercel.app/src/loader.js"></script>`);
    toast.success('Embed code copied!');
  };

  const updateConfig = (path: string, value: any) => {
    setConfig((prev: any) => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let obj: any = newConfig;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const handleFileUpload = (field: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      updateConfig(`branding.${field}`, e.target?.result as string);
      toast.success(`${field} uploaded successfully!`);
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) return <div className="min-h-screen bg-[#0A0505] flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0A0505] relative z-0">
      {/* Header */}
      <header className="border-b border-[#D4AF37] bg-gradient-to-r from-black/80 to-[#0A0505]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Button variant="outline" className="border-[#D4AF37]/50 text-white hover:bg-white/10 min-h-[44px]" onClick={() => navigate('/reseller/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <img src="/images/omnivergeglobal.svg" alt="OmniVerge" className="h-10 w-auto hidden sm:block" />
            <div className="border-l border-white/10 pl-4">
              <h1 className="text-xl font-bold text-white">{tenant?.name || 'Client Configuration'}</h1>
              <p className="text-xs text-white/40">{tenant?.industry} • {tenant?.domain || 'No domain'}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button variant="outline" className="border-[#D4AF37]/50 text-white hover:bg-white/10 min-h-[44px] w-full" onClick={copyEmbedCode}><Code className="h-4 w-4 mr-2" />Embed</Button>
            <Button className="bg-gradient-to-r from-[#0097b2] to-[#D4AF37] min-h-[44px] w-full text-[#0A2540] font-bold" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />{isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
        <Tabs defaultValue="branding" className="space-y-6">
          {/* Tabs - 2x2 Grid on Mobile */}
          <TabsList dir="ltr" className="grid grid-cols-2 gap-2 w-full p-2 h-auto min-h-[100px] bg-[#0097b2]/5 rounded-lg border border-[#D4AF37]/20 sm:flex sm:flex-row sm:h-auto sm:min-h-0">
            <TabsTrigger value="branding" className="flex-1 h-12 flex items-center justify-center text-sm font-medium rounded-md data-[state=active]:bg-[#0097b2] data-[state=active]:text-white text-white/80 hover:bg-[#0097b2]">
              <Palette className="h-4 w-4 mr-2" />Branding
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 h-12 flex items-center justify-center text-sm font-medium rounded-md data-[state=active]:bg-[#0097b2] data-[state=active]:text-white text-white/80 hover:bg-[#0097b2]">
              <MessageSquare className="h-4 w-4 mr-2" />AI
            </TabsTrigger>
            <TabsTrigger value="addons" className="flex-1 h-12 flex items-center justify-center text-sm font-medium rounded-md border border-[#D4AF37] text-[#D4AF37] bg-transparent hover:bg-[#D4AF37]/10 data-[state=active]:bg-[#0097b2] data-[state=active]:text-white">
              <Settings className="h-4 w-4 mr-2" />Add-ons
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex-1 h-12 flex items-center justify-center text-sm font-medium rounded-md border border-[#D4AF37] text-[#D4AF37] bg-transparent hover:bg-[#D4AF37]/10 data-[state=active]:bg-[#0097b2] data-[state=active]:text-white">
              <Eye className="h-4 w-4 mr-2" />Preview
            </TabsTrigger>
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            {/* Typography Card */}
            <Card className="bg-[#0097b2]/10 backdrop-blur-md border border-[#D4AF37] relative z-10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><Palette className="h-5 w-5 text-[#D4AF37]" />Typography</CardTitle>
                <CardDescription className="text-white/60">Choose your brand font</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white mb-2 block">Font Family</Label>
                  <select 
                    className="w-full bg-black/40 border border-[#D4AF37]/50 text-white p-3 rounded-lg min-h-[44px]"
                    value={config?.branding?.font || 'Inter, sans-serif'}
                    onChange={(e) => updateConfig('branding.font', e.target.value)}
                    style={{ fontFamily: config?.branding?.font }}
                  >
                    {FONTS.map((font) => (
                      <option key={font.family} value={font.family} style={{ fontFamily: font.family }}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p-4 bg-black/20 rounded-lg border border-[#D4AF37]/20">
                  <p className="text-white/60 text-sm mb-2">Preview:</p>
                  <p className="text-[#D4AF37] text-xl" style={{ fontFamily: config?.branding?.font }}>
                    The quick brown fox jumps over the lazy dog
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Colors Card */}
            <Card className="bg-[#0097b2]/10 backdrop-blur-md border border-[#D4AF37] relative z-10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><Palette className="h-5 w-5 text-[#D4AF37]" />Colors</CardTitle>
                <CardDescription className="text-white/60">Choose your brand colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button key={color} className="w-11 h-11 rounded-full border-2 border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all min-h-[44px]" style={{ backgroundColor: color }} onClick={() => updateConfig('branding.primaryColor', color)} />
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label className="text-white mb-2 block">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={config?.branding?.primaryColor || '#ec4899'} onChange={(e) => updateConfig('branding.primaryColor', e.target.value)} className="h-12 w-16 bg-black/40 border-[#D4AF37]/30 cursor-pointer" />
                      <Input type="text" value={config?.branding?.primaryColor || '#ec4899'} onChange={(e) => updateConfig('branding.primaryColor', e.target.value)} className="flex-1 bg-black/40 border-[#D4AF37]/30 text-white h-12" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label className="text-white mb-2 block">Gold Accent</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={config?.branding?.primaryGold || '#D4AF37'} onChange={(e) => updateConfig('branding.primaryGold', e.target.value)} className="h-12 w-16 bg-black/40 border-[#D4AF37]/30 cursor-pointer" />
                      <Input type="text" value={config?.branding?.primaryGold || '#D4AF37'} onChange={(e) => updateConfig('branding.primaryGold', e.target.value)} className="flex-1 bg-black/40 border-[#D4AF37]/30 text-white h-12" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logo Card */}
            <Card className="bg-[#0097b2]/10 backdrop-blur-md border border-[#D4AF37] relative z-10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><ImageIcon className="h-5 w-5 text-[#D4AF37]" />Logo</CardTitle>
                <CardDescription className="text-white/60">Upload your logo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white mb-2 block">Logo URL</Label>
                  <Input value={config?.branding?.logoUrl || ''} onChange={(e) => updateConfig('branding.logoUrl', e.target.value)} className="bg-black/40 border-[#D4AF37]/30 text-white w-full min-h-[44px]" placeholder="https://example.com/logo.png" />
                </div>
                <div>
                  <Label className="text-white mb-2 block">Upload Logo</Label>
                  <label className="border-2 border-dashed border-[#D4AF37]/50 rounded-lg p-6 text-center cursor-pointer hover:border-[#D4AF37] transition-colors block min-h-[100px]">
                    <Upload className="h-8 w-8 mx-auto text-white/40 mb-2" />
                    <p className="text-white/60 text-sm">Drag and drop or click to upload</p>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('logoUrl', e)} />
                  </label>
                </div>
                {config?.branding?.logoUrl && (
                  <div className="mt-4 p-4 bg-black/20 rounded-lg border border-[#D4AF37]/20">
                    <img src={config.branding.logoUrl} alt="Logo preview" className="h-16 mx-auto object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Header Image Card */}
            <Card className="bg-[#0097b2]/10 backdrop-blur-md border border-[#D4AF37] relative z-10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><ImageIcon className="h-5 w-5 text-[#D4AF37]" />Header Background</CardTitle>
                <CardDescription className="text-white/60">Set the header background image</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white mb-2 block">Header Image URL</Label>
                  <Input value={config?.branding?.headerImage || ''} onChange={(e) => updateConfig('branding.headerImage', e.target.value)} className="bg-black/40 border-[#D4AF37]/30 text-white w-full min-h-[44px]" placeholder="https://example.com/header.jpg" />
                </div>
                <div>
                  <Label className="text-white mb-2 block">Upload Header Image</Label>
                  <label className="border-2 border-dashed border-[#D4AF37]/50 rounded-lg p-6 text-center cursor-pointer hover:border-[#D4AF37] transition-colors block min-h-[100px]">
                    <Upload className="h-8 w-8 mx-auto text-white/40 mb-2" />
                    <p className="text-white/60 text-sm">Drag and drop or click to upload</p>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('headerImage', e)} />
                  </label>
                </div>
                {config?.branding?.headerImage && (
                  <div className="relative mt-4 rounded-lg overflow-hidden border border-[#D4AF37]/20" style={{ opacity: 1 - (config?.branding?.headerOverlayOpacity || 20) / 100 }}>
                    <img src={config.branding.headerImage} alt="Header preview" className="w-full h-24 object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    <div className="absolute inset-0 bg-black flex items-center justify-center">
                      <span className="text-white text-sm">Header Preview (Opacity: {100 - (config?.branding?.headerOverlayOpacity || 20)}%)</span>
                    </div>
                  </div>
                )}
                {/* Header Overlay Opacity Slider */}
                <div className="mt-4 p-4 bg-black/20 rounded-lg">
                  <Label className="text-white mb-3 block">Header Overlay Opacity: {config?.branding?.headerOverlayOpacity || 20}%</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config?.branding?.headerOverlayOpacity || 20}
                    onChange={(e) => updateConfig('branding.headerOverlayOpacity', parseInt(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none cursor-pointer min-h-[44px] bg-gradient-to-r from-[#0097b2] to-[#D4AF37]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Footer Image Card */}
            <Card className="bg-[#0097b2]/10 backdrop-blur-md border border-[#D4AF37] relative z-10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><ImageIcon className="h-5 w-5 text-[#D4AF37]" />Footer Background</CardTitle>
                <CardDescription className="text-white/60">Set the footer background image</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white mb-2 block">Footer Image URL</Label>
                  <Input value={config?.branding?.footerImage || ''} onChange={(e) => updateConfig('branding.footerImage', e.target.value)} className="bg-black/40 border-[#D4AF37]/30 text-white w-full min-h-[44px]" placeholder="https://example.com/footer.jpg" />
                </div>
                <div>
                  <Label className="text-white mb-2 block">Upload Footer Image</Label>
                  <label className="border-2 border-dashed border-[#D4AF37]/50 rounded-lg p-6 text-center cursor-pointer hover:border-[#D4AF37] transition-colors block min-h-[100px]">
                    <Upload className="h-8 w-8 mx-auto text-white/40 mb-2" />
                    <p className="text-white/60 text-sm">Drag and drop or click to upload</p>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('footerImage', e)} />
                  </label>
                </div>
                {config?.branding?.footerImage && (
                  <div className="relative mt-4 rounded-lg overflow-hidden border border-[#D4AF37]/20" style={{ opacity: 1 - (config?.branding?.footerOverlayOpacity || 20) / 100 }}>
                    <img src={config.branding.footerImage} alt="Footer preview" className="w-full h-16 object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    <div className="absolute inset-0 bg-black flex items-center justify-center">
                      <span className="text-white text-sm">Footer Preview (Opacity: {100 - (config?.branding?.footerOverlayOpacity || 20)}%)</span>
                    </div>
                  </div>
                )}
                {/* Footer Overlay Opacity Slider */}
                <div className="mt-4 p-4 bg-black/20 rounded-lg">
                  <Label className="text-white mb-3 block">Footer Overlay Opacity: {config?.branding?.footerOverlayOpacity || 20}%</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config?.branding?.footerOverlayOpacity || 20}
                    onChange={(e) => updateConfig('branding.footerOverlayOpacity', parseInt(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none cursor-pointer min-h-[44px] bg-gradient-to-r from-[#0097b2] to-[#D4AF37]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Settings Tab */}
          <TabsContent value="ai" className="space-y-6">
            <Card className="bg-[#0097b2]/10 backdrop-blur-md border border-[#D4AF37] relative z-10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><MessageSquare className="h-5 w-5 text-[#D4AF37]" />AI Configuration</CardTitle>
                <CardDescription className="text-white/60">Customize the AI behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white mb-2 block">AI Name</Label>
                  <Input value={config?.ai_config?.aiName || 'Assistant'} onChange={(e) => updateConfig('ai_config.aiName', e.target.value)} className="bg-black/40 border-[#D4AF37]/30 text-white w-full min-h-[44px]" />
                </div>
                <div>
                  <Label className="text-white mb-2 block">Mood</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {AI_MOODS.map((mood) => (
                      <Button key={mood.value} variant={config?.ai_config?.mood === mood.value ? 'default' : 'outline'} className={config?.ai_config?.mood === mood.value ? 'bg-[#0097b2]' : 'border-[#D4AF37]/50 text-white'} onClick={() => updateConfig('ai_config.mood', mood.value)}>{mood.label}</Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-white mb-2 block">Greeting Message</Label>
                  <Textarea value={config?.ai_config?.greeting || ''} onChange={(e) => updateConfig('ai_config.greeting', e.target.value)} className="bg-black/40 border-[#D4AF37]/30 text-white min-h-[80px] w-full" />
                </div>
                <div>
                  <Label className="text-white mb-2 block">System Prompt</Label>
                  <Textarea value={config?.ai_config?.systemPrompt || ''} onChange={(e) => updateConfig('ai_config.systemPrompt', e.target.value)} className="bg-black/40 border-[#D4AF37]/30 text-white min-h-[120px] w-full" placeholder="Instructions for the AI..." />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add-ons Tab */}
          <TabsContent value="addons" className="space-y-6">
            <Card className="bg-[#0097b2]/10 backdrop-blur-md border border-[#D4AF37] relative z-10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><Settings className="h-5 w-5 text-[#D4AF37]" />Premium Features</CardTitle>
                <CardDescription className="text-white/60">Enable additional features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-[#D4AF37]/20 min-h-[60px]">
                  <div><Label className="text-white">Voice Support</Label><p className="text-white/60 text-sm">Enable voice commands</p></div>
                  <Switch checked={config?.addons?.voiceEnabled} onCheckedChange={(checked) => updateConfig('addons.voiceEnabled', checked)} />
                </div>
                <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-[#D4AF37]/20 min-h-[60px]">
                  <div><Label className="text-white">Analytics</Label><p className="text-white/60 text-sm">Track conversations</p></div>
                  <Switch checked={config?.addons?.analyticsEnabled} onCheckedChange={(checked) => updateConfig('addons.analyticsEnabled', checked)} />
                </div>
                <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-[#D4AF37]/20 min-h-[60px]">
                  <div><Label className="text-white">WhatsApp</Label><p className="text-white/60 text-sm">WhatsApp messaging</p></div>
                  <Switch checked={config?.addons?.whatsappEnabled} onCheckedChange={(checked) => updateConfig('addons.whatsappEnabled', checked)} />
                </div>
                <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-[#D4AF37]/20 min-h-[60px]">
                  <div><Label className="text-white">Email</Label><p className="text-white/60 text-sm">Email notifications</p></div>
                  <Switch checked={config?.addons?.emailNotifications} onCheckedChange={(checked) => updateConfig('addons.emailNotifications', checked)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab - Bottom of stack on mobile */}
          <TabsContent value="preview" className="space-y-6">
            <Card className="bg-[#0097b2]/10 backdrop-blur-md border border-[#D4AF37] relative z-10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><Eye className="h-5 w-5 text-[#D4AF37]" />Widget Preview</CardTitle>
                <CardDescription className="text-white/60">See how your widget will look</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-black/60 border border-[#D4AF37]/50 rounded-lg p-6 sm:p-8 text-center" style={{ fontFamily: config?.branding?.font }}>
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl" style={{ backgroundColor: config?.branding?.primaryColor || '#ec4899' }}>
                    💬
                  </div>
                  <p className="text-white font-medium">{tenant?.name || 'Your Widget'}</p>
                  <p className="text-white/60 text-sm mt-1">{config?.ai_config?.aiName || 'Assistant'}</p>
                  <p className="text-[#D4AF37] text-xl mt-4" style={{ fontFamily: config?.branding?.font }}>
                    The quick brown fox jumps over the lazy dog
                  </p>
                </div>
                <div className="mt-4 p-3 bg-black/20 rounded-lg border border-[#D4AF37]/20">
                  <p className="text-white/60 text-xs">Current Font: <span className="text-white">{config?.branding?.font?.split(',')[0] || 'Inter'}</span></p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
