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

import { useLanguage } from "@/context/language-context";

interface PeakHour {
    hour: string;
    count: number;
}

interface PeakHoursChartProps {
    data: PeakHour[];
}

const PeakHoursChart: React.FC<PeakHoursChartProps> = ({ data }) => {
    const { t } = useLanguage();

    if (!data || data.length === 0) {
        return (
            <Card className="border-none shadow-sm flex flex-col h-full items-center justify-center min-h-[300px] opacity-50 bg-card">
                <Zap className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {t("adminDashboard.noPeakHoursData")}
                </p>
            </Card>
        );
    }

    const maxCount = Math.max(...data.map((d) => d.count));

    return (
        <Card className="border-none shadow-sm flex flex-col h-full overflow-hidden bg-card">
            <CardHeader className="border-b border-muted/20 bg-muted/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <Zap className="h-5 w-5 text-primary fill-current" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-black uppercase tracking-tight text-foreground">
                            {t("adminDashboard.peakHours")}
                        </CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {t("adminDashboard.peakHoursSub")}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="var(--border)"
                                opacity={0.5}
                            />
                            <XAxis
                                dataKey="hour"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 800, fill: "var(--muted-foreground)" }}
                                interval={1}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 800, fill: "var(--muted-foreground)" }}
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                                contentStyle={{
                                    borderRadius: "1.25rem",
                                    border: "none",
                                    backgroundColor: "var(--background)",
                                    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                                    padding: "1rem",
                                }}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formatter={(value: any) => [
                                    t("adminDashboard.unitBookingsShort", { count: value ?? 0 }),
                                    t("adminDashboard.quantity")
                                ]}
                                labelStyle={{
                                    fontWeight: 900,
                                    color: "var(--muted-foreground)",
                                    fontSize: "10px",
                                    marginBottom: "0.5rem",
                                    textTransform: "uppercase"
                                }}
                            />
                            <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={1500}>
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                            entry.count === maxCount && maxCount > 0
                                                ? "var(--primary)" // Primary color for peak
                                                : "var(--muted)" // Muted for others
                                        }
                                        fillOpacity={entry.count === maxCount ? 1 : 0.5}
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
