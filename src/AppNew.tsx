import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ChatWidget from "./components/widget/ChatWidget";  // ← uncommented
import AdminDashboard from "./pages/AdminDashboard";


const queryClient = new QueryClient();

const AppNew = () => (
  <div className="relative min-h-screen text-white">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
                <BrowserRouter>
          <Routes>
            {/* 1. Die Hoofbladsy vir kliënte */}
            <Route path="/" element={<Index />} />
            
            {/* 2. Jill se Secret Revenue Dashboard */}
            <Route path="/admin-luxe" element={<AdminDashboard />} /> 
            
            {/* 3. Fallback vir foute */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>

        <ChatWidget /> 
      </TooltipProvider>
    </QueryClientProvider>
  </div>
);

export default AppNew;
