import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo only – clickable to home */}
        <a href="/" className="flex items-center">
          <img
            src="/images/omnivergeglobal.svg"
            alt="Omniverge Global"
            className="h-9 w-auto"  // Height 36px – adjust if needed (h-8, h-10, etc.)
          />
        </a>

        {/* Center links (hidden on mobile) */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Features</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">How It Works</a>
          <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Pricing</a>
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">Log In</Button>
          <Button size="sm">Get Started Free</Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;