import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Save,
  Upload,
  Palette,
} from 'lucide-react';

const PRESET_COLORS = [
  '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#22c55e',
  '#eab308', '#f97316', '#ef4444', '#06b6d4', '#84cc16',
  '#D4AF37', '#be185d', '#7c3aed', '#0891b2', '#059669',
];

interface WidgetConfig {
  branding: {
    primaryColor: string;
    primaryGold: string;
    logoUrl: string;
    font: string;
  };
}

export default function WidgetSettings() {
  const { clientId, tenant } = useOutletContext<any>();
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<WidgetConfig>({
    branding: {
      primaryColor: '#ec4899',
      primaryGold: '#D4AF37',
      logoUrl: '',
      font: 'Inter, sans-serif',
    },
  });

  const [originalConfig, setOriginalConfig] = useState<any>(null);

  useEffect(() => {
    if (clientId) {
      loadConfig();
    }
  }, [clientId]);

  const loadConfig = async () => {
    // ✅ Use widget_configs table (same as reseller ClientConfig.tsx)
    const { data: configData } = await supabase
      .from('widget_configs')
      .select('*')
      .eq('tenant_id', clientId)
      .maybeSingle();

    if (configData) {
      const loadedBranding = (configData as any).branding;
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

    // ✅ Use widget_configs table (same as reseller ClientConfig.tsx)
    const { error } = await (supabase as any)
      .from('widget_configs')
      .upsert({
        tenant_id: clientId,
        branding: config.branding,
      }, {
        onConflict: 'tenant_id',
      });

    // Calculate delta changes
    const changes: any = { old: {}, new: {} };
    
    Object.keys(config.branding).forEach(key => {
      if (originalConfig && config.branding[key as keyof typeof config.branding] !== originalConfig[key]) {
        changes.old[key] = originalConfig[key];
        changes.new[key] = config.branding[key as keyof typeof config.branding];
      }
    });

    // Create audit log entry
    await (supabase as any)
      .from('audit_logs')
      .insert({
        client_id: clientId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'widget_settings_updated',
        description: 'Client updated widget branding settings',
        changes: Object.keys(changes.old).length > 0 ? changes : config.branding,
      });

    // Update original config after save
    setOriginalConfig(structuredClone(config.branding));

    if (error) {
      toast.error('Failed to save configuration');
      console.error(error);
    } else {
      toast.success('Widget settings saved successfully! Changes will be live immediately.');
    }

    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Widget Settings</h2>
          <p className="text-sm text-white/40 mt-1">
            Customize your chat widget appearance to match your brand
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-pink-500 to-gold-500 hover:from-pink-600 hover:to-gold-600"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

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
                  onChange={(e) => updateBranding('primaryColor', e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer border-0"
                />
                <Input
                  value={config.branding.primaryColor}
                  onChange={(e) => updateBranding('primaryColor', e.target.value)}
                  className="flex-1 bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Accent Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.branding.primaryGold}
                  onChange={(e) => updateBranding('primaryGold', e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer border-0"
                />
                <Input
                  value={config.branding.primaryGold}
                  onChange={(e) => updateBranding('primaryGold', e.target.value)}
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
            <CardTitle className="text-white">Brand Logo</CardTitle>
            <CardDescription className="text-white/60">
              Upload your company logo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80">Logo URL</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/logo.png"
                  value={config.branding.logoUrl}
                  onChange={(e) => updateBranding('logoUrl', e.target.value)}
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

            {config.branding.logoUrl && (
              <div className="mt-4 rounded-lg overflow-hidden border border-white/10 p-4 bg-white/5">
                <img 
                  src={config.branding.logoUrl} 
                  alt="Logo preview" 
                  className="max-h-20 mx-auto"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}