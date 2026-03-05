import React from "react";
import { cn } from "@/src/lib/utils";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export default function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent" />
          <span className="text-white font-black text-lg tracking-tighter">5M</span>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-indigo-500 rounded-tl-lg" />
        </div>
      </div>
      {!iconOnly && (
        <div className="flex flex-col -space-y-1">
          <span className="text-xl font-black tracking-tighter text-white">
            FIVEM<span className="text-indigo-500">ELITE</span>
          </span>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
            Premium Listing
          </span>
        </div>
      )}
    </div>
  );
}
