import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, CalendarCheck } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ 
    totalRevenue: 0, 
    totalBookings: 0, 
    lastBooking: { 
      title: "",
      firstName: "", 
      lastName: "", 
      isRepeat: false,
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
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
              
              {/* 1. Client Profile, Title & Type */}
              <div className="space-y-3 min-w-[250px]">
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${stats.lastBooking.isRepeat ? 'border-pink-500/50 text-pink-400 bg-pink-500/5' : 'border-emerald-500/50 text-emerald-400 bg-emerald-500/5'}`}>
                    {stats.lastBooking.isRepeat ? "Repeat Client" : "New Client"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-pink-300/60 text-xs font-light italic uppercase tracking-tighter">
                    {stats.lastBooking.title || "Client"}
                  </span>
                  <h3 className="text-3xl font-extralight text-white/90 tracking-tight">
                    {stats.lastBooking.firstName || "New"} {stats.lastBooking.lastName || "Guest"}
                  </h3>
                </div>
                <p className="text-pink-300 text-sm tracking-[0.1em] font-light uppercase italic">
                  {stats.lastBooking.treatment || "Service Consultation"}
                </p>
              </div>

              {/* 2. Contact Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4 py-4 lg:border-l lg:border-white/10 lg:pl-12">
                <div className="flex flex-col">
                  <span className="text-[10px] text-pink-200/40 mb-1 font-bold tracking-[0.2em] uppercase">Email Address</span>
                  <span className="text-sm text-white/70 font-light">{stats.lastBooking.email || "pending@luxe.com"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-pink-200/40 mb-1 font-bold tracking-[0.2em] uppercase">Contact Number</span>
                  <span className="text-sm text-white/70 font-light">{stats.lastBooking.phone || "Not Provided"}</span>
                </div>
              </div>

              {/* 3. Transaction Value & Time */}
              <div className="text-right min-w-[140px]">
                <span className="block text-3xl font-extralight text-white tracking-tighter">
                  +${stats.lastBooking.price?.toFixed(2) || "0.00"}
                </span>
                <span className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-medium">
                  Confirmed at {stats.lastBooking.timestamp}
                </span>
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
