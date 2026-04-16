import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  Search,
  LogOut,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Building2,
  Activity,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ✅ ORIGINAL CLEAN INTERFACES
interface Tenant {
  id: string;
  name: string;
  industry: string;
  domain: string | null;
  is_active: boolean;
  created_at: string;
  embed_code: string | null;
  subscription_tier: string;
  addons: string[];
}

interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cost_to_us_min: number;
  cost_to_us_max: number;
  price_to_client: number;
  setup_fee: number;
  setup_fee_zar: number;
  features: string[];
  is_active: boolean;
}

interface AddonDefinition {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cost_to_us_min: number;
  cost_to_us_max: number;
  price_to_client: number;
  is_active: boolean;
}

export default function ResellerDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientIndustry, setNewClientIndustry] = useState('Wellness');
  const [newClientDomain, setNewClientDomain] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientMobile, setNewClientMobile] = useState('');
  const [newClientCategory, setNewClientCategory] = useState('Health');
  const [newClientWebsite, setNewClientWebsite] = useState('');
  const [newClientTier, setNewClientTier] = useState('starter');
  const [newClientAddons, setNewClientAddons] = useState<string[]>([]);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [addonDefinitions, setAddonDefinitions] = useState<AddonDefinition[]>([]);
  const [resellerData, setResellerData] = useState<any>(null);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalLeads: 0,
    totalRevenue: 0,
    conversionRate: 0,
  });

  const [resellerPricing, setResellerPricing] = useState<any[]>([]);
  const [isEditingPricing, setIsEditingPricing] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchPricingData();
  }, []);

  useEffect(() => {
    if (resellerData) {
      fetchTenants();
    }
  }, [resellerData]);

  useEffect(() => {
    if (tenants.length > 0 && resellerData) {
      fetchStats();
    }
  }, [tenants, resellerData]);

  const fetchPricingData = async () => {
    const { data: plans } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_to_client');

    const { data: addons } = await supabase
      .from('addon_definitions')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (plans) setPricingPlans(plans);
    if (addons) setAddonDefinitions(addons);
  };

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/reseller/login');
        return;
      }

      const { data: reseller, error } = await supabase
        .from('resellers')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (reseller) {
        setResellerData(reseller);
      } else {
        const { data: newReseller, error: insertError } = await (supabase as any)
          .from('resellers')
          .insert({
            user_id: session.user.id,
            email: session.user.email,
            company_name: session.user.user_metadata?.company_name || 'My Company',
            subscription_tier: 'free',
            max_tenants: 3,
          })
          .select()
          .single();

        if (insertError) {
          toast.error('Failed to create reseller account');
          return;
        }

        setResellerData(newReseller);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenants = async () => {
    if (!resellerData) return;

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('reseller_id', resellerData.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenants:', error);
      return;
    }

    setTenants(data || []);
  };

  const fetchStats = async () => {
    if (!resellerData) return;

    setStats(prev => ({
      ...prev,
      totalClients: tenants.length
    }));

    if (tenants.length === 0) {
      setStats(prev => ({
        ...prev,
        totalLeads: 0,
        totalRevenue: 0,
        conversionRate: 0
      }));
      return;
    }

    try {
      const { data: statsData } = await supabase
        .from('daily_stats')
        .select('total_leads, total_revenue, conversions')
        .in('tenant_id', tenants.map(t => t.id))
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) as any;

      const totalLeads = statsData?.reduce((sum, s) => sum + (s.total_leads || 0), 0) || 0;
      const totalRevenue = statsData?.reduce((sum, s) => sum + (s.total_revenue || 0), 0) || 0;
      const totalConversions = statsData?.reduce((sum, s) => sum + (s.conversions || 0), 0) || 0;

      setStats({
        totalClients: tenants.length,
        totalLeads,
        totalRevenue,
        conversionRate: totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0,
      });

    } catch (err: any) {
      setStats(prev => ({
        ...prev,
        totalLeads: 0,
        totalRevenue: 0,
        conversionRate: 0
      }));
    }
  };

  const handleAddClient = async () => {
    if (!resellerData) {
      toast.error('Authentication error: Please sign in again');
      return;
    }
    
    if (!newClientName.trim()) {
      toast.error('Please enter a client name');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newClientEmail || !emailRegex.test(newClientEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    const insertPayload = {
      reseller_id: resellerData.id,
      name: newClientName.trim(),
      industry: newClientIndustry,
      domain: newClientDomain || null,
      contact_email: newClientEmail,
      contact_mobile: newClientMobile,
      is_active: true,
      subscription_tier: newClientTier,
      addons: newClientAddons,
    };

    const { data: tenant, error } = await (supabase as any)
      .from('tenants')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    if (newClientEmail) {
      const { data: user } = await supabase.auth.signUp({
        email: newClientEmail,
        password: 'TemporaryPassword123!',
      });

      if (user && user.user) {
        await (supabase as any)
          .from('clients')
          .insert({
            user_id: user.user.id,
            email: newClientEmail,
            company_name: newClientName.trim(),
            mobile_number: newClientMobile,
            business_category: newClientCategory,
            website_url: newClientWebsite,
            status: 'approved'
          });
      }
    }

    toast.success('Client added successfully!');
    setShowAddClient(false);
    setNewClientName('');
    setNewClientIndustry('Wellness');
    setNewClientDomain('');
    setNewClientEmail('');
    setNewClientMobile('');
    setNewClientWebsite('');
    await fetchTenants();
  };

  const handleDeleteClient = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    const { error } = await supabase.from('tenants').delete().eq('id', tenantId);
    if (error) { toast.error(error.message); return; }
    toast.success('Client deleted');
    await fetchTenants();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/reseller/login';
  };

  const copyEmbedCode = (tenant: Tenant) => {
    const embedCode = `<script>
  window.ovgConfig = {
    tenantId: "${tenant.id}",
    widgetUrl: "https://ovg-engage.vercel.app"
  };
</script>
<script src="https://ovg-engage.vercel.app/src/loader.js"></script>`;
    
    navigator.clipboard.writeText(embedCode);
    toast.success('Embed code copied to clipboard!');
  };

  const filteredTenants = tenants.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0505] flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] overflow-x-hidden w-screen max-w-full">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/omnivergeglobal.svg" alt="OmniVerge" className="h-10 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-white">
                {resellerData?.company_name || 'OVG Engage'}
              </h1>
              <p className="text-xs text-white/40 uppercase tracking-widest">
                Reseller Console
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5 text-white/60" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-8 space-y-8 overflow-x-hidden w-full">
        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="bg-black/40 border-[#0097b2]/20 backdrop-blur-xl p-1">
            <TabsTrigger value="clients" className="data-[state=active]:bg-[#0097b2] data-[state=active]:text-white text-white/60">
              <Building2 className="h-4 w-4 mr-2" />
              Clients
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 w-full min-w-0">
              <h2 className="text-2xl font-bold text-white">Your Clients</h2>
              <Button
                onClick={() => setShowAddClient(true)}
                className="bg-gradient-to-r from-[#0097b2] to-[#D4AF37] hover:from-[#008aa3] hover:to-[#c49f30] w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full min-w-0">
              {filteredTenants.map((tenant) => (
                <Card key={tenant.id} className="bg-black/40 border-white/10 backdrop-blur-xl hover:border-white/20 transition-colors w-full min-w-0">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-white">{tenant.name}</CardTitle>
                    <CardDescription className="text-white/40">{tenant.industry}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-white/10 text-white hover:bg-white/5"
                      onClick={() => navigate(`/reseller/client/${tenant.id}`)}
                    >
                      Configure Widget
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Client Dialog */}
      <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
        <DialogContent className="bg-black/80 border border-[#D4AF37]/50 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#0097b2] to-[#D4AF37]">
              Add New Client
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white/80">Company Name</Label>
              <Input className="bg-white/5 border-[#0097b2]/30 focus:border-[#D4AF37] text-white" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Email</Label>
              <Input className="bg-white/5 border-[#0097b2]/30 focus:border-[#D4AF37] text-white" type="email" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Mobile Nr.</Label>
              <Input className="bg-white/5 border-[#0097b2]/30 focus:border-[#D4AF37] text-white" value={newClientMobile} onChange={e => setNewClientMobile(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Website URL</Label>
              <Input className="bg-white/5 border-[#0097b2]/30 focus:border-[#D4AF37] text-white" placeholder="https://www.theirbusiness.com" value={newClientWebsite} onChange={e => setNewClientWebsite(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Business Category</Label>
              <select 
                className="w-full bg-[#0A0F1C] border border-[#0097b2]/30 text-white p-2 rounded-md focus:border-[#D4AF37] outline-none"
                value={newClientCategory}
                onChange={e => setNewClientCategory(e.target.value)}
              >
                {['Health', 'Beauty', 'Auto Retail', 'Insurance', 'Real Estate', 'Hospitality', 'Professional Services', 'Other'].map(c => (
                  <option key={c} value={c} className="bg-[#0A0F1C]">{c}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => setShowAddClient(false)}>Cancel</Button>
            <Button className="bg-gradient-to-r from-[#0097b2] to-[#D4AF37] hover:from-[#008aa3] hover:to-[#B89630]" onClick={handleAddClient}>Add Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
