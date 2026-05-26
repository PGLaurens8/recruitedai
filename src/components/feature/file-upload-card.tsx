
"use client";

import type React from 'react';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { UploadCloud } from 'lucide-react';
import { uploadResumeDirect } from '@/lib/storage-client';
import { useToast } from '@/hooks/use-toast';

interface FileUploadCardProps {
  /**
   * Legacy callback that receives the raw File. Used by callers that build a
   * Base64 Data URI themselves. Kept for backward compatibility.
   */
  onFileUpload?: (file: File) => void;
  /**
   * Preferred callback. When provided, the selected file is uploaded directly
   * to Supabase Storage (via a signed upload ticket from /api/upload/resume)
   * and this is called with the resulting signed read URL (not a Data URI).
   */
  onFileSelect?: (url: string) => void;
  acceptedFileTypes?: string; // e.g., ".pdf,.doc,.docx"
  title: string;
  description: string;
  ctaText?: string;
  icon?: React.ReactNode;
}

export function FileUploadCard({
  onFileUpload,
  onFileSelect,
  acceptedFileTypes = ".pdf,.txt,application/pdf,text/plain", // Changed to PDF and TXT
  title,
  description,
  ctaText = "Upload File",
  icon = <UploadCloud className="h-12 w-12 text-gray-400" />
}: FileUploadCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadAndEmit = useCallback(
    async (file: File) => {
      if (!onFileSelect) return;
      setIsUploading(true);
      try {
        const { url } = await uploadResumeDirect(file);
        onFileSelect(url);
        toast({ title: 'Upload complete', description: `${file.name} is ready to process.` });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not upload the file.';
        toast({ variant: 'destructive', title: 'Upload failed', description: message });
      } finally {
        setIsUploading(false);
      }
    },
    [onFileSelect, toast]
  );

  const acceptFile = useCallback(
    (file: File) => {
      setSelectedFile(file);
      // When a URL consumer is wired up, upload immediately on selection.
      if (onFileSelect) {
        void uploadAndEmit(file);
      }
    },
    [onFileSelect, uploadAndEmit]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      acceptFile(event.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) return;
    if (onFileSelect) {
      void uploadAndEmit(selectedFile);
      return;
    }
    onFileUpload?.(selectedFile);
  };

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      acceptFile(e.dataTransfer.files[0]);
    }
  }, [acceptFile]);

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <label
            htmlFor="file-upload"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer
            ${dragActive ? "border-primary bg-primary/10" : "border-border hover:border-gray-300"}
             bg-card hover:bg-muted/50 transition-colors ${isUploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {icon}
              <p className={`mb-2 text-sm ${dragActive ? "text-primary" : "text-muted-foreground"}`}>
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className={`text-xs ${dragActive ? "text-primary" : "text-muted-foreground"}`}>
                PDF, TXT (MAX. 4MB)
              </p>
            </div>
            <Input
              id="file-upload"
              type="file"
              className="hidden"
              accept={acceptedFileTypes}
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>

          {selectedFile && (
            <div className="text-sm text-muted-foreground">
              Selected file: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}

          {isUploading && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Spinner size={16} />
              <span>Uploading…</span>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={!selectedFile || isUploading} className="w-full">
            {isUploading ? "Uploading…" : ctaText}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
