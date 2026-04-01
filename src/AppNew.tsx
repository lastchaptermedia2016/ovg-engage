import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ChatWidget from "./components/widget/ChatWidget"; 
import AdminDashboard from "./pages/AdminDashboard";

const queryClient = new QueryClient();

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
          <ChatWidget /> 
          <Routes>
            <Route path="/" element={<Index />} />
            {/* We keep this here but we don't rely on it anymore */}
            <Route path="/luxe-console" element={<AdminDashboard />} /> 
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default AppNew;