import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, CalendarCheck } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalRevenue: 0, totalBookings: 0, data: [] });

  return (
    <div className="min-h-screen bg-black p-8 text-white font-light">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl tracking-widest uppercase text-pink-200">The Luxe Med Spa</h1>
            <p className="text-white/50 italic">Performance Dashboard | New Haven</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-tighter text-white/30">Live Status</p>
            <span className="flex items-center gap-2 text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Concierge Active
            </span>
          </div>
        </header>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Beraamde Inkomste" value={`$${stats.totalRevenue}`} icon={<DollarSign className="text-pink-400" />} sub="Vanaf AI-besprekings" />
          <StatCard title="Totale Besprekings" value={stats.totalBookings} icon={<CalendarCheck className="text-pink-400" />} sub="Hierdie maand" />
          <StatCard title="AI Doeltreffendheid" value="94%" icon={<TrendingUp className="text-pink-400" />} sub="Hand-off ratio" />
        </div>

        {/* LAASTE AKTIWITEIT */}
        <Card className="bg-white/5 border-white/10 text-white backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-pink-200 font-light tracking-wide">Onlangse AI Besprekings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Hierdie sal deur jou DB gevul word */}
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span>Sarah - Botox (4:00 PM)</span>
                <span className="text-pink-300">+$300.00</span>
              </div>
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
