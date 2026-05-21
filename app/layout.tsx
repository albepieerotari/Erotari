import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Erotari',
  description: 'Soon to be revealed',
  icons: {
    icon: '/loghi/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
