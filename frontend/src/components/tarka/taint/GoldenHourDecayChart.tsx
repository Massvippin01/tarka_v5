import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { formatInrCompact } from "../../../lib/formatInr";

interface GoldenHourDecayChartProps {
  height?: number | string;
  /** Booked loss, recoverable and cash-out amounts (INR) of the active case. */
  lossInr: number;
  recoverableInr: number;
  cashoutInr: number;
}

export const GoldenHourDecayChart: React.FC<GoldenHourDecayChartProps> = ({
  height = 175,
  lossInr,
  recoverableInr,
  cashoutInr,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;

    const times = ["Debit", "Cash-out", "+1h", "Lien placed", "SLA window", "+24h"];
    const L = lossInr / 100000;
    const R = recoverableInr / 100000;
    const recoverableValues = [L, R, R, R, R, R];
    const pct = lossInr > 0 ? Math.round((recoverableInr / lossInr) * 100) : 0;

    const option: echarts.EChartsOption = {
      grid: {
        top: 28,
        right: 20,
        bottom: 24,
        left: 48,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line" },
        formatter: (params: any) => {
          const tName = params[0].name;
          const rec = params[0].value;
          return `
            <div style="font-size:11px; font-family:Inter,sans-serif;">
              <strong>${tName}</strong><br/>
              Recoverable: <strong style="color:#059669;">${formatInrCompact(rec * 100000)} (${pct}%)</strong><br/>
              ${tName.includes("Cash") ? `<span style="color:#E11D48;font-weight:700;">Cash withdrawn: ${formatInrCompact(cashoutInr)}</span>` : ""}
              ${tName.includes("Lien") ? '<span style="color:#4F46E5;font-weight:700;">§106/§107 liens executed</span>' : ""}
            </div>
          `;
        },
      },
      xAxis: {
        type: "category",
        data: times,
        axisLine: { lineStyle: { color: "#CBD5E1" } },
        axisLabel: {
          color: "#475569",
          fontSize: 9.5,
          fontWeight: 600,
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: Math.max(1, Math.ceil(L * 1.1)),
        interval: Math.max(1, Math.ceil(L / 5)),
        axisLabel: {
          color: "#64748B",
          fontSize: 9.5,
          formatter: "₹{value} L",
        },
        splitLine: {
          lineStyle: { color: "#F1F5F9" },
        },
      },
      series: [
        {
          name: "Recoverable Capital",
          type: "line",
          step: "end",
          data: recoverableValues,
          itemStyle: { color: "#059669" },
          lineStyle: { width: 2.5, color: "#059669" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(5, 150, 105, 0.3)" },
              { offset: 1, color: "rgba(5, 150, 105, 0.04)" },
            ]),
          },
          markPoint: {
            data: [
              {
                name: "ATM Cashout",
                coord: ["Cash-out", R],
                value: `-${formatInrCompact(cashoutInr)}`,
                itemStyle: { color: "#E11D48" },
                label: {
                  fontSize: 9,
                  fontWeight: 700,
                  offset: [0, -14],
                },
              },
              {
                name: "Actual Lien",
                coord: ["Lien placed", R],
                value: `Lien ${formatInrCompact(recoverableInr)}`,
                itemStyle: { color: "#4F46E5" },
                label: {
                  fontSize: 9,
                  fontWeight: 700,
                  offset: [0, -14],
                },
              },
            ],
          },
          markLine: {
            symbol: "none",
            data: [
              {
                xAxis: "Lien placed",
                lineStyle: { color: "#4F46E5", type: "dashed", width: 1.5 },
                label: {
                  formatter: "Lien placed",
                  position: "insideEndTop",
                  color: "#4F46E5",
                  fontSize: 9,
                  fontWeight: 700,
                },
              },
            ],
          },
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
      chartInstance.current = null;
    };
  }, [lossInr, recoverableInr, cashoutInr]);

  return <div ref={chartRef} style={{ width: "100%", height }} />;
};
