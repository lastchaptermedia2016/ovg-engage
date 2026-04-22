import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  groqCredits: number;
  elevenLabsCredits: number;
  brandColor: string;
  createdAt: string;
}

const ResellerConsole = () => {
  const [tenants, setTenants] = useState<Tenant[]>([
    {
      id: 'tenant-001',
      name: 'Acme Corp',
      status: 'active',
      groqCredits: 5000,
      elevenLabsCredits: 2000,
      brandColor: '#0097b2',
      createdAt: '2026-01-15'
    },
    {
      id: 'tenant-002',
      name: 'Beta Industries',
      status: 'active',
      groqCredits: 3500,
      elevenLabsCredits: 1500,
      brandColor: '#6366f1',
      createdAt: '2026-02-01'
    },
    {
      id: 'tenant-003',
      name: 'Gamma Solutions',
      status: 'inactive',
      groqCredits: 1000,
      elevenLabsCredits: 500,
      brandColor: '#10b981',
      createdAt: '2026-03-10'
    }
  ]);

  useEffect(() => {
    // Set up Supabase Realtime for credit usage updates
    const channel = supabase
      .channel('credit-usage-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tenant_credits'
        },
        (payload) => {
          const updatedCredit = payload.new as any;
          setTenants(prev => prev.map(tenant => 
            tenant.id === updatedCredit.tenant_id 
              ? { 
                  ...tenant, 
                  groqCredits: updatedCredit.groq_credits || tenant.groqCredits,
                  elevenLabsCredits: updatedCredit.elevenlabs_credits || tenant.elevenLabsCredits
                } 
              : tenant
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [globalBrandColor, setGlobalBrandColor] = useState('#0097b2');
  const [globalFont, setGlobalFont] = useState('Inter');
  const [globalVoiceId, setGlobalVoiceId] = useState('21m00Tcm4TlvDq8ikWAM');
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [showBrandPanel, setShowBrandPanel] = useState(false);

  const handleApplyGlobalTheme = () => {
    // Apply global theme to all tenants
    setTenants(prev => prev.map(tenant => ({
      ...tenant,
      brandColor: globalBrandColor
    })));
    console.log('Global theme applied to all tenants');
  };

  const handleUpdateTenantBrand = (tenantId: string, newColor: string) => {
    setTenants(prev => prev.map(tenant => 
      tenant.id === tenantId ? { ...tenant, brandColor: newColor } : tenant
    ));
  };

  const handleAddCredits = (tenantId: string, type: 'groq' | 'elevenLabs', amount: number) => {
    setTenants(prev => prev.map(tenant => {
      if (tenant.id === tenantId) {
        if (type === 'groq') {
          return { ...tenant, groqCredits: tenant.groqCredits + amount };
        } else {
          return { ...tenant, elevenLabsCredits: tenant.elevenLabsCredits + amount };
        }
      }
      return tenant;
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'inactive': return '#6b7280';
      case 'suspended': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <main className="relative w-full h-screen bg-transparent p-8 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-wider" style={{ color: '#D4AF37' }}>
            RESELLER CONSOLE
          </h1>
          <button
            onClick={() => setShowBrandPanel(!showBrandPanel)}
            className="px-4 py-2 bg-gradient-to-r from-[#A67C00] via-[#F9E498] to-[#D4AF37] rounded text-[#0A2540] text-sm font-bold hover:from-[#B89630] hover:via-[#FAF5D6] hover:to-[#E5C158] transition-all"
          >
            {showBrandPanel ? 'Hide Brand Panel' : 'Global Brand Override'}
          </button>
        </div>

        {/* Global Brand Override Panel */}
        {showBrandPanel && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 mb-6">
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#D4AF37' }}>
              Global Brand Override
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm text-white/70 mb-2 block">Brand Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={globalBrandColor}
                    onChange={(e) => setGlobalBrandColor(e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={globalBrandColor}
                    onChange={(e) => setGlobalBrandColor(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border rounded text-white text-sm"
                    style={{ borderColor: '#0097b2' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-2 block">Global Font</label>
                <select
                  value={globalFont}
                  onChange={(e) => setGlobalFont(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border rounded text-white text-sm"
                  style={{ borderColor: '#0097b2' }}
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                  <option value="Montserrat">Montserrat</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-2 block">Default Voice</label>
                <select
                  value={globalVoiceId}
                  onChange={(e) => setGlobalVoiceId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border rounded text-white text-sm"
                  style={{ borderColor: '#0097b2' }}
                >
                  <option value="21m00Tcm4TlvDq8ikWAM">Adam - Deep</option>
                  <option value="AZnzlk1XvdvUeBnXmlld">Bella - Professional</option>
                  <option value="D38z5RkWrs4dI642Wlx">Charlie - Friendly</option>
                  <option value="EXAVITQu4vr4xnSDxMaL">Daniel - Luxury</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleApplyGlobalTheme}
              className="w-full px-4 py-3 bg-gradient-to-r from-[#0097b2] to-[#226683] rounded text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Apply Global Theme to All Tenants
            </button>
          </div>
        )}

        {/* Tenant Overview */}
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#0097b2' }}>
              Multi-Tenant Overview
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#0097b230' }}>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-white/70">Tenant</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-white/70">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-white/70">Brand Color</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-white/70">Groq Credits</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-white/70">ElevenLabs Credits</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-white/70">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-white/70">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b hover:bg-white/5" style={{ borderColor: '#0097b210' }}>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{tenant.name}</div>
                        <div className="text-xs text-white/50">{tenant.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span 
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ 
                            background: `${getStatusColor(tenant.status)}20`,
                            color: getStatusColor(tenant.status)
                          }}
                        >
                          {tenant.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: tenant.brandColor }}
                          />
                          <span className="text-sm text-white/70">{tenant.brandColor}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-white">{tenant.groqCredits.toLocaleString()}</div>
                        <button
                          onClick={() => handleAddCredits(tenant.id, 'groq', 1000)}
                          className="text-xs mt-1 text-[#0097b2] hover:underline"
                        >
                          + Add 1000
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-white">{tenant.elevenLabsCredits.toLocaleString()}</div>
                        <button
                          onClick={() => handleAddCredits(tenant.id, 'elevenLabs', 500)}
                          className="text-xs mt-1 text-[#0097b2] hover:underline"
                        >
                          + Add 500
                        </button>
                      </td>
                      <td className="py-3 px-4 text-sm text-white/70">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedTenant(selectedTenant === tenant.id ? null : tenant.id)}
                          className="px-3 py-1 bg-white/10 rounded text-xs text-white hover:bg-white/20 transition-colors"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tenant Management Panel */}
          {selectedTenant && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 animate-pulse">
              <h2 className="text-xl font-semibold mb-4" style={{ color: '#D4AF37' }}>
                Manage: {tenants.find(t => t.id === selectedTenant)?.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-white/70 mb-2 block">Override Brand Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={tenants.find(t => t.id === selectedTenant)?.brandColor || '#0097b2'}
                      onChange={(e) => handleUpdateTenantBrand(selectedTenant, e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={tenants.find(t => t.id === selectedTenant)?.brandColor || ''}
                      onChange={(e) => handleUpdateTenantBrand(selectedTenant, e.target.value)}
                      className="flex-1 px-3 py-2 bg-white/5 border rounded text-white text-sm"
                      style={{ borderColor: '#0097b2' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-2 block">Status</label>
                  <select
                    value={tenants.find(t => t.id === selectedTenant)?.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as 'active' | 'inactive' | 'suspended';
                      setTenants(prev => prev.map(t => 
                        t.id === selectedTenant ? { ...t, status: newStatus } : t
                      ));
                    }}
                    className="w-full px-3 py-2 bg-white/5 border rounded text-white text-sm"
                    style={{ borderColor: '#0097b2' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-2 block">Groq Credits Override</label>
                  <input
                    type="number"
                    value={tenants.find(t => t.id === selectedTenant)?.groqCredits || 0}
                    onChange={(e) => {
                      const newCredits = parseInt(e.target.value) || 0;
                      setTenants(prev => prev.map(t => 
                        t.id === selectedTenant ? { ...t, groqCredits: newCredits } : t
                      ));
                    }}
                    className="w-full px-3 py-2 bg-white/5 border rounded text-white text-sm"
                    style={{ borderColor: '#0097b2' }}
                  />
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-2 block">ElevenLabs Credits Override</label>
                  <input
                    type="number"
                    value={tenants.find(t => t.id === selectedTenant)?.elevenLabsCredits || 0}
                    onChange={(e) => {
                      const newCredits = parseInt(e.target.value) || 0;
                      setTenants(prev => prev.map(t => 
                        t.id === selectedTenant ? { ...t, elevenLabsCredits: newCredits } : t
                      ));
                    }}
                    className="w-full px-3 py-2 bg-white/5 border rounded text-white text-sm"
                    style={{ borderColor: '#0097b2' }}
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setSelectedTenant(null)}
                  className="px-4 py-2 bg-gradient-to-r from-[#0097b2] to-[#226683] rounded text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setSelectedTenant(null)}
                  className="px-4 py-2 bg-white/10 rounded text-white text-sm hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Usage Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#0097b2' }}>
              Total Groq Usage
            </h3>
            <div className="text-3xl font-bold" style={{ color: '#D4AF37' }}>
              {tenants.reduce((sum, t) => sum + t.groqCredits, 0).toLocaleString()}
            </div>
            <div className="text-xs text-white/60 mt-1">Credits across all tenants</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#0097b2' }}>
              Total ElevenLabs Usage
            </h3>
            <div className="text-3xl font-bold" style={{ color: '#D4AF37' }}>
              {tenants.reduce((sum, t) => sum + t.elevenLabsCredits, 0).toLocaleString()}
            </div>
            <div className="text-xs text-white/60 mt-1">Credits across all tenants</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#0097b2' }}>
              Active Tenants
            </h3>
            <div className="text-3xl font-bold" style={{ color: '#D4AF37' }}>
              {tenants.filter(t => t.status === 'active').length}
            </div>
            <div className="text-xs text-white/60 mt-1">of {tenants.length} total</div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ResellerConsole;
