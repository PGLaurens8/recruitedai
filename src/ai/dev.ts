
import { config } from 'dotenv';
config();

import '@/ai/flows/reformat-resume.ts';
import '@/ai/flows/tailor-resume-to-job-spec.ts';
import '@/ai/flows/assess-job-match.ts';
import '@/ai/flows/generate-cover-letter.ts';
import '@/ai/flows/find-companies.ts';
import '@/ai/flows/generate-interview-questions';
import '@/ai/flows/analyze-interview-response';
import '@/ai/flows/generate-candidate-profile';
import '@/ai/flows/find-smart-leads.ts';
import '@/ai/tools/web-browser.ts';
import '@/ai/flows/extract-cv-data.ts';
import '@/ai/flows/analyze-interview.ts';
    
