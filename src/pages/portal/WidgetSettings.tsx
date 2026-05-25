import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Upload, Eye, Palette, Type, Image as ImageIcon } from 'lucide-react';

interface WidgetConfig {
  branding: {
    primaryColor: string;
    primaryGold: string;
    logoUrl: string;
    font: string;
  };
}

export default function WidgetSettings() {
  const { clientId } = useOutletContext<{ clientId: string }>();
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<WidgetConfig>({
    branding: {
      primaryColor: '#ec4899',
      primaryGold: '#D4AF37',
      logoUrl: '',
      font: 'Inter, sans-serif',
    },
  });

  const [originalConfig, setOriginalConfig] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (clientId) {
      loadConfig();
    }
  }, [clientId]);

  const loadConfig = async () => {
    // Use tenants table for branding
    const { data: configData } = await supabase
      .from('tenants')
      .select('branding')
      .eq('tenant_id', clientId)
      .maybeSingle();

    if (configData) {
      const loadedBranding = (configData as unknown as { branding: WidgetConfig['branding'] }).branding;
      setConfig({
        branding: loadedBranding,
      });
      setOriginalConfig(structuredClone(loadedBranding));
    }
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

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPG, PNG, WebP, or SVG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      updateBranding(key, base64String);
      toast.success('Image uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Use tenants table for branding
    const { error } = await (supabase.from('tenants') as unknown as {
      upsert: (data: Record<string, unknown>, opts?: Record<string, unknown>) => Promise<{ error: unknown }>;
    }).upsert({
      tenant_id: clientId,
      branding: config.branding,
    }, {
      onConflict: 'tenant_id',
    });

    // Calculate delta changes
    const changes: { old: Record<string, string>; new: Record<string, string> } = { old: {}, new: {} };
    
    Object.keys(config.branding).forEach(key => {
      if (originalConfig && config.branding[key as keyof typeof config.branding] !== originalConfig[key]) {
        changes.old[key] = originalConfig[key];
        changes.new[key] = config.branding[key as keyof typeof config.branding];
      }
    });

    // Create audit log entry
    await (supabase.from('audit_logs') as unknown as {
      insert: (data: Record<string, unknown>) => Promise<unknown>;
    }).insert({
      client_id: clientId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'widget_settings_updated',
      description: 'Client updated widget branding settings',
      changes: Object.keys(changes.old).length > 0 ? changes : config.branding,
    });

    setIsSaving(false);

    if (!error) {
      toast.success('Saved successfully!');
    } else {
      toast.error('Failed to save');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Widget Branding</h2>
          <p className="text-white/40 text-sm mt-1">
            Customize the look and feel of your AI widget
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-pink-500 to-amber-500 hover:from-pink-600 hover:to-amber-600">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Preview Card */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-3xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Eye className="h-4 w-4 text-pink-400" />
            Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="rounded-xl p-8 text-center"
            style={{
              background: `linear-gradient(135deg, ${config.branding.primaryColor}22, ${config.branding.primaryGold}22)`,
              border: `1px solid ${config.branding.primaryColor}44`,
            }}
          >
            <div className="text-4xl mb-3">
              {config.branding.logoUrl ? (
                <img src={config.branding.logoUrl} alt="Logo" className="h-12 mx-auto object-contain" />
              ) : (
                <div className="h-12 w-12 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: config.branding.primaryColor }}>
                  <ImageIcon className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold text-white mb-1">
              Widget Preview
            </h3>
            <p className="text-sm text-white/60" style={{ fontFamily: config.branding.font }}>
              This is how your widget will appear to visitors using the {config.branding.font} font.
            </p>
            <div className="flex gap-2 justify-center mt-4">
              <span className="px-3 py-1 text-xs rounded-full text-white" style={{ backgroundColor: config.branding.primaryColor }}>
                Primary
              </span>
              <span className="px-3 py-1 text-xs rounded-full text-white" style={{ backgroundColor: config.branding.primaryGold }}>
                Gold
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary Color */}
        <Card className="bg-black/40 border-white/10 backdrop-blur-3xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Palette className="h-4 w-4 text-pink-400" />
              Primary Color
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={config.branding.primaryColor}
                onChange={e => updateBranding('primaryColor', e.target.value)}
                className="h-10 w-16 rounded cursor-pointer bg-transparent border border-white/10"
              />
              <Input
                value={config.branding.primaryColor}
                onChange={e => updateBranding('primaryColor', e.target.value)}
                className="flex-1 bg-white/5 border-white/10 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Gold Accent */}
        <Card className="bg-black/40 border-white/10 backdrop-blur-3xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Palette className="h-4 w-4 text-amber-400" />
              Gold Accent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={config.branding.primaryGold}
                onChange={e => updateBranding('primaryGold', e.target.value)}
                className="h-10 w-16 rounded cursor-pointer bg-transparent border border-white/10"
              />
              <Input
                value={config.branding.primaryGold}
                onChange={e => updateBranding('primaryGold', e.target.value)}
                className="flex-1 bg-white/5 border-white/10 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card className="bg-black/40 border-white/10 backdrop-blur-3xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Type className="h-4 w-4 text-blue-400" />
              Typography
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3 items-center">
              <select
                value={config.branding.font}
                onChange={e => updateBranding('font', e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="Inter, sans-serif" className="bg-gray-900">Inter (Modern)</option>
                <option value="Playfair Display, serif" className="bg-gray-900">Playfair Display (Elegant)</option>
                <option value="Poppins, sans-serif" className="bg-gray-900">Poppins (Clean)</option>
                <option value="Georgia, serif" className="bg-gray-900">Georgia (Classic)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Logo Upload */}
        <Card className="bg-black/40 border-white/10 backdrop-blur-3xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="h-4 w-4 text-green-400" />
              Logo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3 items-center">
              <Input
                value={config.branding.logoUrl}
                onChange={e => updateBranding('logoUrl', e.target.value)}
                placeholder="Or paste image URL..."
                className="flex-1 bg-white/5 border-white/10 text-white"
              />
            </div>
            <label className="block">
              <span className="sr-only">Choose logo file</span>
              <input
                type="file"
                accept="image/*"
                onChange={e => handleFileUpload('logoUrl', e)}
                className="block w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-500 file:text-white hover:file:bg-pink-600"
              />
            </label>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}