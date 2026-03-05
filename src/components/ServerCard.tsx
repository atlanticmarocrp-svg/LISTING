import React from "react";
import { Users, ExternalLink, Star, MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import { Server } from "@/src/types";
import { cleanFiveMName, cn, truncate, regionCodeToFlag, regionFlagUrl, regionCodeFromString } from "@/src/lib/utils";

interface ServerCardProps {
  server: Server;
  onClick: (cfxId: string) => void;
  key?: React.Key;
}

export default function ServerCard({ server, onClick }: ServerCardProps) {
  const data = server.data;
  const clients = data?.clients ?? server.players_online ?? 0;
  const maxClients = data?.sv_maxclients ?? server.max_players ?? 300;
  const playerPercent = (clients / maxClients) * 100;

  // derive normalized country code for flag lookup
  const code = regionCodeFromString(server.region, data?.vars?.locale);

  // Use official FiveM CDN for icon if iconVersion is available, otherwise fallback
  const officialIcon = data?.iconVersion
    ? `https://frontend.cfx-services.net/api/servers/icon/${server.cfx_id}/${data.iconVersion}.png`
    : null;

  const icon = server.custom_logo || officialIcon || data?.icon || data?.ownerAvatar || `https://picsum.photos/seed/${server.cfx_id}/400/400`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group relative bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col"
      onClick={() => onClick(server.cfx_id)}
    >
      {/* Logo Area (Square) */}
      <div className="relative aspect-square overflow-hidden bg-zinc-950">
        <img
          src={icon}
          alt={server.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />

        {server.show_stars === 1 && (
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold text-white">{server.total_stars || 0}</span>
            </div>
            {server.comment_count !== undefined && server.comment_count > 0 && (
              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20" />
                <span className="text-xs font-bold text-white">{server.comment_count}</span>
              </div>
            )}
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex flex-wrap gap-1.5 mb-1">
            {data?.vars?.tags?.split(",").slice(0, 2).map((tag: string) => (
              <span key={tag} className="text-[9px] bg-indigo-600/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                {tag.trim()}
              </span>
            ))}
          </div>
          {server.region && (
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
              <span className="text-lg">{regionCodeToFlag(code)}</span>
              <span>{code || server.region || ""}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-black text-white line-clamp-1 mb-1 group-hover:text-indigo-400 transition-colors">
            {truncate(server.custom_name || (data ? cleanFiveMName(data.hostname) : server.name), 20)}
          </h3>

          {server.show_owner_label === 1 && (
            <p className="text-xs text-zinc-500 font-medium mb-4">
              by {server.owner_label || data?.ownerName || "Owner"}
            </p>
          )}
        </div>

        {server.hide_players === 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <div className="flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                <span>{clients} / {maxClients}</span>
              </div>
              {server.show_percentage_full !== 0 && (
                <span>{Math.round(playerPercent)}%</span>
              )}
            </div>

            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${playerPercent}%` }}
                className={cn(
                  "h-full rounded-full transition-all",
                  playerPercent > 90 ? "bg-red-500" : playerPercent > 50 ? "bg-indigo-500" : "bg-emerald-500"
                )}
              />
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        <button className="w-full bg-zinc-800/50 hover:bg-red-600 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-zinc-800 hover:border-red-500">
          Details
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
