import { motion } from "framer-motion";
import { MessageCircle, Zap, Users, Shield, Palette, BarChart3 } from "lucide-react";

const features = [
  {
    icon: MessageCircle,
    title: "Proactive Greetings",
    description: "AI automatically greets visitors after a few seconds with a personalized, customizable welcome message.",
  },
  {
    icon: Zap,
    title: "Instant Embed",
    description: "One script tag. Paste it into your site and your AI concierge is live in under 60 seconds.",
  },
  {
    icon: Users,
    title: "Conversational Lead Capture",
    description: "AI naturally asks for contact info during the conversation—no forms, no friction.",
  },
  {
    icon: Shield,
    title: "GDPR-Ready Consent",
    description: "Built-in consent flow ensures compliance before any data is collected.",
  },
  {
    icon: Palette,
    title: "Fully Customizable",
    description: "Match your brand with custom colors, logos, greetings, and promo messages.",
  },
  {
    icon: BarChart3,
    title: "Lead Analytics",
    description: "Track every conversation and lead in a clean dashboard with export tools.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Everything you need to engage visitors
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A complete AI engagement toolkit that works while you sleep.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
