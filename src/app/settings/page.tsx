
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { listAvailableModels, type ModelInfo } from '@/ai/flows/list-models';
import { 
  Settings, 
  Code, 
  Database, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu,
  ShieldCheck
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  
  // Model Registry State
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const fetchModels = async () => {
    setIsLoadingModels(true);
    setModelsError(null);
    try {
      const data = await listAvailableModels();
      setModels(data);
    } catch (err: any) {
      setModelsError(err.message);
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    if (activeTab === "developer" && user?.role === "Developer") {
      fetchModels();
    }
  }, [activeTab, user]);

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage system preferences and developer tools.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings size={16} /> General
          </TabsTrigger>
          {user.role === 'Developer' && (
            <TabsTrigger value="developer" className="flex items-center gap-2">
              <Code size={16} /> Developer
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Preferences</CardTitle>
              <CardDescription>
                Customize your experience within RecruitedAI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">System follows browser preference by default.</p>
                </div>
                <Badge variant="outline">Auto</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive email updates about candidate placements.</p>
                </div>
                <Badge variant="outline">Enabled</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Security
              </CardTitle>
              <CardDescription>
                Manage your account security and permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">You are currently logged in with <span className="font-bold">{user.role}</span> level access.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {user.role === 'Developer' && (
          <TabsContent value="developer" className="mt-6 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Database className="h-6 w-6 text-primary" />
                  Model Registry
                </h2>
                <p className="text-sm text-muted-foreground">
                  Verify available Gemini models for your API key.
                </p>
              </div>
              <Button onClick={fetchModels} disabled={isLoadingModels} variant="outline" size="sm">
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingModels ? 'animate-spin' : ''}`} />
                Refresh Models
              </Button>
            </div>

            {modelsError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>
                  {modelsError}. Please check your GOOGLE_GENAI_API_KEY in the .env file.
                </AlertDescription>
              </Alert>
            )}

            {isLoadingModels ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Spinner size={48} className="text-primary mb-4" />
                <p className="text-lg text-muted-foreground">Querying Google AI API...</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {models.length === 0 && !modelsError && (
                  <div className="col-span-full text-center p-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No models returned from API.</p>
                  </div>
                )}
                {models.map((model) => (
                  <Card key={model.name} className={model.name.includes('gemini-1.5-flash') ? 'border-primary' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-base font-bold break-all">{model.displayName}</CardTitle>
                        {model.name.includes('gemini-1.5-flash') && (
                          <Badge variant="default" className="shrink-0 text-[10px]">In Use</Badge>
                        )}
                      </div>
                      <CardDescription className="font-mono text-[10px]">{model.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-xs text-muted-foreground line-clamp-3">
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

            <div className="bg-muted/30 p-6 rounded-lg border">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <Cpu className="h-5 w-5 text-primary" />
                Troubleshooting 404/429 Errors
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                The application is configured to use <code>googleai/gemini-1.5-flash</code>. Ensure this model appears in the list above with support for <code>generateContent</code>.
              </p>
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Developer Mode: Full bypass enabled. You see all data.</span>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
