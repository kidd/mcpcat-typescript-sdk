interface MCPCatOptions {
    enableReportMissing?: boolean;
    enableTracing?: boolean;
    enableToolCallContext?: boolean;
    customContextDescription?: string;
    identify?: (request: any, extra?: CompatibleRequestHandlerExtra) => Promise<UserIdentity | null>;
    redactSensitiveInformation?: RedactFunction;
    exporters?: Record<string, ExporterConfig>;
    apiBaseUrl?: string;
}
type RedactFunction = (text: string) => Promise<string>;
interface ExporterConfig {
    type: string;
    [key: string]: any;
}
interface Exporter {
    export(event: Event): Promise<void>;
}
interface Event {
    id: string;
    sessionId: string;
    projectId?: string;
    eventType: string;
    timestamp: Date;
    duration?: number;
    ipAddress?: string;
    sdkLanguage?: string;
    mcpcatVersion?: string;
    serverName?: string;
    serverVersion?: string;
    clientName?: string;
    clientVersion?: string;
    identifyActorGivenId?: string;
    identifyActorName?: string;
    identifyActorData?: object;
    resourceName?: string;
    parameters?: any;
    response?: any;
    userIntent?: string;
    isError?: boolean;
    error?: ErrorData;
    actorId?: string;
    eventId?: string;
    identifyData?: object;
}
interface CompatibleRequestHandlerExtra {
    sessionId?: string;
    headers?: Record<string, string | string[]>;
    [key: string]: any;
}
interface UserIdentity {
    userId: string;
    userName?: string;
    userData?: Record<string, any>;
}
interface StackFrame {
    filename: string;
    function: string;
    lineno?: number;
    colno?: number;
    in_app: boolean;
    abs_path?: string;
    context_line?: string;
}
interface ChainedErrorData {
    message: string;
    type?: string;
    stack?: string;
    frames?: StackFrame[];
}
interface ErrorData {
    message: string;
    type?: string;
    stack?: string;
    frames?: StackFrame[];
    chained_errors?: ChainedErrorData[];
    platform?: string;
}
interface CustomEventData {
    resourceName?: string;
    parameters?: any;
    response?: any;
    message?: string;
    duration?: number;
    isError?: boolean;
    error?: any;
}

/**
 * Integrates MCPCat analytics into an MCP server to track tool usage patterns and user interactions.
 *
 * @param server - The MCP server instance to track. Must be a compatible MCP server implementation.
 * @param projectId - Your MCPCat project ID obtained from mcpcat.io when creating an account. Pass null for telemetry-only mode.
 * @param options - Optional configuration to customize tracking behavior.
 * @param options.enableReportMissing - Adds a "get_more_tools" tool that allows LLMs to automatically report missing functionality.
 * @param options.enableTracing - Enables tracking of tool calls and usage patterns.
 * @param options.enableToolCallContext - Injects a "context" parameter to existing tools to capture user intent.
 * @param options.customContextDescription - Custom description for the injected context parameter. Only applies when enableToolCallContext is true. Use this to provide domain-specific guidance to LLMs about what context they should provide.
 * @param options.identify - Async function to identify users and attach custom data to their sessions.
 * @param options.redactSensitiveInformation - Function to redact sensitive data before sending to MCPCat.
 * @param options.apiBaseUrl - Custom API base URL for sending events. Falls back to the `MCPCAT_API_URL` environment variable if not set, then to the default `https://api.mcpcat.io`.
 * @param options.exporters - Configure telemetry exporters to send events to external systems. Available exporters:
 *   - `otlp`: OpenTelemetry Protocol exporter (see {@link ../modules/exporters/otlp.OTLPExporter})
 *   - `datadog`: Datadog APM exporter (see {@link ../modules/exporters/datadog.DatadogExporter})
 *   - `sentry`: Sentry Monitoring exporter (see {@link ../modules/exporters/sentry.SentryExporter})
 *
 * @returns The tracked server instance.
 *
 * @remarks
 * Analytics data and debug information are logged to `~/mcpcat.log` since console logs interfere
 * with STDIO-based MCP servers.
 *
 * Do not call `track()` multiple times on the same server instance as this will cause unexpected behavior.
 *
 * @example
 * ```typescript
 * import * as mcpcat from "mcpcat";
 *
 * const mcpServer = new Server({ name: "my-mcp-server", version: "1.0.0" });
 *
 * // Track the server with MCPCat
 * mcpcat.track(mcpServer, "proj_abc123xyz");
 *
 * // Register your tools
 * mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
 *   tools: [{ name: "my_tool", description: "Does something useful" }]
 * }));
 * ```
 *
 * @example
 * ```typescript
 * // With user identification
 * mcpcat.track(mcpServer, "proj_abc123xyz", {
 *   identify: async (request, extra) => {
 *     const user = await getUserFromToken(request.params.arguments.token);
 *     return {
 *       userId: user.id,
 *       userData: { plan: user.plan, company: user.company }
 *     };
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With custom context description
 * mcpcat.track(mcpServer, "proj_abc123xyz", {
 *   enableToolCallContext: true,
 *   customContextDescription: "Explain why you're calling this tool and what business objective it helps achieve"
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With sensitive data redaction
 * mcpcat.track(mcpServer, "proj_abc123xyz", {
 *   redactSensitiveInformation: async (text) => {
 *     return text.replace(/api_key_\w+/g, "[REDACTED]");
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Telemetry-only mode (no MCPCat account required)
 * mcpcat.track(mcpServer, null, {
 *   exporters: {
 *     otlp: {
 *       type: "otlp",
 *       endpoint: "http://localhost:4318/v1/traces"
 *     }
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Dual mode - send to both MCPCat and telemetry exporters
 * mcpcat.track(mcpServer, "proj_abc123xyz", {
 *   exporters: {
 *     datadog: {
 *       type: "datadog",
 *       apiKey: process.env.DD_API_KEY,
 *       site: "datadoghq.com"
 *     }
 *   }
 * });
 * ```
 */
declare function track(server: any, projectId: string | null, options?: MCPCatOptions): any;
/**
 * Publishes a custom event to MCPCat with flexible session management.
 *
 * @param serverOrSessionId - Either a tracked MCP server instance or a MCP session ID string
 * @param projectId - Your MCPCat project ID (required)
 * @param eventData - Optional event data to include with the custom event
 *
 * @returns Promise that resolves when the event is queued for publishing
 *
 * @example
 * ```typescript
 * // With a tracked server
 * await mcpcat.publishCustomEvent(
 *   server,
 *   "proj_abc123xyz",
 *   {
 *     resourceName: "custom-action",
 *     parameters: { action: "user-feedback", rating: 5 },
 *     message: "User provided feedback"
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // With a MCP session ID
 * await mcpcat.publishCustomEvent(
 *   "user-session-12345",
 *   "proj_abc123xyz",
 *   {
 *     isError: true,
 *     error: { message: "Custom error occurred", code: "ERR_001" }
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * await mcpcat.publishCustomEvent(
 *   server,
 *   "proj_abc123xyz",
 *   {
 *     resourceName: "feature-usage",
 *   }
 * );
 * ```
 */
declare function publishCustomEvent(serverOrSessionId: any | string, projectId: string, eventData?: CustomEventData): Promise<void>;

type IdentifyFunction = MCPCatOptions["identify"];

export { type CustomEventData, type Exporter, type ExporterConfig, type IdentifyFunction, type MCPCatOptions, type RedactFunction, type UserIdentity, publishCustomEvent, track };
