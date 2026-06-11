"use client";

import * as React from "react";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {
    LayoutDashboard,
    Map,
    CalendarDays,
    LogOut,
    Activity,
    UserCircle,
    User,
    Settings,
    Bell,
    Search,
    Sun,
    Moon,
    Languages,
} from "lucide-react";
import Cookies from "js-cookie";
import {authService} from "@/services/auth.service";
import {handleComingSoon} from "@/lib/coming-soon";
import {useLanguage} from "@/context/language-context";
import {useTheme} from "next-themes";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarInset,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Separator} from "@/components/ui/separator";
import {Input} from "@/components/ui/input";

const adminMenuItems = [
    {name: "Dashboard", href: "/admin", icon: LayoutDashboard},
    {name: "Quản lý Sân", href: "/admin/courts", icon: Map},
    {name: "Đơn đặt sân", href: "/admin/bookings", icon: CalendarDays},
];

interface UserProfile {
    id: string;
    fullName: string;
    email: string;
    role: string;
}

export function DashboardLayout({
                                    children,
                                    menuItems: initialMenuItems = adminMenuItems,
                                }: {
    children: React.ReactNode,
    menuItems?: typeof adminMenuItems,
    roleLabel?: string,
    roleDetail?: string
}) {
    const [userData, setUserData] = React.useState<UserProfile | null>(null);
    const [isLogoutOpen, setIsLogoutOpen] = React.useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const {locale, setLocale, t} = useLanguage();
    const {theme, setTheme} = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        // 1. Load from sessionStorage immediately (UX: No flicker)
        const savedUser = sessionStorage.getItem("user");
        if (savedUser) {
            try {
                setUserData(JSON.parse(savedUser));
            } catch (e) {
                console.error("Failed to parse saved user", e);
            }
        }

        // 2. Fetch fresh data from server (Integrity)
        const fetchUser = async () => {
            try {
                const profile = await authService.getProfile();
                setUserData(profile);
                sessionStorage.setItem("user", JSON.stringify(profile));
            } catch (error) {
                console.error("Failed to fetch profile in layout:", error);
            }
        };
        fetchUser();
    }, []);

    const profileHref = pathname.startsWith("/admin") ? "/admin/profile" : "/user/profile";
    const menuItems = initialMenuItems;
    const roleLabel = userData?.fullName || (pathname.startsWith("/admin") ? t("sidebar.roleAdminLabel") : t("sidebar.roleUserLabel"));
    const roleDetail = pathname.startsWith("/admin") ? t("sidebar.roleAdminDetail") : t("sidebar.roleUserDetail");
    const userEmail = userData?.email || "...";

    const confirmLogout = async () => {
        setIsLogoutOpen(false);
        router.push("/login");
        sessionStorage.clear();
        Cookies.remove("access_token");
        try {
            await authService.logout();
        } catch (e) {
            console.warn("Backend logout failed, but local session cleared", e);
        }
    };

    const [titleOverride, setTitleOverride] = React.useState<string | null>(null);

    React.useEffect(() => {
        const handleUpdate = (e: Event) => {
            const customEvent = e as CustomEvent<string>;
            setTitleOverride(customEvent.detail);
        };
        window.addEventListener("updateBreadcrumb", handleUpdate);
        return () => {
            window.removeEventListener("updateBreadcrumb", handleUpdate);
            setTitleOverride(null);
        };
    }, [pathname]);

    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    const getTranslatedName = (name: string) => {
        if (name === "Dashboard") return t("sidebar.dashboard");
        if (name === "Quản lý Sân") return t("sidebar.manageCourts");
        if (name === "Đơn đặt sân") return t("sidebar.bookings");
        if (name === "Tìm sân") return t("sidebar.searchCourts");
        if (name === "Lịch sử đặt") return t("sidebar.bookingHistory");
        if (name === "Hồ sơ cá nhân") return t("sidebar.personalProfile");
        return name;
    };

    const breadcrumbs = pathname
        .split("/")
        .filter(Boolean)
        .map((segment, index, array) => {
            const href = "/" + array.slice(0, index + 1).join("/");
            let label = segment.charAt(0).toUpperCase() + segment.slice(1);
            
            if (isUUID(segment)) {
                label = titleOverride || t("common.loading");
            } else if (label === "User") {
                label = t("sidebar.userTitle");
            } else if (label === "Admin") {
                label = t("sidebar.dashboard");
            } else if (label === "Courts") {
                label = t("sidebar.manageCourts");
            } else if (label === "Bookings") {
                label = t("sidebar.bookings");
            } else if (label === "Profile") {
                label = t("common.profile");
            }

            return {label, href, isLast: index === array.length - 1};
        });

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon">
                <SidebarHeader className="h-16 flex items-center px-6">
                    <Link href={pathname.startsWith("/admin") ? "/admin" : "/user"} className="flex items-center gap-3">
                        <div className="bg-primary p-1.5 rounded-lg active:scale-95 transition-transform">
                            <Activity className="w-5 h-5 text-primary-foreground"/>
                        </div>
                        <span className="text-xl font-black tracking-tight group-data-[collapsible=icon]:hidden text-foreground">
                            NOVA<span className="text-muted-foreground font-medium">{pathname.startsWith("/admin") ? "Admin" : "Booking"}</span>
                        </span>
                    </Link>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu className="px-2 pt-4">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        isActive={isActive}
                                        tooltip={getTranslatedName(item.name)}
                                        className="h-11 rounded-xl active:scale-98 transition-all"
                                        render={<Link href={item.href}/>}
                                    >
                                        <item.icon className={isActive ? "text-primary" : "text-muted-foreground"}/>
                                        <span className="font-bold">{getTranslatedName(item.name)}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter className="p-4 border-t border-border">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => setIsLogoutOpen(true)}
                                               className="h-11 rounded-xl text-muted-foreground hover:text-destructive active:scale-98 transition-all">
                                <LogOut className="w-4 h-4"/>
                                <span className="font-bold">{t("common.logout")}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
                <SidebarRail/>
            </Sidebar>
            <SidebarInset className="bg-muted/30">
                <header
                    className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/80 backdrop-blur-md px-6 transition-all duration-300">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1 active:scale-95 transition-transform"/>
                        <Separator orientation="vertical" className="mr-2 h-4"/>
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href={pathname.startsWith("/admin") ? "/admin" : "/user"} className="font-medium">
                                        {pathname.startsWith("/admin") ? t("sidebar.adminTitle") : t("sidebar.userTitle")}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                {breadcrumbs.map((crumb) => (
                                    <React.Fragment key={crumb.href}>
                                        <BreadcrumbSeparator className="hidden md:block"/>
                                        <BreadcrumbItem>
                                            {crumb.isLast ? (
                                                <BreadcrumbPage className="font-bold text-foreground">{crumb.label}</BreadcrumbPage>
                                            ) : (
                                                <BreadcrumbLink href={crumb.href} className="font-medium">{crumb.label}</BreadcrumbLink>
                                            )}
                                        </BreadcrumbItem>
                                    </React.Fragment>
                                ))}
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative hidden md:block opacity-40 cursor-not-allowed">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
                            <Input
                                type="search"
                                placeholder={`${t("common.search")} (${t("common.notAvailable")})`}
                                disabled
                                className="w-64 pl-9 rounded-full bg-muted/50 border-none cursor-not-allowed text-xs"
                            />
                        </div>

                        {/* Language Toggle */}
                        <button
                            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black tracking-widest uppercase bg-secondary/80 hover:bg-primary/10 hover:text-primary rounded-full transition-all border border-border cursor-pointer active:scale-95"
                        >
                            <Languages className="w-3.5 h-3.5"/>
                            {locale}
                        </button>

                        {/* Theme Toggle */}
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all border border-transparent cursor-pointer active:scale-95"
                            aria-label="Toggle theme"
                        >
                            {mounted && theme === "dark" ? (
                                <Sun className="w-5 h-5 text-amber-500 fill-amber-500/25"/>
                            ) : (
                                <Moon className="w-5 h-5 text-indigo-500 fill-indigo-500/25"/>
                            )}
                        </button>

                        <button 
                            onClick={() => handleComingSoon()}
                            className="p-2 text-muted-foreground hover:text-foreground relative opacity-60 cursor-not-allowed"
                        >
                            <Bell className="w-5 h-5"/>
                            <span
                                className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background"></span>
                        </button>

                        <DropdownMenu>
                            <DropdownMenuTrigger render={<button
                                className="flex items-center gap-2 hover:bg-secondary p-1 pr-2 rounded-full transition-all cursor-pointer active:scale-98"/>}>
                                <div
                                    className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    <UserCircle className="w-6 h-6"/>
                                </div>
                                <div className="text-left hidden lg:block">
                                    <p className="text-xs font-bold leading-none text-foreground">{roleLabel}</p>
                                    <p className="text-[9px] text-muted-foreground uppercase mt-0.5 font-bold tracking-wider">{roleDetail}</p>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 rounded-2xl p-1.5" align="end">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="font-normal px-2 py-1.5">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-bold leading-none text-foreground">{roleLabel}</p>
                                            <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator/>
                                <DropdownMenuGroup>
                                    <DropdownMenuItem render={
                                        <Link href={profileHref} className="flex w-full items-center px-2 py-1.5 rounded-xl font-medium"/>
                                    }>
                                        <User className="mr-2 h-4 w-4"/>
                                        <span>{t("common.profile")}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        onClick={() => handleComingSoon()}
                                        className="opacity-60 cursor-not-allowed px-2 py-1.5 rounded-xl font-medium"
                                    >
                                        <Settings className="mr-2 h-4 w-4"/>
                                        <span>{t("common.settings")}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem onClick={() => setIsLogoutOpen(true)}
                                                  className="text-destructive focus:text-destructive px-2 py-1.5 rounded-xl font-medium cursor-pointer">
                                    <LogOut className="mr-2 h-4 w-4"/>
                                    <span>{t("common.logout")}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>
                <main className="p-6 md:p-10">{children}</main>
            </SidebarInset>

            <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
                <AlertDialogContent className="rounded-[2rem] max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">{t("common.confirmLogout")}</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium text-muted-foreground">
                            {t("common.logoutPrompt")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:flex-col mt-2">
                        <AlertDialogCancel className="w-full rounded-xl h-11 border-none hover:bg-secondary font-bold text-xs">{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmLogout}
                            className="w-full rounded-xl h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold text-xs"
                        >
                            {t("common.logout")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SidebarProvider>
    );
}

