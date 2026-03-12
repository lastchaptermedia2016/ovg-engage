import { motion } from "framer-motion";
import { Mic, Send, X, MessageCircle } from "lucide-react";

const WidgetMockup = () => {
  return (
    <div className="relative w-full max-w-sm">
      {/* Chat window */}
      <motion.div
        className="rounded-2xl border border-border shadow-2xl shadow-primary/10 overflow-hidden"
        style={{ backgroundColor: 'hsla(340, 40%, 80%, 0.6)', backdropFilter: 'blur(4px)' }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-primary px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20">
              <MessageCircle className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-foreground">OVG Concierge</p>
              <p className="text-xs text-primary-foreground/70">Online now</p>
            </div>
          </div>
          <button className="text-primary-foreground/70 hover:text-primary-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="space-y-3 p-5">
          {/* AI message */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-sm"
          >
            Hi! 👋 Looking for help today? I can offer <span className="font-semibold text-primary">20% off</span> your first consultation.
          </motion.div>

          {/* User message */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 }}
            className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground"
          >
            That sounds great! Tell me more.
          </motion.div>

          {/* AI reply */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2 }}
            className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-sm"
          >
            Of course! What's your name so I can personalize your experience? 😊
          </motion.div>
        </div>

        {/* Input bar */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
            <input
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              placeholder="Type a message..."
              readOnly
            />
            <button className="text-muted-foreground hover:text-foreground">
              <Mic className="h-4 w-4" />
            </button>
            <button className="text-primary">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>

     {/* Floating bubble – soft breathe + sparkle */}
<motion.div
  className="absolute -bottom-4 -right-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg animate-breathe-sparkle relative"
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ delay: 0.8, type: "spring" }}
>
  <MessageCircle className="h-6 w-6 text-primary-foreground" />

  {/* Tiny diamond sparkle dot */}
  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-white/70 animate-sparkle-dot pointer-events-none" />
</motion.div>
    </div>
  );
};

export default WidgetMockup;
