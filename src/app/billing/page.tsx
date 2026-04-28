
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { CheckCircle, Zap, Mail } from "lucide-react";
import { useAuth } from "@/context/auth-context";

const plans = [
  {
    name: "Personal",
    price: "$0",
    frequency: "/month",
    description: "Basic tools for individual job seekers.",
    features: [
      "Basic Resume Reformatting (1 per month)",
      "Limited AI Suggestions",
      "Online Resume (Watermarked)",
      "LinkTree Bio Page (Basic)",
    ],
  },
  {
    name: "Professional",
    price: "$19",
    frequency: "/month",
    description: "Advanced candidate branding toolkit.",
    features: [
      "Unlimited AI Resume Reformatting",
      "Unlimited AI Job Spec Targeting",
      "Advanced AI Suggestions & Analytics",
      "Ad-Free Online Resume",
      "Customizable LinkTree Bio Page",
      "Priority Support",
    ],
    highlight: true,
  },
  {
    name: "Agency Enterprise",
    price: "$199",
    frequency: "/month",
    description: "Full Talent Engine & Business Hub for recruitment agencies.",
    features: [
      "All Professional Features",
      "Full Talent Engine Module",
      "Full Business Hub Module",
      "Branded CV Exports",
      "Team Member Seats",
      "Dedicated Account Manager",
    ],
  },
];

const agencyRoles = ["Admin", "Recruiter", "Sales", "Developer"];

export default function BillingPage() {
  const { user } = useAuth();
  const isAgencyUser = user?.role && agencyRoles.includes(user.role);

  return (
    <div className="container mx-auto py-12 max-w-5xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold">Billing & Plans</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {isAgencyUser
            ? "Your workspace is on the Agency Enterprise plan."
            : "Choose the plan that fits your goals."}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => {
          const isCurrent = isAgencyUser
            ? plan.name === "Agency Enterprise"
            : plan.name === "Personal";

          return (
            <Card key={plan.name} className={`flex flex-col ${plan.highlight ? "border-primary shadow-xl ring-2 ring-primary" : ""}`}>
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
                <CardDescription className="text-xs mt-1">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : plan.highlight ? "default" : "secondary"}
                  disabled={isCurrent}
                  size="lg"
                >
                  {isCurrent ? (
                    "Active Plan"
                  ) : (
                    <>
                      {plan.highlight && <Zap className="mr-2 h-4 w-4" />}
                      Contact Us to Upgrade
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        <Card className="inline-block max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2"><Mail className="h-5 w-5" /> Manage Your Subscription</CardTitle>
            <CardDescription>
              To upgrade, downgrade, or manage billing details, contact our team directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="mailto:billing@recruitedai.com">Email Billing Support</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
