import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface GoldenHourDecayChartProps {
  height?: number | string;
}

export const GoldenHourDecayChart: React.FC<GoldenHourDecayChartProps> = ({
  height = 175,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;

    // Piecewise timeline points:
    // T+0 (09:30): Victim Debit ₹5.00L
    // T+18m (09:48): ATM Cash Out -₹1.20L -> ₹3.80L
    // T+1h (10:30): L2 Mule Forwarding
    // T+2.5h (12:00): Case Clock / Actual Lien Order Placed (₹3.80L secured)
    // T+3h (12:30): Golden Hour SLA Window
    // T+24h (Next day): SOP Statutory Deadline
    const times = ["T+0 (09:30)", "T+18m (ATM)", "T+1h", "T+2.5h (Lien)", "T+3h (SLA)", "T+24h"];
    const recoverableValues = [5.0, 3.8, 3.8, 3.8, 3.8, 3.8];

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
              Recoverable Capital: <strong style="color:#059669;">₹${rec.toFixed(2)}L (76%)</strong><br/>
              ${tName.includes("ATM") ? '<span style="color:#E11D48;font-weight:700;">⚠ ATM DL-049 Dispensed ₹1.20L Cash</span>' : ""}
              ${tName.includes("Lien") ? '<span style="color:#4F46E5;font-weight:700;">★ §106/§107 Liens Executed</span>' : ""}
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
        max: 5.5,
        interval: 1.0,
        axisLabel: {
          color: "#64748B",
          fontSize: 9.5,
          formatter: "₹{value}L",
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
                coord: ["T+18m (ATM)", 3.8],
                value: "-₹1.20L",
                itemStyle: { color: "#E11D48" },
                label: {
                  fontSize: 9,
                  fontWeight: 700,
                  offset: [0, -14],
                },
              },
              {
                name: "Actual Lien",
                coord: ["T+2.5h (Lien)", 3.8],
                value: "Lien ₹3.8L",
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
                xAxis: "T+2.5h (Lien)",
                lineStyle: { color: "#4F46E5", type: "dashed", width: 1.5 },
                label: {
                  formatter: "Current T+2.5h",
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
  }, []);

  return <div ref={chartRef} style={{ width: "100%", height }} />;
};
