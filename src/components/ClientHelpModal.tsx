import React, { useState, useEffect } from 'react';
import { HelpCircle, X, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ClientHelpModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    if (open) {
      fetch('/Client_User_Manual.md')
        .then(res => res.text())
        .then(text => setMarkdown(text))
        .catch(() => setMarkdown('Loading manual...'));
    }
  }, [open]);

  const renderMarkdown = (text: string) => {
    // Simple markdown renderer
    let html = text
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mb-4 mt-6 first:mt-0">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-cyan-400 mb-3 mt-5">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium text-white mb-2 mt-4">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-white/80">$1</em>')
      .replace(/^- (.*$)/gim, '<li class="text-white/70 mb-1 ml-4 list-disc">$1</li>')
      .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-2 py-1 rounded text-cyan-300 font-mono text-sm">$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-cyan-500 pl-4 py-2 my-4 bg-cyan-500/10 rounded-r text-white/90">$1</blockquote>')
      .replace(/---/g, '<hr class="border-white/10 my-6" />');
    
    return { __html: html };
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full px-3 py-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
      >
        <HelpCircle className="h-5 w-5" />
        <span>Help & Documentation</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0A0505] border-white/10 max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b border-white/10 flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-bold text-white">Client User Manual</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div 
              className="prose prose-invert max-w-none space-y-3"
              dangerouslySetInnerHTML={renderMarkdown(markdown)}
            />
          </div>

          <div className="p-4 border-t border-white/10 flex justify-center">
            <Button 
              className="bg-gradient-to-r from-[#0097b2] to-[#FFD700] hover:from-[#008299] hover:to-[#E6C200]"
              onClick={() => window.open('mailto:support@omnivergeglobal.com?subject=Client Support Request')}
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientHelpModal;