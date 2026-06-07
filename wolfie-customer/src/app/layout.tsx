import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '../providers/QueryProvider';

export const metadata: Metadata = {
  title: 'Wolfie Delivery - Revolutionary NYC Food Platform',
  description: 'The fastest, cheapest, and most premium gourmet meal delivery platform in New York City.',
  icons: {
    icon: '/favicon.ico',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="font-sans antialiased bg-white text-slate-800 min-h-full flex flex-col">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
