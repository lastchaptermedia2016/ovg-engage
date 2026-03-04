import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import WidgetMockup from "./WidgetMockup";

const HeroSection = () => {
  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Video as the only background – no overlays */}
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
              AI-Powered Engagement
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
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/25">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
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
                <span className="font-display text-2xl font-bold text-white">24/7</span> engagement
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <span className="font-display text-2xl font-bold text-white">60s</span> setup
              </div>
            </div>
          </motion.div>

          {/* Right: Widget mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="flex justify-center lg:justify-end"
          >
            <WidgetMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;