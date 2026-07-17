import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { WhopApp } from "@whop/react/components";
import "frosted-ui/styles.css";
import "./globals.css";
import { Shell } from "./components/Shell";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Circuit — esports tournaments",
  description: "Run the bracket. Fill the purse. Get paid.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={mono.variable}>
        <WhopApp accentColor="blue" appearance="dark" grayColor="gray">
          <Shell>{children}</Shell>
        </WhopApp>
      </body>
    </html>
  );
}
