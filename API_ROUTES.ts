// ============================================================================
// ADVANCED FEATURES API ROUTES
// ============================================================================
// Add these routes to server.ts at the end before the server listen() call

// ====================
// 1. ADVANCED FILTERING
// ====================

app.get("/api/servers/search", async (req, res) => {
  const { regions, languages, gameplayTypes, tags, query, sortBy } = req.query;

  let sqlQuery = supabase.from("servers").select("*");

  // Filter by regions
  if (regions && Array.isArray(regions)) {
    sqlQuery = sqlQuery.in("region", regions);
  }

  // Filter by languages
  if (languages && Array.isArray(languages)) {
    sqlQuery = sqlQuery.contains("language", languages);
  }

  // Filter by gameplay types
  if (gameplayTypes && Array.isArray(gameplayTypes)) {
    sqlQuery = sqlQuery.contains("gameplay_type", gameplayTypes);
  }

  // Filter by tags
  if (tags && Array.isArray(tags)) {
    sqlQuery = sqlQuery.contains("tags", tags);
  }

  // Text search
  if (query) {
    sqlQuery = sqlQuery.or(`name.ilike.%${query}%,custom_name.ilike.%${query}%`);
  }

  // Sorting
  if (sortBy === "uptime") {
    sqlQuery = sqlQuery.order("uptime_percentage", { ascending: false });
  } else if (sortBy === "newest") {
    sqlQuery = sqlQuery.order("added_at", { ascending: false });
  }

  const { data, error } = await sqlQuery;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ====================
// 2. SERVER COLLECTIONS
// ====================

app.get("/api/user/collections", authMiddleware, async (req: any, res) => {
  const { data, error } = await supabase
    .from("server_collections")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post("/api/user/collections", authMiddleware, async (req: any, res) => {
  const { name, description } = req.body;
  const { data, error } = await supabase
    .from("server_collections")
    .insert([{
      user_id: req.user.id,
      name,
      description,
      servers_ids: [],
      is_shared: false
    }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.patch("/api/user/collections/:id", authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const { name, description, servers_ids } = req.body;

  const { data, error } = await supabase
    .from("server_collections")
    .update({
      name,
      description,
      servers_ids,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("user_id", req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.delete("/api/user/collections/:id", authMiddleware, async (req: any, res) => {
  const { error } = await supabase
    .from("server_collections")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.patch("/api/user/collections/:id/share", authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const { is_shared } = req.body;
  const shared_token = is_shared ? require("crypto").randomBytes(16).toString("hex") : null;

  const { data, error } = await supabase
    .from("server_collections")
    .update({
      is_shared,
      shared_token,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("user_id", req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.get("/api/collections/:token", async (req, res) => {
  const { token } = req.params;
  const { data, error } = await supabase
    .from("server_collections")
    .select("*")
    .eq("shared_token", token)
    .eq("is_shared", true)
    .single();

  if (error) return res.status(404).json({ error: "Collection not found" });
  res.json(data);
});

// ====================
// 3. PUSH NOTIFICATIONS
// ====================

app.post("/api/user/subscriptions", authMiddleware, async (req: any, res) => {
  const { cfx_id, notification_type } = req.body;

  const { data, error } = await supabase
    .from("notification_subscriptions")
    .insert([{
      user_id: req.user.id,
      cfx_id,
      notification_type,
      is_active: true
    }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.get("/api/user/subscriptions", authMiddleware, async (req: any, res) => {
  const { data, error } = await supabase
    .from("notification_subscriptions")
    .select("*")
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.delete("/api/user/subscriptions/:id", authMiddleware, async (req: any, res) => {
  const { error } = await supabase
    .from("notification_subscriptions")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// ====================
// 4. PREDICTIONS & ANALYTICS
// ====================

app.get("/api/servers/:cfxId/predictions", async (req, res) => {
  const { cfxId } = req.params;

  // Get minute-based analytics (1440 points for 24h)
  const { data: recentData } = await supabase
    .from("analytics")
    .select("players, timestamp")
    .eq("cfx_id", cfxId)
    .order("timestamp", { ascending: false })
    .limit(1440); // Last 1440 minutes = 24 hours

  const minuteAgg: any = {};
  if (recentData && recentData.length > 0) {
    recentData.forEach((point: any) => {
      const date = new Date(point.timestamp);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const timeKey = `${hours}:${minutes}`;
      
      if (!minuteAgg[timeKey]) {
        minuteAgg[timeKey] = { players: [], count: 0 };
      }
      minuteAgg[timeKey].players.push(point.players);
      minuteAgg[timeKey].count += 1;
    });
  }

  // Generate 1440 points for 24 hours (every minute)
  const result = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m++) {
      const timeKey = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const data = minuteAgg[timeKey];
      
      result.push({
        minute_of_day: h * 60 + m,
        time: timeKey,
        avg_players: data ? Math.round(data.players.reduce((a: number, b: number) => a + b, 0) / data.count) : 0,
        peak_players: data ? Math.max(...data.players) : 0
      });
    }
  }

  res.json(result);
});

// ====================
// 5. SERVER COMPARISON
// ====================

app.post("/api/comparisons", authMiddleware, async (req: any, res) => {
  const { servers_ids } = req.body;

  const { data, error } = await supabase
    .from("server_comparisons")
    .insert([{
      user_id: req.user.id,
      servers_ids
    }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.get("/api/user/comparisons", authMiddleware, async (req: any, res) => {
  const { data, error } = await supabase
    .from("server_comparisons")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ====================
// 6. USER PREFERENCES
// ====================

app.get("/api/user/preferences", authMiddleware, async (req: any, res) => {
  const { data: user, error } = await supabase
    .from("users")
    .select("theme, notifications_enabled, preferred_regions, preferred_languages")
    .eq("id", req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(user);
});

app.patch("/api/user/preferences", authMiddleware, async (req: any, res) => {
  const { theme, notifications_enabled, preferred_regions, preferred_languages } = req.body;

  const { data, error } = await supabase
    .from("users")
    .update({
      theme,
      notifications_enabled,
      preferred_regions,
      preferred_languages
    })
    .eq("id", req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
