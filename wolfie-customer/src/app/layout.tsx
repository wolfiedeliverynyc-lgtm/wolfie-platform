import type { Metadata } from "next";
import { Lustria, Poppins, Roboto, Inter } from "next/font/google";
import "./globals.css";
import "./service-worker-handler"; // PWA service worker handler
import { ErrorBoundary } from "@/providers/ErrorBoundary";
import QueryProvider from "@/providers/QueryProvider";
import AuthProvider from "@/providers/AuthProvider";
import { SocketProvider } from "@/providers/SocketProvider";

const lustria = Lustria({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-lustria",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Wolfie NYC - Build for New Yorkers!",
  description: "Wolfie NYC delivery service. Built for New Yorkers.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Wolfie",
  },
  formatDetection: {
    telephone: false,
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lustria.variable} ${poppins.variable} ${roboto.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              <SocketProvider>
                {children}
              </SocketProvider>
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
