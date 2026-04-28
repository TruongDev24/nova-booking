"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";
import Cookies from "js-cookie";

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
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

const adminMenuItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Quản lý Sân", href: "/admin/courts", icon: Map },
  { name: "Đơn đặt sân", href: "/admin/bookings", icon: CalendarDays },
];

export function DashboardLayout({ 
  children, 
  menuItems = adminMenuItems,
  roleLabel = "Chủ sân",
  roleDetail = "Manager"
}: { 
  children: React.ReactNode,
  menuItems?: typeof adminMenuItems,
  roleLabel?: string,
  roleDetail?: string
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    Cookies.remove("access_token");
    sessionStorage.clear();
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const breadcrumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((segment, index, array) => {
      const href = "/" + array.slice(0, index + 1).join("/");
      const label = segment.charAt(0).toUpperCase() + segment.slice(1);
      return { label, href, isLast: index === array.length - 1 };
    });

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-16 flex items-center px-6">
          <Link href={pathname.startsWith("/admin") ? "/admin" : "/user"} className="flex items-center gap-3">
            <div className="bg-primary p-1.5 rounded-lg">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight group-data-[collapsible=icon]:hidden">
              NOVA<span className="text-muted-foreground">{pathname.startsWith("/admin") ? "Admin" : "Booking"}</span>
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
                    tooltip={item.name}
                    className="h-11"
                    render={<Link href={item.href} />}
                  >
                    <item.icon className={isActive ? "text-primary" : "text-muted-foreground"} />
                    <span className="font-medium">{item.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          <SidebarMenu>
            <SidebarMenuItem>
               <SidebarMenuButton onClick={handleLogout} className="h-11 text-muted-foreground hover:text-destructive">
                  <LogOut />
                  <span>Đăng xuất</span>
               </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="bg-muted/40">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href={pathname.startsWith("/admin") ? "/admin" : "/user"}>
                    {pathname.startsWith("/admin") ? "Admin" : "User"}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((crumb) => (
                  <React.Fragment key={crumb.href}>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      {crumb.isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm kiếm..."
                className="w-64 pl-9 rounded-full bg-muted/50 border-none focus-visible:ring-1"
              />
            </div>
            
            <button className="p-2 text-muted-foreground hover:text-foreground relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background"></span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger render={<button className="flex items-center gap-2 hover:bg-muted p-1 pr-2 rounded-full transition-colors" />}>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    <UserCircle className="w-6 h-6" />
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-bold leading-none">{roleLabel}</p>
                    <p className="text-[10px] text-muted-foreground uppercase mt-1">{roleDetail}</p>
                  </div>
              </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">Account</p>
                        <p className="text-xs leading-none text-muted-foreground">user@nova.com</p>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Hồ sơ</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Cài đặt</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="p-6 md:p-10">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
