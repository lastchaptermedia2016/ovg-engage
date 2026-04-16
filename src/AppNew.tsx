import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useMatch, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ChatWidget from "./components/widget/ChatWidget"; 
import ResellerChatWidget from "./components/widget/ResellerChatWidget";
import VIPCustomerConsole from "./components/widget/VIPCustomerConsole";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import CommandAuth from "./pages/command/Auth";
import ResellerLogin from "./pages/reseller/Login";
import ResellerDashboard from "./pages/reseller/Dashboard";
import ClientConfig from "./pages/reseller/ClientConfig";
import CustomServices from "./pages/reseller/CustomServices";
import TestOmniVerge from "./pages/TestOmniVerge";
import ClientPortalDashboard from "./pages/portal/Dashboard";
import WidgetSettings from "./pages/portal/WidgetSettings";
import Analytics from "./pages/portal/Analytics";
import Support from "./pages/portal/Support";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const queryClient = new QueryClient();

// ✅ PUBLIC PATHS - Never guard these routes
const PUBLIC_PATHS = ['/', '/login', '/reseller/login', '/command/auth', '/test-omniverge'];

// ✅ Widget Manager - conditionally renders widgets based on route
// All hooks are called unconditionally to comply with React Rules of Hooks
const WidgetManager = () => {
  const isTestOmniVerge = useMatch("/test-omniverge");
  
  // Determine visibility based on current path
  const currentPath = window.location.pathname;
  const isResellerPath = currentPath.startsWith('/reseller');
  const isLoginPath = currentPath === '/login' || currentPath === '/command/auth';
  const isAdminPath = currentPath.startsWith('/admin');

  // Kill-switch: no widgets on reseller, login, or admin paths
  if (isResellerPath || isLoginPath || isAdminPath) {
    return null;
  }

  return (
    <>
      {!isTestOmniVerge && <ResellerChatWidget />}
      {isTestOmniVerge && <ChatWidget />}
      <VIPCustomerConsole />
    </>
  );
};

// ✅ Route Guard - ONLY guards protected routes and enforces domain isolation
// Does NOT handle post-login routing (login pages handle their own redirects)
const RouteGuard = () => {
  const navigate = useNavigate();
  const [guardState, setGuardState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const runGuard = async () => {
      const currentPath = window.location.pathname;
      
      // ✅ PUBLIC PATH BYPASS - Instant, no async, no overlay
      if (PUBLIC_PATHS.includes(currentPath)) {
        if (isMounted) setGuardState('ready');
        return;
      }

      try {
        // ✅ Wait for Supabase session handshake
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (sessionError) {
          setErrorMessage(`Session error: ${sessionError.message}`);
          setGuardState('error');
          return;
        }

        // ✅ PATH-AWARE REDIRECT for unauthenticated users
        if (!session?.user) {
          if (currentPath.startsWith('/reseller')) {
            navigate('/reseller/login', { replace: true });
          } else if (currentPath.startsWith('/command')) {
            navigate('/command/auth', { replace: true });
          } else if (currentPath.startsWith('/portal')) {
            navigate('/login', { replace: true });
          } else {
            navigate('/login', { replace: true });
          }
          setGuardState('ready');
          return;
        }

        // ✅ Fetch user role for domain isolation
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, tenant_id')
          .eq('id', session.user.id)
          .maybeSingle() as any;

        if (!isMounted) return;

        if (userError) {
          setErrorMessage(`User lookup failed: ${userError.message}`);
          setGuardState('error');
          return;
        }

        // ✅ No user record: show error, don't silently redirect
        if (!userData) {
          setErrorMessage('No user profile found. Contact your administrator.');
          toast.error('Account not found. Please contact support.');
          setGuardState('error');
          return;
        }

        // ✅ DOMAIN ISOLATION: Reseller/Admin on client portal → bounce to reseller dashboard
        if (['reseller', 'admin', 'developer', 'support'].includes(userData.role)) {
          if (currentPath.startsWith('/portal/') || currentPath.startsWith('/client/')) {
            navigate('/reseller/dashboard', { replace: true });
            setGuardState('ready');
            return;
          }
        }

        // ✅ DOMAIN ISOLATION: Client on reseller console → bounce to their portal
        if (userData.role === 'client') {
          if (currentPath.startsWith('/reseller/') && currentPath !== '/reseller/login') {
            navigate(`/portal/${userData.tenant_id}/settings`, { replace: true });
            setGuardState('ready');
            return;
          }
        }

        setGuardState('ready');
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(`Guard error: ${err.message}`);
          setGuardState('error');
        }
      }
    };

    // Run on initial mount
    runGuard();

    // ✅ Listen ONLY for sign-out to re-run guard (login pages handle sign-in routing)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT') {
        setGuardState('loading');
        runGuard();
      }
      // TOKEN_REFRESHED is safe to ignore - session is still valid
      // SIGNED_IN is handled by the login pages themselves - NO INTERFERENCE
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // ✅ Semi-transparent overlay with error display (never a full lockout)
  if (guardState === 'loading') {
    const currentPath = window.location.pathname;
    if (!PUBLIC_PATHS.includes(currentPath)) {
      return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/80 border border-white/10 rounded-lg p-6 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-white/30 border-t-white rounded-full mx-auto mb-3" />
            <div className="text-white/60 text-sm">Verifying access...</div>
          </div>
        </div>
      );
    }
  }

  // ✅ Error state: visible on page, not hidden in console
  if (guardState === 'error') {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-black/90 border border-red-500/30 rounded-lg p-6 text-center max-w-md">
          <div className="text-red-400 text-lg font-semibold mb-2">Authentication Error</div>
          <div className="text-white/60 text-sm mb-4">{errorMessage}</div>
          <button 
            onClick={() => window.location.href = '/reseller/login'}
            className="px-4 py-2 bg-[#0097b2] text-white rounded-lg text-sm hover:bg-[#00829c] transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
};

const AppNew = () => {
  const [showJillConsole, setShowJillConsole] = useState(false);

  useEffect(() => {
    const handleGlobalStealth = (e: KeyboardEvent) => {
      // SHIFT + J to toggle the console ON/OFF
      if (e.shiftKey && e.key === 'J') {
        localStorage.setItem("luxe-admin-stealth-access", "true");
        setShowJillConsole(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleGlobalStealth);
    return () => window.removeEventListener("keydown", handleGlobalStealth);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        
        {/* Stealth Admin Overlay */}
        {showJillConsole && (
          <div className="fixed inset-0 z-[9999] bg-white overflow-auto">
            <div className="p-4 bg-black text-white flex justify-between items-center">
              <span>💎 LUXE STEALTH CONSOLE ACTIVE</span>
              <button 
                onClick={() => setShowJillConsole(false)}
                className="bg-red-900 px-3 py-1 rounded text-xs"
              >
                CLOSE [ESC]
              </button>
            </div>
            <AdminDashboard />
          </div>
        )}

        <>
          <RouteGuard />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/luxe-console" element={<AdminDashboard />} />
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/command/auth" element={<CommandAuth />} />
            <Route path="/reseller/login" element={<ResellerLogin />} />
            {/* Reseller Console Routes */}
            <Route path="/reseller/dashboard" element={<ResellerDashboard />} />
            <Route path="/reseller/client/:tenantId" element={<ClientConfig />} />
            <Route path="/reseller/client/:tenantId/services" element={<CustomServices />} />
            {/* Test page for OmniVerge Global widget */}
            <Route path="/test-omniverge" element={<TestOmniVerge />} />
            {/* Client Portal Routes */}
            <Route path="/portal/:clientId" element={<ClientPortalDashboard />}>
              <Route index element={<WidgetSettings />} />
              <Route path="settings" element={<WidgetSettings />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="support" element={<Support />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          <WidgetManager />
        </>
        
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default AppNew;
