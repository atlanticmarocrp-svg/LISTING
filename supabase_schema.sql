-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.analytics (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  cfx_id text,
  players integer,
  max_players integer,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT analytics_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_cfx_id_fkey FOREIGN KEY (cfx_id) REFERENCES public.servers(cfx_id)
);
CREATE TABLE public.comment_likes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  comment_id bigint,
  user_identifier text,
  CONSTRAINT comment_likes_pkey PRIMARY KEY (id),
  CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id)
);
CREATE TABLE public.comments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  cfx_id text,
  user_id uuid,
  username text DEFAULT 'Anonymous'::text,
  content text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_cfx_id_fkey FOREIGN KEY (cfx_id) REFERENCES public.servers(cfx_id),
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.hourly_analytics (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  cfx_id text NOT NULL,
  hour_of_day integer NOT NULL,
  avg_players integer,
  avg_max_players integer,
  peak_players integer,
  last_updated timestamp with time zone DEFAULT now(),
  CONSTRAINT hourly_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT hourly_analytics_cfx_id_fkey FOREIGN KEY (cfx_id) REFERENCES public.servers(cfx_id)
);
CREATE TABLE public.notification_subscriptions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  cfx_id text,
  notification_type text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT notification_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT notification_subscriptions_cfx_id_fkey FOREIGN KEY (cfx_id) REFERENCES public.servers(cfx_id)
);
CREATE TABLE public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  title text,
  message text,
  type text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.server_collections (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  servers_ids text[] DEFAULT ARRAY[]::text[],
  is_shared boolean DEFAULT false,
  shared_token text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT server_collections_pkey PRIMARY KEY (id),
  CONSTRAINT server_collections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.server_comparisons (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  servers_ids text[] NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT server_comparisons_pkey PRIMARY KEY (id),
  CONSTRAINT server_comparisons_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.server_stars (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  cfx_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT server_stars_pkey PRIMARY KEY (id),
  CONSTRAINT server_stars_cfx_id_fkey FOREIGN KEY (cfx_id) REFERENCES public.servers(cfx_id),
  CONSTRAINT server_stars_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.servers (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  cfx_id text UNIQUE,
  name text,
  custom_name text,
  stars integer DEFAULT 0,
  is_hidden boolean DEFAULT false,
  custom_logo text,
  custom_discord text,
  custom_banner text,
  hide_players integer DEFAULT 0,
  hide_resources integer DEFAULT 0,
  hide_chart integer DEFAULT 0,
  show_stars integer DEFAULT 0,
  show_owner_label integer DEFAULT 0,
  owner_label text,
  show_percentage_full integer DEFAULT 1,
  background_size text DEFAULT 'cover',
  banner_position text DEFAULT '50%',
  added_at timestamp with time zone DEFAULT now(),
  players_online integer DEFAULT 0,
  max_players integer DEFAULT 0,
  -- region should be populated explicitly; no generic EU default
  region text,
  language ARRAY DEFAULT ARRAY[]::text[],
  gameplay_type ARRAY DEFAULT ARRAY[]::text[],
  tags ARRAY DEFAULT ARRAY[]::text[],
  uptime_percentage numeric DEFAULT 100,
  last_seen timestamp with time zone DEFAULT now(),
  CONSTRAINT servers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.settings (
  key text NOT NULL,
  value text,
  CONSTRAINT settings_pkey PRIMARY KEY (key)
);
CREATE TABLE public.shared_collections (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  collection_id bigint NOT NULL,
  shared_by_user_id uuid NOT NULL,
  shared_with_user_id uuid,
  access_level text DEFAULT 'view'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shared_collections_pkey PRIMARY KEY (id),
  CONSTRAINT shared_collections_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.server_collections(id),
  CONSTRAINT shared_collections_shared_by_user_id_fkey FOREIGN KEY (shared_by_user_id) REFERENCES public.users(id),
  CONSTRAINT shared_collections_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.users(id)
);
CREATE TABLE public.tickets (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  subject text,
  message text,
  status text DEFAULT 'open'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tickets_pkey PRIMARY KEY (id),
  CONSTRAINT tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text UNIQUE,
  password text,
  avatar text,
  role text DEFAULT 'user'::text,
  reputation integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  notifications_enabled boolean DEFAULT true,
  theme text DEFAULT 'dark'::text,
  preferred_regions ARRAY DEFAULT ARRAY[]::text[],
  preferred_languages ARRAY DEFAULT ARRAY[]::text[],
  CONSTRAINT users_pkey PRIMARY KEY (id)
);