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
  DialogDescription,
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

interface DailyStat {
  date: string;
  total_leads: number;
  total_revenue: number;
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

  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // ✅ SINGLE GLOBAL STATE ARRAY
  const [resellerPricing, setResellerPricing] = useState<any[]>([]);
  const [isEditingPricing, setIsEditingPricing] = useState(false);

  // ✅ CLEAN USEEFFECT CHAIN
  useEffect(() => {
    checkAuth();
    fetchPricingData();
  }, []);

  useEffect(() => {
    if (resellerData) {
      fetchTenants();
      fetchAuditLogs();
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

  const toggleAddon = (slug: string) => {
    setNewClientAddons(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
    );
  };

  const calculateMonthlyPrice = () => {
    const plan = pricingPlans.find(p => p.slug === newClientTier);
    const planPrice = plan?.price_to_client || 0;
    const addonsPrice = newClientAddons.reduce((sum, slug) => {
      const addon = addonDefinitions.find(a => a.slug === slug);
      return sum + (addon?.price_to_client || 0);
    }, 0);
    return planPrice + addonsPrice;
  };

  const calculateMonthlyCost = () => {
    const plan = pricingPlans.find(p => p.slug === newClientTier);
    const planCost = plan?.cost_to_us_max || 0;
    const addonsCost = newClientAddons.reduce((sum, slug) => {
      const addon = addonDefinitions.find(a => a.slug === slug);
      return sum + (addon?.cost_to_us_max || 0);
    }, 0);
    return planCost + addonsCost;
  };

  const calculateProfit = () => {
    return calculateMonthlyPrice() - calculateMonthlyCost();
  };

  const calculateSetupFee = () => {
    const plan = pricingPlans.find(p => p.slug === newClientTier);
    return plan?.setup_fee_zar || plan?.setup_fee || 0;
  };

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/reseller/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role, tenant_id')
        .eq('id', session.user.id)
        .maybeSingle() as any;

      if (userData && userData.role === 'client') {
        toast.error('You do not have access to the management console');
        window.location.href = `/portal/${userData.tenant_id}/settings`;
        return;
      }

      const { data: reseller, error } = await supabase
        .from('resellers')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching reseller:', error);
        return;
      }

      if (reseller) {
        setResellerData(reseller);
      } else {
        const { data: newReseller, error: insertError } = await supabase
          .from('resellers')
          .insert({
            user_id: session.user.id,
            email: session.user.email,
            company_name: session.user.user_metadata?.company_name || 'My Company',
            subscription_tier: 'free',
            max_tenants: 3,
          })
          .select()
          .single() as any;

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

  const fetchAuditLogs = async () => {
    const tenantIds = tenants.map(t => t.id);
    
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*')
      .in('client_id', tenantIds)
      .order('created_at', { ascending: false })
      .limit(15);

    setAuditLogs(logs || []);
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

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const tenantIds = tenants.map((t) => t.id).filter(id => uuidRegex.test(id));

    if (tenantIds.length === 0) {
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
        .in('tenant_id', tenantIds)
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

    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert(insertPayload)
      .select()
      .single() as any;

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Client added successfully!');
    setShowAddClient(false);
    setNewClientName('');
    setNewClientIndustry('Wellness');
    setNewClientDomain('');
    setNewClientEmail('');
    setNewClientMobile('');
    await fetchTenants();
  };

  const handleDeleteClient = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    const { error } = await supabase.from('tenants').delete().eq('id', tenantId);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Client deleted');
    await fetchTenants();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.startsWith('supabase.auth.')) {
        localStorage.removeItem(key);
      }
    });

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
    <div className="min-h-screen bg-[#0A0505] overflow-x-hidden w-screen max-w-full">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-gold-500 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {resellerData?.company_name || 'OVG Engage'}
              </h1>
              <p className="text-xs text-white/40 uppercase tracking-widest">
                Reseller Console
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

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-8 space-y-8 overflow-x-hidden w-full">
        {/* Tabs for Clients and Pricing */}
        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="bg-black/40 border-white/10 backdrop-blur-xl p-1">
            <TabsTrigger value="clients" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-white/60">
              <Building2 className="h-4 w-4 mr-2" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="pricing" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-white/60">
              <DollarSign className="h-4 w-4 mr-2" />
              Pricing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">
                Total Clients
              </CardTitle>
              <Users className="h-4 w-4 text-pink-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.totalClients}</div>
              <p className="text-xs text-white/40 mt-1">Active businesses</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">
                Total Leads
              </CardTitle>
              <Activity className="h-4 w-4 text-gold-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.totalLeads}</div>
              <p className="text-xs text-white/40 mt-1">Last 30 days</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                ${stats.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-white/40 mt-1">Last 30 days</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">
                Conversion Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.conversionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-white/40 mt-1">Lead to booking</p>
            </CardContent>
          </Card>
        </div>

          {/* Clients Section */}
          <div className="space-y-6 w-full max-w-full min-w-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 w-full min-w-0">
            <div>
              <h2 className="text-2xl font-bold text-white">Your Clients</h2>
              <p className="text-sm text-white/40 mt-1">
                Manage widget configurations and view analytics
              </p>
            </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full min-w-0">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <Button
                onClick={() => setShowAddClient(true)}
                className="bg-gradient-to-r from-pink-500 to-gold-500 hover:from-pink-600 hover:to-gold-600 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </div>
          </div>

          {/* Clients Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full min-w-0">
            {filteredTenants.map((tenant) => (
              <Card
                key={tenant.id}
                className="bg-black/40 border-white/10 backdrop-blur-xl hover:border-white/20 transition-colors w-full min-w-0"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-white">
                        {tenant.name}
                      </CardTitle>
                      <CardDescription className="text-white/40">
                        {tenant.industry}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4 text-white/60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-black border-white/10">
                        <DropdownMenuItem
                          onClick={() => navigate(`/reseller/client/${tenant.id}`)}
                          className="text-white/80"
                        >
                          Configure Widget
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate(`/reseller/client/${tenant.id}/services`)}
                          className="text-white/80"
                        >
                          Custom Services
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => copyEmbedCode(tenant)}
                          className="text-white/80"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Embed Code
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClient(tenant.id)}
                          className="text-red-400"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <ExternalLink className="h-3 w-3" />
                    {tenant.domain || 'No domain configured'}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        tenant.is_active ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <span className="text-xs text-white/40">
                      {tenant.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

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

          {filteredTenants.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/40">
                {searchQuery
                  ? 'No clients found matching your search.'
                  : 'No clients yet. Add your first client to get started!'}
              </p>
            </div>
          )}
        </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Pricing Management</h2>
                <p className="text-sm text-white/40 mt-1">
                  Set custom prices for your clients and track profit margins
                </p>
              </div>
              <Button
                onClick={async () => {
                  if (isEditingPricing) {
                    // ✅ SINGLE GLOBAL SAVE BUTTON
                    // Saves ALL changes at once
                    for (const plan of pricingPlans) {
                      const edited = resellerPricing.find((p: any) => p.plan_slug === plan.slug);
                      
                      await (supabase as any)
                        .from('pricing_plans')
                        .update({
                          price_to_client: edited?.price_to_client ?? plan.price_to_client,
                          setup_fee_zar: edited?.setup_fee_zar ?? plan.setup_fee_zar
                        })
                        .eq('id', plan.id);
                    }
                    toast.success('Pricing changes saved!');
                  }
                  setIsEditingPricing(!isEditingPricing);
                }}
                className="bg-gradient-to-r from-pink-500 to-gold-500 hover:from-pink-600 hover:to-gold-600"
              >
                {isEditingPricing ? 'Save All Changes' : 'Edit Prices'}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Subscription Plans</CardTitle>
                  <CardDescription className="text-white/40">
                    Set custom prices for your clients
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pricingPlans.map((plan) => {
                    const resellerPrice = resellerPricing.find(
                      (p: any) => p.plan_slug === plan.slug
                    );
                    const customPrice = resellerPrice?.price_to_client || plan.price_to_client;
                    const customSetupFee = resellerPrice?.setup_fee_zar ?? plan.setup_fee_zar ?? plan.setup_fee;
                    const profit = customPrice - plan.cost_to_us_max;

                    return (
                      <div key={plan.id} className="border border-white/10 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-white">{plan.name}</h4>
                            <p className="text-xs text-white/40">{plan.description}</p>
                          </div>
                        <div className="text-right">
                            <div className="text-sm text-white/60">Base Price</div>
                            <div className="text-lg font-bold text-gold-500">R{plan.price_to_client}/mo</div>
                            {plan.setup_fee > 0 && (
                              <div className="text-sm text-gold-400">+ R{plan.setup_fee} setup</div>
                            )}
                          </div>
                        </div>
                        
                        {isEditingPricing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-white/80 text-sm">Monthly Price (R)</Label>
                                <Input
                                  type="number"
                                  value={customPrice}
                                  onChange={(e) => {
                                    const newPrice = parseFloat(e.target.value);
                                    setResellerPricing(prev => {
                                      const existing = prev.find((p: any) => p.plan_slug === plan.slug);
                                      if (existing) {
                                        return prev.map((p: any) =>
                                          p.plan_slug === plan.slug
                                            ? { ...p, price_to_client: newPrice }
                                            : p
                                        );
                                      } else {
                                        return [...prev, {
                                          plan_slug: plan.slug,
                                          price_to_client: newPrice,
                                          setup_fee_zar: plan.setup_fee_zar
                                        }];
                                      }
                                    });
                                  }}
                                  className="bg-white/5 border-white/10 text-white"
                                  min={plan.cost_to_us_max}
                                />
                              </div>
                                <div className="space-y-2">
                                  <Label className="text-white/80 text-sm">Setup Fee (R)</Label>
                                  <Input
                                    type="number"
                                    value={customSetupFee}
                                    onChange={(e) => {
                                      const setupFee = parseFloat(e.target.value) || 0;
                                      setResellerPricing(prev => {
                                        const existing = prev.find((p: any) => p.plan_slug === plan.slug);
                                        if (existing) {
                                          return prev.map((p: any) =>
                                            p.plan_slug === plan.slug
                                              ? { ...p, setup_fee_zar: setupFee }
                                              : p
                                          );
                                        } else {
                                          return [...prev, {
                                            plan_slug: plan.slug,
                                            price_to_client: plan.price_to_client,
                                            setup_fee_zar: setupFee
                                          }];
                                        }
                                      });
                                    }}
                                    className="bg-white/5 border-white/10 text-white"
                                    min={0}
                                  />
                                </div>
                            </div>
                            <p className="text-xs text-white/40">
                              Minimum monthly price: R{plan.cost_to_us_max} (cost to you)
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-white/60">Your Price</div>
                              <div className="text-lg font-bold text-white">R{customPrice}</div>
                            </div>
                            <div>
                              <div className="text-sm text-white/60">Your Profit</div>
                              <div className={`text-lg font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                R{profit.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Add-ons</CardTitle>
                  <CardDescription className="text-white/40">
                    Set custom prices for add-on features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {addonDefinitions.map((addon) => {
                    const resellerPrice = resellerPricing.find(
                      (p: any) => p.addon_slug === addon.slug
                    );
                    const customPrice = resellerPrice?.price_to_client || addon.price_to_client;
                    const profit = customPrice - addon.cost_to_us_max;

                    return (
                      <div key={addon.id} className="border border-white/10 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-white">{addon.name}</h4>
                            <p className="text-xs text-white/40">{addon.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-white/60">Base Price</div>
                            <div className="text-lg font-bold text-gold-500">R{addon.price_to_client}</div>
                          </div>
                        </div>
                        
                        {isEditingPricing ? (
                          <div className="space-y-2">
                            <Label className="text-white/80 text-sm">Your Price</Label>
                            <Input
                              type="number"
                              value={customPrice}
                              onChange={(e) => {
                                const newPrice = parseFloat(e.target.value);
                                setResellerPricing(prev => {
                                  const existing = prev.find((p: any) => p.addon_slug === addon.slug);
                                  if (existing) {
                                    return prev.map((p: any) =>
                                      p.addon_slug === addon.slug
                                        ? { ...p, price_to_client: newPrice }
                                        : p
                                    );
                                  } else {
                                    return [...prev, {
                                      addon_slug: addon.slug,
                                      price_to_client: newPrice
                                    }];
                                  }
                                });
                              }}
                              className="bg-white/5 border-white/10 text-white"
                              min={addon.cost_to_us_max}
                            />
                            <p className="text-xs text-white/40">
                              Minimum price: R{addon.cost_to_us_max} (cost to you)
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-white/60">Your Price</div>
                              <div className="text-lg font-bold text-white">R{customPrice}</div>
                            </div>
                            <div>
                              <div className="text-sm text-white/60">Your Profit</div>
                              <div className={`text-lg font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                R{profit.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Client Dialog */}
      <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
        <DialogContent className="bg-black border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Client</DialogTitle>
            <DialogDescription className="text-white/60">
              Create a new client configuration for the chat widget.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-white/80">Company Name</Label>
              <Input
                placeholder="e.g. The Luxe Spa"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Industry</Label>
              <select
                value={newClientIndustry}
                onChange={(e) => setNewClientIndustry(e.target.value)}
                className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm"
              >
                <option value="Wellness">Wellness</option>
                <option value="Beauty">Beauty</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Hospitality">Hospitality</option>
                <option value="Retail">Retail</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Website Domain (optional)</Label>
              <Input
                placeholder="e.g. luxespa.com"
                value={newClientDomain}
                onChange={(e) => setNewClientDomain(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Contact Email</Label>
              <Input
                type="email"
                placeholder="client@company.com"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Mobile Number</Label>
              <Input
                type="tel"
                placeholder="+27 82 123 4567"
                value={newClientMobile}
                onChange={(e) => setNewClientMobile(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Subscription Tier</Label>
              <div className="grid grid-cols-2 gap-3">
                {pricingPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setNewClientTier(plan.slug)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      newClientTier === plan.slug
                        ? 'border-pink-500 bg-pink-500/20'
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <div className="font-semibold text-white">{plan.name}</div>
                    <div className="text-xs text-white/60 mt-1">{plan.description}</div>
                    <div className="text-sm text-gold-500 mt-2">
                      R{plan.price_to_client}/mo
                      {plan.setup_fee > 0 && (
                        <span className="block text-gold-400">+ R{plan.setup_fee} setup</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Add-ons (optional)</Label>
              <div className="grid grid-cols-1 gap-2">
                {addonDefinitions.map((addon) => (
                  <label
                    key={addon.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:border-white/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={newClientAddons.includes(addon.slug)}
                        onChange={() => toggleAddon(addon.slug)}
                        className="w-4 h-4 rounded border-white/30 text-pink-500 focus:ring-pink-500"
                      />
                      <div>
                        <div className="text-sm text-white">{addon.name}</div>
                        <div className="text-xs text-white/40">{addon.description}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gold-500">+R{addon.price_to_client}</div>
                  </label>
                ))}
              </div>
            </div>

            <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/60 text-sm">Monthly Revenue</span>
                  <span className="text-white font-semibold">R{calculateMonthlyPrice()}</span>
                </div>
                {calculateSetupFee() > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/60 text-sm">Setup Fee (one-time)</span>
                    <span className="text-gold-400 font-semibold">+ R{calculateSetupFee()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/60 text-sm">Monthly Cost</span>
                  <span className="text-red-400">-R{calculateMonthlyCost()}</span>
                </div>
                <div className="border-t border-white/10 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80 font-medium">Monthly Profit</span>
                  <span className="text-green-400 font-bold">R{calculateProfit()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddClient(false)}
              className="border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddClient}
              className="bg-gradient-to-r from-pink-500 to-gold-500"
            >
              Add Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
