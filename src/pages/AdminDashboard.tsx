import React, { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, CalendarCheck, Trash2, Smartphone, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// --- STEALTH CONFIGURATION ---
const AUTHORIZED_KEY = "luxe-admin-stealth-access"; 

const StatCard = ({ title, value, icon, sub, className = "" }: any) => (
  <div className={`relative overflow-hidden rounded-[2rem] p-8 border backdrop-blur-3xl bg-white/[0.02] ${className}`}>
    <div className="flex justify-between items-start mb-4">
      {title}
      {icon}
    </div>
    <div className="text-4xl mb-2">{value}</div>
    <div className="mt-1">{sub}</div>
  </div>
);

const AdminDashboard = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    bookings: [] as any[],
  });

  // 1. SYNC WITH THE SHIFT+J BYPASS
  useEffect(() => {
    const checkAccess = () => {
      const auth = localStorage.getItem(AUTHORIZED_KEY);
      if (auth === "true") setIsAuthorized(true);
    };
    
    checkAccess();
    window.addEventListener('storage', checkAccess);
    return () => window.removeEventListener('storage', checkAccess);
  }, []);

  // 2. DATA SYNC (LOCKING THE 11-POINT GRID)
  const syncData = () => {
    const raw = localStorage.getItem("luxe_live_stats");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    setStats({
      totalRevenue: Number(parsed.totalRevenue) || 0,
      totalBookings: Number(parsed.totalBookings) || 0,
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : []
    });
  };

  useEffect(() => {
    if (isAuthorized) {
      syncData();
      window.addEventListener('luxe_update', syncData);
      return () => window.removeEventListener('luxe_update', syncData);
    }
  }, [isAuthorized]);

  const clearAllData = () => {
    if (confirm("Permanently wipe the sanctuary logs?")) {
      localStorage.removeItem("luxe_live_stats");
      setStats({ totalRevenue: 0, totalBookings: 0, bookings: [] });
    }
  };

  // 3. THE "GHOST 404" BYPASS
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-sans">
        <div className="text-center space-y-4">
          <h1 className="text-2xl tracking-widest opacity-50">404</h1>
          <p className="text-sm uppercase tracking-[0.5em] opacity-30">Access Restricted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0A0505] selection:bg-[#D4AF37]/30 font-extralight tracking-tight text-white p-8">
      
      {/* SHIMMER LINE */}
      <div className="fixed top-0 left-0 w-full h-[2px] z-50 overflow-hidden bg-white/5">
        <div className="w-[40%] h-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-shimmer-fast"></div>
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto space-y-12">
        
        {/* HEADER */}
        <header className="flex justify-between items-end border-b border-[#D4AF37]/10 pb-10">
          <div className="space-y-1">
            <h1 className="text-5xl tracking-[0.35em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#F9E4B7] via-[#D4AF37] to-[#C5A028] italic">
              The Luxe Med Spa
            </h1>
            <p className="text-[#D4AF37]/30 italic mt-3 text-[10px] uppercase tracking-[0.5em]">
              Intelligence Console • New Haven Sanctuary
            </p>
          </div>
          <button onClick={clearAllData} className="px-7 py-3 text-[9px] uppercase tracking-[0.3em] bg-red-900/10 border border-red-900/30 text-red-400 hover:bg-red-900/20 rounded-full transition-all">
            <Trash2 className="w-3.5 h-3.5 inline mr-2" /> Reset
          </button>
        </header>

        {/* METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <StatCard title="Revenue" value={`$${stats.totalRevenue}`} icon={<DollarSign className="text-[#D4AF37]"/>} sub="AI Projected" />
          <StatCard title="Sessions" value={stats.totalBookings} icon={<CalendarCheck className="text-[#D4AF37]"/>} sub="Active Leads" />
          <StatCard title="Conversion" value="94.2%" icon={<TrendingUp className="text-[#D4AF37]"/>} sub="Efficiency" />
        </div>

        {/* 11-POINT MASTER GRID */}
        <Card className="bg-black/40 border-[#D4AF37]/10 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="border-b border-[#D4AF37]/10 py-6 px-10">
             <CardTitle className="text-[#D4AF37] tracking-[0.2em] uppercase text-xs">Live Sanctuary Stream</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* GRID HEADER */}
            <div className="grid grid-cols-11 gap-2 px-10 py-4 bg-white/[0.02] text-[9px] uppercase tracking-widest text-[#D4AF37]/60 font-bold border-b border-[#D4AF37]/5">
              <div>Type</div><div>Title</div><div>First</div><div>Last</div><div>Phone</div><div>Email</div><div>Drink</div><div>Time</div><div>Treatment</div><div>Price</div><div>Actions</div>
            </div>

            {/* DATA ROWS */}
            <div className="divide-y divide-[#D4AF37]/5 max-h-[600px] overflow-auto">
              {stats.bookings.length > 0 ? stats.bookings.map((b: any, i: number) => (
                <div key={i} className="grid grid-cols-11 gap-2 px-10 py-6 text-[11px] items-center hover:bg-white/[0.01] transition-colors">
                  <div className={b.isNew ? "text-emerald-400" : "text-blue-400"}>{b.isNew ? "✨ NEW" : "🔄 RET"}</div>
                  <div className="opacity-50">{b.title || "-"}</div>
                  <div className="font-medium">{b.firstName || "Guest"}</div>
                  <div>{b.lastName || "-"}</div>
                  <div className="opacity-60">{b.phone || "-"}</div>
                  <div className="truncate opacity-60">{b.email || "-"}</div>
                  <div className="italic text-[#D4AF37]/70">{b.refreshment || "-"}</div>
                  <div className="font-mono text-[#D4AF37]">{b.time || b.timestamp || "-"}</div>
                  <div className="truncate">{b.treatment || "-"}</div>
                  <div className="text-[#D4AF37] font-bold">${b.price || "0"}</div>
                  <div>
                    <button 
                      onClick={() => {
                        const cleanPhone = b.phone?.replace(/\D/g, '');
                        const message = `Hello ${b.title || ''} ${b.firstName || ''}, this is The Luxe Med Spa confirming your ${b.treatment} appointment for ${b.time}. Your ${b.refreshment || 'refreshment'} will be ready. Amount: $${b.price || '0'}. We look forward to seeing you! 💎`;
                        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
                      }} 
                      className="p-2 hover:bg-[#D4AF37]/10 rounded-full text-[#D4AF37] transition-colors"
                      title="Send WhatsApp confirmation"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="p-20 text-center text-[#D4AF37]/20 italic">Awaiting next bespoke experience...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;