import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Supabase credentials missing. Backend will not function correctly.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || "fivem-elite-secret-key";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket connection handling
const clients = new Map<string, WebSocket>();

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  if (token) {
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      clients.set(decoded.id.toString(), ws);

      ws.on("close", () => {
        clients.delete(decoded.id.toString());
      });
    } catch (err) {
      ws.close();
    }
  } else {
    ws.close();
  }
});

async function sendNotification(userId: string, title: string, message: string, type: string) {
  try {
    await supabase.from("notifications").insert([{
      user_id: userId,
      title,
      message,
      type
    }]);

    const ws = clients.get(userId.toString());
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "notification", title, message, notificationType: type }));
    }
  } catch (err) {
    console.error("Notification error:", err);
  }
}

async function notifyAdmins(title: string, message: string, type: string) {
  const { data: admins } = await supabase.from("users").select("id").eq("role", "admin");
  if (admins) {
    for (const admin of admins) {
      await sendNotification(admin.id, title, message, type);
    }
  }
}

app.use(express.json());
app.use(cors());

// Auth Middleware
const authMiddleware = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const adminMiddleware = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Cache for FiveM API
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds for snappy real-time updates

async function fetchFiveMServer(cfxId: string, bypassCache = false) {
  const cleanId = cfxId.trim().toLowerCase();

  if (!bypassCache) {
    const cached = cache.get(cleanId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  }

  try {
    console.log(`[FiveM] Fetching ${cleanId} (Bypass: ${bypassCache})...`);
    const response = await axios.get(`https://frontend.cfx-services.net/api/servers/single/${cleanId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000
    });

    const data = response.data.Data || response.data;

    if (data && (data.clients !== undefined || data.hostname)) {
      cache.set(cleanId, { data, timestamp: Date.now() });
      return data;
    }
    return null;
  } catch (error: any) {
    console.error(`[FiveM] Error for ${cleanId}:`, error.message);
    return null;
  }
}

// 1. Live Sync Worker (Frequence: 5s - pour UI Temps Réel)
async function runLiveSync() {
  const { data: servers } = await supabase.from("servers").select("cfx_id");
  if (!servers) return;

  // Parallelize fetches for speed
  await Promise.all(servers.map(async (s) => {
    try {
      const data = await fetchFiveMServer(s.cfx_id, true);
      if (data && data.clients !== undefined) {
        await supabase.from("servers").update({
          players_online: data.clients,
          max_players: data.sv_maxclients
        }).eq("cfx_id", s.cfx_id);
      }
    } catch (err) {
      // Ignore single server errors to keep others syncing
    }
  }));
}

// 2. Historical Analytics Worker (Long-term - every 30m)
async function runAnalyticsCollection() {
  console.log("[Analytics] Saving historical points...");
  const { data: servers } = await supabase.from("servers").select("cfx_id");
  if (!servers) return;

  await Promise.all(servers.map(async (s) => {
    try {
      const data = await fetchFiveMServer(s.cfx_id);
      if (data && data.clients !== undefined) {
        await supabase.from("analytics").insert({
          cfx_id: s.cfx_id.toLowerCase().trim(),
          players: data.clients,
          max_players: data.sv_maxclients
        });
      }
    } catch (err) { }
  }));
  console.log("[Analytics] Collection complete.");
}

// Schedules
setInterval(runLiveSync, 5 * 1000);           // EVERY 5 SECONDS (Realtime)
setInterval(runAnalyticsCollection, 1 * 60 * 1000); // EVERY 1 MINUTE (granular history)

// Initial run
setTimeout(() => {
  runLiveSync();
  runAnalyticsCollection();
}, 2000);

// API Routes
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const { data: user, error } = await supabase.from("users").select("*").eq("username", username).single();

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar } });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const { data, error } = await supabase.from("users").insert([{ username, password: hashedPassword, role: 'user' }]).select().single();

  if (error) return res.status(400).json({ error: error.message });

  const token = jwt.sign({ id: data.id, username: data.username, role: data.role }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token, user: data });
});

app.get("/api/settings", async (req, res) => {
  const { data } = await supabase.from("settings").select("*");
  const settings = (data || []).reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  res.json(settings);
});

app.post("/api/admin/settings", adminMiddleware, async (req, res) => {
  const settings = req.body;
  for (const [key, value] of Object.entries(settings)) {
    await supabase.from("settings").upsert({ key, value: String(value) });
  }
  res.json({ success: true });
});

app.get("/api/servers", async (req, res) => {
  const { data: servers, error } = await supabase.from("servers").select("*");
  if (error) return res.status(500).json({ error: error.message });

  const enrichedServers = [];
  for (const s of servers) {
    console.log(`Enriching server ${s.cfx_id}...`);
    const [fivemData, starsCountRes, commentsCountRes] = await Promise.all([
      fetchFiveMServer(s.cfx_id.trim()),
      supabase.from("server_stars").select("*", { count: 'exact', head: true }).eq("cfx_id", s.cfx_id),
      supabase.from("comments").select("*", { count: 'exact', head: true }).eq("cfx_id", s.cfx_id)
    ]);

    enrichedServers.push({
      ...s,
      data: fivemData,
      total_stars: (s.stars || 0) + (starsCountRes.count || 0),
      comment_count: commentsCountRes.count || 0
    });
  }

  res.json(enrichedServers);
});

app.get("/api/servers/:cfxId", async (req, res) => {
  const cfxId = req.params.cfxId.trim().toLowerCase();
  const { data: server, error } = await supabase.from("servers").select("*").eq("cfx_id", cfxId).single();
  if (error || !server) return res.status(404).json({ error: "Server not found" });

  // count stars separately
  const { count: starCount } = await supabase.from("server_stars").select("*", { count: 'exact', head: true }).eq("cfx_id", cfxId);
  const totalStars = (server.stars || 0) + (starCount || 0);

  const fivem = await fetchFiveMServer(cfxId);
  const { data: comments } = await supabase.from("comments").select("*, users(avatar)").eq("cfx_id", cfxId).order("created_at", { ascending: false });

  // Real Analytics from DB
  let { data: analytics } = await supabase
    .from("analytics")
    .select("players, timestamp")
    .eq("cfx_id", cfxId)
    .order("timestamp", { ascending: false })
    .limit(48);

  // Instant point if empty (UX fix)
  if ((!analytics || analytics.length === 0) && fivem) {
    console.log(`[Analytics] Creating instant point for ${cfxId}...`);
    const { data: newPoint } = await supabase.from("analytics").insert({
      cfx_id: cfxId,
      players: fivem.clients,
      max_players: fivem.sv_maxclients
    }).select().single();
    if (newPoint) analytics = [newPoint];
  }

  res.json({
    server,
    data: fivem,
    analytics: analytics || [],
    comments: comments || [],
    total_stars: totalStars
  });
});

app.get("/api/comments/recent", async (req, res) => {
  const { data, error } = await supabase
    .from("comments")
    .select("*, servers(name, custom_name)")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });

  const enriched = await Promise.all((data || []).map(async (c: any) => {
    const { count } = await supabase.from("comment_likes").select("*", { count: 'exact', head: true }).eq("comment_id", c.id);
    return {
      ...c,
      server_name: c.servers?.name,
      custom_name: c.servers?.custom_name,
      likes: count || 0
    };
  }));

  res.json(enriched);
});

app.get("/api/comments/top", async (req, res) => {
  const { data, error } = await supabase
    .from("comments")
    .select("*, servers(name, custom_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });

  const enriched = await Promise.all((data || []).map(async (c: any) => {
    const { count } = await supabase.from("comment_likes").select("*", { count: 'exact', head: true }).eq("comment_id", c.id);
    return {
      ...c,
      server_name: c.servers?.name,
      custom_name: c.servers?.custom_name,
      likes: count || 0
    };
  }));

  res.json(enriched.sort((a, b) => b.likes - a.likes));
});

// return overall player total + server count
app.get("/api/stats", async (req, res) => {
  const { data: servers } = await supabase.from("servers").select("cfx_id");
  let totalPlayers = 0;
  for (const s of (servers || [])) {
    const data = await fetchFiveMServer(s.cfx_id);
    if (data) totalPlayers += data.clients;
  }
  res.json({ totalPlayers, serverCount: servers?.length || 0 });
});

// history of global players (sum of analytics by day)
app.get("/api/stats/global-history", async (req, res) => {
  const { data, error } = await supabase.from("analytics").select("players, timestamp");
  if (error) return res.status(500).json({ error: error.message });
  const grouped: Record<string, number> = {};
  (data || []).forEach((r: any) => {
    const date = new Date(r.timestamp).toISOString().split('T')[0];
    grouped[date] = (grouped[date] || 0) + (r.players || 0);
  });
  const result = Object.entries(grouped).map(([day, players]) => ({ day, players }));
  res.json(result);
});

// dominant servers (currently just top by live players; period parameter ignored)
app.get("/api/stats/dominant-servers", async (req, res) => {
  const { period } = req.query; // not used for now
  const { data: servers, error } = await supabase.from("servers").select("*, players_online");
  if (error) return res.status(500).json({ error: error.message });
  // sort descending by live players
  const sorted = (servers || []).sort((a: any, b: any) => (b.players_online || 0) - (a.players_online || 0));
  const top = sorted.slice(0, 10).map((s: any) => ({
    cfx_id: s.cfx_id,
    name: s.custom_name || s.name,
    players: s.players_online || 0
  }));
  res.json(top);
});

// keep old top-starred endpoint afterwards
app.get("/api/stats/top-starred", async (req, res) => {
  const { data: servers, error } = await supabase.from("servers").select("*");
  if (error) return res.status(500).json({ error: error.message });

  const enriched = [];
  for (const s of servers) {
    const [fivemData, starsCountRes] = await Promise.all([
      fetchFiveMServer(s.cfx_id.trim()),
      supabase.from("server_stars").select("*", { count: 'exact', head: true }).eq("cfx_id", s.cfx_id)
    ]);
    enriched.push({
      ...s,
      data: fivemData,
      star_count: (s.stars || 0) + (starsCountRes.count || 0)
    });
  }

  res.json(enriched.sort((a, b) => (b.star_count || 0) - (a.star_count || 0)).slice(0, 4));
});

app.get("/api/user/stars", authMiddleware, async (req: any, res) => {
  const { data, error } = await supabase.from("server_stars").select("cfx_id").eq("user_id", req.user.id);
  res.json((data || []).map((s: any) => s.cfx_id));
});

app.post("/api/servers/:cfxId/star", authMiddleware, async (req: any, res) => {
  const cfxId = req.params.cfxId.trim().toLowerCase();
  const { error } = await supabase.from("server_stars").insert([{ user_id: req.user.id, cfx_id: cfxId }]);
  if (error) return res.status(400).json({ error: "Already starred" });
  res.json({ success: true });
});

app.post("/api/comments/:commentId/like", async (req, res) => {
  const { commentId } = req.params;
  const { userIdentifier } = req.body;
  const { error } = await supabase.from("comment_likes").insert([{ comment_id: commentId, user_identifier: userIdentifier }]);
  if (error) return res.status(400).json({ error: "Already liked" });

  // Reward author
  const { data: comment } = await supabase.from("comments").select("user_id").eq("id", commentId).single();
  if (comment?.user_id) {
    await supabase.rpc('increment_reputation', { user_id: comment.user_id, amount: 1 });
  }

  res.json({ success: true });
});

app.delete("/api/comments/:commentId/like", async (req, res) => {
  const { commentId } = req.params;
  const { userIdentifier } = req.body;
  await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_identifier", userIdentifier);
  res.json({ success: true });
});

app.get("/api/user/comments", authMiddleware, async (req: any, res) => {
  const { data } = await supabase.from("comments").select("*, servers(name, custom_name)").eq("user_id", req.user.id).order("created_at", { ascending: false });
  const enriched = (data || []).map((c: any) => ({
    ...c,
    server_name: c.servers?.name,
    custom_name: c.servers?.custom_name
  }));
  res.json(enriched);
});

app.get("/api/user/notifications", authMiddleware, async (req: any, res) => {
  const { data } = await supabase.from("notifications").select("*").eq("user_id", req.user.id).order("created_at", { ascending: false });
  res.json(data || []);
});

app.post("/api/user/notifications/read", authMiddleware, async (req: any, res) => {
  await supabase.from("notifications").update({ is_read: true }).eq("user_id", req.user.id);
  res.json({ success: true });
});

app.get("/api/user/tickets", authMiddleware, async (req: any, res) => {
  const { data } = await supabase.from("tickets").select("*").eq("user_id", req.user.id).order("created_at", { ascending: false });
  res.json(data || []);
});

app.get("/api/admin/users", adminMiddleware, async (req, res) => {
  const { data } = await supabase.from("users").select("id, username, role, created_at, reputation");
  res.json(data || []);
});

app.delete("/api/admin/users/:id", adminMiddleware, async (req, res) => {
  await supabase.from("users").delete().eq("id", req.params.id);
  res.json({ success: true });
});

app.patch("/api/admin/users/:id", adminMiddleware, async (req, res) => {
  await supabase.from("users").update(req.body).eq("id", req.params.id);
  res.json({ success: true });
});

app.get("/api/admin/tickets", adminMiddleware, async (req, res) => {
  const { data } = await supabase.from("tickets").select("*, users(username, avatar)").order("created_at", { ascending: false });
  const enriched = (data || []).map((t: any) => ({
    ...t,
    user_name: t.users?.username,
    user_avatar: t.users?.avatar
  }));
  res.json(enriched);
});

app.patch("/api/admin/tickets/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  await supabase.from("tickets").update({ status }).eq("id", id);

  const { data: ticket } = await supabase.from("tickets").select("user_id, subject").eq("id", id).single();
  if (ticket) {
    await sendNotification(ticket.user_id, "Ticket Updated", `Your ticket "${ticket.subject}" is now ${status}`, "ticket");
  }
  res.json({ success: true });
});

app.post("/api/admin/servers", adminMiddleware, async (req, res) => {
  const cfx_id = req.body.cfx_id.trim().toLowerCase();
  const data = await fetchFiveMServer(cfx_id);
  if (!data) return res.status(404).json({ error: "Server not found on FiveM" });

  const { error } = await supabase.from("servers").insert([{
    cfx_id,
    name: data.hostname.replace(/\^([0-9])/g, ""),
    stars: 0
  }]);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.patch("/api/admin/servers/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  // only allow known server columns to avoid schema-cache errors
  const allowed: Record<string, any> = {};
  const whitelist = [
    "custom_name",
    "custom_logo",
    "custom_discord",
    "is_hidden",
    "hide_players",
    "hide_resources",
    "hide_chart",
    "stars",
    "show_stars",
    "show_owner_label",
    "owner_label",
    "show_percentage_full",
    "custom_banner",
    "background_size",
    "banner_position",
  ];
  for (const key of whitelist) {
    if (req.body[key] !== undefined) {
      allowed[key] = req.body[key];
    }
  }

  const { error } = await supabase.from("servers").update(allowed).eq("id", id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/admin/servers/:id", adminMiddleware, async (req, res) => {
  const { error } = await supabase.from("servers").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.post("/api/servers/:cfxId/comments", authMiddleware, async (req: any, res) => {
  const cfxId = req.params.cfxId.trim().toLowerCase();
  const { content } = req.body;
  const { data, error } = await supabase.from("comments").insert([{
    cfx_id: cfxId,
    user_id: req.user.id,
    username: req.user.username,
    content
  }]).select().single();

  if (error) return res.status(400).json({ error: error.message });

  // Reputation
  await supabase.rpc('increment_reputation', { user_id: req.user.id, amount: 5 });

  res.json({ success: true, id: data.id });
});

app.get("/api/servers/:cfxId/comments", async (req, res) => {
  const { data } = await supabase.from("comments").select("*, users(avatar)").eq("cfx_id", req.params.cfxId).order("created_at", { ascending: false });
  res.json(data || []);
});

app.post("/api/tickets", authMiddleware, async (req: any, res) => {
  const { subject, message } = req.body;
  const { data, error } = await supabase.from("tickets").insert([{
    user_id: req.user.id,
    subject,
    message
  }]).select().single();

  if (error) return res.status(400).json({ error: error.message });
  await notifyAdmins("New Ticket", `New ticket: ${subject}`, "ticket");
  res.json({ success: true, id: data.id });
});

app.get("/api/user/profile", authMiddleware, async (req: any, res) => {
  const { data: user } = await supabase.from("users").select("*").eq("id", req.user.id).single();
  const { data: starred } = await supabase.from("server_stars").select("servers(*)").eq("user_id", req.user.id);
  res.json({ user, starredServers: (starred || []).map((s: any) => s.servers) });
});

app.get("/api/stats", async (req, res) => {
  const { data: servers } = await supabase.from("servers").select("cfx_id");
  let totalPlayers = 0;
  for (const s of (servers || [])) {
    const data = await fetchFiveMServer(s.cfx_id);
    if (data) totalPlayers += data.clients;
  }
  res.json({ totalPlayers, serverCount: servers?.length || 0 });
});

// Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
