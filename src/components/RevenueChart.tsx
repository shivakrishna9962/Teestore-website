'use client';

import { formatPrice } from '@/lib/helpers';

interface DataPoint {
    date: string;
    revenue: number;
}

interface RevenueChartProps {
    data: DataPoint[];
}

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const PADDING = { top: 20, right: 20, bottom: 40, left: 60 };

export default function RevenueChart({ data }: RevenueChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                No revenue data available
            </div>
        );
    }

    const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
    const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
    const minRevenue = 0;

    const xStep = innerW / Math.max(data.length - 1, 1);

    function xPos(i: number) {
        return PADDING.left + i * xStep;
    }

    function yPos(value: number) {
        return PADDING.top + innerH - ((value - minRevenue) / (maxRevenue - minRevenue)) * innerH;
    }

    const polylinePoints = data
        .map((d, i) => `${xPos(i)},${yPos(d.revenue)}`)
        .join(' ');

    // Y-axis ticks (5 ticks)
    const yTicks = Array.from({ length: 5 }, (_, i) =>
        Math.round((maxRevenue / 4) * i)
    );

    // X-axis: show every nth label to avoid crowding
    const labelEvery = Math.ceil(data.length / 7);

    return (
        <div className="w-full overflow-x-auto">
            <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                className="w-full"
                style={{ minWidth: 300 }}
                aria-label="Revenue chart"
            >
                {/* Grid lines */}
                {yTicks.map((tick) => (
                    <g key={tick}>
                        <line
                            x1={PADDING.left}
                            y1={yPos(tick)}
                            x2={CHART_WIDTH - PADDING.right}
                            y2={yPos(tick)}
                            stroke="#e5e7eb"
                            strokeWidth={1}
                        />
                        <text
                            x={PADDING.left - 6}
                            y={yPos(tick) + 4}
                            textAnchor="end"
                            fontSize={10}
                            fill="#6b7280"
                        >
                            {formatPrice(tick)}
                        </text>
                    </g>
                ))}

                {/* X-axis labels */}
                {data.map((d, i) => {
                    if (i % labelEvery !== 0 && i !== data.length - 1) return null;
                    const label = d.date.slice(5); // MM-DD
                    return (
                        <text
                            key={i}
                            x={xPos(i)}
                            y={CHART_HEIGHT - 8}
                            textAnchor="middle"
                            fontSize={10}
                            fill="#6b7280"
                        >
                            {label}
                        </text>
                    );
                })}

                {/* Area fill */}
                <polygon
                    points={`${PADDING.left},${PADDING.top + innerH} ${polylinePoints} ${CHART_WIDTH - PADDING.right},${PADDING.top + innerH}`}
                    fill="#3b82f6"
                    fillOpacity={0.1}
                />

                {/* Line */}
                <polyline
                    points={polylinePoints}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />

                {/* Data points */}
                {data.map((d, i) => (
                    <circle
                        key={i}
                        cx={xPos(i)}
                        cy={yPos(d.revenue)}
                        r={3}
                        fill="#3b82f6"
                    >
                        <title>{`${d.date}: ${formatPrice(d.revenue)}`}</title>
                    </circle>
                ))}

                {/* Axes */}
                <line
                    x1={PADDING.left}
                    y1={PADDING.top}
                    x2={PADDING.left}
                    y2={PADDING.top + innerH}
                    stroke="#d1d5db"
                    strokeWidth={1}
                />
                <line
                    x1={PADDING.left}
                    y1={PADDING.top + innerH}
                    x2={CHART_WIDTH - PADDING.right}
                    y2={PADDING.top + innerH}
                    stroke="#d1d5db"
                    strokeWidth={1}
                />
            </svg>

            {/* Table fallback for accessibility */}
            <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                    View as table
                </summary>
                <div className="mt-2 overflow-x-auto">
                    <table className="text-xs w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="border border-gray-200 px-2 py-1 text-left">Date</th>
                                <th className="border border-gray-200 px-2 py-1 text-right">Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((d, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="border border-gray-200 px-2 py-1">{d.date}</td>
                                    <td className="border border-gray-200 px-2 py-1 text-right">{formatPrice(d.revenue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </div>
    );
}
