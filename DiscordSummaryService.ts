import type {
  Channel,
  DiscordMessage,
  EssentialMessage,
  Thread,
  Message,
  Run,
} from "./types.ts";

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
