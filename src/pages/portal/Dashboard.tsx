import { useState, useEffect } from 'react';
import { useParams, useNavigate, Outlet } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Palette,
  BarChart3,
  Headphones,
  LogOut,
  Building2,
} from 'lucide-react';

export default function ClientPortalDashboard() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalConversions: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (tenant) {
      loadStats();
    }
  }, [tenant]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/login');
      return;
    }

    // Verify user has 'client' role and matches tenant ID
    const { data: userData, error } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('id', session.user.id)
      .maybeSingle() as any;

    if (error || !userData || userData.role !== 'client') {
      toast.error('Unauthorized access');
      navigate('/login');
      return;
    }

    // HARD CLIENT ISOLATION: Enforce client can only access their own portal
    if (userData.tenant_id !== clientId) {
      toast.error('You do not have permission to access this portal');
      return;
    }

    // Load client data
    const { data: tenantData } = await supabase
      .from('client_configs')
      .select('*')
      .eq('client_id', clientId)
      .single();

    setTenant(tenantData);
    setIsLoading(false);
  };

  const loadStats = async () => {
    const { data: statsData } = await supabase
      .from('daily_stats')
      .select('total_leads, conversions')
      .eq('tenant_id', clientId)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) as any;

    const totalLeads = statsData?.reduce((sum, s) => sum + (s.total_leads || 0), 0) || 0;
    const totalConversions = statsData?.reduce((sum, s) => sum + (s.conversions || 0), 0) || 0;

    setStats({
      totalLeads,
      totalConversions,
      conversionRate: totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0,
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    
    // Clear only Supabase auth keys (preserve widget configs, booking states, etc.)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.startsWith('supabase.auth.')) {
        localStorage.removeItem(key);
      }
    });
    
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0505] flex items-center justify-center">
        <div className="text-white/60">Loading portal...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0505]">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
           <div className="flex items-center gap-3">
             {tenant?.logo_url ? (
               <img 
                 src={tenant.logo_url} 
                 alt={tenant.name || 'Client Logo'} 
                 className="h-8 object-contain"
               />
             ) : (
               <img 
                 src="/images/omnivergeglobal.svg" 
                 alt="OmniVerge Global" 
                 className="h-8 object-contain"
               />
             )}
             <div>
               <h1 className="text-xl font-bold text-white">
                 {tenant?.name || 'OVG-Engage'}
               </h1>
               <p className="text-xs text-white/40 uppercase tracking-widest">
                 My Dashboard
               </p>
             </div>
           </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5 text-white/60" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-8">
        <Tabs defaultValue="settings" className="space-y-8">
          <TabsList className="bg-white/5 p-1">
            <TabsTrigger 
              value="settings" 
              className="data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white"
            >
              <Palette className="h-4 w-4 mr-2" />
              Widget Settings
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="support" 
              className="data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white"
            >
              <Headphones className="h-4 w-4 mr-2" />
              Support
            </TabsTrigger>
          </TabsList>

          <Outlet context={{ clientId, tenant, stats }} />
        </Tabs>
       </main>

       {/* Powered By Footer */}
       <footer className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-black/30 backdrop-blur-sm py-3 px-6">
         <div className="max-w-7xl mx-auto flex items-center justify-end gap-2 opacity-40 grayscale">
           <span className="text-xs text-white/60">Powered by</span>
           <img 
             src="/images/omnivergeglobal.svg" 
             alt="OmniVerge Global" 
             className="h-4"
           />
         </div>
       </footer>
     </div>
  );
}