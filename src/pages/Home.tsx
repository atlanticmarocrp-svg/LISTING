import React from "react";
import { supabase } from "@/src/lib/supabase";
import { Search, Filter, TrendingUp, Users, Server as ServerIcon, MessageSquare, Heart, Star, LayoutGrid, List } from "lucide-react";
import { motion } from "motion/react";
import Hero from "@/src/components/Hero";
import AdvancedFilters from "@/src/components/AdvancedFilters";
import ServerCard from "@/src/components/ServerCard";
import ServerListItem from "@/src/components/ServerListItem";
import { Server, Stats, Comment } from "@/src/types";
import { truncate, regionCodeToFlag, regionFlagUrl, regionCodeFromString } from "@/src/lib/utils";

interface HomeProps {
  onServerClick: (cfxId: string) => void;
  settings?: Record<string, string>;
}

export default function Home({ onServerClick, settings }: HomeProps) {
  const [servers, setServers] = React.useState<Server[]>([]);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [recentComments, setRecentComments] = React.useState<Comment[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [sortBy, setSortBy] = React.useState<"players" | "stars" | "comments">("players");

  const [topStarred, setTopStarred] = React.useState<any[]>([]);
  const [filters, setFilters] = React.useState<import("@/src/types").FilterOptions>({ regions: [], languages: [], gameplayTypes: [], tags: [] });
  const [viewMode, setViewMode] = React.useState<"grid" | "list">(() => {
    // default to list layout; preserve across sessions
    return (localStorage.getItem('viewMode') as "grid" | "list") || "list";
  });
  const [userRegion, setUserRegion] = React.useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [availableRegions, setAvailableRegions] = React.useState<string[]>([]);

  // Extract unique regions from servers
  const getAvailableRegions = React.useCallback((serversList: Server[]): string[] => {
    const regions = new Set<string>();
    serversList.forEach(server => {
      // First, try to get the region from server.region
      if (server.region) {
        const code = regionCodeFromString(server.region, server.data?.vars?.locale);
        if (code) {
          regions.add(code);
        }
      }
      // Also check locale if available
      if (server.data?.vars?.locale) {
        const code = regionCodeFromString(undefined, server.data.vars.locale);
        if (code) {
          regions.add(code);
        }
      }
    });
    return Array.from(regions).sort();
  }, []);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [serversRes, statsRes, commentsRes, topStarredRes] = await Promise.all([
          fetch("/api/servers"),
          fetch("/api/stats"),
          fetch("/api/comments/recent"),
          fetch("/api/stats/top-starred")
        ]);

        const serversData = await serversRes.json();
        const statsData = await statsRes.json();
        const commentsData = await commentsRes.json();
        const topStarredData = await topStarredRes.json();

        setServers(Array.isArray(serversData) ? serversData : []);
        setStats(statsData);
        setRecentComments(Array.isArray(commentsData) ? commentsData : []);
        setTopStarred(Array.isArray(topStarredData) ? topStarredData : []);
        
        // Set available regions
        const regions = getAvailableRegions(Array.isArray(serversData) ? serversData : []);
        setAvailableRegions(regions);
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // determine visitor country/region from locale
    const locale = navigator.language;
    const detected = regionCodeFromString(undefined, locale);
    if (detected) setUserRegion(detected);

    // REAL-TIME: Listen for server table updates (Players, stars, etc.)
    const channel = supabase
      .channel('home_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'servers' },
        (payload) => {
          // Update the specific server in the list
          setServers(prev => prev.map(s =>
            s.cfx_id === payload.new.cfx_id
              ? {
                ...s,
                ...payload.new,
                data: { ...s.data, clients: payload.new.players_online, sv_maxclients: payload.new.max_players }
              }
              : s
          ));

          // Refresh stats to get updated player sum
          fetch("/api/stats").then(res => res.json()).then(setStats);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredServers = servers
    .filter(s => {
      // advanced filters
      if (filters.regions.length > 0 && !filters.regions.includes(s.region)) return false;
      // (could extend to languages, gameplayTypes, tags later)

      const searchLower = search.toLowerCase();
      const nameMatch = s.name.toLowerCase().includes(searchLower);
      const customNameMatch = s.custom_name && s.custom_name.toLowerCase().includes(searchLower);
      return nameMatch || customNameMatch;
    })
    .sort((a, b) => {
      if (sortBy === "stars") return (b.total_stars || 0) - (a.total_stars || 0);
      if (sortBy === "comments") return (b.comment_count || 0) - (a.comment_count || 0);
      return (b.data?.clients || 0) - (a.data?.clients || 0);
    });

  const heroServers = [...servers]
    .sort((a, b) => (b.data?.clients || 0) - (a.data?.clients || 0))
    .slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      <Hero featuredServers={heroServers} onServerClick={onServerClick} settings={settings} />

      <div className="max-w-7xl mx-auto px-4 -mt-12 relative z-10">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {[
            { label: "Total Servers", value: stats?.serverCount || 0, icon: ServerIcon, color: "text-indigo-400" },
            { label: "Players Online", value: stats?.totalPlayers || 0, icon: Users, color: "text-emerald-400" },
          ].map((stat, i) => (
            <div key={i} className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-6 rounded-2xl flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black text-white">
                  {stat.value.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col gap-4 mb-10">
          <div className="flex flex-col md:flex-row gap-4 relative">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by server name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <div>
                <AdvancedFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  activeCount={filters.regions.length + filters.languages.length + filters.gameplayTypes.length + filters.tags.length}
                  isOpen={filtersOpen}
                  onOpenChange={setFiltersOpen}
                  hideToggle={false}
                  availableRegions={availableRegions}
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="players">Most Players</option>
                <option value="stars">Most Stars</option>
                <option value="comments">Most Comments</option>
              </select>
              {/* floating filter button is handled separately */}
              {/* (map pin location shortcut removed) */}
              <button
                onClick={() => {
                  setViewMode("grid");
                  localStorage.setItem('viewMode','grid');
                }}
                className={
                  "p-3 rounded-2xl transition-colors " +
                  (viewMode === "grid" ? "bg-indigo-600" : "bg-zinc-900 border border-zinc-800")
                }
                title="Grid view"
              >
                <LayoutGrid className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => {
                  setViewMode("list");
                  localStorage.setItem('viewMode','list');
                }}
                className={
                  "p-3 rounded-2xl transition-colors " +
                  (viewMode === "list" ? "bg-indigo-600" : "bg-zinc-900 border border-zinc-800")
                }
                title="List view"
              >
                <List className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Top Starred Quick View */}
        {topStarred.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Most Starred</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {topStarred.map((s) => {
                // reuse the same icon logic as ServerCard so stars list and grid match
                const officialIcon = s.data?.iconVersion
                  ? `https://frontend.cfx-services.net/api/servers/icon/${s.cfx_id}/${s.data.iconVersion}.png`
                  : null;
                const logoUrl =
                  s.custom_logo ||
                  officialIcon ||
                  s.data?.icon ||
                  s.data?.ownerAvatar ||
                  `https://picsum.photos/seed/${s.cfx_id}/100/100`;

                return (
                  <motion.div
                    key={s.cfx_id}
                    whileHover={{ y: -4 }}
                    onClick={() => onServerClick(s.cfx_id)}
                    className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-amber-500/30 transition-all"
                  >
                    <img
                      src={logoUrl}
                      className="w-12 h-12 rounded-xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{s.name}</p>
                      {(() => {
                        const code = regionCodeFromString(s.region, s.data?.vars?.locale);
                        if (!code) return null;
                        return (
                          <div className="text-[10px] text-zinc-400 uppercase mt-1 flex items-center gap-1">
                            <span className="text-lg">{regionCodeToFlag(code)}</span>
                            <span>{code}</span>
                          </div>
                        );
                      })()}
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-xs font-black">{s.star_count}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Server listing (grid or row) */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredServers.map((server: Server) => (
              <ServerCard key={server.id} server={server} onClick={onServerClick} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredServers.map((server: Server) => (
              <ServerListItem
                key={server.id}
                server={server}
                onClick={onServerClick}
              />
            ))}
          </div>
        )}

        {filteredServers.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-lg">No servers found matching your search.</p>
          </div>
        )}

        {/* Recent Activity */}
        <div className="mt-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Recent Activity</h2>
              <p className="text-zinc-500 text-sm">What the community is saying across all servers</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentComments.map((comment) => (
              <motion.div
                key={comment.id}
                whileHover={{ y: -4 }}
                onClick={() => onServerClick(comment.cfx_id)}
                className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl cursor-pointer hover:border-zinc-700 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                      {comment.username[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded uppercase font-bold">
                          {truncate(comment.custom_name || comment.server_name, 20)}
                        </span>
                        <p className="text-sm font-bold text-white">{comment.username}</p>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500 text-xs font-bold">
                    <Heart className="w-3 h-3" />
                    {comment.likes}
                  </div>
                </div>
                <p className="text-zinc-400 text-sm line-clamp-2 mb-4 italic">
                  "{comment.content}"
                </p>
                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-600 font-mono">{comment.cfx_id}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
