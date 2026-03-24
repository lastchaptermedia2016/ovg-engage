import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, CalendarCheck, Trash2 } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    bookings: [] as any[],
    lastBooking: { title: "", firstName: "", lastName: "", isRepeat: false, email: "", phone: "", treatment: "", price: 0, timestamp: "" }
  });

  const syncData = () => {
    const raw = localStorage.getItem("luxe_live_stats");
    if (!raw) return;
    const parsed = JSON.parse(raw);

    setStats(prev => {
      let newBookings = Array.isArray(parsed.bookings) ? [...parsed.bookings] : [];
      return { 
        ...parsed, 
        totalRevenue: Number(parsed.totalRevenue) || 0,
        totalBookings: Number(parsed.totalBookings) || 0,
        bookings: newBookings.slice(0, 25) 
      };
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
      localStorage.removeItem("luxe_last_id");
      setStats({ totalRevenue: 0, totalBookings: 0, bookings: [], lastBooking: { title: "", firstName: "", lastName: "", isRepeat: false, email: "", phone: "", treatment: "", price: 0, timestamp: "" } });
    }
  };

  return (
  <div className="min-h-screen relative overflow-hidden bg-[#080406] selection:bg-pink-500/30 font-extralight tracking-tight text-white p-8">
    
    {/* 1. DIE "LUXE SILK AURA" - AGTERGROND LIGTE */}
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Sagte Gloei Bo-Links (Champagne/Pienk) */}
      <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-pink-900/15 rounded-full blur-[140px] animate-pulse transition-all duration-[5000ms]"></div>
      
      {/* Sagte Rose-Goud Onder-Regs */}
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-800/10 rounded-full blur-[160px] animate-pulse delay-700"></div>
      
      {/* "Subtle Silk Grain" - Gee dit 'n tasbare, luukse papier/stof tekstuur */}
      <div className="absolute inset-0 opacity-[0.02] bg-[url('https://www.transparenttextures.com')]"></div>
    </div>

    {/* 2. DASHBOARD INHOUD */}
    <div className="relative z-10 max-w-[1400px] mx-auto space-y-12">

      {/* HEADER */}
      <header className="flex justify-between items-end border-b border-white/5 pb-10">
        <div className="space-y-1">
          <h1 className="text-5xl tracking-[0.35em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-pink-100 via-white to-rose-200 font-extralight italic drop-shadow-[0_0_15px_rgba(255,182,193,0.1)] transition-all duration-700 hover:tracking-[0.4em]">
            The Luxe Med Spa
          </h1>
          <p className="text-pink-100/20 italic mt-3 text-[10px] font-light uppercase tracking-[0.5em] flex items-center gap-3">
            <span className="w-8 h-[1px] bg-pink-500/20"></span>
            Bespoke Business Intelligence • New Haven Sanctuary
          </p>
        </div>
        <button 
          onClick={clearAllData} 
          className="group flex items-center gap-3 px-7 py-3 text-[9px] uppercase tracking-[0.3em] bg-white/[0.02] hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-white/30 hover:text-red-400 rounded-full transition-all duration-700 backdrop-blur-xl shadow-2xl"
        >
          <Trash2 className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-500" /> 
          Reset Console
        </button>
      </header>

      {/* Die rest van jou Metric Cards en Tabel gaan hier voort ... */}


        {/* METRIC CARDS - CRYSTAL UPGRADE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <StatCard title="Projected Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} icon={<DollarSign className="text-pink-300 w-5 h-5" />} sub="Confirmed AI Conversions" />
          <StatCard title="Total Bookings" value={stats.totalBookings} icon={<CalendarCheck className="text-pink-300 w-5 h-5" />} sub="Active Session Count" />
          <StatCard title="AI Efficiency" value="94.2%" icon={<TrendingUp className="text-pink-300 w-5 h-5" />} sub="Lead-to-Sanctuary Ratio" />
        </div>

        {/* LIVE BOOKING STREAM - FLOATING GLASS UPGRADE */}
        <Card className="bg-white/[0.01] border-white/5 text-white backdrop-blur-3xl rounded-[2.5rem] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border-t-white/10">
          <CardHeader className="border-b border-white/5 bg-white/[0.01] py-8 px-10 flex flex-row items-center justify-between">
            <CardTitle className="text-pink-100/40 font-extralight tracking-[0.4em] text-[9px] uppercase italic">Live Booking Stream — Global Logs</CardTitle>
            <div className="flex items-center gap-3 px-4 py-1.5 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
              <span className="text-[8px] text-emerald-500/60 uppercase tracking-[0.3em] font-bold">System Online</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[700px] overflow-y-scroll scrollbar-none">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-black/40 border-b border-white/5 sticky top-0 z-20 backdrop-blur-3xl">
                  <tr className="text-[8px] uppercase tracking-[0.35em] text-white/30">
                    <th className="text-left py-7 px-10 font-medium">Profile</th>
                    <th className="text-left py-7 px-8 font-medium">First Name</th>
                    <th className="text-left py-7 px-8 font-medium">Surname</th>
                    <th className="text-left py-7 px-8 font-medium text-amber-200/30 italic">Notes/Drinks</th>
                    <th className="text-left py-7 px-8 font-medium text-white/10 font-mono">Timestamp</th>
                    <th className="text-left py-7 px-8 font-medium">Status</th>
                    <th className="text-left py-7 px-8 font-medium">Treatment</th>
                    <th className="text-right py-7 px-10 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {stats.bookings?.length > 0 ? (
                    stats.bookings.map((b: any, i: number) => {
                      const isCancelled = b.status === "CANCELLED";
                      return (
                        <tr key={b.id || i} className={`transition-all duration-700 group ${isCancelled ? 'bg-red-500/[0.02] opacity-40' : 'hover:bg-pink-500/[0.02]'}`}>
                          <td className="py-7 px-10 font-extralight text-pink-300/40 text-[10px] tracking-widest uppercase italic">{b.title || "—"}</td>
                          <td className={`py-7 px-8 font-light tracking-wide ${isCancelled ? 'text-white/10' : 'text-white/80'}`}>{b.firstName || "Guest"}</td>
                          <td className={`py-7 px-8 font-light tracking-wide ${isCancelled ? 'text-white/10' : 'text-white/80'}`}>{b.lastName || "Client"}</td>
                          
                          <td className="py-7 px-8">
                            <span className="text-[10px] text-amber-200/40 uppercase tracking-[0.2em] font-medium italic group-hover:text-amber-200/70 transition-colors duration-500">
                              {b.refreshment || "Standard Water"}
                            </span>
                          </td>

                          <td className="py-7 px-8">
                            <span className="text-[9px] text-white/10 font-mono tracking-[0.25em] uppercase group-hover:text-white/40 transition-colors">
                              {b.timestamp || "—"}
                            </span>
                          </td>

                          <td className="py-7 px-8">
                            <span className={`inline-flex px-4 py-1 text-[8px] uppercase tracking-[0.3em] rounded-full border transition-all duration-700 ${
                              isCancelled ? 'border-red-500/20 text-red-500/40 bg-red-500/[0.02]' : 
                              b.isRepeat ? 'border-pink-500/20 text-pink-400/60 bg-pink-500/[0.02] group-hover:border-pink-500/40' : 
                              'border-emerald-500/20 text-emerald-400/60 bg-emerald-500/[0.02] group-hover:border-emerald-500/40'
                            }`}>
                              {isCancelled ? "Void" : b.isRepeat ? "Return" : "New"}
                            </span>
                          </td>
                          <td className={`py-7 px-8 italic text-xs tracking-wide ${isCancelled ? 'text-white/5 line-through' : 'text-white/40 font-extralight group-hover:text-white/70'}`}>
                            {b.treatment || "Consultation"}
                          </td>
                          <td className="py-7 px-10 text-right">
                            <span className={`text-xl font-extralight tracking-tighter transition-all duration-700 ${
                              isCancelled ? 'text-white/5 line-through font-normal' : 'text-emerald-400/80 group-hover:text-emerald-300 group-hover:drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                            }`}>
                              {isCancelled ? `$${Number(b.price || 0).toFixed(2)}` : `+$${Number(b.price || 0).toFixed(2)}`}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={9} className="py-32 text-center text-white/10 text-[9px] uppercase tracking-[0.5em] font-light italic">Refining Sanctuary Intelligence...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, sub }: any) => (
  <Card className="relative overflow-hidden bg-white/[0.01] border-white/5 text-white backdrop-blur-3xl rounded-[2rem] p-2 shadow-2xl hover:bg-white/[0.03] transition-all duration-700 group border-t-white/10">
    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
    <CardHeader className="flex flex-row items-center justify-between pb-4 relative z-10">
      <CardTitle className="text-[9px] font-bold text-white/20 uppercase tracking-[0.4em] italic">{title}</CardTitle>
      <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 group-hover:border-pink-500/20 transition-all duration-500">{icon}</div>
    </CardHeader>
    <CardContent className="relative z-10 pt-2">
      <div className="text-5xl font-extralight tracking-tighter text-white/90 group-hover:translate-x-1 transition-transform duration-700">{value}</div>
      <p className="text-[9px] text-white/10 mt-5 italic font-light tracking-[0.3em] uppercase group-hover:text-pink-300/30 transition-colors">{sub}</p>
    </CardContent>
  </Card>
);

export default AdminDashboard;
