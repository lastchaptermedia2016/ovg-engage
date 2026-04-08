import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Shield, Gift, Star, Clock, Calendar, Phone, Mail, 
  TrendingUp, Award, ChevronRight, RefreshCw, CheckCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// VIP Tier Configuration
const VIP_TIERS = {
  standard: { name: 'Standard', color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30', icon: Star },
  silver: { name: 'Silver', color: 'text-slate-300', bg: 'bg-slate-500/20', border: 'border-slate-500/30', icon: Award },
  gold: { name: 'Gold', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', icon: Trophy },
  platinum: { name: 'Platinum', color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', icon: Crown },
};

// Import icons for tiers
function Trophy(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function Crown(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

interface VIPConsoleConfig {
  brandName: string;
  primaryColor: string;
  logo?: string;
  vipConsoleEnabled: boolean;
  vipShortcut: string;
  vipAccessMethod: 'shortcut' | 'password' | 'code';
}

interface CustomerProfile {
  id: string;
  rewards_points: number;
  vip_tier: string;
  preferences: any;
  booking_count?: number;
  total_spent?: number;
}

interface CustomerOffer {
  id: string;
  offer_type: string;
  offer_value: number;
  offer_description: string;
  valid_until: string;
  used: boolean;
}

interface Booking {
  id: string;
  treatment: string;
  price: number;
  time: string;
  timestamp: string;
  title: string;
  firstName: string;
  lastName: string;
  refreshment: string;
  phone: string;
  email: string;
}

const VIPCustomerConsole = () => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [config, setConfig] = useState<VIPConsoleConfig | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [offers, setOffers] = useState<CustomerOffer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Load configuration from widget_configs
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const tenantId = (window as any).ovgConfig?.tenantId;
        
        if (!tenantId) {
          console.log("🎨 No tenant ID found for VIP console");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('widget_configs')
          .select('*')
          .eq('tenant_id', tenantId)
          .single();

        if (error || !data) {
          setLoading(false);
          return;
        }

        const widgetData = data as any;
        const vipConfig: VIPConsoleConfig = {
          brandName: widgetData.branding?.brandName || 'The Luxe Med Spa',
          primaryColor: widgetData.branding?.primaryColor || '#be185d',
          logo: widgetData.branding?.logo,
          vipConsoleEnabled: widgetData.vip_console_enabled || false,
          vipShortcut: widgetData.vip_shortcut || 'SHIFT+V',
          vipAccessMethod: widgetData.vip_access_method || 'shortcut',
        };

        setConfig(vipConfig);
        
        // Check if VIP console is enabled
        if (!vipConfig.vipConsoleEnabled) {
          setLoading(false);
          return;
        }

        // Check localStorage for existing authorization
        const authKey = `vip_auth_${tenantId}`;
        const isAuth = localStorage.getItem(authKey) === 'true';
        if (isAuth) {
          setIsAuthorized(true);
          await loadCustomerData();
        }
      } catch (err) {
        console.error('Error loading VIP config:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Load customer data
  const loadCustomerData = async () => {
    try {
      const tenantId = (window as any).ovgConfig?.tenantId;
      if (!tenantId) return;

      // Get customer email from localStorage or leads
      const customerEmail = localStorage.getItem('customer_email');
      if (!customerEmail) {
        // Try to get from last booking
        const rawStats = localStorage.getItem('luxe_live_stats');
        if (rawStats) {
          const stats = JSON.parse(rawStats);
          if (stats.lastBooking?.email) {
            localStorage.setItem('customer_email', stats.lastBooking.email);
          }
        }
      }

      // Load bookings from localStorage (Jill's stats)
      const rawStats = localStorage.getItem('luxe_live_stats');
      if (rawStats) {
        const stats = JSON.parse(rawStats);
        const customerBookings = stats.bookings?.filter((b: any) => 
          b.email === customerEmail
        ) || [];
        setBookings(customerBookings.slice(0, 10));

        // Calculate total spent
        const totalSpent = customerBookings.reduce((sum: number, b: any) => 
          sum + (Number(b.price) || 0), 0
        );

        // Create mock profile based on bookings
        const mockProfile: CustomerProfile = {
          id: 'local-profile',
          rewards_points: Math.floor(totalSpent / 10), // 1 point per $10
          vip_tier: totalSpent > 2000 ? 'platinum' : totalSpent > 1000 ? 'gold' : totalSpent > 500 ? 'silver' : 'standard',
          preferences: {},
          booking_count: customerBookings.length,
          total_spent: totalSpent,
        };

        setProfile(mockProfile);
      }

      // Load offers from Supabase
      if (customerEmail) {
        const { data: offersData } = await supabase
          .from('customer_offers')
          .select('*')
          .eq('customer_email', customerEmail)
          .eq('used', false)
          .gt('valid_until', new Date().toISOString())
          .order('valid_until', { ascending: true });

        if (offersData) {
          setOffers(offersData);
        }
      }
    } catch (err) {
      console.error('Error loading customer data:', err);
    }
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!config?.vipConsoleEnabled) return;

      // Parse shortcut (e.g., "SHIFT+V")
      const shortcut = config.vipShortcut || 'SHIFT+V';
      const keys = shortcut.split('+').map(k => k.trim().toUpperCase());
      
      const shiftPressed = e.shiftKey && keys.includes('SHIFT');
      const keyPressed = keys.includes(e.key.toUpperCase());
      
      if (shiftPressed && keyPressed && keys.length === 2) {
        e.preventDefault();
        
        if (config.vipAccessMethod === 'shortcut') {
          if (!isAuthorized) {
            setIsAuthorized(true);
            localStorage.setItem(`vip_auth_${(window as any).ovgConfig?.tenantId}`, 'true');
            loadCustomerData();
          }
          setIsOpen(prev => !prev);
        } else {
          setShowPasswordModal(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config, isAuthorized]);

  // Verify access code/password
  const verifyAccess = async () => {
    try {
      const tenantId = (window as any).ovgConfig?.tenantId;
      if (!tenantId) return;

      if (config?.vipAccessMethod === 'code') {
        const { data, error } = await supabase
          .from('vip_access_codes')
          .select('*')
          .eq('code', accessCode)
          .eq('tenant_id', tenantId)
          .eq('active', true)
          .single();

        if (error || !data) {
          toast({ title: 'Invalid Code', description: 'Please enter a valid VIP access code.', variant: 'destructive' });
          return;
        }

        // Check if expired (cast to any to access properties)
        const accessData = data as any;
        if (accessData.expires_at && new Date(accessData.expires_at) < new Date()) {
          toast({ title: 'Expired Code', description: 'This access code has expired.', variant: 'destructive' });
          return;
        }

        // Increment usage (cast to any to bypass type issues)
        await (supabase as any)
          .from('vip_access_codes')
          .update({ current_uses: accessData.current_uses + 1 })
          .eq('id', accessData.id);
      } else if (config?.vipAccessMethod === 'password') {
        // Simple password check (in production, this should be server-side)
        if (password !== 'VIP2026') { // Default password
          toast({ title: 'Invalid Password', description: 'Please enter the correct password.', variant: 'destructive' });
          return;
        }
      }

      setIsAuthorized(true);
      setShowPasswordModal(false);
      setIsOpen(true);
      localStorage.setItem(`vip_auth_${tenantId}`, 'true');
      await loadCustomerData();
      
      toast({ title: 'Access Granted', description: 'Welcome to your VIP console!' });
    } catch (err) {
      console.error('Access verification error:', err);
      toast({ title: 'Error', description: 'Failed to verify access.', variant: 'destructive' });
    }
  };

  // Close handler
  const handleClose = () => {
    setIsOpen(false);
  };

  // Refresh data
  const refreshData = () => {
    loadCustomerData();
    toast({ title: 'Refreshed', description: 'Your VIP data has been updated.' });
  };

  // Don't render if not enabled or loading
  if (loading || !config?.vipConsoleEnabled) {
    return null;
  }

  const tier = VIP_TIERS[profile?.vip_tier as keyof typeof VIP_TIERS] || VIP_TIERS.standard;
  const TierIcon = tier.icon;

  return (
    <>
      {/* Password/Code Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="mx-4 w-full max-w-sm rounded-2xl bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-6 w-6 text-amber-400" />
                <h3 className="text-lg font-bold text-white">VIP Access</h3>
              </div>

              <p className="text-sm text-gray-300 mb-4">
                {config.vipAccessMethod === 'code' 
                  ? 'Enter your VIP access code' 
                  : 'Enter your VIP password'}
              </p>

              <input
                type={config.vipAccessMethod === 'code' ? 'text' : 'password'}
                value={config.vipAccessMethod === 'code' ? accessCode : password}
                onChange={(e) => config.vipAccessMethod === 'code' ? setAccessCode(e.target.value) : setPassword(e.target.value)}
                placeholder={config.vipAccessMethod === 'code' ? 'Access Code' : 'Password'}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 mb-4"
                onKeyDown={(e) => e.key === 'Enter' && verifyAccess()}
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={verifyAccess}
                >
                  Enter
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIP Console Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] bg-[#0A0505] overflow-auto"
          >
            {/* Shimmer Line */}
            <div className="fixed top-0 left-0 w-full h-[2px] z-50 overflow-hidden bg-white/5">
              <div className="w-[40%] h-full bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-shimmer-fast"></div>
            </div>

            {/* Header */}
            <div className="relative z-10 max-w-[1400px] mx-auto p-8">
              <header className="flex justify-between items-end border-b border-amber-400/10 pb-6 mb-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Crown className="h-8 w-8 text-amber-400" />
                    <h1 className="text-4xl tracking-[0.3em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 italic">
                      {config.brandName}
                    </h1>
                  </div>
                  <p className="text-amber-400/40 text-[10px] uppercase tracking-[0.5em]">
                    VIP Customer Console • Your Personal Sanctuary
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={refreshData}
                    className="text-amber-400 hover:bg-amber-400/10"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={handleClose}
                    className="bg-red-900/20 border border-red-900/30 text-red-400 hover:bg-red-900/30"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </header>

              {/* VIP Status Card */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {/* Tier Card */}
                <Card className={`bg-black/40 border ${tier.border} backdrop-blur-3xl rounded-2xl overflow-hidden`}>
                  <CardHeader className="pb-2">
                    <CardTitle className={`text-sm ${tier.color} tracking-widest uppercase flex items-center gap-2`}>
                      <TierIcon className="h-4 w-4" />
                      Your Tier
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${tier.color}`}>{tier.name}</div>
                    <div className="text-xs text-gray-500 mt-1">VIP Status</div>
                  </CardContent>
                </Card>

                {/* Rewards Points */}
                <Card className="bg-black/40 border-amber-400/10 backdrop-blur-3xl rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-amber-400 tracking-widest uppercase flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Rewards
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-400">{profile?.rewards_points || 0}</div>
                    <div className="text-xs text-gray-500 mt-1">Points Available</div>
                  </CardContent>
                </Card>

                {/* Bookings */}
                <Card className="bg-black/40 border-amber-400/10 backdrop-blur-3xl rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-amber-400 tracking-widest uppercase flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Visits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-400">{profile?.booking_count || bookings.length}</div>
                    <div className="text-xs text-gray-500 mt-1">Total Bookings</div>
                  </CardContent>
                </Card>

                {/* Total Spent */}
                <Card className="bg-black/40 border-amber-400/10 backdrop-blur-3xl rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-amber-400 tracking-widest uppercase flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Investment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-400">${profile?.total_spent?.toLocaleString() || '0'}</div>
                    <div className="text-xs text-gray-500 mt-1">Total Spent</div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Offers */}
              {offers.length > 0 && (
                <div className="mb-10">
                  <h2 className="text-amber-400 tracking-widest uppercase text-xs mb-4">Your Exclusive Offers</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {offers.map((offer) => (
                      <Card key={offer.id} className="bg-black/40 border-amber-400/20 backdrop-blur-3xl rounded-2xl overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-2">
                            <Badge className={`${tier.bg} ${tier.color} border ${tier.border}`}>
                              {offer.offer_type}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Expires {new Date(offer.valid_until).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-white mb-1">
                            {offer.offer_type === 'percentage' ? `${offer.offer_value}% OFF` : `$${offer.offer_value}`}
                          </div>
                          <div className="text-sm text-gray-400">{offer.offer_description}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Booking History */}
              <div>
                <h2 className="text-amber-400 tracking-widest uppercase text-xs mb-4">Your Booking History</h2>
                <Card className="bg-black/40 border-amber-400/10 backdrop-blur-3xl rounded-2xl overflow-hidden">
                  <CardContent className="p-0">
                    {bookings.length > 0 ? (
                      <div className="divide-y divide-amber-400/5">
                        {bookings.map((booking, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-amber-400/20 flex items-center justify-center">
                                <CheckCircle className="h-4 w-4 text-amber-400" />
                              </div>
                              <span className="text-sm text-white">{booking.treatment}</span>
                            </div>
                            <div className="text-sm text-gray-400">{booking.time}</div>
                            <div className="text-sm text-amber-400 font-semibold">${booking.price}</div>
                            <div className="text-sm text-gray-500 italic">{booking.refreshment}</div>
                            <div className="text-sm text-gray-500">{booking.phone}</div>
                            <div className="text-sm text-gray-500 truncate">{booking.email}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center text-amber-400/30 italic">
                        <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No bookings found. Your sanctuary experience awaits...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VIPCustomerConsole;