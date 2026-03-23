import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, CalendarCheck } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ 
    totalRevenue: 0, 
    totalBookings: 0, 
    lastBooking: { 
      firstName: "", 
      lastName: "", 
      email: "", 
      phone: "", 
      treatment: "", 
      price: 0, 
      timestamp: "" 
    } 
  });

  useEffect(() => {
    const syncData = () => {
      const rawData = localStorage.getItem("luxe_live_stats");
      if (rawData) {
        setStats(JSON.parse(rawData));
      }
    };

    syncData();
    window.addEventListener('storage', syncData);
    return () => window.removeEventListener('storage', syncData);
  }, []);

  return (
    <div className="min-h-screen bg-black p-8 text-white font-extralight tracking-tight">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* HEADER */}
        <header className="flex justify-between items-end border-b border-white/10 pb-8">
          <div>
            <h1 className="text-4xl tracking-[0.25em] uppercase text-pink-100 font-extralight">The Luxe Med Spa</h1>
            <p className="text-white/40 italic mt-2 tracking-wide text-sm font-light">Performance Analytics | New Haven</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-2">System Status</p>
            <span className="flex items-center justify-end gap-2 text-emerald-400 text-xs font-medium uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span> 
              Concierge Online
            </span>
          </div>
        </header>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatCard 
            title="Projected Revenue" 
            value={`$${stats.totalRevenue.toFixed(2)}`} 
            icon={<DollarSign className="text-pink-300 w-5 h-5" />} 
            sub="Captured via AI Bookings" 
          />
          <StatCard 
            title="Total Bookings" 
            value={stats.totalBookings} 
            icon={<CalendarCheck className="text-pink-300 w-5 h-5" />} 
            sub="Current Monthly Cycle" 
          />
          <StatCard 
            title="AI Efficiency" 
            value="94.2%" 
            icon={<TrendingUp className="text-pink-300 w-5 h-5" />} 
            sub="User-to-Booking Ratio" 
          />
        </div>

        {/* RECENT ACTIVITY SECTION */}
        <Card className="bg-white/[0.02] border-white/10 text-white backdrop-blur-3xl rounded-3xl overflow-hidden shadow-2xl">
          <CardHeader className="border-b border-white/5 bg-white/[0.01] py-6 px-8">
            <CardTitle className="text-pink-100 font-extralight tracking-[0.15em] text-xs uppercase">Latest Client Acquisition</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-8 hover:bg-white/[0.01] transition-all duration-500 gap-6">
                
                <div className="flex flex-col gap-1 min-w-[200px]">
                  <span className="text-white/90 font-light text-xl tracking-tight">
                    {stats.lastBooking.firstName || "New"} {stats.lastBooking.lastName || "Guest"}
                  </span>
                  <span className="text-pink-300/80 text-[11px] uppercase tracking-[0.15em] font-light italic">
                    {stats.lastBooking.treatment || "Service Consultation"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3 py-2 border-l border-white/10 pl-6 text-left">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5 font-bold">Email Address</span>
                    <span className="text-xs text-white/70 font-light">{stats.lastBooking.email || "pending@luxe.com"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5 font-bold">Contact Number</span>
                    <span className="text-xs text-white/70 font-light">{stats.lastBooking.phone || "No number provided"}</span>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end min-w-[100px]">
                  <span className="text-white font-extralight text-2xl tracking-tighter">
                    +${stats.lastBooking.price?.toFixed(2) || "0.00"}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-emerald-500 uppercase tracking-widest font-bold">Confirmed</span>
                    <span className="text-[9px] text-white/20 uppercase tracking-tighter">at {stats.lastBooking.timestamp}</span>
                  </div>
                </div>

              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, sub }: any) => (
  <Card className="bg-white/[0.03] border-white/10 text-white backdrop-blur-xl rounded-2xl p-2 shadow-xl hover:bg-white/[0.05] transition-all duration-500">
    <CardHeader className="flex flex-row items-center justify-between pb-3">
      <CardTitle className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.25em]">{title}</CardTitle>
      <div className="p-2 bg-white/[0.03] rounded-full">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-4xl font-extralight tracking-tight text-white/95">{value}</div>
      <p className="text-[10px] text-white/20 mt-3 italic font-light tracking-wide">{sub}</p>
    </CardContent>
  </Card>
);

export default AdminDashboard;
