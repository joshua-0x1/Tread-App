import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeContext";
import { LanguageProvider } from "@/components/LanguageContext";

export const metadata: Metadata = {
  title: "LETTER COOK for threads!",
  description: "Automate, personalize, publish, and analyze your Threads content with AI feedback loops.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('lang', 'jp');
          } catch (_) {}
        `}} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)] font-sans-custom transition-colors duration-200" suppressHydrationWarning>
        <LanguageProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
