import React from "react";
import { LayoutDashboard, ShieldCheck, LogOut, User as UserIcon, Bell, X } from "lucide-react";
import { cn } from "@/src/lib/utils";
import Logo from "@/src/components/Logo";
import LoginModal from "@/src/components/LoginModal";

interface NavbarProps {
  onPageChange: (page: "home" | "admin" | "stats" | "support" | "profile") => void;
  currentPage: string;
  user?: any;
  onLogout: () => void;
  onLogin: (token: string, user: any) => void;
  onOpenLogin: () => void;
}

export default function Navbar({ onPageChange, currentPage, user, onLogout, onLogin, onOpenLogin }: NavbarProps) {
  const [status, setStatus] = React.useState<string>("checking");

  React.useEffect(() => {
    fetch("https://status.cfx.re/api/v2/status.json")
      .then(res => res.json())
      .then(data => setStatus(data.status.indicator))
      .catch(() => setStatus("unknown"));
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div
            className="cursor-pointer"
            onClick={() => onPageChange("home")}
          >
            <Logo />
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-full border border-zinc-800">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              status === "none" ? "bg-emerald-500" : status === "minor" ? "bg-amber-500" : "bg-red-500"
            )} />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Cfx.re Status
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => onPageChange("home")}
            className={cn(
              "transition-colors hover:text-white",
              currentPage === "home" ? "text-white" : "text-zinc-400"
            )}
          >
            Servers
          </button>

          <button
            onClick={() => onPageChange("stats")}
            className={cn(
              "transition-colors hover:text-white",
              currentPage === "stats" ? "text-white" : "text-zinc-400"
            )}
          >
            Statistique
          </button>

          <button
            onClick={() => onPageChange("support")}
            className={cn(
              "transition-colors hover:text-white",
              currentPage === "support" ? "text-white" : "text-zinc-400"
            )}
          >
            Support
          </button>

          {user?.role === "admin" && (
            <button
              onClick={() => onPageChange("admin")}
              className={cn(
                "flex items-center gap-2 transition-colors hover:text-white",
                currentPage === "admin" ? "text-white" : "text-zinc-400"
              )}
            >
              <LayoutDashboard className="w-4 h-4 text-indigo-500" />
              Admin
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-4 border-l border-zinc-800 pl-6 ml-2">
              <button
                onClick={() => onPageChange("profile")}
                className={cn(
                  "flex items-center gap-3 transition-all p-1 whitespace-nowrap",
                  currentPage === "profile" ? "text-indigo-400" : "text-zinc-400 hover:text-white"
                )}
              >
                <div className="relative">
                  <img src={user.avatar || "/default-avatar.png"} className="w-8 h-8 rounded-full border border-zinc-700 object-cover" />
                  {user.role === 'admin' && (
                    <div className="absolute -top-1 -right-1 bg-indigo-600 rounded-full p-0.5 border border-zinc-950">
                      <ShieldCheck className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
                <span className="hidden sm:inline font-bold text-xs">{user.username}</span>
              </button>
              <button
                onClick={onLogout}
                className="text-zinc-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-zinc-900"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="bg-indigo-600/10 text-indigo-400 px-5 py-2.5 rounded-xl border border-indigo-600/20 hover:bg-indigo-600 hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
