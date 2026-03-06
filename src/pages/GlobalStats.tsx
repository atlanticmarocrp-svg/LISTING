import React from "react";
import { supabase } from "@/src/lib/supabase";
import { BarChart3, TrendingUp, Users, Calendar, Star, Trophy, Medal } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { cn, truncate, getApiUrl } from "@/src/lib/utils";

export default function GlobalStats() {
  const [data, setData] = React.useState<{ day: string; players: number }[]>([]);
  const [stats, setStats] = React.useState<{ totalPlayers: number } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [dominantServers, setDominantServers] = React.useState<any[]>([]);
  const [topStarred, setTopStarred] = React.useState<any[]>([]);
  const [dominantPeriod, setDominantPeriod] = React.useState<"realtime" | "day" | "week" | "month" | "year">("realtime");
  const [loadingDominant, setLoadingDominant] = React.useState(true);
  const [refreshingDominant, setRefreshingDominant] = React.useState(false);

  const fetchDominant = async (period: string, isInitial: boolean = false) => {
    if (isInitial) {
      setLoadingDominant(true);
    } else {
      setRefreshingDominant(true);
    }
    try {
      const res = await fetch(getApiUrl(`/api/stats/dominant-servers?period=${period}`));
      const data = await res.json();
      setDominantServers(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) {
        setLoadingDominant(false);
      } else {
        setRefreshingDominant(false);
      }
    }
  };

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const [historyRes, realtimeRes, topStarredRes] = await Promise.all([
          fetch(getApiUrl("/api/stats/global-history")),
          fetch(getApiUrl("/api/stats")),
          fetch(getApiUrl("/api/stats/top-starred"))
        ]);
        const historyJson = await historyRes.json();
        const realtimeJson = await realtimeRes.json();
        const topStarredJson = await topStarredRes.json();

        setData(historyJson);
        setStats(realtimeJson);
        setTopStarred(topStarredJson);
      } catch (err) {
        console.error("Failed to fetch global stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    fetchDominant(dominantPeriod, true);

    // REAL-TIME: Listen for server table updates (Players)
    const channel = supabase
      .channel('global_stats_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'servers' },
        (payload) => {
          // Refresh stats and dominant list when any server updates
          fetchStats();
          if (dominantPeriod === 'realtime') {
            fetchDominant('realtime', false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  React.useEffect(() => {
    fetchDominant(dominantPeriod, false);
  }, [dominantPeriod]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const latestPlayers = stats?.totalPlayers || 0;
  const maxCapacity = 2000;
  const percentage = Math.round((latestPlayers / maxCapacity) * 100);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 pt-12">
        {/* Top Starred Servers Podium */}
        <div className="mb-20">
          <div className="flex items-center justify-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-500" />
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Server Hall of Fame</h2>
              <p className="text-zinc-500 text-sm font-medium">The most starred servers by the community</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-500" />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-end justify-center gap-4 lg:gap-0 max-w-6xl mx-auto px-4 pb-12">
            {/* Rank 4 - Far Left / Behind */}
            {topStarred[3] && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 0.9 }}
                transition={{ delay: 0.4 }}
                className="w-full lg:w-1/5 flex flex-col items-center group -mr-8 z-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <div className="mb-4 text-center">
                  <div className="relative w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                    <span className="text-xl font-black text-zinc-600">4</span>
                  </div>
                  <h3 className="font-bold text-[10px] text-zinc-600 truncate w-24 mx-auto uppercase tracking-tighter">{truncate(topStarred[3].name, 20)}</h3>
                </div>
                <div className="w-full bg-gradient-to-b from-zinc-800 to-zinc-950 border-x border-t border-zinc-700 rounded-t-2xl p-4 h-20 flex flex-col items-center justify-center relative shadow-lg">
                  <div className="flex items-center gap-1 text-zinc-600">
                    <Star className="w-3 h-3 fill-zinc-700" />
                    <span className="text-sm font-black">{topStarred[3].star_count}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Rank 3 - Left of Center */}
            {topStarred[2] && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full lg:w-1/4 flex flex-col items-center group z-10"
              >
                <div className="mb-6 text-center">
                  <div className="relative w-20 h-20 mx-auto mb-3 flex items-center justify-center">
                    <span className="text-2xl font-black text-orange-700">3</span>
                  </div>
                  <h3 className="font-bold text-xs text-zinc-400 truncate w-32 mx-auto uppercase tracking-tight">{truncate(topStarred[2].name, 20)}</h3>
                </div>
                <div className="w-full bg-gradient-to-b from-zinc-700 to-zinc-900 border-x border-t border-zinc-600 rounded-t-3xl p-6 h-36 flex flex-col items-center justify-center relative shadow-2xl">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Star className="w-4 h-4 fill-orange-900/50" />
                    <span className="text-xl font-black">{topStarred[2].star_count}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Rank 1 - Center (The King) */}
            {topStarred[0] && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className="w-full lg:w-1/3 flex flex-col items-center group z-30 -mx-2"
              >
                <div className="mb-8 text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-5xl font-black text-amber-500 drop-shadow-lg">1</span>
                  </div>
                  <h3 className="font-black text-xl text-white truncate w-56 mx-auto drop-shadow-lg uppercase tracking-tighter">{truncate(topStarred[0].name, 20)}</h3>
                </div>
                <div className="w-full bg-gradient-to-b from-amber-600/20 to-zinc-950 border-x border-t border-amber-500 rounded-t-[40px] p-10 h-64 flex flex-col items-center justify-center relative shadow-[0_-20px_50px_rgba(245,158,11,0.15)] overflow-visible">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-950 text-xs font-black px-8 py-2 rounded-full uppercase tracking-[0.3em] shadow-[0_10px_20px_rgba(245,158,11,0.3)] whitespace-nowrap">
                    Champion
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-3 text-amber-500">
                      <Star className="w-10 h-10 fill-amber-500" />
                      <span className="text-6xl font-black tracking-tighter">{topStarred[0].star_count}</span>
                    </div>
                    <p className="text-amber-500/50 text-[10px] font-bold uppercase tracking-[0.4em]">Stars</p>
                  </div>

                  {/* champion logo: try custom then fall back to official / fiveM icon */}
                  <div className="absolute -bottom-8 w-24 h-24 rounded-3xl border-4 border-zinc-950 overflow-hidden bg-zinc-900 shadow-2xl z-40">
                    <img
                      src={
                        topStarred[0].custom_logo ||
                        (topStarred[0].data?.iconVersion
                          ? `https://frontend.cfx-services.net/api/servers/icon/${topStarred[0].cfx_id}/${topStarred[0].data.iconVersion}.png`
                          : null) ||
                        topStarred[0].data?.icon ||
                        topStarred[0].data?.ownerAvatar ||
                        `https://picsum.photos/seed/${topStarred[0].cfx_id}/100/100`
                      }
                      alt="Logo"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Rank 2 - Right of Center */}
            {topStarred[1] && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full lg:w-1/4 flex flex-col items-center group z-20"
              >
                <div className="mb-6 text-center">
                  <div className="relative w-24 h-24 mx-auto mb-3 flex items-center justify-center">
                    <span className="text-3xl font-black text-zinc-300">2</span>
                  </div>
                  <h3 className="font-bold text-sm text-zinc-300 truncate w-40 mx-auto uppercase tracking-tight">{truncate(topStarred[1].name, 20)}</h3>
                </div>
                <div className="w-full bg-gradient-to-b from-zinc-600 to-zinc-900 border-x border-t border-zinc-400 rounded-t-3xl p-8 h-48 flex flex-col items-center justify-center relative shadow-2xl">
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Star className="w-5 h-5 fill-zinc-300" />
                    <span className="text-3xl font-black">{topStarred[1].star_count}</span>
                  </div>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-zinc-400 text-zinc-950 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
                    2nd Place
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Podium Base Line */}
          <div className="max-w-5xl mx-auto h-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-indigo-500" />
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tighter">Global Statistics</h1>
            </div>
            <p className="text-zinc-500 max-w-2xl">
              Track the evolution of the FiveM community across all our partner servers.
              This data is updated daily to reflect real activity.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl min-w-[200px]">
              <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">
                <Users className="w-4 h-4" />
                Players Online
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">{latestPlayers}</span>
                <span className="text-zinc-500 text-sm">/ {maxCapacity}</span>
              </div>
              <div className="mt-4 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  className="h-full bg-indigo-500"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-wider">
                {percentage}% of total capacity
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <TrendingUp className="w-64 h-64" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-xl font-bold mb-1">Weekly Activity</h2>
                  <p className="text-zinc-500 text-sm">Peak player count per day</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Calendar className="w-4 h-4" />
                    Last 7 Days
                  </div>
                </div>
              </div>

              <div className="h-[400px] w-full">
                {data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGlobalPlayers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis
                        dataKey="day"
                        stroke="#52525b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(str) => {
                          const date = new Date(str);
                          return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
                        }}
                      />
                      <YAxis
                        stroke="#52525b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 2000]}
                        ticks={[0, 500, 1000, 1500, 2000]}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { dateStyle: 'full' })}
                      />
                      <Area
                        type="monotone"
                        dataKey="players"
                        stroke="#6366f1"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorGlobalPlayers)"
                        animationDuration={2000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                    <p className="text-sm font-medium">No data available at the moment.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Dominant Servers Section */}
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-xl font-bold">Dominant Servers</h2>
                <p className="text-zinc-500 text-xs mt-1">Servers with the most players (Activity Peak)</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: "realtime", label: "Real-time" },
                  { id: "day", label: "Day" },
                  { id: "week", label: "Week" },
                  { id: "month", label: "Month" },
                  { id: "year", label: "Year" }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setDominantPeriod(p.id as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                      dominantPeriod === p.id
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <motion.div className="space-y-4" layout>
              {loadingDominant && dominantServers.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-indigo-500 animate-spin" />
                  <p className="text-zinc-500 text-xs font-medium">Loading servers...</p>
                </div>
              ) : dominantServers.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {/* Refresh indicator - subtle badge */}
                  {refreshingDominant && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-indigo-600/10 border border-indigo-500/20 mx-auto w-fit text-xs font-bold text-indigo-400 uppercase"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                      Updating data...
                    </motion.div>
                  )}
                  {dominantServers.map((server, idx) => {
                  // Rank badge color and animation based on position
                  const rankColors = [
                    "bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-600/30",
                    "bg-gradient-to-br from-slate-400 to-slate-500 text-zinc-950 shadow-lg shadow-slate-400/30",
                    "bg-gradient-to-br from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-600/30"
                  ];
                  const rankColor = rankColors[idx] || "bg-indigo-600/10 text-indigo-500";

                  return (
                    <motion.div
                      key={server.cfx_id}
                      layout
                      initial={{ opacity: 0, scale: 0.95, x: -20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: 20 }}
                      transition={{
                        layout: { duration: 0.4, type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.3 },
                        scale: { duration: 0.3 }
                      }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl bg-zinc-950 border border-zinc-800/50 group hover:border-indigo-500/30 transition-all",
                        refreshingDominant && "opacity-70"
                      )}
                    >
                      {/* Rank Badge with Animation */}
                      <motion.div
                        layout
                        animate={{
                          scale: idx < 3 ? 1.15 : 1,
                          rotate: idx < 3 ? [0, -2, 2, 0] : 0
                        }}
                        transition={{
                          scale: { duration: 0.4 },
                          rotate: { duration: 0.6, delay: 0.2 }
                        }}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0",
                          rankColor,
                          idx < 3 && "ring-2 ring-offset-2 ring-offset-zinc-900"
                        )}
                      >
                        {idx + 1}
                      </motion.div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate group-hover:text-indigo-400 transition-colors">
                          {truncate(server.name, 20)}
                        </h3>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">
                          CFX: {server.cfx_id}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <motion.div
                          animate={{ fontSize: idx < 3 ? "1.375rem" : "1.25rem" }}
                          transition={{ duration: 0.4 }}
                          className="font-black text-white"
                        >
                          {server.players}
                        </motion.div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                          Players
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden hidden md:block flex-shrink-0">
                        <motion.div
                          layout
                          animate={{
                            width: `${Math.min((server.players / 2000) * 100, 100)}%`,
                            backgroundColor: idx === 0 ? "#fbbf24" : idx === 1 ? "#a1a1aa" : idx === 2 ? "#fb923c" : "#6366f1"
                          }}
                          transition={{
                            width: { duration: 0.6, type: "spring", stiffness: 100, damping: 20 },
                            backgroundColor: { duration: 0.4 }
                          }}
                          className="h-full"
                        />
                      </div>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              ) : (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  No data available for this period.
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
