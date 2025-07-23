import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { DiscordSummaryService } from "./DiscordSummaryService.ts";

async function handler(req: Request) {
  const url = new URL(req.url);

  const service = new DiscordSummaryService();
  await service.init();

  try {
    if (url.pathname === "/health" && req.method === "GET") {
      return new Response("ok");
    }

    if (url.pathname === "/channels") {
      if (req.method === "POST") {
        const { guild_id, channel_id, channel_name } = await req.json();

        const result = await service.addChannel(
          guild_id,
          channel_id,
          channel_name,
        );
        return new Response(result.message, {
          headers: { "Content-type": "application/json" },
        });
      } else if (req.method === "GET") {
        const channels = await service.getActiveChannels();
        const channelList = channels
          .map(
            (c) =>
              `${c.name} (${c.id}) - Last check: ${new Date(c.last_check).toLocaleString()}`,
          )
          .join("\n");

        return new Response(channelList || "No channels configured", {
          headers: { "Content-Type": "text/plain" },
        });
      }
    }

    if (url.pathname === "/messages" && req.method === "GET") {
      const name = url.searchParams.get("channel_name");
      const lastMessageId = url.searchParams.get("last_message_id");
      let channelId: string = "";
      const channels = await service.getActiveChannels();
      for (const entry of channels) {
        if (entry.name === name) {
          channelId = entry.id;
        }
      }
      if (!channelId) {
        return new Response("Channel not found", { status: 404 });
      }
      const messages = await service.fetchMessages(
        channelId,
        lastMessageId || "",
      );

      return new Response(JSON.stringify(messages), {
        headers: {
          "Content-type": "application/json",
        },
      });
    }
  } catch (error) {
    console.error("Error: ", error);

    return new Response("error", { status: 500 });
  }
}

serve(handler);
