
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { getJson } from '@/lib/api-client';
import type { ModelInfo } from '@/ai/flows/list-models';
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
  CloudUpload,
  DatabaseZap,
  Users,
  Briefcase,
  Building
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { seedDemoData, saveModelRegistry, useModelRegistry } from '@/lib/data/hooks';

// Mock data for seeding
const SEED_DATA = {
  candidates: [
    { name: "Elena Rodriguez", email: "elena.r@example.com", status: "Sourced", aiScore: 92, currentJob: "Senior UX Designer", currentCompany: "Innovate Inc." },
    { name: "Marcus Chen", email: "marcus.c@example.com", status: "Applied", aiScore: 88, currentJob: "Data Scientist", currentCompany: "DataDriven Co." },
    { name: "Aisha Khan", email: "aisha.k@example.com", status: "Interviewing", aiScore: 95, currentJob: "Backend Engineer", currentCompany: "CloudNet" }
  ],
  jobs: [
    { title: "Senior Frontend Developer", salary: "$120k - $150k", location: "San Francisco, CA", status: "active", approval: "approved", description: "Modern React expert needed." },
    { title: "Data Scientist", salary: "$100k - $130k", location: "Remote", status: "pending", approval: "pending", description: "ML models focus." }
  ],
  clients: [
    { name: "TechCorp", contactName: "John Doe", contactEmail: "john.doe@techcorp.com", status: "Active" },
    { name: "Innovate LLC", contactName: "Jane Smith", contactEmail: "jane.s@innovatellc.com", status: "Active" }
  ]
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [registryRefreshKey, setRegistryRefreshKey] = useState(0);
  
  // Model discovery state
  const [discoveredModels, setModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const { data: registryData, isLoading: isLoadingRegistry } = useModelRegistry(registryRefreshKey);

  const fetchModels = async () => {
    setIsLoadingModels(true);
    setModelsError(null);
    try {
      const data = await getJson<ModelInfo[]>("/api/ai/list-models");
      setModels(data);
      toast({
        title: "Models Discovered",
        description: `Found ${data.length} models from the API. Click 'Save to Database' to persist.`,
      });
    } catch (err: any) {
      setModelsError(err.message);
      toast({ variant: "destructive", title: "Discovery Failed", description: err.message });
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSyncToDatabase = async () => {
    if (discoveredModels.length === 0) return;
    await saveModelRegistry({
      models: discoveredModels,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.email || 'Unknown Developer',
    });
    setRegistryRefreshKey((current) => current + 1);
    toast({ title: "Sync Complete", description: "The discovered model list has been saved." });
  };

  // Seeding Logic
  const handleSeedDatabase = async () => {
    if (!user || !user.id) {
      toast({ variant: "destructive", title: "Auth Required", description: "Please ensure you are logged in." });
      return;
    }
    await seedDemoData(user);

    toast({
      title: "Seeding Success",
      description: "Company, Candidates, Jobs, and Clients have been populated for your current multitenant ID.",
    });
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage system preferences and developer tools.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="general" className="flex items-center gap-2"><Settings size={16} /> General</TabsTrigger>
          {user.role === 'Developer' && (
            <TabsTrigger value="developer" className="flex items-center gap-2"><Code size={16} /> Developer</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Preferences</CardTitle>
              <CardDescription>Stable environment configuration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Model Standard</p>
                  <p className="text-xs text-muted-foreground">Using <strong>Gemini 2.5 Flash</strong>.</p>
                </div>
                <Badge variant="outline">Stable (2026)</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Data Isolation</p>
                  <p className="text-xs text-muted-foreground">Multitenancy is enforced via Company ID paths.</p>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user.role === 'Developer' && (
          <TabsContent value="developer" className="mt-6 space-y-8">
            {/* Database Seeding Section */}
            <Card className="border-primary/50 shadow-md">
              <CardHeader className="bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <DatabaseZap className="h-5 w-5 text-primary" />
                      Database Seeding
                    </CardTitle>
                    <CardDescription>Populate the active data store with sample multitenant data for development.</CardDescription>
                  </div>
                  <Button onClick={handleSeedDatabase} variant="default">
                    <CloudUpload className="mr-2 h-4 w-4" /> Seed All Samples
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border rounded bg-muted/10 flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-xs font-bold uppercase">Candidates</p>
                      <p className="text-lg font-semibold">{SEED_DATA.candidates.length}</p>
                    </div>
                  </div>
                  <div className="p-3 border rounded bg-muted/10 flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-xs font-bold uppercase">Job Postings</p>
                      <p className="text-lg font-semibold">{SEED_DATA.jobs.length}</p>
                    </div>
                  </div>
                  <div className="p-3 border rounded bg-muted/10 flex items-center gap-3">
                    <Building className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-xs font-bold uppercase">Clients</p>
                      <p className="text-lg font-semibold">{SEED_DATA.clients.length}</p>
                    </div>
                  </div>
                </div>
                <Alert className="mt-4 bg-blue-50 border-blue-200">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Seed Configuration</AlertTitle>
                  <AlertDescription className="text-blue-700 text-xs">
                    Seeded data is applied to your current company (or a per-user demo company if your profile has none). Your profile company_id is updated automatically.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Separator />

            {/* Model Registry Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Database className="h-6 w-6 text-primary" />
                  Model Registry
                </h2>
                <p className="text-sm text-muted-foreground">Monitor Gemini models via Google AI API.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchModels} disabled={isLoadingModels} variant="outline" size="sm">
                  {isLoadingModels ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Run Discovery
                </Button>
                <Button onClick={handleSyncToDatabase} disabled={discoveredModels.length === 0} size="sm">
                  <Save className="mr-2 h-4 w-4" /> Save to Database
                </Button>
              </div>
            </div>

            {modelsError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>API Error</AlertTitle>
                <AlertDescription>{modelsError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-8">
              {discoveredModels.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">Discovered (Unsaved)</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {discoveredModels.map((model) => <ModelCard key={model.name} model={model} isNew={true} />)}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Persisted Registry</h3>
                  {registryData?.updatedAt && <Badge variant="secondary" className="text-[10px]">Last Sync: {new Date(registryData.updatedAt).toLocaleString()}</Badge>}
                </div>
                {isLoadingRegistry ? (
                  <div className="flex flex-col items-center justify-center p-12"><Spinner size={48} className="text-primary mb-4" /><p className="text-sm text-muted-foreground">Loading...</p></div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {(!registryData?.models || registryData.models.length === 0) ? (
                      <div className="col-span-full text-center p-12 border-2 border-dashed rounded-lg bg-muted/10"><p className="text-muted-foreground">Run Discovery to populate.</p></div>
                    ) : (
                      (registryData.models as ModelInfo[]).map((model) => <ModelCard key={model.name} model={model} />)
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function ModelCard({ model, isNew = false }: { model: ModelInfo; isNew?: boolean }) {
  const isInUse = model.name.includes('gemini-2.5-flash');
  return (
    <Card className={`${isInUse ? 'border-primary' : ''} ${isNew ? 'border-yellow-500/50 shadow-sm' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-sm font-bold break-all">{model.displayName}</CardTitle>
          <div className="flex flex-col items-end gap-1">
            {isInUse && <Badge variant="default" className="text-[8px] h-4">In Use</Badge>}
            {isNew && <Badge variant="secondary" className="text-[8px] h-4 bg-yellow-100 text-yellow-800">New</Badge>}
          </div>
        </div>
        <CardDescription className="font-mono text-[9px] truncate">{model.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[11px] text-muted-foreground line-clamp-2">{model.description}</p>
        <div className="flex flex-wrap gap-1">
          {model.supportedGenerationMethods.map((method) => (
            <Badge key={method} variant="outline" className="text-[8px] px-1">{method.replace('generate', '')}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
