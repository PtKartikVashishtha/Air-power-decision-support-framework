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
    <html lang="en">
      <head>
        {/* Google Fonts — Inter (UI), JetBrains Mono (data), Material Symbols */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        {/* Fallback: ensure Material Symbols icon font renders inline */}
        <style dangerouslySetInnerHTML={{ __html: `
          .material-symbols-outlined {
            font-family: 'Material Symbols Outlined', sans-serif;
            font-weight: normal;
            font-style: normal;
            font-size: inherit;
            display: inline-block;
            line-height: 1;
            text-transform: none;
            letter-spacing: normal;
            word-wrap: normal;
            white-space: nowrap;
            direction: ltr;
            -webkit-font-smoothing: antialiased;
            vertical-align: middle;
          }
        `}} />
      </head>
      <body>
        {/* Mandatory Defence Training Classification Banner */}
        <div
          style={{
            width: '100%',
            background: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            textAlign: 'center',
            padding: '2px 0',
            fontSize: '10px',
            fontWeight: 700,
            color: '#b91c1c',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: "'Inter', sans-serif",
            flexShrink: 0,
          }}
        >
          CLASSIFICATION: NOTIONAL / TRAINING DATA ONLY — UNCLASSIFIED DEFENCE SIMULATION (SIH-26250)
        </div>
        {children}
      </body>
    </html>
  );
}
