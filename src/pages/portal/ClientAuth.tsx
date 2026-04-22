import React, { useState } from 'react';

const ClientAuth = () => {
  const [email, setEmail] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Client login attempt for:", email);
    // Logic for Supabase Client Auth will go here
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent font-sans">
      <div className="max-w-md w-full p-10 bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-100">
        <div className="text-center mb-10">
          <div className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest text-white uppercase bg-[#0097b2] rounded-full">
            Client Portal
          </div>
          <h1 className="text-4xl font-extrabold text-[#226683] tracking-tight">Omniverge</h1>
          <p className="mt-3 text-slate-500">Enter your credentials to manage your assets</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 ml-1">Work Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-2 p-4 bg-white/90 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#0097b2] focus:bg-white outline-none transition-all" 
              placeholder="name@company.com" 
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-[#226683] text-white font-bold rounded-2xl shadow-lg hover:bg-[#0097b2] transform hover:-translate-y-1 transition-all active:scale-95"
          >
            Access Dashboard
          </button>
        </form>
        
        <p className="mt-8 text-center text-sm text-slate-400">
          Need an account? <span className="text-[#0097b2] font-semibold cursor-pointer">Contact your Reseller</span>
        </p>
      </div>
    </div>
  );
};

export default ClientAuth;