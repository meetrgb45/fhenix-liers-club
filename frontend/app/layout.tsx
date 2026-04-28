import './globals.css';
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-saloon-bg text-white min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
