import './globals.css';
import type { Metadata } from 'pwa-helper-react'; // standard layout setup

export const metadata = {
  title: 'Guard Patrol PWA',
  description: 'Live Field Log & Geofence Verification v2.6',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className="bg-slate-950 text-white">{children}</body>
    </html>
  );
}
