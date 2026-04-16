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
      <body className="bg-dark text-white font-mono">{children}</body>
    </html>
  );
}
