import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AIR POWER // Dynamic Air Operations & Resource Optimisation (SIH 26250)',
  description: 'AI-Enabled Common Decision-Support Framework for Joint Air Operations (MoD / DSSC)',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-ops-950 text-gray-200 antialiased min-h-screen flex flex-col font-mono">
        {/* Top Mandatory Defense Classification & Training Banner */}
        <div className="w-full bg-rose-950/80 border-b border-rose-800 text-center py-1 text-[11px] font-bold text-rose-300 tracking-wider">
          CLASSIFICATION: NOTIONAL / TRAINING DATA ONLY — UNCLASSIFIED DEFENCE SIMULATION (SIH-26250)
        </div>
        {children}
      </body>
    </html>
  );
}
