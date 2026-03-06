import React from "react";
import { supabase } from "@/src/lib/supabase";
import { ArrowLeft, Users, Globe, MessageSquare, Play, Shield, Terminal, Star, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FiveMServerData, Analytics, Server, Comment } from "@/src/types";
import { cleanFiveMName, cn, truncate, regionCodeToFlag, getApiUrl } from "@/src/lib/utils";

interface ServerDetailsProps {
  cfxId: string;
  onBack: () => void;
  settings?: Record<string, string>;
  userToken: string | null;
  onUserLogin: (token: string, user: any) => void;
}

export default function ServerDetails({ cfxId, onBack, settings, userToken, onUserLogin }: ServerDetailsProps) {
  const [data, setData] = React.useState<{ server: Server; data: FiveMServerData; analytics: Analytics[]; comments: Comment[] } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [commentText, setCommentText] = React.useState("");
  const [isPosting, setIsPosting] = React.useState(false);
  const [isStarred, setIsStarred] = React.useState(false);

  // Simple user identifier for likes (Anonymous for now)
  const userIdentifier = React.useMemo(() => {
    let id = localStorage.getItem("user_id");
    if (!id) {
      id = Math.random().toString(36).substring(7);
      localStorage.setItem("user_id", id);
    }
    return id;
  }, []);

  const [likedComments, setLikedComments] = React.useState<number[]>(() => {
    const saved = localStorage.getItem(`liked_comments_${cfxId}`);
    return saved ? JSON.parse(saved) : [];
  });

  React.useEffect(() => {
    localStorage.setItem(`liked_comments_${cfxId}`, JSON.stringify(likedComments));
  }, [likedComments, cfxId]);

  const fetchDetails = async () => {
    try {
      const cleanId = cfxId.trim().toLowerCase();
      const res = await fetch(getApiUrl(`/api/servers/${cleanId}`));
      const json = await res.json();
      setData(json);
      console.log(`[Polling] Refreshed data for ${cfxId} at ${new Date().toLocaleTimeString()}`);

      if (userToken) {
        const starsRes = await fetch(getApiUrl("/api/user/stars"), {
          headers: { "Authorization": `Bearer ${userToken}` }
        });
        const stars = await starsRes.json();
        setIsStarred(Array.isArray(stars) && stars.includes(cfxId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStar = async () => {
    if (!userToken) {
      alert("Please login to star this server.");
      return;
    }

    if (isStarred) return; // Cannot unstar

    try {
      const res = await fetch(getApiUrl(`/api/servers/${cfxId}/star`), {
        method: "POST",
        headers: { "Authorization": `Bearer ${userToken}` }
      });
      if (res.ok) {
        setIsStarred(true);
        // update local count so UI reflects the new star immediately
        setData(prev => prev ? { ...prev, total_stars: (prev.total_stars || 0) + 1 } : prev);
      }
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    fetchDetails();

    // REAL-TIME: Listen for server table changes (Player counts, stars)
    const channel = supabase
      .channel(`server_realtime_${cfxId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'servers',
          filter: `cfx_id=eq.${cfxId.trim().toLowerCase()}`
        },
        (payload) => {
          console.log('[Realtime] Server update received:', payload.new);
          setData(prev => prev ? {
            ...prev,
            server: payload.new,
            // Keep fivemData but sync numeric counts if needed
            data: {
              ...prev.data,
              clients: payload.new.players_online,
              sv_maxclients: payload.new.max_players
            }
          } : prev);
        }
      )
      .subscribe();

    // second channel listens for new stars so counts stay accurate
    const starsChannel = supabase
      .channel(`server_stars_${cfxId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'server_stars',
          filter: `cfx_id=eq.${cfxId.trim().toLowerCase()}`
        },
        () => {
          setData(prev => prev ? { ...prev, total_stars: (prev.total_stars || 0) + 1 } : prev);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(starsChannel);
    };
  }, [cfxId, userToken]);

  const handlePostComment = async () => {
    if (!commentText.trim() || isPosting) return;
    if (!userToken) {
      alert("Please login to post a comment.");
      return;
    }

    const cleanId = cfxId.trim().toLowerCase();
    setIsPosting(true);
    try {
      const res = await fetch(getApiUrl(`/api/servers/${cleanId}/comments`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ content: commentText.trim() })
      });

      if (res.ok) {
        setCommentText("");
        fetchDetails();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to post comment");
      }
    } catch (err) {
      console.error(err);
      alert("Network error while posting comment");
    } finally {
      setIsPosting(false);
    }
  };

  const handleLikeComment = async (commentId: number) => {
    const isLiked = likedComments.includes(commentId);

    try {
      const res = await fetch(getApiUrl(`/api/comments/${commentId}/like`), {
        method: isLiked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIdentifier })
      });

      if (res.ok) {
        setLikedComments(prev =>
          isLiked ? prev.filter(id => id !== commentId) : [...prev, commentId]
        );
        fetchDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="min-h-screen bg-zinc-950" />;
  if (!data || data.error || !data.data || !data.server) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-4">
        <h2 className="text-2xl font-black mb-4">Server not found</h2>
        <p className="text-zinc-500 mb-8 max-w-md text-center">
          The server with ID <span className="text-indigo-400 font-mono">{cfxId}</span> could not be found or is currently offline.
        </p>
        <button
          onClick={onBack}
          className="bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-2xl font-bold hover:bg-zinc-800 transition-all"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const server = data.data; // FiveM Data
  const dbServer = data.server; // DB Record
  const banner = dbServer.custom_banner || server.vars?.banner_detail || server.vars?.banner_connecting || settings?.default_banner || "https://picsum.photos/seed/details/1920/1080";

  // Official Icon Logic
  const officialIcon = server.iconVersion
    ? `https://frontend.cfx-services.net/api/servers/icon/${cfxId}/${server.iconVersion}.png`
    : null;

  const icon = dbServer.custom_logo || officialIcon || server.icon || server.ownerAvatar || `https://picsum.photos/seed/${cfxId}/400/400`;
  const discordLink = dbServer.custom_discord || server.vars?.discord;

  const localeToRegion = (locale?: string) => {
    if (!locale) return "Global";
    try {
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
      const countryCode = locale.split('-')[1] || locale.split('_')[1];
      return countryCode ? regionNames.of(countryCode) : "Global";
    } catch {
      return "Global";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20 relative overflow-hidden">
      {/* Ambient Background Glow - Tints the page with server colors */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img
          src={banner}
          className="w-full h-full object-cover opacity-[0.15] blur-[150px] scale-125"
          referrerPolicy="no-referrer"
          alt=""
        />
        <div className="absolute inset-0 bg-zinc-950/20" />
      </div>

      <div className="relative z-10">
        {/* Header Banner */}
        <div className="relative h-[400px]">
          <img
            src={banner}
            className="w-full h-full"
            style={{
              objectFit: (dbServer.background_size as any) || 'cover',
              objectPosition: `center ${dbServer.banner_position || '50%'}`
            }}
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 via-zinc-950/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-zinc-950 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

          <button
            onClick={onBack}
            className="absolute top-24 left-4 md:left-10 bg-black/50 backdrop-blur-md p-3 rounded-full hover:bg-white hover:text-black transition-all z-10"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="absolute bottom-10 left-4 md:left-10 right-4 md:right-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-indigo-500 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <img
                  src={icon}
                  className="relative w-24 h-24 md:w-32 md:h-32 rounded-[2rem] border-4 border-zinc-950 shadow-2xl object-cover bg-zinc-900"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-5xl font-black">{truncate(dbServer.custom_name || cleanFiveMName(server.hostname), 20)}</h1>
                  {dbServer.show_stars === 1 && (
                    <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-bold">{(data?.total_stars ?? dbServer.stars) || 0}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {dbServer.show_owner_label === 1 && (
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-zinc-700">
                      Owner: {dbServer.owner_label || server.ownerName}
                    </span>
                  )}
                  {Array.from(new Set(server.vars.tags?.split(",") || [])).map((tag: any) => String(tag).trim()).filter(Boolean).map(tag => (
                    <span key={tag} className="text-xs bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStar}
                disabled={isStarred}
                className={cn(
                  "px-6 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all border",
                  isStarred
                    ? "bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20 cursor-default"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800"
                )}
              >
                <Star className={cn("w-5 h-5", isStarred && "fill-current")} />
                {isStarred ? "Starred" : "Star Server"}
              </button>
              <a
                href={`fivem://connect/${cfxId}`}
                className="bg-red-600 hover:bg-red-500 px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-600/20"
              >
                <Play className="w-5 h-5 fill-current" />
                Join Server
              </a>
              {discordLink && (
                <a
                  href={discordLink}
                  target="_blank"
                  className="bg-[#5865F2] hover:bg-[#4752C4] px-6 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#5865F2]/20"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z" /></svg>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Stats & Analytics */}
          <div className="lg:col-span-2 space-y-8">
            {/* Real-time Stats */}
            {dbServer.hide_players !== 1 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-6 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users className="w-12 h-12" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Joueurs</span>
                  </div>
                  <div className="flex items-baseline gap-1" key={server?.clients}>
                    <motion.p
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-black text-white"
                    >
                      {server?.clients ?? dbServer.players_online ?? 0}
                    </motion.p>
                    <p className="text-zinc-500 font-bold">/{server?.sv_maxclients ?? dbServer.max_players ?? 300}</p>
                  </div>
                </div>
                {[
                  { label: "Resources", value: server?.resources?.length || "...", icon: Terminal },
                  { label: "Game Type", value: server?.gametype || dbServer.gametype || "Roleplay", icon: Shield },
                  { label: "Region",
                    value: (
                      () => {
                        const name = localeToRegion(server?.vars?.locale) || "...";
                        const code = (server?.vars?.locale || "").split(/[-_]/)[1] || (server?.vars?.locale || "").toUpperCase();
                        const flag = regionCodeToFlag(code);
                        return flag ? `${flag} ${name}` : name;
                      }
                    )(),
                    icon: Globe },
                ].map((stat, i) => (
                  <div key={i} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                    <stat.icon className="w-5 h-5 text-zinc-500 mb-3" />
                    <p className="text-2xl font-black">{stat.value}</p>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Analytics Chart */}
            {dbServer.hide_chart !== 1 && (
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold">Activité du joueur (24h)</h2>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full" />
                    Live Tracking
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  {data.analytics && data.analytics.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[...data.analytics].reverse()}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorPlayers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis
                          dataKey="timestamp"
                          stroke="#52525b"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(str) => {
                            const date = new Date(str);
                            return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                          }}
                          minTickGap={30}
                        />
                        <YAxis
                          stroke="#52525b"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 'dataMax + 10']}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff' }}
                          labelFormatter={(label) => new Date(label).toLocaleString()}
                        />
                        <Area
                          type="monotone"
                          dataKey="players"
                          stroke="#6366f1"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorPlayers)"
                          animationDuration={1500}
                          isAnimationActive={data.analytics.length > 1}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
                      <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-indigo-500 animate-spin mb-4" />
                      <p className="text-sm font-medium">Collecting real-time data...</p>
                      <p className="text-xs opacity-50">The chart will update as data points are recorded.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resources List */}
            {dbServer.hide_resources !== 1 && (
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                <h2 className="text-xl font-bold mb-6">Server Resources ({server.resources.length})</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {server.resources.slice(0, 15).map(res => (
                    <div key={res} className="bg-zinc-800/50 border border-zinc-700/50 px-4 py-2 rounded-xl text-sm text-zinc-400 font-mono truncate">
                      {res}
                    </div>
                  ))}
                  {server.resources.length > 15 && (
                    <div className="bg-indigo-600/10 border border-indigo-500/20 px-4 py-2 rounded-xl text-sm text-indigo-400 font-bold flex items-center justify-center">
                      +{server.resources.length - 15} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gallery Section */}
            {((server.vars.gallery && server.vars.gallery.length > 0) || server.vars.banner_detail || server.vars.banner_connecting) && (
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                <h2 className="text-xl font-bold mb-6">Server Gallery</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Show banners if no gallery, or alongside gallery */}
                  {[
                    ...(server.vars.gallery || []),
                    server.vars.banner_detail,
                    server.vars.banner_connecting
                  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map((img, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-800"
                    >
                      <img
                        src={img as string}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        alt={`Gallery ${idx}`}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
              <div className="flex items-center gap-3 mb-8">
                <MessageSquare className="w-6 h-6 text-indigo-500" />
                <h2 className="text-xl font-bold">Community Comments</h2>
              </div>

              {/* Comment Input Area */}
              <div className="mb-10">
                {!userToken ? (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center">
                    <p className="text-zinc-500">You must be logged in to post a comment.</p>
                  </div>
                ) : (
                  <div className="relative group">
                    <textarea
                      placeholder="Share your thoughts about this server..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value.slice(0, 500))} // Increased to 500
                      maxLength={500}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500 transition-colors min-h-[120px] resize-none"
                    />
                    <div className="absolute bottom-4 left-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                      {commentText.length} / 500 characters
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <button
                        onClick={handlePostComment}
                        disabled={isPosting || !commentText.trim() || commentText.length > 500}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/20"
                      >
                        {isPosting ? "Posting..." : "Post Comment"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Comments List */}
              <div className="space-y-6">
                {data.comments.length > 0 ? (
                  data.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4 p-4 rounded-2xl bg-zinc-800/30 border border-zinc-800/50">
                      <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                        {comment.username[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded uppercase font-bold">
                              {truncate(comment.custom_name || comment.server_name || cfxId, 20)}
                            </span>
                            <span className="font-bold text-sm">{comment.username}</span>
                          </div>
                          <span className="text-zinc-500 text-[10px] uppercase font-bold">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                          {comment.content}
                        </p>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleLikeComment(comment.id)}
                            className={cn(
                              "flex items-center gap-1.5 text-xs font-bold transition-colors",
                              likedComments.includes(comment.id) ? "text-red-500" : "text-zinc-500 hover:text-white"
                            )}
                          >
                            <Heart className={cn("w-4 h-4", likedComments.includes(comment.id) && "fill-current")} />
                            {comment.likes} Likes
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <p className="text-zinc-600 text-sm">No comments yet. Be the first to share your thoughts!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Info & Actions */}
          <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
              <h2 className="text-xl font-bold mb-6">About Server</h2>
              <p className="text-zinc-400 leading-relaxed mb-8">
                {server.vars.sv_projectDesc || "No description provided by the server owner."}
              </p>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-zinc-800">
                  <span className="text-zinc-500 text-sm">IP Address</span>
                  <span className="font-mono text-white text-sm">
                    {server.connectEndPoints?.[0]?.split(':')[0] || "Hidden"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-zinc-800">
                  <span className="text-zinc-500 text-sm">Port</span>
                  <span className="font-mono text-white text-sm">
                    {server.connectEndPoints?.[0]?.split(':')[1] || "30120"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-zinc-800">
                  <span className="text-zinc-500 text-sm">CFX ID</span>
                  <span className="font-mono text-indigo-400">{cfxId}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-zinc-800">
                  <span className="text-zinc-500 text-sm">OneSync</span>
                  <span className="text-emerald-400 text-sm font-bold">Enabled</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-zinc-500 text-sm">Version</span>
                  <span className="text-zinc-300 text-sm">v1.0.42</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-600 to-orange-700 p-8 rounded-3xl shadow-xl shadow-red-600/20">
              <h3 className="text-2xl font-black mb-4">Ready to play?</h3>
              <p className="text-white/80 text-sm mb-6">
                Launch FiveM and connect instantly to start your journey.
              </p>
              <a
                href={`fivem://connect/${cfxId}`}
                className="w-full bg-white text-red-600 py-4 rounded-2xl font-black text-center block hover:scale-[1.02] transition-transform"
              >
                CONNECT NOW
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
