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

const VipCustomersTable: React.FC<VipCustomersTableProps> = ({ customers }) => {
  return (
    <Card className="border-none shadow-sm flex flex-col h-full overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-500" />
          <div>
            <CardTitle className="text-lg font-black uppercase tracking-tight">
              Top khách hàng VIP
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">
              Dựa trên tổng mức chi tiêu
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="px-6 text-[10px] font-black uppercase tracking-widest">
                Khách hàng
              </TableHead>
              <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">
                Số lượt
              </TableHead>
              <TableHead className="text-right px-6 text-[10px] font-black uppercase tracking-widest">
                Chi tiêu
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers && customers.length > 0 ? (
              customers.map((customer, index) => (
                <TableRow key={customer.userId} className="group transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[10px] group-hover:scale-110 transition-transform">
                        {index + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black tracking-tight text-foreground">
                          {customer.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {customer.phone}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[9px] font-black uppercase">
                      <ShoppingBag className="w-3 h-3" /> {customer.totalBookings}
                    </span>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <span className="text-sm font-black tracking-tight">
                      {customer.totalSpent.toLocaleString()}
                      <span className="text-[10px] text-muted-foreground ml-0.5">
                        đ
                      </span>
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 opacity-30">
                    <User className="h-8 w-8" />
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      Chưa có dữ liệu
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
