import React from "react";
import { User, Star, MessageSquare, Award, Bell, Trash2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Server, Comment } from "@/src/types";
import ServerCard from "@/src/components/ServerCard";
import { truncate, cn, getApiUrl } from "@/src/lib/utils";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}

interface ProfileProps {
  token: string | null;
  onServerClick: (cfxId: string) => void;
}

export default function Profile({ token, onServerClick }: ProfileProps) {
  const [profileData, setProfileData] = React.useState<{ user: any; starredServers: Server[] } | null>(null);
  const [userComments, setUserComments] = React.useState<Comment[]>([]);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"favorites" | "comments" | "notifications">("favorites");

  const fetchData = async () => {
    if (!token) return;
    try {
      const [profileRes, commentsRes, notificationsRes] = await Promise.all([
        fetch(getApiUrl("/api/user/profile"), { headers: { "Authorization": `Bearer ${token}` } }),
        fetch(getApiUrl("/api/user/comments"), { headers: { "Authorization": `Bearer ${token}` } }),
        fetch(getApiUrl("/api/user/notifications"), { headers: { "Authorization": `Bearer ${token}` } })
      ]);

      const profile = await profileRes.json();
      const comments = await commentsRes.json();
      const notifs = await notificationsRes.json();

      setProfileData(profile);
      setUserComments(Array.isArray(comments) ? comments : []);
      setNotifications(Array.isArray(notifs) ? notifs : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [token]);

  const markNotificationsRead = async () => {
    if (!token) return;
    try {
      await fetch(getApiUrl("/api/user/notifications/read"), {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!profileData) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Please login to view your profile.</div>;

  const { user, starredServers } = profileData;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      {/* Profile Header */}
      <div className="relative h-64 w-full bg-gradient-to-b from-indigo-600/20 to-zinc-950">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-end pb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-indigo-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <img 
                src={user.avatar || `https://picsum.photos/seed/${user.id}/200`} 
                className="relative w-32 h-32 rounded-full border-4 border-zinc-950 object-cover bg-zinc-900"
                alt={user.username}
              />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-black mb-2">{user.username}</h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 px-4 py-1.5 rounded-full">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold">{user.reputation} Reputation</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 px-4 py-1.5 rounded-full">
                  <Star className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-bold">{starredServers.length} Favorites</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 px-4 py-1.5 rounded-full">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold">{userComments.length} Comments</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        {/* Tabs */}
        <div className="flex gap-4 border-b border-zinc-800 mb-8 overflow-x-auto pb-px">
          {[
            { id: "favorites", label: "Favorite Servers", icon: Star },
            { id: "comments", label: "My Comments", icon: MessageSquare },
            { id: "notifications", label: "Notifications", icon: Bell, count: unreadCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === "notifications" && unreadCount > 0) markNotificationsRead();
              }}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all relative whitespace-nowrap",
                activeTab === tab.id ? "text-indigo-500" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" 
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "favorites" && (
              <div>
                {starredServers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {starredServers.map((server) => (
                      <ServerCard key={server.id} server={server} onClick={onServerClick} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-zinc-800 border-dashed">
                    <Star className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500">You haven't starred any servers yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "comments" && (
              <div className="space-y-4">
                {userComments.length > 0 ? (
                  userComments.map((comment) => (
                    <div key={comment.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded uppercase font-bold">
                            {truncate(comment.custom_name || comment.server_name || comment.cfx_id, 30)}
                          </span>
                          <span className="text-zinc-500 text-[10px] uppercase font-bold">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-zinc-300 italic">"{comment.content}"</p>
                      </div>
                      <button 
                        onClick={() => onServerClick(comment.cfx_id)}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors text-zinc-400 hover:text-white"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-zinc-800 border-dashed">
                    <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500">You haven't posted any comments yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-4">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={cn(
                        "p-6 rounded-2xl border transition-all",
                        notif.is_read ? "bg-zinc-900/30 border-zinc-800 opacity-60" : "bg-indigo-600/5 border-indigo-500/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {!notif.is_read && <div className="w-2 h-2 bg-indigo-500 rounded-full" />}
                            <h3 className="font-bold text-white">{notif.title}</h3>
                          </div>
                          <p className="text-zinc-400 text-sm">{notif.message}</p>
                          <p className="text-zinc-600 text-[10px] uppercase font-bold mt-2">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          notif.type === 'ticket' ? "bg-emerald-500/10 text-emerald-500" : "bg-indigo-500/10 text-indigo-500"
                        )}>
                          {notif.type === 'ticket' ? <MessageSquare className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-zinc-800 border-dashed">
                    <Bell className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500">No notifications yet.</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
