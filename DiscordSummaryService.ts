interface Channel {
  id: string;
  guild_id: string;
  name: string;
  last_message_id?: string;
  last_check: string;
  active: boolean;
}

interface DiscordUser {
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

interface DiscordEmoji {
  id: string | null;
  name: string;
}

interface DiscordReactionCountDetails {
  burst: number;
  normal: number;
}

interface DiscordReaction {
  emoji: DiscordEmoji;
  count: number;
  count_details: DiscordReactionCountDetails;
  burst_colors: string[];
  me_burst: boolean;
  burst_me: boolean;
  me: boolean;
  burst_count: number;
}

interface DiscordAttachment {
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

interface DiscordEmbed {
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

interface DiscordMessageReference {
  message_id: string;
  channel_id?: string;
  guild_id?: string;
}

interface DiscordMessage {
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

// Simplified Essential Message Structure
interface EssentialReaction {
  emoji: string;
  count: number;
}

interface EssentialReplyContext {
  id: string;
  author?: string;
  content_preview?: string;
}

interface EssentialMessage {
  id: string;
  timestamp: string;
  author: string;
  content: string;
  mentions?: string[];
  reactions?: EssentialReaction[];
  has_attachments?: boolean;
  pinned?: boolean;
  replying_to?: EssentialReplyContext;
}

interface Thread {
  id: string;
  object: string;
  created_at: number;
}

interface Message {
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

interface Run {
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

export class DiscordSummaryService {
  private botToken: string;
  private discordApiUrl: string;
  private openAiKey: string;
  private openAiAssistantId: string;
  private openAiApiUrl: string;
  private kv: Deno.kv;

  constructor() {
    this.botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    this.discordApiUrl = Deno.env.get("DISCORD_API_URL");
    this.openAiKey = Deno.env.get("OPEN_AI_API_KEY");
    this.openAiAssistantId = Deno.env.get("OPEN_AI_ASSISTANT_ID");
    this.openAiApiUrl = Deno.env.get("OPEN_AI_API_URL");
  }

  async init() {
    this.kv = await Deno.openKv();
  }

  async addChannel(guildId: string, channelId: string, channelName: string) {
    const channel: Channel = {
      id: channelId,
      guild_id: guildId,
      name: channelName,
      last_check: new Date().toISOString(),
      active: true,
    };

    await this.kv.set(["channels", channelId], channel);

    return { success: true, message: `Added channel: ${channelName}` };
  }

  async getActiveChannels(): Promise<Channel[]> {
    const channels: Channel[] = [];
    const iter = this.kv.list({ prefix: ["channels"] });

    for await (const entry of iter) {
      const channel = entry.value;
      if (channel.active) {
        channels.push(channel);
      }
    }

    return channels;
  }

  async fetchMessages(
    channelId: string,
    lastMessageId?: string,
  ): Promise<EssentialMessage[]> {
    const url = `${this.discordApiUrl}/channels/${channelId}/messages`;
    const params = new URLSearchParams({ limit: "100" });

    if (lastMessageId) {
      params.set("after", lastMessageId);
    }

    const response = await fetch(`${url}?${params}`, {
      headers: {
        Authorization: `Bot ${this.botToken}`,
        "Content-Type": "application/json",
        "User-Agent":
          "DiscordBot (https://github.com/coudrew/action-summary 1.0.0)",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord API error: ${response.status} - ${errorText}`);
    }

    const messages = (await response.json()) as DiscordMessage[];

    const filteredMessages = messages.filter(
      (msg) => !msg.author.bot && msg.content.trim(),
    );

    const simplifiedMessages: EssentialMessage[] = filteredMessages.map(
      (msg) => ({
        id: msg.id,
        timestamp: msg.timestamp,
        author: msg.author.username,
        content: msg.content,
        ...(msg.mentions?.length && {
          mentions: msg.mentions.map((u) => u.username),
        }),
        ...(msg.reactions?.length && {
          reactions: msg.reactions
            .filter((r) => r.count > 0)
            .map((r) => ({
              emoji: r.emoji.name,
              count: r.count,
            })),
        }),
        ...(msg.attachments?.length && { has_attachments: true }),
        ...(msg.pinned && { pinned: true }),
        ...(msg.message_reference && {
          replying_to: {
            id: msg.message_reference.message_id,
            author: msg.referenced_message?.author?.username,
            content_preview: msg.referenced_message?.content?.slice(0, 100),
          },
        }),
      }),
    );

    return simplifiedMessages.reverse();
  }

  async openAIRequest(endpoint: string, method: string = "GET", body?: any) {
    const response = await fetch(`${this.openAiApiUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.openAiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  async summarizeMessages(messages: EssentialMessage[]): Promise<string> {
    if (!messages.length) {
      return "No messages";
    }

    const content = messages.map((message) => JSON.stringify(message)).join();

    const thread: Thread = await this.openAIRequest("/threads", "POST");

    const message: Message = await this.openAIRequest(
      `/threads/${thread.id}/messages`,
      "POST",
      { role: "user", content },
    );

    const run: Run = await this.openAIRequest(
      `/threads/${thread.id}/runs`,
      "POST",
      { assistant_id: this.openAiAssistantId },
    );

    let currentRun = run;
    while (["queued", "in_progress"].includes(currentRun.status)) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      currentRun = await this.openAIRequest(
        `/threads/${thread.id}/runs/${run.id}`,
      );
    }

    if (currentRun.status === "completed") {
      const messagesResponse = await this.openAIRequest(
        `/threads/${thread.id}/messages`,
      );
      const assistantMessage = messagesResponse.data.find(
        (msg: Message) => msg.role === "assistant",
      );
      return JSON.parse(
        assistantMessage?.content[0]?.text?.value || "No response",
      );
    }

    throw new Error(`Run failed with status: ${currentRun.status}`);
  }
}
