import React from "react";
import { motion } from "motion/react";
import { Server } from "@/src/types";
import { cleanFiveMName, truncate } from "@/src/lib/utils";

interface HeroProps {
  featuredServers: Server[];
  onServerClick: (cfxId: string) => void;
  settings?: Record<string, string>;
}

export default function Hero({ featuredServers, onServerClick, settings }: HeroProps) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (featuredServers.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % featuredServers.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredServers]);

  if (featuredServers.length === 0) return null;

  const current = featuredServers[index];

  // Smart Banner Fetching
  const officialBanner = current.data?.vars?.banner_detail || current.data?.vars?.banner_connecting;
  const banner = current.custom_banner || officialBanner || settings?.default_banner || "https://picsum.photos/seed/hero/1920/1080";

  // Official Icon Fetching
  const officialIcon = current.data?.iconVersion
    ? `https://frontend.cfx-services.net/api/servers/icon/${current.cfx_id}/${current.data.iconVersion}.png`
    : null;

  const icon = current.custom_logo || officialIcon || current.data?.icon || current.data?.ownerAvatar || `https://picsum.photos/seed/${current.cfx_id}/400/400`;

  return (
    <div className="relative h-[600px] w-full overflow-hidden">
      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className="absolute inset-0"
      >
        <img
          src={banner}
          className="w-full h-full object-cover"
          style={{ objectPosition: `center ${current.banner_position || '50%'}` }}
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/20 via-zinc-950/60 to-zinc-950" />
      </motion.div>

      <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-center">
        <motion.div
          key={`text-${index}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-2xl"
        >
          <span className="inline-block bg-indigo-600/20 text-indigo-400 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-500/30 mb-6">
            Featured Server
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
            {truncate(current.custom_name || cleanFiveMName(current.data?.hostname || current.name), 20)}
          </h1>
          <p className="text-zinc-400 text-lg mb-8 line-clamp-2">
            {current.data?.vars.sv_projectDesc || "Experience the ultimate roleplay adventure on our premium FiveM server. Join thousands of players today."}
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onServerClick(current.cfx_id)}
              className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-red-600/20"
            >
              Play Now
            </button>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={icon}
                  className="w-12 h-12 rounded-xl border border-white/20 object-cover bg-zinc-900"
                  referrerPolicy="no-referrer"
                />
                <div className="flex flex-col">
                  <span className="text-white font-bold text-sm">{current.owner_label || current.data?.ownerName}</span>
                  <span className="text-white/40 text-[10px] uppercase font-bold tracking-tighter">Server Identity</span>
                </div>
              </div>
              {current.hide_players === 0 && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 text-white/60 font-medium text-sm">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    {current.data?.clients} Players Online
                  </div>
                  <span className="text-white/40 text-[10px] uppercase font-bold tracking-tighter">Live Status</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
        {featuredServers.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-1 rounded-full transition-all ${i === index ? "w-8 bg-indigo-500" : "w-2 bg-zinc-700"
              }`}
          />
        ))}
      </div>
    </div>
  );
}
