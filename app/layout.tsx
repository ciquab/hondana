import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ほんだな',
  description: '家族向け読書記録アプリ'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
