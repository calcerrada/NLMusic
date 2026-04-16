import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NLMusic',
  description: 'Live coding drums with natural language',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Strudel.cc runtime — WebAudio API para reproducción de patrones */}
        <script src="https://cdn.jsdelivr.net/npm/strudel@0.x/dist/index.umd.js" defer></script>
      </head>
      <body className="bg-dark text-white font-mono">{children}</body>
    </html>
  );
}
