import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { resolveCase, selectSyndicate } from "../../../selectors/caseSelectors";
import { formatInrCompact } from "../../../lib/formatInr";

interface CrossStateWaterfallProps {
  height?: number | string;
  /** Active case; the waterfall stacks this case and every case linked to it by a shared anchor. */
  caseId?: string;
}

/** Cumulative exposure waterfall across the cases linked to the active case. */
export const CrossStateWaterfall: React.FC<CrossStateWaterfallProps> = ({ height = "100%", caseId = "CASE-2026-001" }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const fixture = resolveCase(caseId);
    if (!fixture) return;
    const items = selectSyndicate(fixture).combinedCases;
    const labels = items.map((i) => `${i.caseId.replace("CASE-2026-", "Case ")}`);
    const increments = items.map((i) => i.bookedLossInr);
    const bases: number[] = [];
    increments.reduce((acc, v) => {
      bases.push(acc);
      return acc + v;
    }, 0);
    const total = increments.reduce((a, b) => a + b, 0);

    if (!chartInstance.current) chartInstance.current = echarts.init(chartRef.current);
    const chart = chartInstance.current;

    const option: echarts.EChartsOption = {
      grid: { top: 28, right: 24, bottom: 24, left: 48, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const tar = params[1];
          const idx = tar.dataIndex;
          return `<div style="font-size:11px">
            <strong>${items[idx].caseId}</strong> · ${items[idx].policeStation}<br/>
            Booked loss: <strong>${formatInrCompact(increments[idx])}</strong><br/>
            Cumulative: <strong>${formatInrCompact(bases[idx] + increments[idx])}</strong> of ${formatInrCompact(total)}
          </div>`;
        },
      },
      xAxis: { type: "category", data: labels, axisLine: { lineStyle: { color: "rgba(148,163,184,0.4)" } }, axisLabel: { color: "#64748B", fontSize: 11, fontWeight: 600 }, axisTick: { show: false } },
      yAxis: { type: "value", axisLine: { show: false }, axisLabel: { color: "#64748B", fontSize: 11, formatter: (v: number) => formatInrCompact(v) }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.2)" } } },
      series: [
        { name: "Base", type: "bar", stack: "total", itemStyle: { borderColor: "transparent", color: "transparent" }, emphasis: { itemStyle: { borderColor: "transparent", color: "transparent" } }, data: bases },
        {
          name: "Exposure",
          type: "bar",
          stack: "total",
          barWidth: "55%",
          data: increments.map((val, idx) => ({
            value: val,
            itemStyle: { color: idx === 0 ? "#E11D48" : ["#3B82F6", "#6366F1", "#8B5CF6", "#F59E0B"][(idx - 1) % 4], borderRadius: [4, 4, 0, 0] },
          })),
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
  }, [caseId]);

  return <div ref={chartRef} style={{ width: "100%", height }} />;
};
