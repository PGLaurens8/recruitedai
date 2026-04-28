import type { Metadata } from 'next';
import './globals.css';

import { Inter, Source_Code_Pro } from 'next/font/google';
import ClientLayout from './ClientLayout';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const sourceCodePro = Source_Code_Pro({ subsets: ['latin'], display: 'swap', variable: '--font-source-code-pro' });

export const metadata: Metadata = {
  title: 'RecruitedAI',
  description: 'AI-Powered Recruiting & Career Tools',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${sourceCodePro.variable}`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
