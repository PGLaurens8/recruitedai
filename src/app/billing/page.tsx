
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { CheckCircle, Zap } from "lucide-react";
import Link from "next/link";
import { PaymentDialog } from "@/components/feature/payment-dialog";

const plans = [
  {
    name: "Free Tier",
    price: "$0",
    frequency: "/month",
    features: [
      "Basic Resume Reformatting (1 per month)",
      "Limited AI Suggestions",
      "Online Resume (Watermarked)",
      "LinkTree Bio Page (Basic)",
    ],
    cta: "Currently Active",
    isCurrent: true,
  },
  {
    name: "Premium",
    price: "$19",
    frequency: "/month",
    features: [
      "Unlimited AI Resume Reformatting",
      "Unlimited AI Job Spec Targeting",
      "Advanced AI Suggestions & Analytics",
      "Ad-Free Online Resume (No Watermark)",
      "Customizable LinkTree Bio Page",
      "Priority Support",
    ],
    cta: "Upgrade to Premium",
    isCurrent: false,
    highlight: true,
  },
   {
    name: "Pro Annual",
    price: "$199",
    frequency: "/year (Save 15%)",
    features: [
      "All Premium Features",
      "Early Access to New Tools",
      "Dedicated Account Manager",
    ],
    cta: "Go Pro Annually",
    isCurrent: false,
  },
];

export default function BillingPage() {
  return (
    <div className="container mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold font-headline">Billing & Plans</h1>
        <p className="mt-2 text-lg text-muted-foreground">Choose the plan that's right for your career goals.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => (
          <Card key={plan.name} className={`flex flex-col ${plan.highlight ? 'border-primary shadow-xl ring-2 ring-primary' : ''}`}>
            {plan.highlight && (
              <div className="py-2 px-4 bg-primary text-primary-foreground text-sm font-semibold text-center rounded-t-lg">
                Most Popular
              </div>
            )}
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <div className="text-4xl font-extrabold mt-2">
                {plan.price}
                <span className="text-lg font-normal text-muted-foreground">{plan.frequency}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
               {plan.isCurrent ? (
                 <Button 
                    className="w-full" 
                    variant="outline"
                    disabled={true}
                    size="lg"
                  >
                   {plan.cta}
                 </Button>
              ) : (
                <PaymentDialog planName={plan.name} price={plan.price} frequency={plan.frequency}>
                  <Button 
                    className="w-full" 
                    variant={plan.highlight ? "default" : "secondary"}
                    disabled={plan.isCurrent}
                    size="lg"
                  >
                    {plan.highlight && !plan.isCurrent && <Zap className="mr-2 h-5 w-5" />}
                    {plan.cta}
                  </Button>
                </PaymentDialog>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center text-muted-foreground text-sm">
        <p>Payments are securely processed by Stripe. You can cancel or change your plan at any time.</p>
        <p>For more details, visit our <Link href="/faq" className="underline hover:text-primary">FAQ</Link> or <Link href="/contact" className="underline hover:text-primary">Contact Support</Link>.</p>
      </div>
    </div>
  );
}
