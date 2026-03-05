import React from "react";
import { Plus, Trash2, RefreshCw, LogOut, LayoutDashboard, Server as ServerIcon, Users, Edit2, Eye, EyeOff, X, Save, TrendingUp, Star, Ticket, Shield, MessageSquare, CheckCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Server, Stats } from "@/src/types";
import { truncate, cn } from "@/src/lib/utils";

interface User {
  id: number;
  username: string;
  discord_id: string;
  avatar: string;
  role: string;
  created_at: string;
}

interface TicketType {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

interface AdminProps {
  token: string;
  onLogin: (token: string, user: any) => void;
  onLogout: () => void;
  onViewServer: (cfxId: string) => void;
}

export default function Admin({ token, onLogin, onLogout, onViewServer }: AdminProps) {
  const [servers, setServers] = React.useState<Server[]>([]);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [newCfxId, setNewCfxId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"servers" | "users" | "tickets">("servers");

  // Users and Tickets state
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [allTickets, setAllTickets] = React.useState<TicketType[]>([]);

  // Editing state
  const [editingServer, setEditingServer] = React.useState<Server | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editLogo, setEditLogo] = React.useState("");
  const [editDiscord, setEditDiscord] = React.useState("");
  const [editHidden, setEditHidden] = React.useState(false);
  const [editHidePlayers, setEditHidePlayers] = React.useState(false);
  const [editHideResources, setEditHideResources] = React.useState(false);
  const [editHideChart, setEditHideChart] = React.useState(false);
  const [editStars, setEditStars] = React.useState(0);
  const [editShowStars, setEditShowStars] = React.useState(false);
  const [editShowOwnerLabel, setEditShowOwnerLabel] = React.useState(false);
  const [editOwnerLabel, setEditOwnerLabel] = React.useState("");
  const [editShowPercentageFull, setEditShowPercentageFull] = React.useState(true);
  const [editBanner, setEditBanner] = React.useState("");
  const [editBackgroundSize, setEditBackgroundSize] = React.useState("cover");
  const [editBannerPosition, setEditBannerPosition] = React.useState("50%");

  // Settings state
  const [globalSettings, setGlobalSettings] = React.useState<Record<string, string>>({});
  const [defaultBanner, setDefaultBanner] = React.useState("");

  const fetchAdminData = async () => {
    if (!token) return;
    try {
      const [sRes, stRes, setRes, uRes, tRes] = await Promise.all([
        fetch("/api/servers"),
        fetch("/api/stats"),
        fetch("/api/settings"),
        fetch("/api/admin/users", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("/api/admin/tickets", { headers: { "Authorization": `Bearer ${token}` } })
      ]);
      setServers(await sRes.json());
      setStats(await stRes.json());
      const settings = await setRes.json();
      setGlobalSettings(settings);
      setDefaultBanner(settings.default_banner || "");
      setAllUsers(await uRes.json());
      setAllTickets(await tRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    fetchAdminData();
  }, [token]);

  const addServer = async () => {
    if (!newCfxId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/servers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ cfx_id: newCfxId })
      });
      if (res.ok) {
        setNewCfxId("");
        fetchAdminData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteServer = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    await fetch(`/api/admin/servers/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    fetchAdminData();
  };

  const startEditing = (server: Server) => {
    setEditingServer(server);
    setEditName(server.custom_name || "");
    setEditLogo(server.custom_logo || "");
    setEditDiscord(server.custom_discord || "");
    setEditHidden(server.is_hidden === 1);
    setEditHidePlayers(server.hide_players === 1);
    setEditHideResources(server.hide_resources === 1);
    setEditHideChart(server.hide_chart === 1);
    setEditStars(server.stars || 0);
    setEditShowStars(server.show_stars === 1);
    setEditShowOwnerLabel(server.show_owner_label === 1);
    setEditOwnerLabel(server.owner_label || "");
    setEditShowPercentageFull(server.show_percentage_full !== 0);
    setEditBanner(server.custom_banner || "");
    setEditBackgroundSize(server.background_size || "cover");
    setEditBannerPosition(server.banner_position || "50%");
  };

  const saveGlobalSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ settings: { default_banner: defaultBanner } })
      });
      if (res.ok) {
        fetchAdminData();
      }
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editingServer) return;
    setLoading(true);
    try {
      const payload = {
        custom_name: editName || null,
        custom_logo: editLogo || null,
        custom_discord: editDiscord || null,
        // supabase columns are numeric flags (0/1) rather than booleans
        is_hidden: editHidden ? 1 : 0,
        hide_players: editHidePlayers ? 1 : 0,
        hide_resources: editHideResources ? 1 : 0,
        hide_chart: editHideChart ? 1 : 0,
        stars: editStars,
        show_stars: editShowStars ? 1 : 0,
        show_owner_label: editShowOwnerLabel ? 1 : 0,
        owner_label: editOwnerLabel || null,
        show_percentage_full: editShowPercentageFull ? 1 : 0,
        custom_banner: editBanner || null,
        background_size: editBackgroundSize,
        banner_position: editBannerPosition
      };

      const res = await fetch(`/api/admin/servers/${editingServer.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setEditingServer(null);
        fetchAdminData();
      } else {
        // show error so user knows why the save failed
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to save changes");
      }
    } catch (e) {
      console.error(e);
      alert("Unable to contact server");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
        <Shield className="w-16 h-16 text-zinc-800 mb-6" />
        <h1 className="text-2xl font-black text-white text-center mb-2">Access Denied</h1>
        <p className="text-zinc-500 text-center mb-8 text-sm max-w-xs">You must be logged in as an administrator to access this area.</p>
        <button
          onClick={() => window.location.href = '/'}
          className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-8 rounded-xl transition-all"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black mb-2">Admin Dashboard</h1>
            <p className="text-zinc-500">Manage your server listings and platform settings.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchAdminData} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl hover:bg-zinc-800 transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={onLogout} className="bg-red-600/10 text-red-500 border border-red-600/20 px-6 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all">
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800 w-fit">
          {[
            { id: "servers", label: "Servers", icon: ServerIcon },
            { id: "users", label: "Users", icon: Users },
            { id: "tickets", label: "Tickets", icon: Ticket },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "servers" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {[
                { label: "Total Servers", value: stats?.serverCount || 0, icon: ServerIcon },
                { label: "Total Players", value: stats?.totalPlayers || 0, icon: Users },
              ].map((stat, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                  <stat.icon className="w-6 h-6 text-indigo-500 mb-4" />
                  <p className="text-3xl font-black">{stat.value}</p>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Global Settings */}
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl mb-12">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-indigo-500" />
                Global Platform Settings
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Default Server Background URL</label>
                  <div className="flex flex-col md:flex-row gap-4">
                    <input
                      type="text"
                      placeholder="https://picsum.photos/seed/default/1920/1080"
                      value={defaultBanner}
                      onChange={(e) => setDefaultBanner(e.target.value)}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      onClick={saveGlobalSettings}
                      disabled={loading}
                      className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-bold px-10 py-4 rounded-2xl transition-all border border-zinc-700 flex items-center justify-center gap-2"
                    >
                      {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Save Global
                    </button>
                  </div>
                  <p className="text-zinc-500 text-[10px] mt-2 italic">
                    This image will be used if a server doesn't have a custom background and no background is provided by the FiveM API.
                  </p>
                </div>
              </div>
            </div>

            {/* Add Server */}
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl mb-12">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Add New Server
              </h2>
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Enter CFX ID (e.g. r7k5l7)"
                  value={newCfxId}
                  onChange={(e) => setNewCfxId(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  onClick={addServer}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-10 py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Add Server
                </button>
              </div>
              <p className="text-zinc-500 text-xs mt-4">
                The system will automatically extract all metadata, banners, and player counts from the FiveM API.
              </p>
            </div>

            {/* Server List */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold">Managed Servers</h2>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{servers.length} Total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
                      <th className="px-8 py-4">Server</th>
                      <th className="px-8 py-4">CFX ID</th>
                      <th className="px-8 py-4">Players</th>
                      <th className="px-8 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {servers.map((server) => (
                      <tr key={server.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <img
                              src={server.custom_logo || (server.data?.iconVersion ? `https://frontend.cfx-services.net/api/servers/icon/${server.cfx_id}/${server.data.iconVersion}.png` : server.data?.ownerAvatar) || "https://picsum.photos/seed/owner/100/100"}
                              className="w-10 h-10 rounded-xl object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="font-bold text-white line-clamp-1">{truncate(server.name, 20)}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-zinc-500 text-xs">Added {new Date(server.added_at).toLocaleDateString()}</p>
                                {server.custom_discord && (
                                  <span className="text-[10px] bg-indigo-600/10 text-indigo-400 px-1.5 py-0.5 rounded font-bold">Discord Set</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 font-mono text-indigo-400 text-sm">{server.cfx_id}</td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{server.data?.clients || 0}</span>
                            <span className="text-zinc-500">/ {server.data?.sv_maxclients || 0}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onViewServer(server.cfx_id)}
                              className="p-2 bg-zinc-800 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-all"
                              title="View Details"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => startEditing(server)}
                              className="p-2 bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition-all"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => deleteServer(server.id)}
                              className="p-2 bg-zinc-800 text-zinc-500 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "users" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden"
          >
            <div className="p-8 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold">User Management</h2>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{allUsers.length} Users</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
                    <th className="px-8 py-4">User</th>
                    <th className="px-8 py-4">Discord ID</th>
                    <th className="px-8 py-4">Role</th>
                    <th className="px-8 py-4">Joined</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {allUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <img src={u.avatar} className="w-10 h-10 rounded-full object-cover" />
                          <p className="font-bold text-white">{u.username}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-mono text-zinc-500 text-sm">{u.discord_id || "N/A"}</td>
                      <td className="px-8 py-6">
                        <select
                          value={u.role}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            await fetch(`/api/admin/users/${u.id}`, {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                              },
                              body: JSON.stringify({ role: newRole })
                            });
                            fetchAdminData();
                          }}
                          className={cn(
                            "text-[10px] px-2 py-1 rounded font-bold uppercase bg-zinc-800 border border-zinc-700 text-zinc-400 focus:outline-none focus:border-indigo-500",
                            u.role === 'admin' && "text-indigo-400"
                          )}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-8 py-6 text-zinc-500 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={async () => {
                            if (!confirm("Delete user?")) return;
                            await fetch(`/api/admin/users/${u.id}`, {
                              method: "DELETE",
                              headers: { "Authorization": `Bearer ${token}` }
                            });
                            fetchAdminData();
                          }}
                          className="p-2 bg-zinc-800 text-zinc-500 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === "tickets" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
              <h2 className="text-xl font-bold mb-2">Support Tickets</h2>
              <p className="text-zinc-500 text-sm">Review and manage user support requests.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {allTickets.map((t) => (
                <div key={t.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl hover:border-zinc-700 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img src={t.user_avatar} className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="font-bold text-white">{t.user_name}</p>
                        <p className="text-xs text-zinc-500">{new Date(t.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${t.status === 'open' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="font-bold text-indigo-400 mb-2">{t.subject}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">{t.message}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-6 border-t border-zinc-800">
                    {t.status === 'open' ? (
                      <button
                        onClick={async () => {
                          await fetch(`/api/admin/tickets/${t.id}`, {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({ status: "closed" })
                          });
                          fetchAdminData();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-all"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark as Resolved
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          await fetch(`/api/admin/tickets/${t.id}`, {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({ status: "open" })
                          });
                          fetchAdminData();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-all"
                      >
                        <Clock className="w-4 h-4" />
                        Reopen Ticket
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {allTickets.length === 0 && (
                <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-3xl text-center">
                  <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500 font-bold">No tickets found.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingServer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingServer(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black">Edit Server</h2>
                <button onClick={() => setEditingServer(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Custom Name (Override API)</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter custom name..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Custom Logo URL</label>
                  <input
                    type="text"
                    value={editLogo}
                    onChange={(e) => setEditLogo(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Custom Background URL</label>
                  <input
                    type="text"
                    value={editBanner}
                    onChange={(e) => setEditBanner(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Background Size (Object Fit)</label>
                  <select
                    value={editBackgroundSize}
                    onChange={(e) => setEditBackgroundSize(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="cover">Cover (Zoomed/Fill)</option>
                    <option value="contain">Contain (Show All)</option>
                    <option value="fill">Fill (Stretch)</option>
                    <option value="none">Original</option>
                    <option value="scale-down">Scale Down</option>
                  </select>
                  <p className="text-[10px] text-zinc-500 mt-1">Use 'Contain' if the background looks too zoomed in.</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Banner Vertical Position</label>
                    <span className="text-xs font-mono text-indigo-400">{editBannerPosition}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={parseInt(editBannerPosition)}
                    onChange={(e) => setEditBannerPosition(`${e.target.value}%`)}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-zinc-600 font-bold uppercase">Top</span>
                    <span className="text-[10px] text-zinc-600 font-bold uppercase">Center</span>
                    <span className="text-[10px] text-zinc-600 font-bold uppercase">Bottom</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-2">Adjust the vertical alignment of the background image.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Custom Discord URL</label>
                  <input
                    type="text"
                    value={editDiscord}
                    onChange={(e) => setEditDiscord(e.target.value)}
                    placeholder="https://discord.gg/..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Visibility Settings</label>

                  <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-3">
                      {editHidden ? <EyeOff className="w-5 h-5 text-red-500" /> : <Eye className="w-5 h-5 text-emerald-500" />}
                      <div>
                        <p className="font-bold text-sm">Public Visibility</p>
                        <p className="text-xs text-zinc-500">{editHidden ? "Hidden from list" : "Visible to everyone"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditHidden(!editHidden)}
                      className={`w-12 h-6 rounded-full transition-all relative ${editHidden ? 'bg-red-600' : 'bg-emerald-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editHidden ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Users className={`w-5 h-5 ${editHidePlayers ? 'text-red-500' : 'text-indigo-500'}`} />
                      <div>
                        <p className="font-bold text-sm">Player Count</p>
                        <p className="text-xs text-zinc-500">{editHidePlayers ? "Hidden on page" : "Visible on page"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditHidePlayers(!editHidePlayers)}
                      className={`w-12 h-6 rounded-full transition-all relative ${editHidePlayers ? 'bg-red-600' : 'bg-emerald-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editHidePlayers ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <RefreshCw className={`w-5 h-5 ${editHideResources ? 'text-red-500' : 'text-indigo-500'}`} />
                      <div>
                        <p className="font-bold text-sm">Resources List</p>
                        <p className="text-xs text-zinc-500">{editHideResources ? "Hidden on page" : "Visible on page"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditHideResources(!editHideResources)}
                      className={`w-12 h-6 rounded-full transition-all relative ${editHideResources ? 'bg-red-600' : 'bg-emerald-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editHideResources ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <LayoutDashboard className={`w-5 h-5 ${editHideChart ? 'text-red-500' : 'text-indigo-500'}`} />
                      <div>
                        <p className="font-bold text-sm">Analytics Chart</p>
                        <p className="text-xs text-zinc-500">{editHideChart ? "Hidden on page" : "Visible on page"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditHideChart(!editHideChart)}
                      className={`w-12 h-6 rounded-full transition-all relative ${editHideChart ? 'bg-red-600' : 'bg-emerald-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editHideChart ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <TrendingUp className={`w-5 h-5 ${!editShowPercentageFull ? 'text-red-500' : 'text-indigo-500'}`} />
                      <div>
                        <p className="font-bold text-sm">Percentage Full Label</p>
                        <p className="text-xs text-zinc-500">{!editShowPercentageFull ? "Hidden (e.g. 42% Full)" : "Visible"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditShowPercentageFull(!editShowPercentageFull)}
                      className={`w-12 h-6 rounded-full transition-all relative ${!editShowPercentageFull ? 'bg-red-600' : 'bg-emerald-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${!editShowPercentageFull ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Star className={`w-5 h-5 ${!editShowStars ? 'text-zinc-500' : 'text-amber-500'}`} />
                      <div>
                        <p className="font-bold text-sm">Star Rating Visibility</p>
                        <p className="text-xs text-zinc-500">{!editShowStars ? "Hidden" : "Visible"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditShowStars(!editShowStars)}
                      className={`w-12 h-6 rounded-full transition-all relative ${!editShowStars ? 'bg-zinc-700' : 'bg-amber-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${!editShowStars ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {editShowStars && (
                      <motion.div
                        key="stars-section"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800 space-y-4 overflow-hidden"
                      >
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Number of Stars (0-5)</label>
                          <input
                            type="number"
                            min="0"
                            max="5"
                            value={editStars}
                            onChange={(e) => setEditStars(parseInt(e.target.value) || 0)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Users className={`w-5 h-5 ${!editShowOwnerLabel ? 'text-zinc-500' : 'text-indigo-500'}`} />
                      <div>
                        <p className="font-bold text-sm">Owner Label Visibility</p>
                        <p className="text-xs text-zinc-500">{!editShowOwnerLabel ? "Hidden (e.g. AtlanticWillson)" : "Visible"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditShowOwnerLabel(!editShowOwnerLabel)}
                      className={`w-12 h-6 rounded-full transition-all relative ${!editShowOwnerLabel ? 'bg-zinc-700' : 'bg-indigo-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${!editShowOwnerLabel ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {editShowOwnerLabel && (
                      <motion.div
                        key="owner-label-section"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800 space-y-4 overflow-hidden"
                      >
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Custom Owner Label (Override)</label>
                          <input
                            type="text"
                            value={editOwnerLabel}
                            onChange={(e) => setEditOwnerLabel(e.target.value)}
                            placeholder="e.g. AtlanticWillson"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                          <p className="text-[10px] text-zinc-500 mt-1">If empty, the default owner name from FiveM API will be used.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={saveEdit}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

