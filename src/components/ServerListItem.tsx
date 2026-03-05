import React from "react";
import { Users, Star } from "lucide-react";
import { Server } from "@/src/types";
import { cleanFiveMName, truncate, regionCodeToFlag, regionFlagUrl, regionCodeFromString } from "@/src/lib/utils";

interface ServerListItemProps {
  server: Server;
  onClick: (cfxId: string) => void;
}

export default function ServerListItem({ server, onClick }: ServerListItemProps) {
  const data = server.data;
  const clients = data?.clients ?? server.players_online ?? 0;
  const maxClients = data?.sv_maxclients ?? server.max_players ?? 0;

  // match ServerCard logo logic
  const officialIcon = data?.iconVersion
    ? `https://frontend.cfx-services.net/api/servers/icon/${server.cfx_id}/${data.iconVersion}.png`
    : null;
  const logo =
    server.custom_logo ||
    officialIcon ||
    data?.icon ||
    data?.ownerAvatar ||
    `https://picsum.photos/seed/${server.cfx_id}/100/100`;

  const code = regionCodeFromString(server.region, server.data?.vars?.locale);
  const flagEmoji = regionCodeToFlag(code);
  // only emoji now, no image

  return (
    <div
      className="flex items-center gap-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl cursor-pointer hover:border-indigo-500/50 transition-all"
      onClick={() => onClick(server.cfx_id)}
    >
      <img
        src={logo}
        alt={server.name}
        className="w-12 h-12 rounded-xl object-cover"
        referrerPolicy="no-referrer"
      />
      <div className="flex-grow min-w-0">
        <p className="font-bold text-white truncate">
          {truncate(server.custom_name || (data ? cleanFiveMName(data.hostname) : server.name), 25)}
        </p>
        <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{server.total_stars || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{clients}/{maxClients}</span>
          </div>
        </div>
      </div>
      <div className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1">
        {flagEmoji && <span className="text-lg">{flagEmoji}</span>}
        <span>{server.region || ""}</span>
      </div>
    </div>
  );
}
