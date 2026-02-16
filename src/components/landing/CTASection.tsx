import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const CTASection = () => {
  return (
    <section className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center md:px-16"
        >
          {/* Decorative elements */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
          </div>

          <div className="relative">
            <h2 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">
              Ready to turn visitors into leads?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-primary-foreground/80">
              Join hundreds of businesses using OVGweb to engage customers the moment they land on their site.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 font-semibold"
              >
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
