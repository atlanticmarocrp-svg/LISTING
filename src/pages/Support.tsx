import React from "react";
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, getApiUrl } from "@/src/lib/utils";

interface Ticket {
  id: number;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

interface SupportProps {
  userToken: string | null;
  onUserLogin: (token: string, user: any) => void;
}

export default function Support({ userToken, onUserLogin }: SupportProps) {
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const fetchTickets = async () => {
    if (!userToken) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/user/tickets"), {
        headers: { "Authorization": `Bearer ${userToken}` }
      });
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTickets();
  }, [userToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(getApiUrl("/api/tickets"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ subject, message })
      });
      
      if (res.ok) {
        setSuccess(true);
        setSubject("");
        setMessage("");
        fetchTickets();
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Ticket Form */}
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-black mb-4">Support & Tickets</h1>
            <p className="text-zinc-500">
              Need help with your server listing or have a general inquiry? 
              Open a ticket and our team will get back to you as soon as possible.
            </p>
          </div>

          {!userToken ? (
            <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-[2.5rem] text-center">
              <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-indigo-500" />
              </div>
              <h2 className="text-xl font-bold mb-4">Authentication Required</h2>
              <p className="text-zinc-500 max-w-xs mx-auto text-sm">
                You must be logged in to create and track support tickets.
              </p>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence>
                  {success && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3 text-emerald-400 text-sm font-bold"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Ticket submitted successfully!
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Subject</label>
                  <input 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required 
                    placeholder="Brief summary of the issue..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-indigo-500 transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Message</label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required 
                    rows={6} 
                    placeholder="Describe your issue in detail..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none" 
                  />
                </div>
                <button 
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3"
                >
                  <Send className="w-5 h-5" />
                  {isSubmitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right: My Tickets */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">My Tickets</h2>
            {userToken && (
              <button 
                onClick={fetchTickets}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <Clock className="w-5 h-5" />
              </button>
            )}
          </div>

          {!userToken ? (
            <div className="bg-zinc-900/50 border border-zinc-800 border-dashed p-12 rounded-[2.5rem] text-center">
              <p className="text-zinc-600 text-sm">Login to see your ticket history.</p>
            </div>
          ) : loading && tickets.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-zinc-900/50 border border-zinc-800 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : tickets.length > 0 ? (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <motion.div 
                  key={ticket.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl hover:border-zinc-700 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{ticket.subject}</h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">
                        ID: #{ticket.id} • {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest",
                      ticket.status === 'open' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'
                    )}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm line-clamp-2 italic">
                    "{ticket.message}"
                  </p>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-zinc-900/50 border border-zinc-800 p-12 rounded-[2.5rem] text-center">
              <AlertCircle className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-500 font-bold">No tickets found.</p>
              <p className="text-zinc-600 text-xs mt-2">Any tickets you create will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
