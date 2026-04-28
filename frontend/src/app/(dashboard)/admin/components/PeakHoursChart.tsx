import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Zap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PeakHour {
  hour: string;
  count: number;
}

interface PeakHoursChartProps {
  data: PeakHour[];
}

const PeakHoursChart: React.FC<PeakHoursChartProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <Card className="border-none shadow-sm flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500 fill-current" />
          <div>
            <CardTitle className="text-lg font-black uppercase tracking-tight">
              Khung giờ vàng
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">
              Mật độ đơn đặt theo thời gian
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fontWeight: 900, fill: "var(--muted-foreground)" }}
                interval={2}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fontWeight: 900, fill: "var(--muted-foreground)" }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                contentStyle={{
                  borderRadius: "1rem",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--background)",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  padding: "0.75rem",
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value ?? 0} đơn`, "Số lượng"]}
                labelStyle={{
                  fontWeight: 900,
                  color: "var(--muted-foreground)",
                  fontSize: "9px",
                  marginBottom: "4px",
                  textTransform: "uppercase"
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={1500}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.count === maxCount && maxCount > 0
                        ? "#f59e0b"
                        : "var(--muted)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default PeakHoursChart;
