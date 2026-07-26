import type { Metadata } from "next";
import "./globals.css";
import "./service-worker-handler"; // PWA service worker handler
import { ErrorBoundary } from "@/providers/ErrorBoundary";
import QueryProvider from "@/providers/QueryProvider";
import AuthProvider from "@/providers/AuthProvider";
import { SocketProvider } from "@/providers/SocketProvider";

const lustria = { variable: "font-lustria" };
const poppins = { variable: "font-poppins" };
const roboto = { variable: "font-roboto" };
const inter = { variable: "font-inter" };

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lustria&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --font-lustria: 'Lustria', serif;
            --font-poppins: 'Poppins', sans-serif;
            --font-roboto: 'Roboto', sans-serif;
            --font-inter: 'Inter', sans-serif;
          }
        `}} />
      </head>
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
                    console.log('ServiceWorker registered:', registration.scope);
                    
                    // Check for updates periodically or on reload
                    registration.addEventListener('updatefound', () => {
                      const newWorker = registration.installing;
                      if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New content is available; please refresh.');
                            // Trigger instant page refresh to reload cache and display updated app
                            window.location.reload();
                          }
                        });
                      }
                    });
                  }).catch(function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });

                // Auto reload pages when the controller changes
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                  if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
