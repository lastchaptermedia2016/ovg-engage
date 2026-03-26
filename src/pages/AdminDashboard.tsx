import React, { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, CalendarCheck, Trash2, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Hulpsub-komponent vir die StatCards om herhaling te voorkom en styl te behou
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
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    bookings: [] as any[],
  });

  const syncData = () => {
    const raw = localStorage.getItem("luxe_live_stats");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    setStats({
      totalRevenue: Number(parsed.totalRevenue) || 0,
      totalBookings: Number(parsed.totalBookings) || 0,
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings.slice(0, 25) : []
    });
  };

  useEffect(() => {
    syncData();
    window.addEventListener('storage', syncData);
    window.addEventListener('luxe_update', syncData);
    return () => {
      window.removeEventListener('storage', syncData);
      window.removeEventListener('luxe_update', syncData);
    };
  }, []);

  const clearAllData = () => {
    if (confirm("Clear ALL booking history?")) {
      localStorage.removeItem("luxe_live_stats");
      setStats({ totalRevenue: 0, totalBookings: 0, bookings: [] });
    }
  };

  const handleWhatsApp = (booking: any) => {
    const cleanPhone = booking.phone.replace(/\D/g, '');
    const msg = `Hello ${booking.title} ${booking.lastName}, your bespoke ${booking.treatment} at The Luxe Med Spa is confirmed. We have your ${booking.refreshment} ready. See you in the sanctuary!`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0A0505] selection:bg-[#D4AF37]/30 font-extralight tracking-tight text-white p-8">
      
      {/* 🚀 DIE "LUXE SHIMMER" LYN - HEEL BO */}
      <div className="fixed top-0 left-0 w-full h-[2px] z-50 overflow-hidden bg-white/5">
        <div className="w-[40%] h-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-shimmer-fast shadow-[0_0_15px_rgba(212,175,55,0.8)]"></div>
      </div>

      {/* 1. AGTERGROND AURA (Velvet & Gold) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[70%] h-[70%] bg-[#450a0a]/20 rounded-full blur-[160px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/5 rounded-full blur-[180px] animate-pulse delay-1000"></div>
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com')] mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 max-w-[1500px] mx-auto space-y-12">
        
        {/* HEADER */}
        <header className="flex justify-between items-end border-b border-[#D4AF37]/10 pb-10">
          <div className="space-y-1">
            <h1 className="text-5xl tracking-[0.35em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#F9E4B7] via-[#D4AF37] to-[#C5A028] font-extralight italic drop-shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              The Luxe Med Spa
            </h1>
            <p className="text-[#D4AF37]/30 italic mt-3 text-[10px] font-light uppercase tracking-[0.5em] flex items-center gap-3">
              <span className="w-8 h-[1px] bg-[#D4AF37]/20"></span>
              Bespoke Business Intelligence • New Haven Sanctuary
            </p>
          </div>
          <button onClick={clearAllData} className="group flex items-center gap-3 px-7 py-3 text-[9px] uppercase tracking-[0.3em] bg-[#D4AF37]/[0.02] hover:bg-red-900/20 border border-[#D4AF37]/10 hover:border-red-500/40 text-[#D4AF37]/40 hover:text-red-400 rounded-full transition-all duration-700">
            <Trash2 className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" /> 
            Reset Console
          </button>
        </header>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <StatCard 
            title={<span className="text-[#D4AF37]/80 uppercase tracking-widest text-[10px]">Projected Revenue</span>} 
            value={<span className="text-[#FFD700] drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] font-light">${stats.totalRevenue.toFixed(2)}</span>} 
            icon={<DollarSign className="text-[#D4AF37] w-5 h-5" />} 
            sub={<span className="text-[#C5A028]/40 italic text-[9px]">Confirmed AI Conversions</span>} 
            className="border-[#D4AF37]/10 bg-gradient-to-b from-white/[0.03] to-transparent"
          />
          <StatCard 
            title={<span className="text-[#D4AF37]/80 uppercase tracking-widest text-[10px]">Total Bookings</span>} 
            value={<span className="text-[#FFD700] drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] font-light">{stats.totalBookings}</span>} 
            icon={<CalendarCheck className="text-[#D4AF37] w-5 h-5" />} 
            sub={<span className="text-[#C5A028]/40 italic text-[9px]">Active Session Count</span>} 
            className="border-[#D4AF37]/10"
          />
          <StatCard 
            title={<span className="text-[#D4AF37]/80 uppercase tracking-widest text-[10px]">AI Efficiency</span>} 
            value={<span className="text-[#FFD700] drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] font-light">94.2%</span>} 
            icon={<TrendingUp className="text-[#D4AF37] w-5 h-5" />} 
            sub={<span className="text-[#C5A028]/40 italic text-[9px]">Lead-to-Sanctuary Ratio</span>} 
            className="border-[#D4AF37]/10"
          />
        </div>

        {/* LIVE BOOKING STREAM */}
        <Card className="bg-black/20 border-[#D4AF37]/10 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden shadow-2xl">
          <CardHeader className="border-b border-[#D4AF37]/10 py-8 px-10 flex flex-row items-center justify-between">
            <CardTitle className="text-[#D4AF37]/40 font-extralight tracking-[0.4em] text-[9px] uppercase italic">Live Booking Stream — Global Logs</CardTitle>
            <div className="flex items-center gap-3 px-4 py-1.5 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
              <span className="text-[8px] text-emerald-500/60 uppercase tracking-[0.3em] font-bold">System Online</span>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-black/40 border-b border-[#D4AF37]/10">
                <tr className="text-[9px] uppercase tracking-[0.2em] text-[#D4AF37]/60">
                  <th className="text-left py-6 px-10">Profile</th>
                  <th className="text-left py-6 px-8">First Name</th>
                  <th className="text-left py-6 px-8">Surname</th>
                  <th className="text-left py-6 px-8 italic opacity-50">Drinks</th>
                  <th className="text-left py-6 px-8">Contact</th>
                  <th className="text-left py-6 px-8 font-mono">Time</th>
                  <th className="text-left py-6 px-8">Status</th>
                  <th className="text-left py-6 px-8">Treatment</th>
                  <th className="text-right py-6 px-10">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/5">
                {stats.bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-[#D4AF37]/5 transition-colors group">
                    <td className="py-6 px-10 text-[#F9E4B7]/60">{booking.title}</td>
                    <td className="py-6 px-8 font-medium text-[#D4AF37]">{booking.firstName}</td>
                    <td className="py-6 px-8 text-[#F9E4B7]/80">{booking.lastName}</td>
                    <td className="py-6 px-8 italic text-[#C5A028]/60">{booking.refreshment}</td>
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleWhatsApp(booking)} className="text-[#D4AF37]/40 hover:text-emerald-400 transition-colors">
                          <Smartphone className="w-3 h-3" />
                        </button>
                        <div className="text-[10px] text-white/40">{booking.phone}</div>
                      </div>
                    </td>
                    <td className="py-6 px-8 font-mono text-[10px] text-white/20">{booking.timestamp}</td>
                    <td className="py-6 px-8">
                      <span className={`px-3 py-1 rounded-full text-[9px] border ${
                        booking.status === 'New' 
                        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' 
                        : 'border-[#D4AF37]/30 text-[#D4AF37] bg-[#D4AF37]/10'
                      }`}>
                        {booking.status || 'RETURNING'}
                      </span>
                    </td>
                    <td className="py-6 px-8 text-[#F9E4B7]/90">{booking.treatment}</td>
                    <td className="py-6 px-10 text-right font-bold text-[#FFD700]">
                      +${Number(booking.price).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

           <style>{`
        @keyframes shimmer-fast {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(250%); }
        }
        .animate-shimmer-fast {
          animation: shimmer-fast 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        /* Versteek scrollbar maar behou funksionaliteit */
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
      `}</style>
 
    </div>
  );
};

export default AdminDashboard;
