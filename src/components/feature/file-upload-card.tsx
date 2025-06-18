
"use client";

import type React from 'react';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UploadCloud } from 'lucide-react';

interface FileUploadCardProps {
  onFileUpload: (file: File) => void;
  acceptedFileTypes?: string; // e.g., ".pdf,.doc,.docx"
  title: string;
  description: string;
  ctaText?: string;
  icon?: React.ReactNode;
}

export function FileUploadCard({
  onFileUpload,
  acceptedFileTypes = ".pdf,.txt,application/pdf,text/plain", // Changed to PDF and TXT
  title,
  description,
  ctaText = "Upload File",
  icon = <UploadCloud className="h-12 w-12 text-gray-400" />
}: FileUploadCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
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
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

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
             bg-card hover:bg-muted/50 transition-colors`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {icon}
              <p className={`mb-2 text-sm ${dragActive ? "text-primary" : "text-muted-foreground"}`}>
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className={`text-xs ${dragActive ? "text-primary" : "text-muted-foreground"}`}>
                PDF, TXT (MAX. 5MB) {/* Changed text here */}
              </p>
            </div>
            <Input
              id="file-upload"
              type="file"
              className="hidden"
              accept={acceptedFileTypes}
              onChange={handleFileChange}
            />
          </label>

          {selectedFile && (
            <div className="text-sm text-muted-foreground">
              Selected file: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
          <Button onClick={handleSubmit} disabled={!selectedFile} className="w-full">
            {ctaText}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
