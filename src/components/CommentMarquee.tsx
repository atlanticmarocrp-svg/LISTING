import React from "react";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { Comment } from "@/src/types";
import { truncate } from "@/src/lib/utils";

export default function CommentMarquee() {
  const [comments, setComments] = React.useState<Comment[]>([]);

  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    const fetchTopComments = async () => {
      try {
        const res = await fetch("/api/comments/top");
        const data = await res.json();
        if (Array.isArray(data)) {
          setComments(data);
        } else {
          setComments([]);
        }
      } catch (err) {
        console.error("Failed to fetch top comments:", err);
        setComments([]);
      }
    };

    fetchTopComments();
    const interval = setInterval(fetchTopComments, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (comments.length === 0) return null;

  // Duplicate comments to ensure smooth infinite scroll
  const displayComments = [...comments, ...comments, ...comments];

  return (
    <div 
      className="fixed top-20 left-0 right-0 h-10 bg-zinc-900/50 backdrop-blur-md border-b border-zinc-800/50 overflow-hidden whitespace-nowrap z-40 flex items-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="bg-zinc-950 px-4 h-full border-r border-zinc-800 relative z-50 flex items-center gap-2 shrink-0">
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-[10px] font-black text-white uppercase tracking-tighter">Top 100</span>
      </div>
      <div className="flex flex-1 overflow-hidden relative">
        {/* Edge Fades */}
        <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-zinc-950/50 to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-zinc-950/50 to-transparent z-10" />
        
        <motion.div
          animate={isPaused ? { x: undefined } : {
            x: ["-33.33%", "0%"], 
          }}
          transition={{
            duration: comments.length * 8, 
            ease: "linear",
            repeat: Infinity,
          }}
          className="flex items-center gap-12 px-4"
        >
          {displayComments.map((comment, i) => (
            <div key={`${comment.id}-${i}`} className="flex items-center gap-3 shrink-0">
              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                {truncate(comment.custom_name || comment.server_name, 20)}
              </span>
              <span className="text-zinc-300 text-sm font-medium">
                {comment.username}:
              </span>
              <span className="text-white text-sm italic">
                "{comment.content}"
              </span>
              <div className="flex items-center gap-1 text-red-500/80 text-xs font-bold">
                <Heart className="w-3 h-3 fill-current" />
                {comment.likes}
              </div>
              <div className="w-1 h-1 rounded-full bg-zinc-800 mx-4" />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
