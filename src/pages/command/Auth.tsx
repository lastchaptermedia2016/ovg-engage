import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

export default function CommandAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check role
      const userMeta = data.user?.user_metadata;
      
      // If reseller, reject
      if (['reseller', 'admin', 'developer', 'support'].includes(userMeta?.role)) {
        toast.error('Please use the Reseller Console to log in.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // If client, check status
      const { data: clientData, error: clientError } = await (supabase as any)
        .from('clients')
        .select('status')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (clientError) throw clientError;

      if (clientData?.status === 'pending') {
        toast.error('Your account is still pending approval.');
        await supabase.auth.signOut();
      } else if (clientData?.status === 'approved') {
        window.location.href = '/command/dashboard';
      } else {
        toast.error('Access denied.');
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: 'client' }
        }
      });

      if (error) throw error;

      const { error: clientError } = await (supabase as any)
        .from('clients')
        .insert({
          user_id: data.user!.id,
          email,
          company_name: companyName,
          status: 'pending'
        });

      if (clientError) throw clientError;

      toast.success('Account created! Your account is pending review.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/images/omnivergeglobal.svg" alt="OmniVerge Global" className="h-12 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">OVG CLIENT COMMAND</h1>
        </div>

        <Card className="bg-black/40 border-[#0097b2]/20 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Client Command</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-6">
              <TabsList className="bg-white/5 w-full">
                <TabsTrigger value="signin" className="w-1/2">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="w-1/2">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white/5 border-[#0097b2]/30 text-white" />
                  <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-white/5 border-[#0097b2]/30 text-white" />
                  <Button type="submit" className="w-full bg-[#0097b2]" disabled={isLoading}>Sign In</Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <Input placeholder="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="bg-white/5 border-[#0097b2]/30 text-white" />
                  <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white/5 border-[#0097b2]/30 text-white" />
                  <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-white/5 border-[#0097b2]/30 text-white" />
                  <Button type="submit" className="w-full bg-[#D4AF37]" disabled={isLoading}>Create Account</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
