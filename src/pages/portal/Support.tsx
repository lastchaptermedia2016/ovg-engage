import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

export default function Support() {
  const { clientId, tenant } = useOutletContext<any>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create support ticket in database
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          client_id: clientId,
          subject: subject.trim(),
          message: message.trim(),
          status: 'open',
        }) as any;

      if (error) throw error;

      // Send email notification
      await fetch('/api/support-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName: tenant?.name || 'Unknown Client',
          clientId,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      toast.success('Support ticket logged. Our team has been notified.');
      setSubject('');
      setMessage('');

    } catch (error: any) {
      console.error('Support ticket error:', error);
      toast.error(error.message || 'Failed to submit support ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Contact Support</h2>
        <p className="text-sm text-white/40 mt-1">
          Need help? Our team is available 24/7
        </p>
      </div>

      <Card className="bg-black/40 border-white/10 backdrop-blur-xl max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">Submit a Support Ticket</CardTitle>
          <CardDescription className="text-white/60">
            We typically respond within 1 business hour
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-white/80">Subject</Label>
              <Input
                placeholder="Brief summary of your issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Message</Label>
              <Textarea
                placeholder="Describe your issue or question in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[200px]"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-pink-500 to-gold-500 hover:from-pink-600 hover:to-gold-600 w-full sm:w-auto"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}