import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface CrossStateWaterfallProps {
  height?: number | string;
}

export const CrossStateWaterfall: React.FC<CrossStateWaterfallProps> = ({ height = "100%" }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;

    // Data for cumulative waterfall:
    // UP (3.85), MH (2.60), KA (1.95), GJ (1.22), DL (0.80) -> Total: 10.42
    const states = ["UP (5 FIRs)", "MH (3 FIRs)", "KA (3 FIRs)", "GJ (2 FIRs)", "DL (1 FIR)"];
    const baseAmounts = [0, 3.85, 6.45, 8.40, 9.62];
    const incrementAmounts = [3.85, 2.60, 1.95, 1.22, 0.80];

    const option: echarts.EChartsOption = {
      grid: {
        top: 28,
        right: 120,
        bottom: 24,
        left: 48,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const tar = params[1];
          const idx = tar.dataIndex;
          const cum = (baseAmounts[idx] + incrementAmounts[idx]).toFixed(2);
          const isDL = idx === 4;
          return `
            <div style="font-size:11px; font-family:Inter,sans-serif;">
              <strong>${tar.name}</strong><br/>
              State Increment: <strong>₹${tar.value.toFixed(2)} Cr</strong><br/>
              Cumulative Total: <strong>₹${cum} Cr</strong><br/>
              ${isDL ? '<span style="color:#E11D48;font-weight:700;">★ DL tips it over the ₹10.00 Cr CBI Mandate</span>' : ""}
            </div>
          `;
        },
      },
      xAxis: {
        type: "category",
        data: states,
        axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.15)" } },
        axisLabel: {
          color: "#94A3B8",
          fontSize: 11,
          fontWeight: 600,
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 12,
        interval: 3,
        axisLine: { show: false },
        axisLabel: {
          color: "#94A3B8",
          fontSize: 11,
          formatter: "₹{value}Cr",
        },
        splitLine: {
          lineStyle: { color: "rgba(255, 255, 255, 0.08)" },
        },
      },
      series: [
        // Transparent base series to create waterfall floating bars
        {
          name: "Base",
          type: "bar",
          stack: "total",
          itemStyle: {
            borderColor: "transparent",
            color: "transparent",
          },
          emphasis: {
            itemStyle: {
              borderColor: "transparent",
              color: "transparent",
            },
          },
          data: baseAmounts,
        },
        // Floating bar series
        {
          name: "Exposure",
          type: "bar",
          stack: "total",
          barWidth: "55%",
          data: incrementAmounts.map((val, idx) => {
            const isDL = idx === 4; // DL crosses threshold
            return {
              value: val,
              itemStyle: {
                color: isDL ? "#E11D48" : idx === 0 ? "#3B82F6" : idx === 1 ? "#6366F1" : idx === 2 ? "#8B5CF6" : "#F59E0B",
                borderRadius: [4, 4, 0, 0],
                shadowColor: isDL ? "rgba(225, 29, 72, 0.35)" : "transparent",
                shadowBlur: isDL ? 8 : 0,
              },
            };
          }),
          markLine: {
            symbol: "none",
            data: [
              {
                yAxis: 10.0,
                lineStyle: {
                  color: "#EF4444",
                  type: "dashed",
                  width: 1.5,
                },
                label: {
                  formatter: "★ ₹10.00 Cr Mandate",
                  position: "insideEndTop",
                  distance: 6,
                  color: "#EF4444",
                  fontSize: 11,
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
