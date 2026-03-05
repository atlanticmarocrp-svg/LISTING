import React from "react";
import { motion } from "motion/react";
import { ArrowLeft, Plus, Trash2, TrendingUp, Users, Zap } from "lucide-react";
import { Server } from "@/src/types";
import { truncate, cn } from "@/src/lib/utils";

interface ServerComparisonProps {
  onBack: () => void;
}

export default function ServerComparison({ onBack }: ServerComparisonProps) {
  const [selectedServers, setSelectedServers] = React.useState<Server[]>([]);
  const [availableServers, setAvailableServers] = React.useState<Server[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await fetch("/api/servers");
        const servers = await res.json();
        setAvailableServers(servers);
      } catch (err) {
        console.error("Failed to fetch servers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchServers();
  }, []);

  const handleAddServer = (server: Server) => {
    if (selectedServers.length < 3 && !selectedServers.find(s => s.cfx_id === server.cfx_id)) {
      setSelectedServers([...selectedServers, server]);
    }
  };

  const handleRemoveServer = (cfxId: string) => {
    setSelectedServers(selectedServers.filter(s => s.cfx_id !== cfxId));
  };

  const getColumnColor = (index: number) => {
    const colors = ["indigo", "emerald", "purple"];
    return colors[index] || "zinc";
  };

  const ComparisonRow = ({ label, data }: { label: string; data: (string | number | undefined)[] }) => (
    <div className="grid grid-cols-4 gap-3 border-b border-zinc-800 py-4">
      <div className="font-bold text-white text-sm">{label}</div>
      {data.map((value, i) => (
        <div key={i} className="text-center">
          <p className="text-sm font-mono text-zinc-300">{value || "N/A"}</p>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <h1 className="text-4xl font-black mb-2">Server Comparison</h1>
        <p className="text-zinc-500">Compare up to 3 servers side by side</p>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
          {/* Add Server Section */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Add Servers
              </h2>
              <p className="text-xs text-zinc-500 mb-4">Selected: {selectedServers.length}/3</p>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {availableServers
                  .filter(s => !selectedServers.find(ss => ss.cfx_id === s.cfx_id))
                  .slice(0, 20)
                  .map((server) => (
                    <button
                      key={server.id}
                      onClick={() => handleAddServer(server)}
                      disabled={selectedServers.length >= 3}
                      className={cn(
                        "w-full text-left p-3 rounded-lg text-xs font-bold transition-all",
                        selectedServers.length >= 3
                          ? "bg-zinc-800/30 text-zinc-600 cursor-not-allowed"
                          : "bg-zinc-800 text-zinc-300 hover:bg-indigo-600/20 hover:text-indigo-400"
                      )}
                    >
                      <div className="truncate">{truncate(server.custom_name || server.name, 20)}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">{server.cfx_id}</div>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="lg:col-span-3">
            {selectedServers.length === 0 ? (
              <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl p-12 text-center">
                <TrendingUp className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">Add servers to start comparing</p>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                {/* Server Cards */}
                <div className="grid grid-cols-4 gap-3 p-6 border-b border-zinc-800">
                  <div />
                  {selectedServers.map((server, i) => (
                    <motion.div
                      key={server.cfx_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="relative"
                    >
                      <div
                        className={`bg-${getColumnColor(i)}-600/10 border border-${getColumnColor(i)}-500/30 rounded-xl p-4`}
                      >
                        <button
                          onClick={() => handleRemoveServer(server.cfx_id)}
                          className="absolute top-2 right-2 p-1 hover:bg-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500 hover:text-white" />
                        </button>
                        <img
                          src={
                            server.custom_logo ||
                            (server.data?.iconVersion
                              ? `https://frontend.cfx-services.net/api/servers/icon/${server.cfx_id}/${server.data.iconVersion}.png`
                              : `https://picsum.photos/seed/${server.cfx_id}/100/100`)
                          }
                          className="w-full h-16 rounded-lg object-cover mb-2"
                          referrerPolicy="no-referrer"
                        />
                        <p className="text-xs font-bold text-white truncate">
                          {truncate(server.custom_name || server.name, 15)}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono">{server.cfx_id}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Comparison Data */}
                <div className="p-6 space-y-4">
                  <ComparisonRow
                    label="Players Online"
                    data={selectedServers.map((s) => s.data?.clients || s.players_online || 0)}
                  />
                  <ComparisonRow
                    label="Max Players"
                    data={selectedServers.map((s) => s.data?.sv_maxclients || s.max_players || 0)}
                  />
                  <ComparisonRow
                    label="Occupancy %"
                    data={selectedServers.map((s) => {
                      const clients = s.data?.clients || s.players_online || 0;
                      const max = s.data?.sv_maxclients || s.max_players || 1;
                      return Math.round((clients / max) * 100) + "%";
                    })}
                  />
                  <ComparisonRow
                    label="Uptime"
                    data={selectedServers.map((s) => (s.uptime_percentage || 100) + "%")}
                  />
                  <ComparisonRow
                    label="Stars"
                    data={selectedServers.map((s) => s.total_stars || 0)}
                  />
                  <ComparisonRow
                    label="Resources"
                    data={selectedServers.map((s) => s.data?.resources.length || 0)}
                  />
                  <ComparisonRow
                    label="Region"
                    data={selectedServers.map((s) => s.region || "Unknown")}
                  />
                  <ComparisonRow
                    label="Gameplay Types"
                    data={selectedServers.map((s) => (s.gameplay_type?.join(", ") || "N/A").substring(0, 20))}
                  />
                  <ComparisonRow
                    label="Added Date"
                    data={selectedServers.map((s) => new Date(s.added_at).toLocaleDateString())}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
