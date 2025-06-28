
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign, Loader2 } from 'lucide-react';

interface PaymentDialogProps {
  children: React.ReactNode;
  planName: string;
  price: string;
  frequency: string;
}

export function PaymentDialog({ children, planName, price, frequency }: PaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate API call to a payment gateway
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setOpen(false);
    toast({
      title: "Payment Successful!",
      description: `You have successfully subscribed to the ${planName} plan.`,
      variant: 'default',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upgrade to {planName}</DialogTitle>
          <DialogDescription>
            You are subscribing to the {planName} plan for {price}{frequency}. Your card will be charged automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handlePayment}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="card-name">Name on Card</Label>
              <Input id="card-name" placeholder="John M. Doe" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-number">Card Details</Label>
              <div className="relative">
                 <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input id="card-number" type="text" inputMode="numeric" pattern="[\d\s]{13,19}" autoComplete="cc-number" placeholder="Card Number" className="pl-9" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input id="expiry-date" type="text" inputMode="numeric" autoComplete="cc-exp" placeholder="MM / YY" required />
                <Input id="cvc" type="text" inputMode="numeric" autoComplete="cc-csc" placeholder="CVC" required />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <DollarSign className="mr-2 h-4 w-4" />
              )}
              {isProcessing ? "Processing..." : `Pay ${price}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
