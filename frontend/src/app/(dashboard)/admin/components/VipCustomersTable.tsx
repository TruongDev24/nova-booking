import React from 'react';
import { User, Phone, ShoppingBag } from 'lucide-react';

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
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden h-full flex flex-col">
      <div className="p-8 border-b border-slate-50">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-600" />
          Top khách hàng VIP
        </h3>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Dựa trên tổng chi tiêu</p>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Khách hàng</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Số lượt</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Tổng chi tiêu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {customers && customers.length > 0 ? (
              customers.map((customer, index) => (
                <tr key={customer.userId} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs group-hover:scale-110 transition-transform">
                        {index + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900">{customer.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {customer.phone}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase">
                      <ShoppingBag className="w-3 h-3" /> {customer.totalBookings}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="text-sm font-black text-slate-900 flex items-center justify-end gap-1">
                      {customer.totalSpent.toLocaleString()}
                      <span className="text-[10px] text-slate-400">đ</span>
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-8 py-20 text-center">
                   <div className="flex flex-col items-center gap-2 opacity-20">
                      <User className="w-10 h-10" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Chưa có dữ liệu VIP</p>
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VipCustomersTable;
