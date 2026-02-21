
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
  ShieldCheck,
  Save,
  CloudUpload
} from 'lucide-react';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const { user: firebaseUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  
  // Model discovery (local state)
  const [discoveredModels, setModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Persistence (Firestore state)
  // Defer fetching until Firebase User is present to avoid permission errors
  const registryDocRef = useMemoFirebase(() => {
    if (!firestore || !firebaseUser) return null;
    return doc(firestore, 'modelRegistry', 'latest');
  }, [firestore, firebaseUser]);

  const { data: registryData, isLoading: isLoadingRegistry } = useDoc<any>(registryDocRef);

  const fetchModels = async () => {
    setIsLoadingModels(true);
    setModelsError(null);
    try {
      const data = await listAvailableModels();
      setModels(data);
      toast({
        title: "Models Discovered",
        description: `Found ${data.length} models from the API. Click 'Save to Database' to persist.`,
      });
    } catch (err: any) {
      setModelsError(err.message);
      toast({
        variant: "destructive",
        title: "Discovery Failed",
        description: err.message,
      });
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSyncToDatabase = () => {
    if (!firestore || discoveredModels.length === 0) return;
    
    const docRef = doc(firestore, 'modelRegistry', 'latest');
    const data = {
      models: discoveredModels,
      updatedAt: serverTimestamp(),
      updatedBy: user?.email || 'Unknown Developer',
    };

    // Use non-blocking write pattern
    setDocumentNonBlocking(docRef, data, { merge: true });
    
    toast({
      title: "Sync Initiated",
      description: "The discovered model list is being saved to the database.",
    });
  };

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Database className="h-6 w-6 text-primary" />
                  Model Registry
                </h2>
                <p className="text-sm text-muted-foreground">
                  Store and manage available Gemini models in Firestore.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchModels} disabled={isLoadingModels} variant="outline" size="sm">
                  {isLoadingModels ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}
                  Run Discovery
                </Button>
                <Button onClick={handleSyncToDatabase} disabled={discoveredModels.length === 0} size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  Save to Database
                </Button>
              </div>
            </div>

            {modelsError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>API Discovery Error</AlertTitle>
                <AlertDescription>{modelsError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-8">
              {/* Discovered Models (Temporary Results) */}
              {discoveredModels.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">Discovered Models (Unsaved)</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {discoveredModels.map((model) => (
                      <ModelCard key={model.name} model={model} isNew={true} />
                    ))}
                  </div>
                </div>
              )}

              {/* Persisted Models (Database State) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Persisted Registry</h3>
                  {registryData && (
                    <Badge variant="secondary" className="text-[10px]">
                      Last Sync: {registryData.updatedAt?.toDate().toLocaleString()}
                    </Badge>
                  )}
                </div>
                
                {isLoadingRegistry || !firebaseUser ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <Spinner size={48} className="text-primary mb-4" />
                    <p className="text-sm text-muted-foreground">Loading from database...</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {(!registryData || !registryData.models || registryData.models.length === 0) ? (
                      <div className="col-span-full text-center p-12 border-2 border-dashed rounded-lg bg-muted/10">
                        <p className="text-muted-foreground">The database is currently empty. Run Discovery and Sync to populate.</p>
                      </div>
                    ) : (
                      registryData.models.map((model: ModelInfo) => (
                        <ModelCard key={model.name} model={model} />
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-muted/30 p-6 rounded-lg border">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <Cpu className="h-5 w-5 text-primary" />
                Troubleshooting Configuration
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                The application is configured to use <code>googleai/gemini-1.5-pro</code>. Ensure this model appears in the Persisted Registry after a successful Sync.
              </p>
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Developer Mode: Model Registry persisted in Firestore.</span>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function ModelCard({ model, isNew = false }: { model: ModelInfo; isNew?: boolean }) {
  const isInUse = model.name.includes('gemini-1.5-pro');
  return (
    <Card className={`${isInUse ? 'border-primary' : ''} ${isNew ? 'border-yellow-500/50 shadow-sm' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-sm font-bold break-all">{model.displayName}</CardTitle>
          <div className="flex flex-col items-end gap-1">
            {isInUse && <Badge variant="default" className="text-[8px] h-4">In Use</Badge>}
            {isNew && <Badge variant="secondary" className="text-[8px] h-4 bg-yellow-100 text-yellow-800">Discovery</Badge>}
          </div>
        </div>
        <CardDescription className="font-mono text-[9px] truncate">{model.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[11px] text-muted-foreground line-clamp-2">
          {model.description}
        </p>
        <div className="flex flex-wrap gap-1">
          {model.supportedGenerationMethods.map((method) => (
            <Badge key={method} variant="outline" className="text-[8px] px-1">
              {method.replace('generate', '')}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
