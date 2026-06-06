import React from "react";
import { User, Phone, ShoppingBag } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface VipCustomer {
    userId: string;
    name: string;
    phone: string;
    totalBookings: number;
    totalSpent: number;
}

interface VipCustomersTableProps {
    customers: VipCustomer[];
}

import { useLanguage } from "@/context/language-context";

interface VipCustomer {
    userId: string;
    name: string;
    phone: string;
    totalBookings: number;
    totalSpent: number;
}

interface VipCustomersTableProps {
    customers: VipCustomer[];
}

const VipCustomersTable: React.FC<VipCustomersTableProps> = ({ customers }) => {
    const { t } = useLanguage();

    return (
        <Card className="border-none shadow-sm flex flex-col h-full overflow-hidden bg-card">
            <CardHeader className="border-b border-muted/20 bg-muted/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-black uppercase tracking-tight text-foreground">
                            {t("adminDashboard.vipCustomers")}
                        </CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {t("adminDashboard.vipCustomersSub")}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30 border-none">
                            <TableHead className="px-6 h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                {t("adminDashboard.tableCustomer")}
                            </TableHead>
                            <TableHead className="text-center h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                {t("adminDashboard.tableBookings")}
                            </TableHead>
                            <TableHead className="text-right px-6 h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                {t("adminDashboard.tableSpent")}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {customers && customers.length > 0 ? (
                            customers.map((customer, index) => (
                                <TableRow key={customer.userId} className="group border-b border-muted/10 hover:bg-muted/5 transition-colors">
                                    <TableCell className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                                {index + 1}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black tracking-tight text-foreground uppercase">
                                                    {customer.name}
                                                </span>
                                                <span
                                                    className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> {customer.phone}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-tighter">
                                            <ShoppingBag className="w-3 h-3" /> {customer.totalBookings}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <span className="text-sm font-black tracking-tighter text-foreground">
                                            {new Intl.NumberFormat("vi-VN", {
                                                style: "currency",
                                                currency: "VND",
                                            }).format(customer.totalSpent)}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-60 text-center">
                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                        <div className="p-4 bg-muted rounded-full">
                                            <User className="h-10 w-10 text-muted-foreground" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            {t("adminDashboard.noVipData")}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default VipCustomersTable;
