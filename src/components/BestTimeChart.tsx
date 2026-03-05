import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { motion } from "motion/react";
import { TrendingUp, Clock, Users } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface HourlyData {
  minute: number;
  time: string;
  avgPlayers: number;
  peakPlayers: number;
  occupancy: number;
  isBestTime: boolean;
}

interface BestTimeChartProps {
  cfxId: string;
  serverName: string;
}

export default function BestTimeChart({ cfxId, serverName }: BestTimeChartProps) {
  const [hourlyData, setHourlyData] = React.useState<HourlyData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [bestHours, setBestHours] = React.useState<number[]>([]);

  React.useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const res = await fetch(`/api/servers/${cfxId}/predictions`);
        const data = await res.json();

        // Transform data for charts - 1440 points for 24h (every minute)
        const minutes = Array.from({ length: 1440 }, (_, i) => {
          const minuteData = data.find((m: any) => m.minute_of_day === i) || {
            minute_of_day: i,
            time: `${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`,
            avg_players: 0,
            peak_players: 0
          };

          return {
            minute: i,
            time: minuteData.time,
            avgPlayers: minuteData.avg_players,
            peakPlayers: minuteData.peak_players,
            occupancy: minuteData.avg_players ? Math.round((minuteData.avg_players / (minuteData.peak_players || 1)) * 100) : 0,
            isBestTime: false
          };
        });

        // Identify best times (top 25%)
        const sorted = [...minutes].sort((a, b) => b.avgPlayers - a.avgPlayers);
        const threshold = sorted[Math.floor(sorted.length * 0.25)].avgPlayers;
        const best = minutes.map((m) => ({ ...m, isBestTime: m.avgPlayers >= threshold }));

        setHourlyData(best);
        setBestHours(best.filter((m) => m.isBestTime).map((m) => m.minute));
      } catch (err) {
        console.error("Failed to fetch predictions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [cfxId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const avgPlayersAll = hourlyData.reduce((sum, m) => sum + m.avgPlayers, 0) / 1440;
  const peakPlayersAll = Math.max(...hourlyData.map((m) => m.peakPlayers));
  const bestTime = hourlyData.reduce((max, m) => (m.avgPlayers > max.avgPlayers ? m : max));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-600/10 to-indigo-600/5 border border-indigo-500/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-400 uppercase">Avg Players</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-white">{Math.round(avgPlayersAll)}</p>
          <p className="text-xs text-zinc-500 mt-1">across all hours</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-emerald-600/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-400 uppercase">Peak Players</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-white">{peakPlayersAll}</p>
          <p className="text-xs text-zinc-500 mt-1">max recorded</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-amber-600/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-400 uppercase">Best Time</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-white">{bestTime.time}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {bestTime.avgPlayers} avg players
          </p>
        </motion.div>
      </div>

      {/* Best Times Badges */}
      {bestHours.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs font-bold text-zinc-400 uppercase mb-3">Best Times to Play (Top 25%)</p>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {bestHours.slice(0, 20).map((minute) => {
              const h = Math.floor(minute / 60);
              const m = minute % 60;
              const nextM = (m + 1) % 60;
              const nextH = m === 59 ? (h + 1) % 24 : h;
              return (
                <div
                  key={minute}
                  className="px-2 py-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg whitespace-nowrap"
                >
                  {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")} - {String(nextH).padStart(2, "0")}:{String(nextM).padStart(2, "0")}
                </div>
              );
            })}
            {bestHours.length > 20 && (
              <div className="px-2 py-1 bg-zinc-700/50 text-zinc-300 text-xs font-bold rounded-lg">
                +{bestHours.length - 20} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Average Players by Minute */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Average Players (24h Activity)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis
              dataKey="time"
              interval={59}
              stroke="#a1a1aa"
            />
            <YAxis stroke="#a1a1aa" />
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }}
              formatter={(value: any) => [Math.round(value), "Players"]}
              labelFormatter={(label: any) => `${label}`}
            />
            <Line
              type="monotone"
              dataKey="avgPlayers"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Peak vs Average */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Peak vs Average (24h)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourlyData.filter((_, i) => i % 60 === 0)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis
              dataKey="time"
              stroke="#a1a1aa"
            />
            <YAxis stroke="#a1a1aa" />
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }}
            />
            <Bar dataKey="avgPlayers" fill="#6366f1" name="Avg Players" radius={[4, 4, 0, 0]} />
            <Bar dataKey="peakPlayers" fill="#f59e0b" name="Peak Players" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
