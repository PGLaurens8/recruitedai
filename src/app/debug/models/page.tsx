'use client';

import { useState, useEffect } from 'react';
import { listAvailableModels, type ModelInfo } from '@/ai/flows/list-models';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, CheckCircle2, Cpu } from 'lucide-react';

export default function DebugModelsPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAvailableModels();
      setModels(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Available AI Models</h1>
          <p className="mt-1 text-muted-foreground">
            List of models supported by your current Google AI API Key.
          </p>
        </div>
        <Button onClick={fetchModels} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh List
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            {error}. Please check your GOOGLE_GENAI_API_KEY in the .env file.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Spinner size={48} className="text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Querying Google AI API...</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {models.length === 0 && !error && (
            <div className="col-span-full text-center p-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No models returned from API.</p>
            </div>
          )}
          {models.map((model) => (
            <Card key={model.name} className={model.name.includes('gemini-2.5-flash') ? 'border-primary' : ''}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg font-bold break-all">{model.displayName}</CardTitle>
                  {model.name.includes('gemini-2.5-flash') && (
                    <Badge variant="default" className="shrink-0">In Use</Badge>
                  )}
                </div>
                <CardDescription className="font-mono text-xs">{model.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {model.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {model.supportedGenerationMethods.map((method) => (
                    <Badge key={method} variant="outline" className="text-[10px]">
                      {method.replace('generate', '')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8 bg-muted/30 p-6 rounded-lg border">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Cpu className="h-5 w-5 text-primary" />
          Troubleshooting 404 Errors
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          If the model string in your Genkit config (currently <code>gemini-2.5-flash</code>) does not match exactly one of the <code>name</code> fields listed above (usually starting with <code>models/</code>), the AI calls will fail with a 404.
        </p>
        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          <span>If you see "models/gemini-2.5-flash" in the list above, your API key is correctly configured.</span>
        </div>
      </div>
    </div>
  );
}
