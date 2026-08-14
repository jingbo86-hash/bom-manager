import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { AppProvider } from '@/lib/store';
import './globals.css';

export const metadata: Metadata = {
  title: 'BOM物料管理与报价系统',
  description: '多级BOM物料清单管理、成本级联计算与报价系统',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className="antialiased bg-slate-50 text-slate-900">
        <AppProvider>
          {isDev && <Inspector />}
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
