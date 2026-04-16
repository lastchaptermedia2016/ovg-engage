import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, Building2 } from 'lucide-react';

/**
 * ✅ RESELLER LOGIN COMPONENT
 * 
 * 100% ISOLATED. NO CLIENT BRANDING.
 * 
 * Path: /reseller/login
 * Branding: OmniVerge Global Electric Blue (#0097b2)
 * 
 * THIS COMPONENT NEVER RENDERS CLIENT CONTENT.
 */

export default function ResellerLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');

  // ✅ NO useEffect session check - RouteGuard handles that
  // ✅ NO onAuthStateChange listener - prevents double-login ghost

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ Submission guard - prevent double-click
    if (isLoading) return;
    setIsLoading(true);

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      // ✅ STRICT ROLE CHECK - Check metadata first, then DB fallback
      const userMeta = data.user?.user_metadata;

      if (['reseller', 'admin', 'developer', 'support'].includes(userMeta?.role)) {
        window.location.href = '/reseller/dashboard';
      } else if (userMeta?.role) {
        // Known role but not reseller → reject
        toast.error('This login is for Reseller accounts only');
        await supabase.auth.signOut();
        setIsLoading(false);
      } else {
        // No role in metadata → check database
        console.log('⚠️ No role in metadata, checking database...');
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user!.id)
          .maybeSingle() as any;

        if (userData && ['reseller', 'admin', 'developer', 'support'].includes(userData.role)) {
          window.location.href = '/reseller/dashboard';
        } else {
          toast.error('This login is for Reseller accounts only');
          await supabase.auth.signOut();
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      toast.error(`Login failed: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ Submission guard - prevent double-click
    if (isLoading) return;
    if (!companyName.trim()) {
      toast.error('Please enter your company name');
      return;
    }
    setIsLoading(true);

    try {
      // 1. Create auth user with HARD CODED reseller role
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'reseller', // ✅ EXCELLENCE VALIDATION: Always reseller on this path
            company_name: companyName.trim(),
          }
        }
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      // 2. Create record in public.resellers table
      const { error: resellerError } = await (supabase as any)
        .from('resellers')
        .insert({
          user_id: data.user!.id,
          email: email,
          company_name: companyName.trim(),
          subscription_tier: 'free',
          max_tenants: 3,
        });

      if (resellerError) {
        console.error('Failed to create reseller record:', resellerError);
      }

      toast.success('Account created! Check your email for verification.');
      setIsSignUp(false); // Switch back to login mode
      setIsLoading(false);
    } catch (err: any) {
      toast.error(`Signup failed: ${err.message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="/images/omnivergeglobal.svg" 
            alt="OmniVerge Global" 
            className="h-12 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-white mb-2">OMNIVERGE GLOBAL</h1>
          <p className="text-white/40">Reseller Management Console</p>
        </div>

        <Card className="bg-black/40 border-[#0097b2]/20 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">
              {isSignUp ? 'Create Reseller Account' : 'Reseller Login'}
            </CardTitle>
            <CardDescription className="text-white/60">
              {isSignUp 
                ? 'Register for a new reseller account'
                : 'Sign in to access the management console'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
              {/* Company Name field only in Sign Up mode */}
              {isSignUp && (
                <div className="space-y-2">
                  <Label className="text-white/80">Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      placeholder="Your Company Name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full pl-10 bg-white/5 border-[#0097b2]/30 text-white placeholder:text-white/30"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-white/80">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    type="email"
                    placeholder="reseller@omnivergeglobal.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 bg-white/5 border-[#0097b2]/30 text-white placeholder:text-white/30"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/80">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 bg-white/5 border-[#0097b2]/30 text-white placeholder:text-white/30"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#0097b2] hover:bg-[#00829c]"
                disabled={isLoading}
              >
                {isLoading 
                  ? (isSignUp ? 'Creating account...' : 'Signing in...') 
                  : (isSignUp ? 'Create Account' : 'Sign In')
                }
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>

            {/* Toggle link at bottom */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[#0097b2] hover:text-[#38bdf8] text-sm transition-colors"
              >
                {isSignUp
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Sign Up"
                }
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-white/40 text-xs mt-8">
          © 2026 OmniVerge Global. All rights reserved.
        </p>
      </div>
    </div>
  );
}
