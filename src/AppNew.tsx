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
  <div className="relative min-h-screen bg-[#FDFBF9]">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        
        <BrowserRouter>
          {/* Die ChatWidget moet BINNE die Browser Router leef vir navigasie-stabiliteit */}
          <ChatWidget /> 
          
          <Routes>
            {/* 1. Kliënt Bladsy */}
            <Route path="/" element={<Index />} />
            
            {/* 2. Jill se Secret Dashboard */}
            <Route path="/luxe-console" element={<AdminDashboard />} /> 
            
            {/* 3. Foutbladsy */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>

      </TooltipProvider>
    </QueryClientProvider>
  </div>
);


export default AppNew;
