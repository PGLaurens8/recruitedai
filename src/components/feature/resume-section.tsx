import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ResumeSectionProps {
  title: string;
  icon: React.ReactNode;
  content: string | string[] | React.ReactNode; // Can be simple text, list of strings, or complex JSX
  className?: string;
}

export function ResumeSection({ title, icon, content, className }: ResumeSectionProps) {
  const renderContent = () => {
    if (typeof content === 'string') {
      // Preserve line breaks from AI output
      return <p className="whitespace-pre-wrap text-sm text-foreground/80">{content}</p>;
    }
    if (Array.isArray(content)) {
      return (
        <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/80">
          {content.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    }
    return content; // For React.ReactNode
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center space-x-3 pb-2">
        {icon}
        <CardTitle className="text-xl font-headline">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
