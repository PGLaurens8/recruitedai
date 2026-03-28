'use client';

import { useEffect } from 'react';
import { Mic2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useVoiceJobBrief, type VoiceJobBriefFields } from '@/hooks/useVoiceJobBrief';

interface VoiceJobBriefButtonProps {
  onBriefCaptured: (fields: VoiceJobBriefFields) => void;
  className?: string;
}

export function VoiceJobBriefButton({ onBriefCaptured, className }: VoiceJobBriefButtonProps) {
  const { toast } = useToast();
  const { isListening, isProcessing, error, startListening, stopListening } = useVoiceJobBrief(onBriefCaptured);

  useEffect(() => {
    if (!error) {
      return;
    }

    if (error.type === 'permission') {
      toast({
        variant: 'destructive',
        title: 'Microphone access needed for voice input',
      });
      return;
    }

    toast({
      variant: 'destructive',
      title: 'Voice unavailable — please type the brief',
      description: error.message,
    });
  }, [error, toast]);

  const handleClick = () => {
    if (isListening) {
      stopListening();
      return;
    }

    startListening();
  };

  const label = isListening ? 'Listening…' : isProcessing ? 'Processing…' : 'Speak your brief';

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="default"
      disabled={isProcessing}
      className={cn(
        'gap-2 rounded-full border-slate-300 px-4 py-2 text-sm font-semibold transition',
        isListening && 'ring-2 ring-red-500 animate-pulse',
        className
      )}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mic2 className="h-4 w-4" aria-hidden />
      )}
      <span>{label}</span>
    </Button>
  );
}
