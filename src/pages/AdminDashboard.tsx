import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, CalendarCheck } from "lucide-react";

const AdminDashboard = () => {
  // 1. Koppel aan die "Live" data vanaf die kletsbot
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    lastBooking: { name: "Niemand", treatment: "Geen", price: 0 }
  });

  useEffect(() => {
    const syncData = () => {
      const rawData = localStorage.getItem("luxe_live_stats");
      if (rawData) {
        setStats(JSON.parse(rawData));
      }
    };

    syncData(); // Laai data onmiddellik
    window.addEventListener('storage', syncData); // Luister vir veranderinge
    return () => window.removeEventListener('storage', syncData);
  }, []);

  return (
    <div className="min-h-screen bg-black p-8 text-white font-light">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER - JOU BESTAANDE KODE */}
        <header className="flex justify-between items-end border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl tracking-widest uppercase text-pink-200 font-extralight">The Luxe Med Spa</h1>
            <p className="text-white/50 italic font-extralight tracking-tight">Performance Dashboard | New Haven</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1">Live Status</p>
            <span className="flex items-center justify-end gap-2 text-green-400 text-sm">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#4ade80]"></span> 
              Concierge Active
            </span>
          </div>
        </header>

        {/* STAT CARDS - JOU BESTAANDE KODE GEBRUIK NOU LIVE STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Beraamde Inkomste" value={`$${stats.totalRevenue.toFixed(2)}`} icon={<DollarSign className="text-pink-400 w-4 h-4" />} sub="Vanaf AI-besprekings" />
          <StatCard title="Totale Besprekings" value={stats.totalBookings} icon={<CalendarCheck className="text-pink-400 w-4 h-4" />} sub="Hierdie maand" />
          <StatCard title="AI Doeltreffendheid" value="94%" icon={<TrendingUp className="text-pink-400 w-4 h-4" />} sub="Hand-off ratio" />
        </div>

        {/* LAASTE AKTIWITEIT - DYNAMIC UPDATE */}
        <Card className="bg-white/[0.03] border-white/10 text-white backdrop-blur-2xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/[0.02] py-4">
            <CardTitle className="text-pink-200 font-extralight tracking-widest text-sm uppercase">Onlangse AI Besprekings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              <div className="flex justify-between items-center p-6 hover:bg-white/[0.02] transition-colors">
                <div className="flex flex-col">
                  <span className="text-white/90 font-light text-sm">{stats.lastBooking.name} — {stats.lastBooking.treatment}</span>
                  <span className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Status: Confirmed</span>
                </div>
                <span className="text-pink-300 font-light text-lg tracking-tighter">+${stats.lastBooking.price.toFixed(2)}</span>
              </div>
              {/* Meer rye kan hierby kom */}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


const StatCard = ({ title, value, icon, sub }: any) => (
  <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-white/60 uppercase tracking-widest">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-light">{value}</div>
      <p className="text-xs text-white/30 mt-1 italic">{sub}</p>
    </CardContent>
  </Card>
);

export default AdminDashboard;
