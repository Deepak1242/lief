"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@apollo/client";
import { USER, ANALYTICS, SHIFTS_ADMIN } from "@/graphql/operations";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(LineElement, BarElement, CategoryScale, LinearScale, PointElement, ChartTooltip, Legend, Filler);

const theme = {
  primary: "#4361ee",
  textSecondary: "#64748b",
};

export default function UserAnalyticsPage() {
  const params = useParams();
  const userId = params?.id;

  // Time range state for analytics
  const [range, setRange] = useState('month'); // today | week | month | custom
  const [customStart, setCustomStart] = useState(null); // YYYY-MM-DD string
  const [metric, setMetric] = useState('hours'); // 'hours' | 'entries'

  const getDateRange = (r, custom) => {
    const end = new Date();
    let start;
    if (r === 'custom' && custom) {
      start = new Date(custom);
    } else {
      switch (r) {
        case 'today': {
          start = new Date();
          start.setHours(0, 0, 0, 0);
          break;
        }
        case 'week': {
          start = new Date(Date.now() - 7 * 24 * 3600 * 1000);
          break;
        }
        case 'month': {
          start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
          break;
        }
        default: {
          start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        }
      }
    }
    return { start, end };
  };

  const dateRange = useMemo(() => getDateRange(range, customStart), [range, customStart]);
  const rangeLabel = useMemo(() => {
    switch (range) {
      case 'today': return 'Today';
      case 'week': return 'Last 7 days';
      case 'month': return 'Last 30 days';
      case 'custom': return customStart ? `Since ${new Date(customStart).toLocaleDateString()}` : 'Custom';
      default: return 'Last 30 days';
    }
  }, [range, customStart]);

  const { data: userData, loading: loadingUser } = useQuery(USER, { variables: { id: userId }, skip: !userId });
  const { data: analyticsData, loading: loadingAnalytics, refetch: refetchAnalytics } = useQuery(ANALYTICS, {
    variables: { userId, from: dateRange.start, to: dateRange.end },
    skip: !userId,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });
  const { data: shiftsData, loading: loadingShifts, refetch: refetchShifts } = useQuery(SHIFTS_ADMIN, {
    variables: { userId, from: dateRange.start, to: dateRange.end },
    skip: !userId,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  // Remove rebuild analytics - graphs will auto-refresh when filters change

  // Helpers
  const formatHoursMin = (hours) => {
    if (!hours || hours <= 0) return '0m';
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h ? h + 'h ' : ''}${m}m`;
  };

  // Calculate hours from shift data
  const calculateShiftHours = (shift) => {
    if (!shift.clockOutAt) return 0; // Ongoing shifts don't count toward analytics
    const start = new Date(shift.clockInAt);
    const end = new Date(shift.clockOutAt);
    return Math.max(0, (end - start) / 3600000); // Convert to hours
  };

  // Helper to generate date range with data calculated from actual shifts
  const getDateRangeWithShiftData = (start, end, shifts) => {
    const dateMap = new Map();
    
    // Process shifts to calculate daily totals
    (shifts || []).forEach(shift => {
      if (!shift.clockOutAt) return; // Skip ongoing shifts
      const shiftDate = new Date(shift.clockInAt);
      const dateKey = shiftDate.toISOString().split('T')[0];
      
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { hours: 0, count: 0 });
      }
      
      const dayData = dateMap.get(dateKey);
      dayData.hours += calculateShiftHours(shift);
      dayData.count += 1;
    });

    const result = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      const data = dateMap.get(dateKey) || { hours: 0, count: 0 };
      result.push({
        date: new Date(current),
        ...data
      });
      current.setDate(current.getDate() + 1);
    }
    return result;
  };

  // Process analytics data directly from shifts for accuracy
  const { processedAnalytics, daysWithData } = useMemo(() => {
    if (!shiftsData?.shifts?.length) return { processedAnalytics: [], daysWithData: 0 };
    
    const data = getDateRangeWithShiftData(dateRange.start, dateRange.end, shiftsData.shifts);
    const daysWithDataCount = data.filter(d => d.hours > 0).length;
    
    return {
      processedAnalytics: data,
      daysWithData: daysWithDataCount > 0 ? daysWithDataCount : 1 // Avoid division by zero
    };
  }, [shiftsData, dateRange]);

  const memberChart = useMemo(() => {
    const labels = processedAnalytics.map(item => 
      item.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    );
    
    const values = processedAnalytics.map(item => 
      metric === 'hours' ? item.hours : item.count
    );

    return {
      labels,
      datasets: [
        {
          label: metric === 'hours' ? 'Daily Hours' : 'Daily Entries',
          data: values,
          borderColor: theme.primary,
          backgroundColor: "rgba(67, 97, 238, 0.15)",
          fill: true,
          tension: 0.35,
        },
      ],
    };
  }, [processedAnalytics, metric]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: { size: 14, weight: "bold" },
        bodyFont: { size: 13 },
        callbacks: {
          label: function(context) {
            const value = context.raw || 0;
            if (metric === 'hours') {
              return `${value.toFixed(2)} hours`;
            }
            return `${value} ${value === 1 ? 'entry' : 'entries'}`;
          }
        }
      },
    },
    scales: {
      x: { 
        grid: { display: false }, 
        ticks: { 
          color: theme.textSecondary,
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 10
        } 
      },
      y: { 
        grid: { color: "rgba(0, 0, 0, 0.03)" },
        ticks: { 
          color: theme.textSecondary,
          callback: function(value) {
            if (metric === 'hours') {
              return value > 0 ? `${value.toFixed(1)}h` : '0h';
            }
            return value;
          }
        },
        beginAtZero: true,
        title: {
          display: true,
          text: metric === 'hours' ? 'Hours' : 'Entries',
          color: theme.textSecondary
        }
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 5,
        hoverBorderWidth: 2
      }
    }
  }), [metric, theme]);

  // Calculate metrics using processed data for consistency
  const { totalHoursNum, totalHoursFmt, avgHours, avgPerDayFmt, totalEntries } = useMemo(() => {
    const hours = processedAnalytics.reduce((sum, day) => sum + (day.hours || 0), 0);
    const entries = processedAnalytics.reduce((sum, day) => sum + (day.count || 0), 0);
    const avgHours = hours / daysWithData;
    
    return {
      totalHoursNum: hours,
      totalHoursFmt: formatHoursMin(hours), // Hours already in correct format
      avgHours,
      avgPerDayFmt: formatHoursMin(avgHours), // Hours already in correct format
      totalEntries: entries
    };
  }, [processedAnalytics, daysWithData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {loadingUser ? "Loading..." : userData?.user?.name || userData?.user?.email || "User"}
            </h1>
            <p className="text-gray-500 mt-1">Individual analytics — {rangeLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-md p-0.5">
              <button
                onClick={() => setMetric('hours')}
                className={`px-2 py-1 text-xs rounded ${metric === 'hours' ? 'bg-white shadow text-gray-800' : 'text-gray-600'}`}
              >Hours</button>
              <button
                onClick={() => setMetric('entries')}
                className={`px-2 py-1 text-xs rounded ${metric === 'entries' ? 'bg-white shadow text-gray-800' : 'text-gray-600'}`}
              >Entries</button>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="range" className="text-sm text-gray-600">Range</label>
              <select
                id="range"
                className="border rounded px-2 py-1 text-sm bg-white"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {range === 'custom' && (
              <input
                type="date"
                className="border rounded px-2 py-1 text-sm"
                max={new Date().toISOString().split('T')[0]}
                value={customStart || ''}
                onChange={(e) => setCustomStart(e.target.value || null)}
              />
            )}
            <Link href="/admin" className="text-blue-600 hover:underline text-sm whitespace-nowrap">← Back to Admin</Link>
          </div>
        </div>


        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="text-xs text-gray-500">Total Hours</div>
            <div className="text-2xl font-semibold">{totalHoursFmt}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="text-xs text-gray-500">Avg Hours/Day</div>
            <div className="text-2xl font-semibold">{avgPerDayFmt}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="text-xs text-gray-500">Total Entries</div>
            <div className="text-2xl font-semibold">{totalEntries}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="text-xs text-gray-500">Shifts</div>
            <div className="text-2xl font-semibold">{(shiftsData?.shifts || []).length}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">
              {metric === 'hours' ? 'Daily Hours' : 'Daily Entries'}
            </h2>
            {(loadingAnalytics || loadingShifts) && (
              <div className="text-sm text-blue-600">Loading...</div>
            )}
          </div>
          <div className="h-72">
            {processedAnalytics.length > 0 ? (
              <Line data={memberChart} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                {(loadingAnalytics || loadingShifts) ? 'Loading data...' : 'No data in the selected range'}
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500 text-right">
            Showing {processedAnalytics.length} days from {dateRange.start.toLocaleDateString()} to {dateRange.end.toLocaleDateString()}
          </div>
        </div>

        {/* Shifts Table */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <h2 className="text-lg font-medium mb-3">Recent Shifts</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Time In</th>
                  <th className="py-2 pr-4">Time Out</th>
                  <th className="py-2 pr-4">Duration</th>
                  <th className="py-2 pr-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {(shiftsData?.shifts || []).slice(0, 20).map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{new Date(s.clockInAt).toLocaleDateString()}</td>
                    <td className="py-2 pr-4">{new Date(s.clockInAt).toLocaleTimeString()}</td>
                    <td className="py-2 pr-4">{s.clockOutAt ? new Date(s.clockOutAt).toLocaleTimeString() : "-"}</td>
                    <td className="py-2 pr-4">
                      {(() => {
                        if (!s.clockOutAt) return "In progress";
                        const start = new Date(s.clockInAt);
                        const end = new Date(s.clockOutAt);
                        const hrs = Math.max(0, (end - start) / 3600000);
                        return formatHoursMin(hrs);
                      })()}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{[s.clockInNote, s.clockOutNote].filter(Boolean).join(" / ") || "-"}</td>
                  </tr>
                ))}
                {(!shiftsData || (shiftsData.shifts || []).length === 0) && (
                  <tr>
                    <td className="py-4 text-center text-gray-500" colSpan={5}>
                      No shifts found in this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
