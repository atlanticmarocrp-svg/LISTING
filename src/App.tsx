import React from "react";
import { AnimatePresence, motion } from "motion/react";
import Navbar from "@/src/components/Navbar";
import CommentMarquee from "@/src/components/CommentMarquee";
import Home from "@/src/pages/Home";
import ServerDetails from "@/src/pages/ServerDetails";
import Admin from "@/src/pages/Admin";
import GlobalStats from "@/src/pages/GlobalStats";
import Support from "@/src/pages/Support";
import Profile from "@/src/pages/Profile";
import Logo from "@/src/components/Logo";
import LoginModal from "@/src/components/LoginModal";
import { Bell, X } from "lucide-react";
import { cn, getApiUrl } from "@/src/lib/utils";

interface Toast {
  id: number;
  title: string;
  message: string;
  type: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = React.useState<"home" | "admin" | "details" | "stats" | "support" | "profile">("home");
  const [selectedCfxId, setSelectedCfxId] = React.useState<string | null>(null);
  const [token, setToken] = React.useState<string | null>(localStorage.getItem("auth_token"));
  const [user, setUser] = React.useState<any>(null);
  const [settings, setSettings] = React.useState<Record<string, string>>({});
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = React.useState(false);

  // WebSocket for notifications
  React.useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}?token=${token}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "notification") {
        const id = Date.now();
        setToasts(prev => [...prev, { id, title: data.title, message: data.message, type: data.notificationType }]);
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
      }
    };

    return () => ws.close();
  }, [token]);

  React.useEffect(() => {
    fetch(getApiUrl("/api/settings"))
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error("Failed to fetch settings:", err));

    if (token) {
      fetch(getApiUrl("/api/user/profile"), {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
          }
        })
        .catch(err => {
          console.error("Failed to fetch profile:", err);
          handleLogout();
        });
    }
  }, [token]);

  const handleServerClick = (cfxId: string) => {
    setSelectedCfxId(cfxId.trim().toLowerCase());
    setCurrentPage("details");
    window.scrollTo(0, 0);
  };

  const handleLogin = (newToken: string, userData: any) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem("auth_token", newToken);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("user_token");
    setCurrentPage("home");
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar
        currentPage={currentPage}
        onPageChange={(page) => setCurrentPage(page)}
        user={user}
        onLogout={handleLogout}
        onLogin={handleLogin}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      <CommentMarquee />

      <main className="pt-32">
        <AnimatePresence>
          {currentPage === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Home onServerClick={handleServerClick} settings={settings} />
            </motion.div>
          )}

          {currentPage === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {selectedCfxId && (
                <ServerDetails
                  cfxId={selectedCfxId}
                  onBack={() => setCurrentPage("home")}
                  settings={settings}
                  userToken={token}
                  onUserLogin={handleLogin}
                />
              )}
            </motion.div>
          )}

          {currentPage === "admin" && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Admin
                token={token}
                onLogin={(newToken, userData) => handleLogin(newToken, userData)}
                onLogout={handleLogout}
                onViewServer={handleServerClick}
              />
            </motion.div>
          )}

          {currentPage === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <GlobalStats />
            </motion.div>
          )}

          {currentPage === "support" && (
            <motion.div
              key="support"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Support userToken={token} onUserLogin={handleLogin} />
            </motion.div>
          )}

          {currentPage === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <Profile token={token} onServerClick={handleServerClick} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Toast Notifications */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="pointer-events-auto bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-2xl flex items-start gap-4 min-w-[300px] max-w-md"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                toast.type === 'ticket' ? "bg-emerald-500/10 text-emerald-500" : "bg-indigo-500/10 text-indigo-500"
              )}>
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-sm">{toast.title}</h4>
                <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-zinc-600 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>


      <footer className="bg-zinc-950 border-t border-zinc-900 py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <Logo iconOnly className="scale-75 origin-left" />
          <p className="text-zinc-600 text-sm">
            &copy; {new Date().getFullYear()} FiveM Elite. All rights reserved. Not affiliated with Cfx.re or Rockstar Games.
          </p>
          <div className="flex gap-6 text-zinc-500 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
          </div>
        </div>
      </footer>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}
