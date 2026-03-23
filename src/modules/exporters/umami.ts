import { Event, Exporter } from "../../types.js";
import { writeToLog } from "../logging.js";
import { PublishEventRequestEventTypeEnum } from "mcpcat-api";

export interface UmamiExporterConfig {
  type: "umami";
  websiteId: string; // Umami website ID
  host?: string; // Default: "https://cloud.umami.is" (supports self-hosted)
}

interface UmamiPayload {
  hostname: string;
  language: string;
  url: string;
  website: string;
  name: string;
  title?: string;
  tag?: string;
  data?: Record<string, any>;
}

export class UmamiExporter implements Exporter {
  private sendUrl: string;
  private websiteId: string;

  constructor(config: UmamiExporterConfig) {
    const host = (config.host || "https://cloud.umami.is").replace(/\/$/, "");
    this.sendUrl = `${host}/api/send`;
    this.websiteId = config.websiteId;

    writeToLog(`UmamiExporter: Initialized with endpoint ${this.sendUrl}`);
  }

  async export(event: Event): Promise<void> {
    try {
      const payload = this.buildPayload(event);

      writeToLog(`UmamiExporter: Sending event ${event.id}`);

      const response = await fetch(this.sendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "mcpcat-sdk",
        },
        body: JSON.stringify({
          payload,
          type: "event",
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        writeToLog(
          `Umami export failed - Status: ${response.status}, Body: ${errorBody}`,
        );
      } else {
        writeToLog(`Umami export success - Event: ${event.id}`);
      }
    } catch (error) {
      writeToLog(`Umami export error: ${error}`);
    }
  }

  private buildPayload(event: Event): UmamiPayload {
    const eventName = this.mapEventType(event.eventType);

    const data: Record<string, any> = {};

    if (event.sessionId) data.session_id = event.sessionId;
    if (event.identifyActorGivenId) data.actor_id = event.identifyActorGivenId;
    if (event.identifyActorName) data.actor_name = event.identifyActorName;
    if (event.resourceName) {
      data.resource_name = event.resourceName;
      if (event.eventType === PublishEventRequestEventTypeEnum.mcpToolsCall) {
        data.tool_name = event.resourceName;
      }
    }
    if (event.duration !== undefined) data.duration_ms = event.duration;
    if (event.serverName) data.server_name = event.serverName;
    if (event.serverVersion) data.server_version = event.serverVersion;
    if (event.clientName) data.client_name = event.clientName;
    if (event.clientVersion) data.client_version = event.clientVersion;
    if (event.projectId) data.project_id = event.projectId;
    if (event.userIntent) data.user_intent = event.userIntent;
    if (event.isError !== undefined) data.is_error = event.isError;
    if (event.parameters !== undefined) data.parameters = event.parameters;
    if (event.response !== undefined) data.response = event.response;

    if (event.isError && event.error) {
      data.error_message = event.error.message;
      if (event.error.type) data.error_type = event.error.type;
      if (event.error.stack) data.error_stack = event.error.stack;
    }

    const payload: UmamiPayload = {
      hostname: event.serverName || "mcp-server",
      language: "en",
      url: event.resourceName
        ? `/${eventName}/${event.resourceName}`
        : `/${eventName}`,
      website: this.websiteId,
      name: eventName,
      data,
    };

    if (event.serverName) {
      payload.title = event.serverName;
    }

    return payload;
  }

  private mapEventType(eventType: string): string {
    const mapping: Record<string, string> = {
      [PublishEventRequestEventTypeEnum.mcpToolsCall]: "mcp_tool_call",
      [PublishEventRequestEventTypeEnum.mcpToolsList]: "mcp_tools_list",
      [PublishEventRequestEventTypeEnum.mcpInitialize]: "mcp_initialize",
      [PublishEventRequestEventTypeEnum.mcpResourcesRead]: "mcp_resource_read",
      [PublishEventRequestEventTypeEnum.mcpResourcesList]: "mcp_resources_list",
      [PublishEventRequestEventTypeEnum.mcpPromptsGet]: "mcp_prompt_get",
      [PublishEventRequestEventTypeEnum.mcpPromptsList]: "mcp_prompts_list",
    };

    return (
      mapping[eventType] ||
      `mcp_${eventType.replace(/^mcp:/, "").replace(/\//g, "_")}`
    );
  }
}
