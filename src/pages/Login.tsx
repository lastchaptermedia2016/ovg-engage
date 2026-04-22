import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight } from 'lucide-react';

/**
 * ✅ CLIENT LOGIN COMPONENT
 * 
 * Path: /login
 * Purpose: Client portal access
 * 
 * CRITICAL: No useEffect session checks. No onAuthStateChange listeners.
 * The RouteGuard in AppNew.tsx handles session detection.
 * This component ONLY handles the form submission → redirect.
 */

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ Submission guard - prevent double-click
    if (isLoading) return;
    setIsLoading(true);

    console.log('🔐 Login attempt for:', email);

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Login failed:', error.message);
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      console.log('✅ Auth successful, user:', data.user?.id);

      // ✅ PATH-AWARE REDIRECT - This is the ONLY redirect source
      // No AuthGuard interference, no useEffect ghost, just this one redirect
      const userMeta = data.user?.user_metadata;

      if (['reseller', 'admin', 'developer', 'support'].includes(userMeta?.role)) {
        // Reseller user somehow on client login → send to reseller dashboard
        console.log('➡️ Reseller role detected → /reseller/dashboard');
        window.location.href = '/reseller/dashboard';
      } else if (userMeta?.role === 'client' && userMeta?.tenant_id) {
        console.log(`➡️ Client role → /portal/${userMeta.tenant_id}/settings`);
        window.location.href = `/portal/${userMeta.tenant_id}/settings`;
      } else {
        // Fallback: role not in metadata, try DB lookup
        console.log('⚠️ Role not in metadata, checking database...');
        const { data: userData } = await supabase
          .from('users')
          .select('role, tenant_id')
          .eq('id', data.user!.id)
          .maybeSingle() as any;

        if (userData) {
          if (['reseller', 'admin', 'developer', 'support'].includes(userData.role)) {
            window.location.href = '/reseller/dashboard';
          } else if (userData.role === 'client' && userData.tenant_id) {
            window.location.href = `/portal/${userData.tenant_id}/settings`;
          } else {
            toast.error('Unknown user role. Contact support.');
            setIsLoading(false);
          }
        } else {
          toast.error('User profile not found. Contact your administrator.');
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      console.error('❌ Login exception:', err);
      toast.error(`Login failed: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      console.log('✅ Signup successful:', data.user);
      toast.success('Account created! Check your email for confirmation.');
    } catch (err: any) {
      toast.error(`Signup failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0505] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="/images/omnivergeglobal.svg" 
            alt="OmniVerge Global" 
            className="h-12 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-white mb-2">OVG Engage</h1>
          <p className="text-white/40">Client Management Portal</p>
        </div>

        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Welcome</CardTitle>
            <CardDescription className="text-white/60">
              Sign in to access your management console
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-6">
              <TabsList className="bg-white/5 w-full">
                <TabsTrigger value="signin" className="w-1/2 data-[state=active]:bg-[#0097b2] data-[state=active]:text-white text-white/60">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="w-1/2 data-[state=active]:bg-[#0097b2] data-[state=active]:text-white text-white/60">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
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
                        className="w-full pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#0097b2] to-[#D4AF37] hover:from-[#008aa3] hover:to-[#c49f30] text-[#0A2540] font-bold"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
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
                        className="w-full pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#0097b2] to-[#D4AF37] hover:from-[#008aa3] hover:to-[#c49f30]"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Create Account'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-white/40 text-xs mt-8">
          © 2026 OVG Engage. All rights reserved.
        </p>
      </div>
    </div>
  );
}
