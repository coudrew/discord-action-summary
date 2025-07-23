interface Channel {
  id: string;
  guild_id: string;
  name: string;
  last_message_id?: string;
  last_check: string;
  active: boolean;
}

interface DiscordMessage {
  id: string;
  content: string;
  author: {
    username: string;
    bot: boolean;
  };
  timestamp: string;
}

export class DiscordSummaryService {
  private botToken: string;
  private discordApiUrl: string;
  private openAiKey: string;
  private openAiAssistantId: string;
  private kv: Deno.kv;

  constructor() {
    this.botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    this.discordApiUrl = Deno.env.get("DISCORD_API_URL");
    this.openAiKey = Deno.env.get("OPEN_AI_API_KEY");
    this.openAiAssistantId = Deno.env.get("OPEN_AI_ASSISTANT_ID");
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
  ): Promise<DiscordMessage[]> {
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
      console.info(url, this.botToken);
      throw new Error(`Discord API error: ${response.status} - ${errorText}`);
    }
    const messages = (await response.json()) as DiscordMessage[];

    const filteredOrderedMessages = messages
      .filter((msg) => !msg.author.bot && msg.content.trim())
      .reverse();

    return filteredOrderedMessages;
  }
}
