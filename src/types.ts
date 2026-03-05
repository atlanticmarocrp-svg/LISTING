export interface FiveMServerData {
  hostname: string;
  clients: number;
  sv_maxclients: number;
  ownerAvatar: string;
  ownerName: string;
  mapname: string;
  gametype: string;
  vars: {
    banner_detail?: string;
    banner_connecting?: string;
    tags?: string;
    sv_projectName?: string;
    sv_projectDesc?: string;
    discord?: string;
    gallery?: string[];
    icon?: string;
    locale?: string;
  };
  icon?: string;
  iconVersion?: string | number;
  resources: string[];
  connectEndPoints: string[];
}

export interface Server {
  id: number;
  cfx_id: string;
  name: string;
  custom_name?: string;
  custom_logo?: string;
  custom_discord?: string;
  custom_banner?: string;
  is_hidden: number;
  hide_players: number;
  hide_resources: number;
  hide_chart: number;
  stars: number;
  show_stars: number;
  show_owner_label: number;
  owner_label?: string;
  show_percentage_full: number;
  background_size?: string;
  banner_position?: string;
  total_stars?: number;
  comment_count?: number;
  players_online?: number;
  max_players?: number;
  added_at: string;
  data?: FiveMServerData;
  region?: string;
  language?: string[];
  gameplay_type?: string[];
  tags?: string[];
  uptime_percentage?: number;
  last_seen?: string;
}

export interface ServerCollection {
  id: number;
  user_id: string;
  name: string;
  description?: string;
  servers_ids: string[];
  is_shared: boolean;
  shared_token?: string;
  created_at: string;
  updated_at: string;
}

export interface SharedCollection {
  id: number;
  collection_id: number;
  shared_by_user_id: string;
  shared_with_user_id?: string;
  access_level: 'view' | 'edit' | 'admin';
  created_at: string;
}

export interface NotificationSubscription {
  id: number;
  user_id: string;
  cfx_id: string;
  notification_type: 'server_online' | 'slot_available' | 'comment_reply';
  is_active: boolean;
  created_at: string;
}

export interface HourlyAnalytics {
  id: number;
  cfx_id: string;
  hour_of_day: number;
  avg_players: number;
  avg_max_players: number;
  peak_players: number;
  last_updated: string;
}

export interface ServerComparison {
  id: number;
  user_id?: string;
  servers_ids: string[];
  created_at: string;
}

export interface FilterOptions {
  regions?: string[];
  languages?: string[];
  gameplayTypes?: string[];
  tags?: string[];
  searchQuery?: string;
  sortBy?: 'players' | 'stars' | 'uptime' | 'newest';
}
}

export interface Analytics {
  id: number;
  cfx_id: string;
  players: number;
  max_players: number;
  timestamp: string;
}

export interface Stats {
  serverCount: number;
  totalPlayers: number;
  totalMaxPlayers: number;
}

export interface Comment {
  id: number;
  cfx_id: string;
  username: string;
  content: string;
  created_at: string;
  likes: number;
  custom_name?: string;
  server_name?: string;
}
