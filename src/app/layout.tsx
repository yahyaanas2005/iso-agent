import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ISOLATERP Global AI Accountant",
  description: "Autonomous ERP agent for natural language financial actions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
