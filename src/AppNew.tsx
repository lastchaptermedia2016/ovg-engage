import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useMatch } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ChatWidget from "./components/widget/ChatWidget"; 
import ResellerChatWidget from "./components/widget/ResellerChatWidget";
import VIPCustomerConsole from "./components/widget/VIPCustomerConsole";
import AdminDashboard from "./pages/AdminDashboard";
import ResellerLogin from "./pages/reseller/Login";
import ResellerDashboard from "./pages/reseller/Dashboard";
import ClientConfig from "./pages/reseller/ClientConfig";
import CustomServices from "./pages/reseller/CustomServices";
import TestOmniVerge from "./pages/TestOmniVerge";

const queryClient = new QueryClient();

// Widget Manager - conditionally renders widgets based on route
const WidgetManager = () => {
  const isTestOmniVerge = useMatch("/test-omniverge");
  
  // Debug: Log the route match result
  console.log("🔍 WidgetManager Debug - isTestOmniVerge:", isTestOmniVerge, "pathname:", window.location.pathname);
  
  // Debug: Log which widget is being rendered
  if (!isTestOmniVerge) {
    console.log("🔴 Rendering ChatWidget (Luxe Med Spa)");
  } else {
    console.log("🟢 Rendering ResellerChatWidget (OmniVerge Global)");
  }
  
  // Only render the original ChatWidget on non-test pages
  // Only render ResellerChatWidget on test page (it handles its own config)
  return (
    <>
      {!isTestOmniVerge && <ChatWidget />}
      {isTestOmniVerge && <ResellerChatWidget />}
      <VIPCustomerConsole />
    </>
  );
};

const AppNew = () => {
  const [showJillConsole, setShowJillConsole] = useState(false);

  useEffect(() => {
    const handleGlobalStealth = (e: KeyboardEvent) => {
      // SHIFT + J to toggle the console ON/OFF
      if (e.shiftKey && e.key === 'J') {
        console.log("🔐 Toggle Jill Console...");
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
        
        {/* THE OVERLAY: This sits on top of everything. No 404 possible. */}
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

        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* We keep this here but we don't rely on it anymore */}
            <Route path="/luxe-console" element={<AdminDashboard />} />
            {/* Reseller Console Routes */}
            <Route path="/reseller/login" element={<ResellerLogin />} />
            <Route path="/reseller/dashboard" element={<ResellerDashboard />} />
            <Route path="/reseller/client/:tenantId" element={<ClientConfig />} />
            <Route path="/reseller/client/:tenantId/services" element={<CustomServices />} />
            {/* Test page for OmniVerge Global widget */}
            <Route path="/test-omniverge" element={<TestOmniVerge />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          {/* Widget Manager - conditionally renders widgets based on route */}
          <WidgetManager />
        </BrowserRouter>
        
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default AppNew;