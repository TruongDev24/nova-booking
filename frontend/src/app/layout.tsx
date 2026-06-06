import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "NOVA Booking - Hệ thống đặt sân cầu lông hàng đầu",
    description: "Đặt sân cầu lông nhanh chóng, quản lý lịch chơi và thống kê chuyên nghiệp.",
};

import {TooltipProvider} from "@/components/ui/tooltip";
import {Toaster} from "@/components/ui/sonner";
import QueryProvider from "@/components/providers/query-provider";
import {SocketProvider} from "@/components/providers/socket-provider";
import {ThemeProvider} from "@/components/providers/theme-provider";
import {LanguageProvider} from "@/context/language-context";

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
            suppressHydrationWarning
        >
        <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <LanguageProvider>
                <QueryProvider>
                    <SocketProvider>
                        <TooltipProvider>
                            {children}
                            <Toaster position="top-center" richColors/>
                        </TooltipProvider>
                    </SocketProvider>
                </QueryProvider>
            </LanguageProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}

