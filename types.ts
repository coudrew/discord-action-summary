export interface Channel {
  id: string;
  guild_id: string;
  name: string;
  last_message_id?: string;
  last_check: string;
  active: boolean;
}

export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  bot: boolean;
  discriminator: string;
  public_flags: number;
  flags: number;
  banner: string | null;
  accent_color: number | null;
  global_name: string | null;
  avatar_decoration_data: any | null;
  collectibles: any | null;
  display_name_styles: any | null;
  banner_color: string | null;
  clan: any | null;
  primary_guild: any | null;
}

export interface DiscordEmoji {
  id: string | null;
  name: string;
}

export interface DiscordReactionCountDetails {
  burst: number;
  normal: number;
}

export interface DiscordReaction {
  emoji: DiscordEmoji;
  count: number;
  count_details: DiscordReactionCountDetails;
  burst_colors: string[];
  me_burst: boolean;
  burst_me: boolean;
  me: boolean;
  burst_count: number;
}

export interface DiscordAttachment {
  id: string;
  filename: string;
  size: number;
  url: string;
  proxy_url: string;
  content_type?: string;
  description?: string;
  width?: number;
  height?: number;
}

export interface DiscordEmbed {
  title?: string;
  type?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: {
    text: string;
    icon_url?: string;
  };
  image?: {
    url: string;
    width?: number;
    height?: number;
  };
  thumbnail?: {
    url: string;
    width?: number;
    height?: number;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
}

export interface DiscordMessageReference {
  message_id: string;
  channel_id?: string;
  guild_id?: string;
}

export interface DiscordMessage {
  type: number;
  content: string;
  mentions: DiscordUser[];
  mention_roles: string[];
  attachments: DiscordAttachment[];
  embeds: DiscordEmbed[];
  timestamp: string;
  edited_timestamp: string | null;
  flags: number;
  components: any[];
  id: string;
  channel_id: string;
  author: DiscordUser;
  pinned: boolean;
  mention_everyone: boolean;
  tts: boolean;
  reactions?: DiscordReaction[];
  message_reference?: DiscordMessageReference;
  referenced_message?: DiscordMessage;
}

// Simplified message structure
export interface SimplifiedMessageReaction {
  emoji: string;
  count: number;
}

export interface SimplifiedMessageReplyContext {
  id: string;
  author?: string;
  content_preview?: string;
}

export interface SimplifiedMessage {
  id: string;
  timestamp: string;
  author: string;
  content: string;
  mentions?: string[];
  reactions?: SimplifiedMessageReaction[];
  has_attachments?: boolean;
  pinned?: boolean;
  replying_to?: SimplifiedMessageReplyContext;
}

// OpenAI types
export interface Thread {
  id: string;
  object: string;
  created_at: number;
}

export interface Message {
  id: string;
  object: string;
  created_at: number;
  thread_id: string;
  role: string;
  content: Array<{
    type: string;
    text: {
      value: string;
      annotations: any[];
    };
  }>;
}

export interface Run {
  id: string;
  object: string;
  created_at: number;
  thread_id: string;
  assistant_id: string;
  status:
    | "queued"
    | "in_progress"
    | "requires_action"
    | "cancelling"
    | "cancelled"
    | "failed"
    | "completed"
    | "expired";
}
