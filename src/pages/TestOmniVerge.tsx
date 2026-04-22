import { useEffect, useState } from 'react';

const TestOmniVerge = () => {
  const [mounted, setMounted] = useState(false);

    useEffect(() => {
      // Set up mock configuration - THIS is what the widget reads from
      (window as any).ovgConfig = {
        tenantId: "test-omniverge-local",
        widgetUrl: "http://localhost:5173",
        // OmniVerge Global branding - overrides default Luxe Med Spa config
        logo: "/images/omnivergeglobal.svg",
        brandName: "OmniVerge Global",
        primaryColor: "#000000",
        aiName: "OVG",
        greeting: "Welcome to OmniVerge Global ✨ I'm OVG, your AI-powered growth strategist. How can we help you master both tradition and innovation to transform challenges into opportunities and bold ideas into lasting success?",
        peekText: "Ready to see the future of AI-powered business?",
        syncBadgeText: "AI CONCIERGE POWERED BY OVG ENGAGE",
        phone: "27760330046",
        headerImage: "/images/omniverge-header.jpg",
      };

    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#c2aa6f] font-inter text-xl">Loading OmniVerge Test...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Simulate their website background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: 'black',
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(194, 170, 111, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(194, 170, 111, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(194, 170, 111, 0.08) 0%, transparent 50%)
          `
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-8">
        <div className="text-center max-w-4xl">
          <img 
            src="/images/omnivergeglobal.svg" 
            alt="OmniVerge Global"
            className="mx-auto mb-8 w-64 h-auto"
          />
          
          <h1 className="text-5xl font-bold text-[#c2aa6f] mb-4 font-inter">
            AI-Powered Growth.
          </h1>
          
          <h2 className="text-2xl text-white mb-6 font-inter">
            OmniVerge Global delivers full-spectrum marketing & AI-powered solutions
          </h2>
          
          <p className="text-gray-300 text-lg mb-8 font-inter leading-relaxed max-w-2xl mx-auto">
            In today's digital age, businesses need more than marketing—they need a partner who masters both tradition and innovation. 
            <strong className="text-[#c2aa6f]"> OmniVerge Global</strong>, we fuse creativity, expertise, and 
            <strong className="text-[#c2aa6f]"> AI-driven strategy</strong> to deliver measurable results & transform challenges into opportunities and bold ideas into lasting success.
          </p>
          
          <div className="flex gap-4 justify-center flex-wrap">
            <button className="px-8 py-3 bg-gradient-to-r from-[#c2aa6f] to-[#a38d59] text-black font-bold rounded-lg hover:shadow-lg hover:shadow-[#c2aa6f]/30 transition-all font-inter">
              Connect
            </button>
            <button className="px-8 py-3 border-2 border-[#c2aa6f] text-[#c2aa6f] font-bold rounded-lg hover:bg-[#c2aa6f]/10 transition-all font-inter">
              Learn More
            </button>
          </div>
          
          <div className="mt-12 p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-[#c2aa6f]/20">
            <p className="text-gray-400 text-sm font-inter">
              🧪 <strong>Test Mode:</strong> The widget in the bottom-right corner is configured with OmniVerge Global's branding. 
              Test the AI responses, voice features, and lead capture functionality.
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default TestOmniVerge;
