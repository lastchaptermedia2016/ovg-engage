import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Video as sole background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-0"
        onLoadedMetadata={(e) => {
          const video = e.currentTarget;
          video.loop = true;
          video.muted = true;
          video.play().catch(() => {
            document.addEventListener('click', () => video.play(), { once: true });
          });
        }}
      >
        <source src="/videos/video-bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-6 flex h-full items-center">
        <div className="grid w-full items-center gap-16 lg:grid-cols-2">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <Play className="h-3 w-3 fill-current" />
              AI-Powered OVG Engagement
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl text-white">
              Turn passive browsers into{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                conversations
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Deploy an AI concierge on your website in 60 seconds. Greet visitors, answer questions, and capture leads—24/7, without lifting a finger.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="relative z-[9999] pointer-events-auto">
                <button
                  onClick={() => {
                    console.log("Button Clicked!");
                    navigate('/dashboard');
                  }}
                  role="button"
                  tabIndex={0}
                  className="px-8 py-4 border-2 border-[#0097b2]/60 rounded-lg font-bold tracking-[0.2em] text-sm bg-clip-text text-transparent bg-gradient-to-tr from-[#226683] via-[#0097b2] to-[#226683] shadow-[0_0_20px_rgba(0,151,178,0.3)] hover:shadow-[0_0_30px_rgba(0,151,178,0.5)] hover:scale-105 transition-all duration-300"
                >
                  INITIATE ACTION
                </button>
              </div>
              <Button variant="outline" size="lg">
                See Demo
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-8 text-sm text-muted-foreground">
              <div>
                <span className="font-display text-2xl font-bold text-white">3×</span> more leads
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <span className="font-display text-2xl font-bold text-white">24/7</span> OVG engagement
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <span className="font-display text-2xl font-bold text-white">60s</span> setup
              </div>
            </div>
          </motion.div>

          {/* Right side spacer — keeps layout balanced without mockup */}
          <div className="hidden lg:block" /> {/* empty div maintains grid column */}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;