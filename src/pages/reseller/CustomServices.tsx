import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Clock,
  Play,
  Square,
  Check,
  DollarSign,
  FileText,
  MoreHorizontal,
  Timer,
  Calendar,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CustomService {
  id: string;
  tenant_id: string;
  service_name: string;
  description: string | null;
  hourly_rate: number;
  estimated_hours: number;
  estimated_total: number;
  status: string;
  priority: string;
  notes: string | null;
  created_at: string;
  approved_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface TimeEntry {
  id: string;
  service_id: string;
  description: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  is_running: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  approved: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  in_progress: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  completed: 'bg-green-500/20 text-green-500 border-green-500/30',
  billed: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
  cancelled: 'bg-red-500/20 text-red-500 border-red-500/30',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
  urgent: 'bg-red-500/20 text-red-400',
};

export default function CustomServices() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<CustomService[]>([]);
  const [timeEntries, setTimeEntries] = useState<Record<string, TimeEntry[]>>({});
  const [showAddService, setShowAddService] = useState(false);
  const [showTimeEntry, setShowTimeEntry] = useState<string | null>(null);
  const [tenant, setTenant] = useState<any>(null);
  
  // New service form
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [newServiceRate, setNewServiceRate] = useState('850');
  const [newServiceHours, setNewServiceHours] = useState('1');
  const [newServicePriority, setNewServicePriority] = useState('medium');
  const [newServiceNotes, setNewServiceNotes] = useState('');

  // Time entry form
  const [timeDescription, setTimeDescription] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');

  useEffect(() => {
    if (tenantId) {
      loadData(tenantId);
    }
  }, [tenantId]);

  const loadData = async (id: string) => {
    // Load tenant
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

    // Load services
    const { data: servicesData } = await supabase
      .from('custom_services')
      .select('*')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false });

    if (servicesData) {
      setServices(servicesData);
      
      // Load time entries for each service
      const entries: Record<string, TimeEntry[]> = {};
      for (const service of servicesData) {
        const { data: entriesData } = await supabase
          .from('time_entries')
          .select('*')
          .eq('service_id', service.id)
          .order('created_at', { ascending: false });
        
        if (entriesData) {
          entries[service.id] = entriesData;
        }
      }
      setTimeEntries(entries);
    }

    setIsLoading(false);
  };

  const handleAddService = async () => {
    if (!tenantId || !newServiceName.trim()) {
      toast.error('Please enter a service name');
      return;
    }

    const { data: resellerData } = await supabase
      .from('resellers')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!resellerData) {
      toast.error('Authentication error');
      return;
    }

    const { error } = await supabase
      .from('custom_services')
      .insert({
        tenant_id: tenantId,
        reseller_id: resellerData.id,
        service_name: newServiceName.trim(),
        description: newServiceDescription.trim(),
        hourly_rate: parseFloat(newServiceRate),
        estimated_hours: parseFloat(newServiceHours),
        priority: newServicePriority,
        notes: newServiceNotes.trim(),
        status: 'pending',
      } as any);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Service added successfully!');
    setShowAddService(false);
    resetServiceForm();
    loadData(tenantId);
  };

  const resetServiceForm = () => {
    setNewServiceName('');
    setNewServiceDescription('');
    setNewServiceRate('850');
    setNewServiceHours('1');
    setNewServicePriority('medium');
    setNewServiceNotes('');
  };

  const updateServiceStatus = async (serviceId: string, newStatus: string) => {
    const updates: any = {};
    
    if (newStatus === 'approved') updates.approved_at = new Date().toISOString();
    if (newStatus === 'in_progress') updates.started_at = new Date().toISOString();
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from('custom_services')
      .update(updates)
      .eq('id', serviceId);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Status updated');
    if (tenantId) loadData(tenantId);
  };

  const startTimer = async (serviceId: string) => {
    const { data: serviceData } = await supabase
      .from('custom_services')
      .select('reseller_id')
      .eq('id', serviceId)
      .single();

    const { data: resellerData } = await supabase
      .from('resellers')
      .select('user_id')
      .eq('id', serviceData?.reseller_id)
      .single();

    if (!resellerData) {
      toast.error('Authentication error');
      return;
    }

    const { error } = await supabase
      .from('time_entries')
      .insert({
        service_id: serviceId,
        user_id: resellerData.user_id,
        description: 'Work session',
        is_running: true,
      } as any);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Timer started');
    if (tenantId) loadData(tenantId);
  };

  const stopTimer = async (entryId: string) => {
    const { error } = await supabase
      .from('time_entries')
      .update({ 
        is_running: false,
        ended_at: new Date().toISOString()
      } as any)
      .eq('id', entryId);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Timer stopped');
    if (tenantId) loadData(tenantId);
  };

  const addManualTime = async (serviceId: string) => {
    if (!manualMinutes || parseFloat(manualMinutes) <= 0) {
      toast.error('Please enter valid minutes');
      return;
    }

    const { data: serviceData } = await supabase
      .from('custom_services')
      .select('reseller_id')
      .eq('id', serviceId)
      .single();

    const { data: resellerData } = await supabase
      .from('resellers')
      .select('user_id')
      .eq('id', serviceData?.reseller_id)
      .single();

    if (!resellerData) {
      toast.error('Authentication error');
      return;
    }

    const now = new Date();
    const startTime = new Date(now.getTime() - parseFloat(manualMinutes) * 60000);

    const { error } = await supabase
      .from('time_entries')
      .insert({
        service_id: serviceId,
        user_id: resellerData.user_id,
        description: timeDescription || 'Manual time entry',
        started_at: startTime.toISOString(),
        ended_at: now.toISOString(),
        is_running: false,
      } as any);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Time entry added');
    setShowTimeEntry(null);
    setTimeDescription('');
    setManualMinutes('');
    if (tenantId) loadData(tenantId);
  };

  const getTotalTime = (serviceId: string): number => {
    const entries = timeEntries[serviceId] || [];
    let total = 0;
    
    for (const entry of entries) {
      if (entry.duration_minutes !== null) {
        total += entry.duration_minutes;
      } else if (entry.is_running) {
        // Calculate running time
        const start = new Date(entry.started_at).getTime();
        const now = Date.now();
        total += (now - start) / 60000;
      }
    }
    
    return Math.round(total);
  };

  const generateMonthlyInvoice = async () => {
    // Get current month's subscription fee
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('subscription_tier, addons, reseller_id')
      .eq('id', tenantId)
      .single();

    if (!tenantData) return;

    // Get plan price
    const { data: plan } = await supabase
      .from('pricing_plans')
      .select('price_to_client')
      .eq('slug', tenantData.subscription_tier as string)
      .single();

    let subtotal = (plan as any)?.price_to_client || 0;

    // Add addon costs
    const addons = tenantData.addons as string[];
    if (addons && Array.isArray(addons)) {
      for (const addonSlug of addons) {
        const { data: addon } = await supabase
          .from('addon_definitions')
          .select('price_to_client')
          .eq('slug', addonSlug)
          .single();
        
        if (addon) subtotal += (addon as any).price_to_client;
      }
    }

    // Add custom services
    const completedServices = services.filter(s => s.status === 'completed' || s.status === 'billed');
    for (const service of completedServices) {
      const timeMinutes = getTotalTime(service.id);
      subtotal += (timeMinutes / 60) * service.hourly_rate;
    }

    // Generate invoice
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
    
    const { error } = await supabase
      .from('invoices')
      .insert({
        tenant_id: tenantId,
        reseller_id: tenantData.reseller_id,
        invoice_number: invoiceNumber,
        subtotal: subtotal,
        status: 'draft',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: `Monthly invoice for ${tenant?.name}`,
      } as any);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Invoice ${invoiceNumber} generated: R${(subtotal * 1.15).toFixed(2)} (incl. VAT)`);
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
                {tenant?.name} - Custom Services
              </h1>
              <p className="text-xs text-white/40">Track time and generate invoices</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={generateMonthlyInvoice}
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5"
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Monthly Invoice
            </Button>
            <Button
              onClick={() => setShowAddService(true)}
              className="bg-gradient-to-r from-pink-500 to-gold-500 hover:from-pink-600 hover:to-gold-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {services.filter(s => s.status === 'pending').length}
                  </div>
                  <div className="text-xs text-white/40">Pending Approval</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {services.filter(s => s.status === 'in_progress').length}
                  </div>
                  <div className="text-xs text-white/40">In Progress</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {services.filter(s => s.status === 'completed').length}
                  </div>
                  <div className="text-xs text-white/40">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-gold-500" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    R{services.reduce((sum, s) => {
                      const time = getTotalTime(s.id);
                      return sum + (time / 60) * s.hourly_rate;
                    }, 0).toFixed(0)}
                  </div>
                  <div className="text-xs text-white/40">Total Billed Hours</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Services</h2>
          
          {services.length === 0 ? (
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardContent className="p-8 text-center">
                <p className="text-white/40">No custom services yet. Add your first service!</p>
              </CardContent>
            </Card>
          ) : (
            services.map((service) => (
              <Card key={service.id} className="bg-black/40 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-white">{service.service_name}</CardTitle>
                        <Badge className={STATUS_COLORS[service.status]}>
                          {service.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={PRIORITY_COLORS[service.priority]}>
                          {service.priority}
                        </Badge>
                      </div>
                      <CardDescription className="text-white/60">
                        {service.description}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4 text-white/60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-black border-white/10">
                        {service.status === 'pending' && (
                          <DropdownMenuItem
                            onClick={() => updateServiceStatus(service.id, 'approved')}
                            className="text-white/80"
                          >
                            Approve
                          </DropdownMenuItem>
                        )}
                        {service.status === 'approved' && (
                          <DropdownMenuItem
                            onClick={() => updateServiceStatus(service.id, 'in_progress')}
                            className="text-white/80"
                          >
                            Start Work
                          </DropdownMenuItem>
                        )}
                        {service.status === 'in_progress' && (
                          <DropdownMenuItem
                            onClick={() => updateServiceStatus(service.id, 'completed')}
                            className="text-white/80"
                          >
                            Mark Complete
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setShowTimeEntry(service.id)}
                          className="text-white/80"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Add Time Entry
                        </DropdownMenuItem>
                        {service.status === 'completed' && (
                          <DropdownMenuItem
                            onClick={() => updateServiceStatus(service.id, 'billed')}
                            className="text-white/80"
                          >
                            Mark as Billed
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-white/40 mb-1">Hourly Rate</div>
                      <div className="text-white font-medium">R{service.hourly_rate}/hr</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40 mb-1">Estimated</div>
                      <div className="text-white font-medium">{service.estimated_hours} hours</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40 mb-1">Time Tracked</div>
                      <div className="text-white font-medium">
                        {Math.floor(getTotalTime(service.id) / 60)}h {getTotalTime(service.id) % 60}m
                      </div>
                    </div>
                  </div>

                  {/* Time Entries */}
                  <div className="border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-white/80">Time Entries</h4>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startTimer(service.id)}
                          className="border-white/10 text-white hover:bg-white/5 h-8"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Start Timer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowTimeEntry(service.id)}
                          className="border-white/10 text-white hover:bg-white/5 h-8"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Manual Entry
                        </Button>
                      </div>
                    </div>

                    {timeEntries[service.id] && timeEntries[service.id].length > 0 ? (
                      <div className="space-y-2">
                        {timeEntries[service.id].slice(0, 3).map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between p-2 bg-white/5 rounded">
                            <div className="flex items-center gap-3">
                              {entry.is_running ? (
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                              ) : (
                                <Check className="h-4 w-4 text-green-500" />
                              )}
                              <div>
                                <div className="text-sm text-white">{entry.description}</div>
                                <div className="text-xs text-white/40">
                                  {new Date(entry.started_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-white">
                              {entry.is_running ? (
                                <span className="text-green-500">Running...</span>
                              ) : (
                                `${entry.duration_minutes} min`
                              )}
                            </div>
                            {entry.is_running && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => stopTimer(entry.id)}
                                className="h-6 w-6 p-0 border-white/10"
                              >
                                <Square className="h-3 w-3 text-red-500" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/40">No time entries yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Add Service Dialog */}
      <Dialog open={showAddService} onOpenChange={setShowAddService}>
        <DialogContent className="bg-black border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add Custom Service</DialogTitle>
            <DialogDescription className="text-white/60">
              Create a new billable service for this client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white/80">Service Name</Label>
              <Input
                placeholder="e.g. Custom API Integration"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Description</Label>
              <Textarea
                placeholder="Describe the work to be done..."
                value={newServiceDescription}
                onChange={(e) => setNewServiceDescription(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">Hourly Rate (R)</Label>
                <Input
                  type="number"
                  value={newServiceRate}
                  onChange={(e) => setNewServiceRate(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Estimated Hours</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={newServiceHours}
                  onChange={(e) => setNewServiceHours(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Priority</Label>
              <Select value={newServicePriority} onValueChange={setNewServicePriority}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Internal Notes</Label>
              <Textarea
                placeholder="Notes for your team..."
                value={newServiceNotes}
                onChange={(e) => setNewServiceNotes(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60">Estimated Total</span>
                  <span className="text-lg font-bold text-gold-500">
                    R{(parseFloat(newServiceRate) * parseFloat(newServiceHours)).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddService(false)}
              className="border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddService}
              className="bg-gradient-to-r from-pink-500 to-gold-500"
            >
              Add Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Entry Dialog */}
      <Dialog open={!!showTimeEntry} onOpenChange={() => setShowTimeEntry(null)}>
        <DialogContent className="bg-black border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add Time Entry</DialogTitle>
            <DialogDescription className="text-white/60">
              Log time spent on this service.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white/80">Description</Label>
              <Input
                placeholder="What work was done?"
                value={timeDescription}
                onChange={(e) => setTimeDescription(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Duration (minutes)</Label>
              <Input
                type="number"
                placeholder="60"
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTimeEntry(null)}
              className="border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={() => showTimeEntry && addManualTime(showTimeEntry)}
              className="bg-gradient-to-r from-pink-500 to-gold-500"
            >
              Add Time Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}