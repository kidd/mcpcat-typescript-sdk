import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UmamiExporter } from "../modules/exporters/umami.js";
import { Event } from "../types.js";
import { PublishEventRequestEventTypeEnum } from "mcpcat-api";

describe("UmamiExporter", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("ok"),
    });
    globalThis.fetch = fetchSpy;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function makeEvent(overrides: Partial<Event> = {}): Event {
    return {
      id: "evt_test123",
      sessionId: "ses_session456",
      projectId: "proj_1",
      eventType: PublishEventRequestEventTypeEnum.mcpToolsCall,
      timestamp: new Date("2025-01-15T10:00:00Z"),
      resourceName: "get_weather",
      serverName: "weather-server",
      serverVersion: "1.0.0",
      clientName: "claude-desktop",
      clientVersion: "2.0.0",
      duration: 150,
      isError: false,
      ...overrides,
    };
  }

  it("should send correct payload structure for regular events", async () => {
    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
    });

    await exporter.export(makeEvent());

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];

    expect(url).toBe("https://cloud.umami.is/api/send");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["User-Agent"]).toBe("mcpcat-sdk");

    const body = JSON.parse(options.body);
    expect(body.type).toBe("event");

    const payload = body.payload;
    expect(payload.website).toBe("test-website-id");
    expect(payload.name).toBe("mcp_tool_call");
    expect(payload.hostname).toBe("weather-server");
    expect(payload.url).toBe("/mcp_tool_call/get_weather");
    expect(payload.language).toBe("en");

    // Verify data properties
    expect(payload.data.session_id).toBe("ses_session456");
    expect(payload.data.tool_name).toBe("get_weather");
    expect(payload.data.resource_name).toBe("get_weather");
    expect(payload.data.duration_ms).toBe(150);
    expect(payload.data.server_name).toBe("weather-server");
    expect(payload.data.server_version).toBe("1.0.0");
    expect(payload.data.client_name).toBe("claude-desktop");
    expect(payload.data.client_version).toBe("2.0.0");
    expect(payload.data.project_id).toBe("proj_1");
    expect(payload.data.is_error).toBe(false);
  });

  it("should use custom host when provided", async () => {
    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
      host: "https://my-umami.example.com",
    });

    await exporter.export(makeEvent());

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://my-umami.example.com/api/send");
  });

  it("should strip trailing slash from host", async () => {
    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
      host: "https://my-umami.example.com/",
    });

    await exporter.export(makeEvent());

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://my-umami.example.com/api/send");
  });

  it("should include error data when isError is true", async () => {
    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
    });

    await exporter.export(
      makeEvent({
        isError: true,
        error: {
          message: "Connection timeout",
          type: "TimeoutError",
          stack:
            "TimeoutError: Connection timeout\n    at fetch (/app/index.js:10:5)",
        },
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    const data = body.payload.data;

    expect(data.is_error).toBe(true);
    expect(data.error_message).toBe("Connection timeout");
    expect(data.error_type).toBe("TimeoutError");
    expect(data.error_stack).toBe(
      "TimeoutError: Connection timeout\n    at fetch (/app/index.js:10:5)",
    );
  });

  it("should not include error fields when isError is false", async () => {
    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
    });

    await exporter.export(makeEvent({ isError: false }));

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    const data = body.payload.data;

    expect(data.error_message).toBeUndefined();
    expect(data.error_type).toBeUndefined();
    expect(data.error_stack).toBeUndefined();
  });

  it("should not throw when fetch fails", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"));

    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
    });

    await expect(exporter.export(makeEvent())).resolves.toBeUndefined();
  });

  it("should not throw when fetch returns non-ok response", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve("Bad Request"),
    });

    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
    });

    await expect(exporter.export(makeEvent())).resolves.toBeUndefined();
  });

  it("should include identity data in event data", async () => {
    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
    });

    await exporter.export(
      makeEvent({
        identifyActorGivenId: "user_abc",
        identifyActorName: "Alice",
      }),
    );

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    const data = body.payload.data;

    expect(data.actor_id).toBe("user_abc");
    expect(data.actor_name).toBe("Alice");
  });

  it("should pass through parameters and response", async () => {
    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
    });

    await exporter.export(
      makeEvent({
        parameters: { city: "London", units: "celsius" },
        response: { temperature: 15, condition: "cloudy" },
      }),
    );

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    const data = body.payload.data;

    expect(data.parameters).toEqual({ city: "London", units: "celsius" });
    expect(data.response).toEqual({ temperature: 15, condition: "cloudy" });
  });

  it("should only set tool_name for tools/call events", async () => {
    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
    });

    // tools/call should have tool_name
    await exporter.export(
      makeEvent({
        eventType: PublishEventRequestEventTypeEnum.mcpToolsCall,
        resourceName: "get_weather",
      }),
    );
    let body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.payload.data.tool_name).toBe("get_weather");
    expect(body.payload.data.resource_name).toBe("get_weather");

    // resources/read should NOT have tool_name
    fetchSpy.mockClear();
    await exporter.export(
      makeEvent({
        eventType: PublishEventRequestEventTypeEnum.mcpResourcesRead,
        resourceName: "my_resource",
      }),
    );
    body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.payload.data.tool_name).toBeUndefined();
    expect(body.payload.data.resource_name).toBe("my_resource");
  });

  it("should map event types to Umami event names", async () => {
    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
    });

    const eventTypes: Record<string, string> = {
      [PublishEventRequestEventTypeEnum.mcpToolsCall]: "mcp_tool_call",
      [PublishEventRequestEventTypeEnum.mcpToolsList]: "mcp_tools_list",
      [PublishEventRequestEventTypeEnum.mcpInitialize]: "mcp_initialize",
      [PublishEventRequestEventTypeEnum.mcpResourcesRead]: "mcp_resource_read",
      [PublishEventRequestEventTypeEnum.mcpResourcesList]: "mcp_resources_list",
      [PublishEventRequestEventTypeEnum.mcpPromptsGet]: "mcp_prompt_get",
      [PublishEventRequestEventTypeEnum.mcpPromptsList]: "mcp_prompts_list",
      "mcp:custom/type": "mcp_custom_type",
    };

    for (const [input, expected] of Object.entries(eventTypes)) {
      fetchSpy.mockClear();
      await exporter.export(makeEvent({ eventType: input }));

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.payload.name).toBe(expected);
    }
  });

  it("should include userIntent in data", async () => {
    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
    });

    await exporter.export(
      makeEvent({ userIntent: "Check the weather in London" }),
    );

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.payload.data.user_intent).toBe("Check the weather in London");
  });

  it("should set url with resource name for tool calls", async () => {
    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
    });

    await exporter.export(makeEvent({ resourceName: "get_weather" }));

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.payload.url).toBe("/mcp_tool_call/get_weather");
  });

  it("should set url without resource name when not present", async () => {
    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
    });

    await exporter.export(makeEvent({ resourceName: undefined }));

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.payload.url).toBe("/mcp_tool_call");
  });

  it("should use 'mcp-server' as default hostname when serverName is not set", async () => {
    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
    });

    await exporter.export(makeEvent({ serverName: undefined }));

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.payload.hostname).toBe("mcp-server");
    expect(body.payload.title).toBeUndefined();
  });

  it("should set title to serverName when present", async () => {
    const exporter = new UmamiExporter({
      type: "umami",
      websiteId: "test-website-id",
    });

    await exporter.export(makeEvent({ serverName: "weather-server" }));

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.payload.title).toBe("weather-server");
  });
});
