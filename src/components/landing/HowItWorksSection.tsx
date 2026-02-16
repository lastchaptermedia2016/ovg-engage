import { motion } from "framer-motion";
import { Code2, Paintbrush, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Code2,
    step: "01",
    title: "Embed",
    description: "Copy a single script tag and paste it into your website. That's it—no coding required.",
  },
  {
    icon: Paintbrush,
    step: "02",
    title: "Customize",
    description: "Set your brand colors, logo, welcome message, and promotional offers from the dashboard.",
  },
  {
    icon: TrendingUp,
    step: "03",
    title: "Capture Leads",
    description: "Your AI concierge engages visitors 24/7, capturing names, emails, and conversation insights.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Live in three simple steps
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From zero to AI-powered engagement in under a minute.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative text-center"
            >
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-12 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-primary/30 to-transparent md:block" />
              )}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <s.icon className="h-7 w-7" />
              </div>
              <span className="font-display text-xs font-bold uppercase tracking-widest text-primary">
                Step {s.step}
              </span>
              <h3 className="mt-2 font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
