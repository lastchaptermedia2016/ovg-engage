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
  Clock,
  Play,
  Pause,
  CheckCircle,
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

  // Dev Timer State
  const RATE_PER_HOUR = 850;
  const [timerState, setTimerState] = useState({
    isRunning: false, isPaused: false,
    startTime: null, elapsed: 0, activeJobId: null,
  });
  const [jobSessions, setJobSessions] = useState([
    { id: '1', date: '2024-04-15', startTime: '09:00', endTime: '11:30', duration: 2.5, bill: 2125, notes: 'Widget setup for Luna Wellness' },
    { id: '2', date: '2024-04-10', startTime: '14:00', endTime: '18:00', duration: 4, bill: 3400, notes: 'Custom API integration for Luvo' },
  ]);
  const [newSessionNotes, setNewSessionNotes] = useState('');

  // Calculate total for selected client
  const totalProjectValue = jobSessions.reduce((sum, s) => sum + s.bill, 0);

  // Timer Functions
  const startTimer = async () => {
    const startTime = Date.now();
    const { data } = await (supabase as any).from('custom_dev_jobs').insert({
      reseller_id: resellerData?.id,
      start_time: new Date().toISOString(),
      status: 'active'
    }).select().single();
    
    setTimerState({
      isRunning: true, isPaused: false,
      startTime, elapsed: 0,
      activeJobId: data?.id || `local-${startTime}`
    });
  };

  const pauseTimer = () => setTimerState(prev => ({ ...prev, isPaused: true }));
  
  const resumeTimer = () => setTimerState(prev => ({ ...prev, isPaused: false }));

  const completeTimer = async () => {
    if (!timerState.startTime) return;
    const totalSeconds = timerState.elapsed;
    const totalCost = (totalSeconds / 3600) * RATE_PER_HOUR;
    const endTime = new Date().toISOString();
    
    // Add to local sessions
    const newSession = {
      id: timerState.activeJobId || `local-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      startTime: new Date(timerState.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      endTime: new Date().toISOString().split('T')[1]?.slice(0, 5) || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration: parseFloat((totalSeconds / 3600).toFixed(1)),
      bill: Math.round(totalCost),
      notes: newSessionNotes || 'Development session'
    };
    setJobSessions(prev => [newSession, ...prev]);
    setNewSessionNotes('');
    
    // Save to Supabase if we have an active job ID
    if (timerState.activeJobId && !timerState.activeJobId.startsWith('local-')) {
      await (supabase as any).from('custom_dev_jobs').update({
        end_time: endTime,
        total_seconds: totalSeconds,
        total_cost: totalCost,
        notes: newSessionNotes,
        status: 'completed'
      }).eq('id', timerState.activeJobId);
    }
    
    setTimerState({
      isRunning: false, isPaused: false,
      startTime: null, elapsed: 0,
      activeJobId: null
    });
    toast.success(`Session completed! Total: R${Math.round(totalCost).toLocaleString()}`);
  };

  // Timer useEffect
  useEffect(() => {
    let interval: any;
    if (timerState.isRunning && !timerState.isPaused && timerState.startTime) {
      interval = setInterval(() => {
        setTimerState(prev => ({
          ...prev,
          elapsed: Math.floor((Date.now() - (prev.startTime || 0)) / 1000)
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.isPaused, timerState.startTime]);

  // Check for active job on mount
  useEffect(() => {
    const checkActiveJob = async () => {
      if (!resellerData?.id) return;
      const { data } = await supabase
        .from('custom_dev_jobs')
        .select('*')
        .eq('reseller_id', resellerData.id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (data?.start_time) {
        const startTime = new Date(data.start_time).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setTimerState({
          isRunning: true, isPaused: false,
          startTime, elapsed,
          activeJobId: data.id
        });
      }
    };
    checkActiveJob();
  }, [resellerData?.id]);

  // Dynamic Pricing State
  const [pricingState, setPricingState] = useState({
    starter: { yourPrice: 499, manualCost: '', setupFee: 0, setupCost: 0 },
    professional: { yourPrice: 999, manualCost: '', setupFee: 0, setupCost: 0 },
    business: { yourPrice: 1999, manualCost: '', setupFee: 0, setupCost: 0 },
    enterprise: { yourPrice: 3999, manualCost: '', setupFee: 0, setupCost: 0 },
    crm: { yourPrice: 99, manualCost: '', setupFee: 0, setupCost: 0 },
    afterhours: { yourPrice: 149, manualCost: '', setupFee: 0, setupCost: 0 },
    analytics: { yourPrice: 79, manualCost: '', setupFee: 0, setupCost: 0 },
    api: { yourPrice: 199, manualCost: '', setupFee: 0, setupCost: 0 },
    emotionai: { yourPrice: 249, manualCost: '', setupFee: 0, setupCost: 0 },
    extraconvos: { yourPrice: 99, manualCost: '', setupFee: 0, setupCost: 0 },
    multilingual: { yourPrice: 129, manualCost: '', setupFee: 0, setupCost: 0 },
    proactive: { yourPrice: 149, manualCost: '', setupFee: 0, setupCost: 0 },
    voice: { yourPrice: 179, manualCost: '', setupFee: 0, setupCost: 0 },
    whitelabel: { yourPrice: 299, manualCost: '', setupFee: 0, setupCost: 0 },
  });

  const basePrices: Record<string, number> = {
    starter: 499, professional: 999, business: 1999, enterprise: 3999,
    crm: 99, afterhours: 149, analytics: 79, api: 199, emotionai: 249,
    extraconvos: 99, multilingual: 129, proactive: 149, voice: 179, whitelabel: 299,
  };

  const calculateProfit = (price: number, cost: string, base: number) => {
    const effectiveCost = cost ? parseFloat(cost) : base;
    return price - effectiveCost;
  };

  const updatePricing = (key: string, field: 'yourPrice' | 'manualCost' | 'setupFee' | 'setupCost', value: string | number) => {
    setPricingState(prev => ({
      ...prev,
      [key]: { ...prev[key as keyof typeof prev], [field]: value }
    }));
  };

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
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col items-center gap-4 w-full text-center">
            <img src="/images/omnivergeglobal.svg" alt="OmniVerge" className="h-8 w-auto" />
            <div>
              <h1 className="text-xl md:text-4xl font-bold text-white">
                {resellerData?.company_name || 'OVG Engage'}
              </h1>
              <p className="text-xs text-white/40 uppercase tracking-widest">
                Reseller Console
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4 w-full">
            <Button 
              variant="ghost" 
              onClick={handleSignOut} 
              className="w-full sm:w-auto text-white/60 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 overflow-x-hidden w-full">
        {/* Stats Header - 4 Column Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          <Card className="bg-[#0A1628] border border-[#D4AF37]/50 backdrop-blur-md">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-[#D4AF37]">{stats.totalClients}</div>
              <div className="text-sm text-white/60 mt-1">Total Clients</div>
              <div className="text-xs text-white/40 mt-1">Active businesses</div>
            </CardContent>
          </Card>
          <Card className="bg-[#0A1628] border border-[#D4AF37]/50 backdrop-blur-md">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-[#D4AF37]">{stats.totalLeads}</div>
              <div className="text-sm text-white/60 mt-1">Total Leads</div>
              <div className="text-xs text-white/40 mt-1">Last 30 days</div>
            </CardContent>
          </Card>
          <Card className="bg-[#0A1628] border border-[#D4AF37]/50 backdrop-blur-md">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-[#D4AF37]">${stats.totalRevenue.toLocaleString()}</div>
              <div className="text-sm text-white/60 mt-1">Total Revenue</div>
              <div className="text-xs text-white/40 mt-1">Last 30 days</div>
            </CardContent>
          </Card>
          <Card className="bg-[#0A1628] border border-[#D4AF37]/50 backdrop-blur-md">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-[#D4AF37]">{stats.conversionRate.toFixed(1)}%</div>
              <div className="text-sm text-white/60 mt-1">Conversion Rate</div>
              <div className="text-xs text-white/40 mt-1">Lead to booking</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="grid grid-cols-3 gap-2 w-full bg-[#0A1628] border border-[#D4AF37]/50 backdrop-blur-md p-1">
            <TabsTrigger value="clients" className="w-full text-sm data-[state=active]:bg-[#0097b2] data-[state=active]:text-white text-white/60">
              <Building2 className="h-4 w-4 mr-2" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="pricing" className="w-full text-sm data-[state=active]:bg-[#0097b2] data-[state=active]:text-white text-white/60">
              <DollarSign className="h-4 w-4 mr-2" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="development" className="w-full text-sm data-[state=active]:bg-[#0097b2] data-[state=active]:text-white text-white/60">
              <Activity className="h-4 w-4 mr-2" />
              Development
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 w-full min-w-0">
              <h2 className="text-2xl font-bold text-white">Your Clients</h2>
              <Button
                onClick={() => setShowAddClient(true)}
                className="bg-gradient-to-r from-[#0097b2] to-[#D4AF37] hover:from-[#008aa3] hover:to-[#c49f30] w-full sm:w-auto text-[#0A2540] font-bold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
              {filteredTenants.map((tenant) => (
                <Card key={tenant.id} className="bg-[#0A1628] border-[#D4AF37]/30 backdrop-blur-md hover:border-[#D4AF37]/60 transition-all w-full min-w-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-white">{tenant.name}</CardTitle>
                    <CardDescription className="text-white/60">{tenant.industry}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-white/40 w-16">Domain:</span>
                      <span className="text-white/80 truncate">{tenant.domain || 'Not set'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-white/40 w-16">Status:</span>
                      <span className={`flex items-center gap-1 ${tenant.is_active ? 'text-green-400' : 'text-red-400'}`}>
                        <span className={`h-2 w-2 rounded-full ${tenant.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                        {tenant.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-[#0097b2] to-[#D4AF37] hover:from-[#008aa3] hover:to-[#c49f30] min-h-[44px] text-[#0A2540] font-bold"
                      onClick={() => navigate(`/reseller/client/${tenant.id}`)}
                    >
                      Configure Widget
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Development Tab Content */}
          <TabsContent value="development" className="space-y-8">
            {/* Total Project Value Summary */}
            <Card className="bg-gradient-to-r from-[#0097b2]/20 to-[#D4AF37]/20 border-[#D4AF37] backdrop-blur-md">
              <CardContent className="p-6 text-center">
                <div className="text-sm text-white/60 uppercase tracking-wider">Total Project Value</div>
                <div className="text-5xl font-bold text-[#D4AF37] mt-2">R{totalProjectValue.toLocaleString()}.00</div>
                <div className="text-sm text-white/40 mt-1">Across all sessions • Rate: R850/hr</div>
              </CardContent>
            </Card>

            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-2">Precision Timer</h2>
              <p className="text-white/60">Track billable custom development work.</p>
            </div>

            {/* Live Timer Card */}
            <Card className="bg-[#0A1628] border-[#D4AF37]/50 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#D4AF37]" />
                  Active Session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label className="text-white/60 text-xs">Client</Label>
                    <select className="w-full bg-black/40 border border-[#0097b2]/30 text-white p-2 rounded-md">
                      <option value="">Select client...</option>
                      {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-white/60 text-xs">Project Title</Label>
                    <Input className="bg-black/40 border-[#0097b2]/30 text-white" placeholder="Widget customization..." />
                  </div>
                </div>
                <div>
                  <Label className="text-white/60 text-xs">Session Notes</Label>
                  <textarea className="w-full bg-black/40 border border-[#0097b2]/30 text-white p-2 rounded-md h-20 resize-none" placeholder="Document what you achieved..." value={newSessionNotes} onChange={e => setNewSessionNotes(e.target.value)} />
                </div>
                {/* Large Cost Ticker */}
                <div className={`flex items-center justify-between p-6 bg-black/60 rounded-lg border-2 ${timerState.isRunning ? 'border-[#D4AF37] animate-pulse' : 'border-[#D4AF37]/30'}`}>
                  <div className="text-center">
                    <div className="text-3xl sm:text-5xl font-mono font-bold text-white">
                      {Math.floor(timerState.elapsed / 3600).toString().padStart(2, '0')}:
                      {Math.floor((timerState.elapsed % 3600) / 60).toString().padStart(2, '0')}:
                      {(timerState.elapsed % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-white/60 text-sm mt-1">Elapsed Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl sm:text-5xl font-mono font-bold text-[#D4AF37]">R{((timerState.elapsed / 3600) * RATE_PER_HOUR).toFixed(2)}</div>
                    <div className="text-white/60 text-sm mt-1">Current Cost</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className={`flex-1 min-h-[44px] ${!timerState.isRunning ? 'bg-gradient-to-r from-[#0097b2] to-[#D4AF37] hover:from-[#008aa3] hover:to-[#c49f30] text-[#0A2540] font-bold' : 'bg-yellow-600 hover:bg-yellow-700 text-white font-bold'}`}
                    onClick={() => !timerState.isRunning ? startTimer() : resumeTimer()}
                  >
                    <Play className="h-4 w-4 mr-2" /> {timerState.isRunning ? (timerState.isPaused ? 'Resume' : 'Running') : 'Start'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 border-[#D4AF37]/50 text-white hover:bg-white/10 min-h-[44px]" 
                    onClick={pauseTimer}
                    disabled={!timerState.isRunning || timerState.isPaused}
                  >
                    <Pause className="h-4 w-4 mr-2" /> Pause
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 border-green-500/50 text-green-400 hover:bg-green-500/10 min-h-[44px]"
                    onClick={completeTimer}
                    disabled={!timerState.isRunning}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Complete
                  </Button>
                </div>
                <p className="text-xs text-white/40 text-center">Autosaves every 60 seconds • Timer persists across browser sessions</p>
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#D4AF37]" />
                Recent Sessions
              </h3>
              <div className="space-y-3">
                {jobSessions.map((session) => (
                  <Card key={session.id} className="bg-[#0A1628] border-[#D4AF37]/30 backdrop-blur-md">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-white font-medium">{session.date}</span>
                            <span className="text-white/60">{session.startTime} - {session.endTime}</span>
                            <span className="text-[#D4AF37] font-bold">{session.duration}h</span>
                            <span className="text-white/40">R{session.bill.toLocaleString()}</span>
                          </div>
                          <Input className="mt-2 bg-black/40 border-[#0097b2]/30 text-white/80 text-sm" defaultValue={session.notes} placeholder="Add session notes..." />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Pricing Tab Content */}
          <TabsContent value="pricing" className="space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-2">Pricing Management</h2>
              <p className="text-white/60">Set custom prices for your clients and track profit margins.</p>
              <p className="text-sm text-[#D4AF37] mt-2">Your Profit = Your Price - Base Price</p>
            </div>

            {/* Subscription Tiers */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#D4AF37]" />
                Subscription Tiers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: 'starter', name: 'Starter', base: 499 },
                  { key: 'professional', name: 'Professional', base: 999 },
                  { key: 'business', name: 'Business', base: 1999 },
                  { key: 'enterprise', name: 'Enterprise', base: 3999 },
                ].map((tier) => {
                  const state = pricingState[tier.key as keyof typeof pricingState];
                  const profit = calculateProfit(state.yourPrice, state.manualCost, tier.base);
                  const upfrontProfit = state.setupFee - state.setupCost;
                  return (
                    <Card key={tier.key} className="bg-[#0A1628] border-[#D4AF37]/30 backdrop-blur-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white text-lg">{tier.name}</CardTitle>
                        <CardDescription className="text-white/40">Base: R{tier.base} | Setup: R0</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="flex-1">
                            <Label className="text-white/60 text-xs">Your Price (R)</Label>
                            <Input 
                              type="number" 
                              className="bg-black/40 border-[#D4AF37]/50 text-white font-bold" 
                              value={state.yourPrice}
                              onChange={(e) => updatePricing(tier.key, 'yourPrice', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-white/60 text-xs">Set-up Fee (R)</Label>
                            <Input 
                              type="number" 
                              className="bg-black/40 border-[#D4AF37]/50 text-white font-bold" 
                              value={state.setupFee}
                              onChange={(e) => updatePricing(tier.key, 'setupFee', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        <div className="border-t border-white/10 pt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Monthly Profit:</span>
                            <span className={`font-bold ${profit >= 0 ? 'text-[#D4AF37]' : 'text-red-400'}`}>R{profit.toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Upfront Profit:</span>
                            <span className={`font-bold ${upfrontProfit >= 0 ? 'text-[#D4AF37]' : 'text-red-400'}`}>R{upfrontProfit.toFixed(0)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Add-ons Section */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#D4AF37]" />
                Add-ons
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {[
                  { key: 'crm', name: 'CRM', desc: 'Customer mgmt', base: 99 },
                  { key: 'afterhours', name: 'After-Hours', desc: '24/7 support', base: 149 },
                  { key: 'analytics', name: 'Analytics', desc: 'Insights', base: 79 },
                  { key: 'api', name: 'API', desc: 'Integrations', base: 199 },
                  { key: 'emotionai', name: 'Emotion AI', desc: 'Sentiment', base: 249 },
                  { key: 'extraconvos', name: 'Extra Convos', desc: 'Unlimited', base: 99 },
                  { key: 'multilingual', name: 'Multilingual', desc: 'Multi-lang', base: 129 },
                  { key: 'proactive', name: 'Proactive', desc: 'Auto-engage', base: 149 },
                  { key: 'voice', name: 'Voice', desc: 'Commands', base: 179 },
                  { key: 'whitelabel', name: 'White Label', desc: 'Branding', base: 299 },
                ].map((addon) => {
                  const state = pricingState[addon.key as keyof typeof pricingState];
                  const profit = calculateProfit(state.yourPrice, state.manualCost, addon.base);
                  const upfrontProfit = state.setupFee - state.setupCost;
                  return (
                    <Card key={addon.key} className="bg-[#0A1628] border-[#D4AF37]/20 backdrop-blur-md">
                      <CardContent className="p-3 space-y-2">
                        <div className="font-medium text-white text-sm">{addon.name}</div>
                        <div className="text-white/40 text-xs">{addon.desc}</div>
                        <div className="text-white/60 text-xs">Base: R{addon.base}</div>
                        <div className="flex flex-col gap-1">
                          <Input 
                            type="number" 
                            className="bg-black/40 border-[#D4AF37]/50 text-white h-7 text-xs" 
                            placeholder="Price"
                            value={state.yourPrice}
                            onChange={(e) => updatePricing(addon.key, 'yourPrice', parseFloat(e.target.value) || 0)}
                          />
                          <Input 
                            type="number" 
                            className="bg-black/40 border-[#D4AF37]/50 text-white h-7 text-xs" 
                            placeholder="Setup"
                            value={state.setupFee}
                            onChange={(e) => updatePricing(addon.key, 'setupFee', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="flex justify-between text-xs pt-1 border-t border-white/10">
                          <span className="text-white/60">Monthly:</span>
                          <span className={`font-bold ${profit >= 0 ? 'text-[#D4AF37]' : 'text-red-400'}`}>R{profit.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-white/60">Upfront:</span>
                          <span className={`font-bold ${upfrontProfit >= 0 ? 'text-[#D4AF37]' : 'text-red-400'}`}>R{upfrontProfit.toFixed(0)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-center pt-4">
              <Button className="bg-gradient-to-r from-[#0097b2] to-[#D4AF37] hover:from-[#008aa3] hover:to-[#c49f30] min-h-[44px] px-8 text-[#0A2540] font-bold">
                Save Pricing
              </Button>
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
            <Button className="bg-gradient-to-r from-[#0097b2] to-[#D4AF37] hover:from-[#008aa3] hover:to-[#B89630] text-[#0A2540] font-bold" onClick={handleAddClient}>Add Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
