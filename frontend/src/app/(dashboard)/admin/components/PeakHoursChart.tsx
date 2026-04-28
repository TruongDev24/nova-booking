import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { Zap } from 'lucide-react';

interface PeakHour {
  hour: string;
  count: number;
}

interface PeakHoursChartProps {
  data: PeakHour[];
}

const PeakHoursChart: React.FC<PeakHoursChartProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500 fill-current" />
            Khung giờ vàng
          </h3>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Mật độ đặt sân theo giờ</p>
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="hour" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
              interval={2}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
              allowDecimals={false}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc', radius: 8 }}
              contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
              formatter={(value: number) => [`${value} đơn`, "Số lượng"]}
              labelStyle={{ fontWeight: 900, color: '#64748b', fontSize: '10px', marginBottom: '4px' }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={1500}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.count === maxCount && maxCount > 0 ? '#f59e0b' : '#e2e8f0'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PeakHoursChart;
