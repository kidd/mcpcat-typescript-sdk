// src/modules/logging.ts
import { createRequire } from "module";
var fsModule = null;
var logFilePath = null;
var initAttempted = false;
var useConsoleFallback = false;
function tryInitSync() {
  if (initAttempted) return;
  initAttempted = true;
  try {
    const require2 = createRequire(import.meta.url);
    const fs = require2("fs");
    const os = require2("os");
    const path = require2("path");
    const home = os.homedir?.();
    if (home) {
      fsModule = fs;
      logFilePath = path.join(home, "mcpcat.log");
    } else {
      useConsoleFallback = true;
    }
  } catch {
    useConsoleFallback = true;
    fsModule = null;
    logFilePath = null;
  }
}
function writeToLog(message) {
  tryInitSync();
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  if (useConsoleFallback) {
    console.log(`[mcpcat] ${logEntry}`);
    return;
  }
  if (!logFilePath || !fsModule) {
    return;
  }
  try {
    if (!fsModule.existsSync(logFilePath)) {
      fsModule.writeFileSync(logFilePath, logEntry + "\n");
    } else {
      fsModule.appendFileSync(logFilePath, logEntry + "\n");
    }
  } catch {
  }
}

// src/modules/compatibility.ts
function logCompatibilityWarning() {
  writeToLog(
    "MCPCat SDK Compatibility: This version only supports Model Context Protocol TypeScript SDK v1.11 and above. Please upgrade if using an older version."
  );
}
function isHighLevelServer(server) {
  return server && typeof server === "object" && server.server && typeof server.server === "object";
}
function isCompatibleServerType(server) {
  if (!server || typeof server !== "object") {
    logCompatibilityWarning();
    throw new Error(
      "MCPCat SDK compatibility error: Server must be an object. Ensure you're using MCP SDK v1.11 or higher."
    );
  }
  if (isHighLevelServer(server)) {
    if (!server._registeredTools || typeof server._registeredTools !== "object") {
      logCompatibilityWarning();
      throw new Error(
        "MCPCat SDK compatibility error: High-level server must have _registeredTools object. This requires MCP SDK v1.11 or higher."
      );
    }
    if (typeof server.tool !== "function") {
      logCompatibilityWarning();
      throw new Error(
        "MCPCat SDK compatibility error: High-level server must have tool() method. This requires MCP SDK v1.11 or higher."
      );
    }
    const targetServer = server.server;
    validateLowLevelServer(targetServer);
    return server;
  } else {
    validateLowLevelServer(server);
    return server;
  }
}
function validateLowLevelServer(server) {
  if (typeof server.setRequestHandler !== "function") {
    logCompatibilityWarning();
    throw new Error(
      "MCPCat SDK compatibility error: Server must have a setRequestHandler method. This requires MCP SDK v1.11 or higher."
    );
  }
  if (!server._requestHandlers || !(server._requestHandlers instanceof Map)) {
    logCompatibilityWarning();
    throw new Error(
      "MCPCat SDK compatibility error: Server._requestHandlers is not accessible. This requires MCP SDK v1.11 or higher."
    );
  }
  if (typeof server._requestHandlers.get !== "function") {
    logCompatibilityWarning();
    throw new Error(
      "MCPCat SDK compatibility error: Server._requestHandlers must be a Map with a get method. This requires MCP SDK v1.11 or higher."
    );
  }
  if (typeof server.getClientVersion !== "function") {
    logCompatibilityWarning();
    throw new Error(
      "MCPCat SDK compatibility error: Server.getClientVersion must be a function. This requires MCP SDK v1.11 or higher."
    );
  }
  if (!server._serverInfo || typeof server._serverInfo !== "object" || !server._serverInfo.name) {
    logCompatibilityWarning();
    throw new Error(
      "MCPCat SDK compatibility error: Server._serverInfo is not accessible or missing name. This requires MCP SDK v1.11 or higher."
    );
  }
}
function getMCPCompatibleErrorMessage(error) {
  if (error instanceof Error) {
    try {
      return JSON.stringify(error, Object.getOwnPropertyNames(error));
    } catch {
      return "Unknown error";
    }
  } else if (typeof error === "string") {
    return error;
  } else if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }
  return "Unknown error";
}

// src/modules/tools.ts
import {
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// src/modules/internal.ts
import { PublishEventRequestEventTypeEnum as PublishEventRequestEventTypeEnum2 } from "mcpcat-api";

// src/modules/eventQueue.ts
import {
  Configuration,
  EventsApi
} from "mcpcat-api";

// src/thirdparty/ksuid/index.js
import { randomBytes } from "crypto";
import { inspect } from "util";
import { promisify } from "util";

// src/thirdparty/ksuid/base-convert-int-array.js
var maxLength = (array, from, to) => Math.ceil(array.length * Math.log2(from) / Math.log2(to));
function baseConvertIntArray(array, { from, to, fixedLength = null }) {
  const length = fixedLength === null ? maxLength(array, from, to) : fixedLength;
  const result = new Array(length);
  let offset = length;
  let input = array;
  while (input.length > 0) {
    if (offset === 0) {
      throw new RangeError(
        `Fixed length of ${fixedLength} is too small, expected at least ${maxLength(array, from, to)}`
      );
    }
    const quotients = [];
    let remainder = 0;
    for (const digit of input) {
      const acc = digit + remainder * from;
      const q = Math.floor(acc / to);
      remainder = acc % to;
      if (quotients.length > 0 || q > 0) {
        quotients.push(q);
      }
    }
    result[--offset] = remainder;
    input = quotients;
  }
  if (fixedLength === null) {
    return offset > 0 ? result.slice(offset) : result;
  }
  while (offset > 0) {
    result[--offset] = 0;
  }
  return result;
}
var base_convert_int_array_default = baseConvertIntArray;

// src/thirdparty/ksuid/base62.js
var CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function encode(buffer, fixedLength) {
  return base_convert_int_array_default(buffer, { from: 256, to: 62, fixedLength }).map((value) => CHARS[value]).join("");
}
function decode(string, fixedLength) {
  const input = Array.from(string, (char) => {
    const charCode = char.charCodeAt(0);
    if (charCode < 58) return charCode - 48;
    if (charCode < 91) return charCode - 55;
    return charCode - 61;
  });
  return Buffer.from(
    base_convert_int_array_default(input, { from: 62, to: 256, fixedLength })
  );
}

// src/thirdparty/ksuid/index.js
var customInspectSymbol = inspect.custom;
var asyncRandomBytes = promisify(randomBytes);
var EPOCH_IN_MS = 14e11;
var MAX_TIME_IN_MS = 1e3 * (2 ** 32 - 1) + EPOCH_IN_MS;
var TIMESTAMP_BYTE_LENGTH = 4;
var PAYLOAD_BYTE_LENGTH = 16;
var BYTE_LENGTH = TIMESTAMP_BYTE_LENGTH + PAYLOAD_BYTE_LENGTH;
var STRING_ENCODED_LENGTH = 27;
var TIME_IN_MS_ASSERTION = `Valid KSUID timestamps must be in milliseconds since ${(/* @__PURE__ */ new Date(0)).toISOString()},
  no earlier than ${new Date(EPOCH_IN_MS).toISOString()} and no later than ${new Date(MAX_TIME_IN_MS).toISOString()}
`.trim().replace(/(\n|\s)+/g, " ").replace(/\.000Z/g, "Z");
var VALID_ENCODING_ASSERTION = `Valid encoded KSUIDs are ${STRING_ENCODED_LENGTH} characters`;
var VALID_BUFFER_ASSERTION = `Valid KSUID buffers are ${BYTE_LENGTH} bytes`;
var VALID_PAYLOAD_ASSERTION = `Valid KSUID payloads are ${PAYLOAD_BYTE_LENGTH} bytes`;
function fromParts(timeInMs, payload) {
  const timestamp = Math.floor((timeInMs - EPOCH_IN_MS) / 1e3);
  const timestampBuffer = Buffer.allocUnsafe(TIMESTAMP_BYTE_LENGTH);
  timestampBuffer.writeUInt32BE(timestamp, 0);
  return Buffer.concat([timestampBuffer, payload], BYTE_LENGTH);
}
var bufferLookup = /* @__PURE__ */ new WeakMap();
var KSUID = class _KSUID {
  constructor(buffer) {
    if (!_KSUID.isValid(buffer)) {
      throw new TypeError(VALID_BUFFER_ASSERTION);
    }
    bufferLookup.set(this, buffer);
    Object.defineProperty(this, "buffer", {
      enumerable: true,
      get() {
        return Buffer.from(buffer);
      }
    });
  }
  get raw() {
    return Buffer.from(bufferLookup.get(this).slice(0));
  }
  get date() {
    return new Date(1e3 * this.timestamp + EPOCH_IN_MS);
  }
  get timestamp() {
    return bufferLookup.get(this).readUInt32BE(0);
  }
  get payload() {
    const payload = bufferLookup.get(this).slice(TIMESTAMP_BYTE_LENGTH, BYTE_LENGTH);
    return Buffer.from(payload);
  }
  get string() {
    const encoded = encode(
      bufferLookup.get(this),
      STRING_ENCODED_LENGTH
    );
    return encoded.padStart(STRING_ENCODED_LENGTH, "0");
  }
  compare(other) {
    if (!bufferLookup.has(other)) {
      return 0;
    }
    return bufferLookup.get(this).compare(bufferLookup.get(other), 0, BYTE_LENGTH);
  }
  equals(other) {
    return this === other || bufferLookup.has(other) && this.compare(other) === 0;
  }
  toString() {
    return `${this[Symbol.toStringTag]} { ${this.string} }`;
  }
  toJSON() {
    return this.string;
  }
  [customInspectSymbol]() {
    return this.toString();
  }
  static async random(time = Date.now()) {
    const payload = await asyncRandomBytes(PAYLOAD_BYTE_LENGTH);
    return new _KSUID(fromParts(Number(time), payload));
  }
  static randomSync(time = Date.now()) {
    const payload = randomBytes(PAYLOAD_BYTE_LENGTH);
    return new _KSUID(fromParts(Number(time), payload));
  }
  static fromParts(timeInMs, payload) {
    if (!Number.isInteger(timeInMs) || timeInMs < EPOCH_IN_MS || timeInMs > MAX_TIME_IN_MS) {
      throw new TypeError(TIME_IN_MS_ASSERTION);
    }
    if (!Buffer.isBuffer(payload) || payload.byteLength !== PAYLOAD_BYTE_LENGTH) {
      throw new TypeError(VALID_PAYLOAD_ASSERTION);
    }
    return new _KSUID(fromParts(timeInMs, payload));
  }
  static isValid(buffer) {
    return Buffer.isBuffer(buffer) && buffer.byteLength === BYTE_LENGTH;
  }
  static parse(string) {
    if (string.length !== STRING_ENCODED_LENGTH) {
      throw new TypeError(VALID_ENCODING_ASSERTION);
    }
    const decoded = decode(string, BYTE_LENGTH);
    if (decoded.byteLength === BYTE_LENGTH) {
      return new _KSUID(decoded);
    }
    const buffer = Buffer.allocUnsafe(BYTE_LENGTH);
    const padEnd = BYTE_LENGTH - decoded.byteLength;
    buffer.fill(0, 0, padEnd);
    decoded.copy(buffer, padEnd);
    return new _KSUID(buffer);
  }
};
Object.defineProperty(KSUID.prototype, Symbol.toStringTag, { value: "KSUID" });
Object.defineProperty(KSUID, "MAX_STRING_ENCODED", {
  value: "aWgEPTl1tmebfsQzFP4bxwgy80V"
});
Object.defineProperty(KSUID, "MIN_STRING_ENCODED", {
  value: "000000000000000000000000000"
});
KSUID.withPrefix = function(prefix) {
  return {
    random: async (time = Date.now()) => {
      const ksuid = await KSUID.random(time);
      return `${prefix}_${ksuid.string}`;
    },
    randomSync: (time = Date.now()) => {
      const ksuid = KSUID.randomSync(time);
      return `${prefix}_${ksuid.string}`;
    },
    fromParts: (timeInMs, payload) => {
      const ksuid = KSUID.fromParts(timeInMs, payload);
      return `${prefix}_${ksuid.string}`;
    }
  };
};
var ksuid_default = KSUID;

// package.json
var package_default = {
  name: "mcpcat",
  version: "0.1.13",
  description: "Analytics tool for MCP (Model Context Protocol) servers - tracks tool usage patterns and provides insights",
  type: "module",
  main: "dist/index.js",
  module: "dist/index.mjs",
  types: "dist/index.d.ts",
  exports: {
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.mjs",
      require: "./dist/index.cjs"
    }
  },
  scripts: {
    build: "tsup",
    dev: "tsup --watch",
    test: "vitest",
    "test:compatibility": "vitest run src/tests/mcp-version-compatibility.test.ts",
    lint: "eslint src/",
    typecheck: "tsc --noEmit",
    prepare: "husky",
    prepublishOnly: "pnpm run build && pnpm run test && pnpm run lint && pnpm run typecheck"
  },
  keywords: [
    "ai",
    "authentication",
    "mcp",
    "observability",
    "ai-agents",
    "ai-platform",
    "ai-agent",
    "mcps",
    "aiagents",
    "ai-agent-tools",
    "mcp-servers",
    "mcp-server",
    "mcp-tools",
    "agent-runtime",
    "mcp-framework",
    "mcp-analytics"
  ],
  author: "MCPcat",
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/MCPCat/mcpcat-typescript-sdk.git"
  },
  bugs: {
    url: "https://github.com/MCPCat/mcpcat-typescript-sdk/issues"
  },
  homepage: "https://github.com/MCPCat/mcpcat-typescript-sdk#readme",
  packageManager: "pnpm@10.11.0",
  devDependencies: {
    "@changesets/cli": "^2.29.8",
    "@modelcontextprotocol/sdk": "~1.24.2",
    "@types/node": "^22.15.21",
    "@typescript-eslint/eslint-plugin": "^8.32.1",
    "@typescript-eslint/parser": "^8.32.1",
    "@vitest/coverage-v8": "^4.0.14",
    "@vitest/ui": "^4.0.14",
    eslint: "^9.39.1",
    husky: "^9.1.7",
    "lint-staged": "^16.1.0",
    prettier: "^3.5.3",
    tsup: "^8.5.0",
    typescript: "^5.8.3",
    vitest: "^4.0.14",
    zod: "^3.25 || ^4.0"
  },
  peerDependencies: {
    "@modelcontextprotocol/sdk": ">=1.11"
  },
  dependencies: {
    "mcpcat-api": "0.1.7"
  },
  "lint-staged": {
    "*.{ts,js}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  },
  pnpm: {
    overrides: {
      "js-yaml": ">=4.1.1",
      tmp: ">=0.2.4",
      vite: ">=6.4.1",
      "body-parser": ">=2.2.1",
      "brace-expansion": "2.0.2"
    },
    overridesComments: {
      "js-yaml": "Fixes GHSA-mh29-5h37-fv8m (prototype pollution in merge) - via @changesets/cli",
      tmp: "Fixes GHSA-52f5-9888-hmc6 (symlink attack) - via @changesets/cli",
      vite: "Fixes GHSA-93m4-6634-74q7 and other vite security issues - via vitest",
      "body-parser": "Fixes GHSA-wqch-xfxh-vrr4 (DoS via url encoding) - via @modelcontextprotocol/sdk",
      "brace-expansion": "Fixes GHSA-v6h2-p8h4-qcjw (ReDoS vulnerability) - via eslint"
    }
  }
};

// src/modules/session.ts
import { createHash } from "crypto";

// src/modules/constants.ts
var INACTIVITY_TIMEOUT_IN_MINUTES = 30;
var DEFAULT_CONTEXT_PARAMETER_DESCRIPTION = `Explain why you are calling this tool and how it fits into the user's overall goal. This parameter is used for analytics and user intent tracking. YOU MUST provide 15-25 words (count carefully). NEVER use first person ('I', 'we', 'you') - maintain third-person perspective. NEVER include sensitive information such as credentials, passwords, or personal data. Example (20 words): "Searching across the organization's repositories to find all open issues related to performance complaints and latency issues for team prioritization."`;
var MCPCAT_CUSTOM_EVENT_TYPE = "mcpcat:custom";

// src/modules/session.ts
function newSessionId() {
  return ksuid_default.withPrefix("ses").randomSync();
}
function deriveSessionIdFromMCPSession(mcpSessionId, projectId) {
  const input = projectId ? `${mcpSessionId}:${projectId}` : mcpSessionId;
  const hash = createHash("sha256").update(input).digest();
  const EPOCH_2024 = (/* @__PURE__ */ new Date("2024-01-01T00:00:00Z")).getTime();
  const timestampOffset = hash.readUInt32BE(0) % (365 * 24 * 60 * 60 * 1e3);
  const timestamp = EPOCH_2024 + timestampOffset;
  const payload = hash.subarray(4, 20);
  return ksuid_default.withPrefix("ses").fromParts(timestamp, payload);
}
function getServerSessionId(server, extra) {
  const data = getServerTrackingData(server);
  if (!data) {
    throw new Error("Server tracking data not found");
  }
  const mcpSessionId = extra?.sessionId;
  if (mcpSessionId) {
    data.sessionId = deriveSessionIdFromMCPSession(
      mcpSessionId,
      data.projectId || void 0
    );
    data.lastMcpSessionId = mcpSessionId;
    data.sessionSource = "mcp";
    setServerTrackingData(server, data);
    setLastActivity(server);
    return data.sessionId;
  }
  if (data.sessionSource === "mcp" && data.lastMcpSessionId) {
    setLastActivity(server);
    return data.sessionId;
  }
  const now = Date.now();
  const timeoutMs = INACTIVITY_TIMEOUT_IN_MINUTES * 60 * 1e3;
  if (now - data.lastActivity.getTime() > timeoutMs) {
    data.sessionId = newSessionId();
    data.sessionSource = "mcpcat";
    setServerTrackingData(server, data);
  }
  setLastActivity(server);
  return data.sessionId;
}
function setLastActivity(server) {
  const data = getServerTrackingData(server);
  if (!data) {
    throw new Error("Server tracking data not found");
  }
  data.lastActivity = /* @__PURE__ */ new Date();
  setServerTrackingData(server, data);
}
function getSessionInfo(server, data) {
  let clientInfo = {
    name: void 0,
    version: void 0
  };
  if (!data?.sessionInfo.clientName) {
    clientInfo = server.getClientVersion();
  }
  const actorInfo = data?.identifiedSessions.get(data.sessionId);
  const sessionInfo = {
    ipAddress: void 0,
    // grab from django
    sdkLanguage: "TypeScript",
    // hardcoded for now
    mcpcatVersion: package_default.version,
    serverName: server._serverInfo?.name,
    serverVersion: server._serverInfo?.version,
    clientName: clientInfo?.name,
    clientVersion: clientInfo?.version,
    identifyActorGivenId: actorInfo?.userId,
    identifyActorName: actorInfo?.userName,
    identifyActorData: actorInfo?.userData || {}
  };
  if (!data) {
    return sessionInfo;
  }
  data.sessionInfo = sessionInfo;
  setServerTrackingData(server, data);
  return data.sessionInfo;
}

// src/modules/redaction.ts
var PROTECTED_FIELDS = /* @__PURE__ */ new Set([
  "sessionId",
  "id",
  "projectId",
  "server",
  "identifyActorGivenId",
  "identifyActorName",
  "identifyData",
  "resourceName",
  "eventType",
  "actorId"
]);
async function redactStringsInObject(obj, redactFn, path = "", isProtected = false) {
  if (obj === null || obj === void 0) {
    return obj;
  }
  if (typeof obj === "string") {
    if (isProtected) {
      return obj;
    }
    return await redactFn(obj);
  }
  if (Array.isArray(obj)) {
    return Promise.all(
      obj.map(
        (item, index) => redactStringsInObject(item, redactFn, `${path}[${index}]`, isProtected)
      )
    );
  }
  if (obj instanceof Date) {
    return obj;
  }
  if (typeof obj === "object") {
    const redactedObj = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "function" || value === void 0) {
        continue;
      }
      const fieldPath = path ? `${path}.${key}` : key;
      const isFieldProtected = isProtected || path === "" && PROTECTED_FIELDS.has(key);
      redactedObj[key] = await redactStringsInObject(
        value,
        redactFn,
        fieldPath,
        isFieldProtected
      );
    }
    return redactedObj;
  }
  return obj;
}
async function redactEvent(event, redactFn) {
  return redactStringsInObject(event, redactFn, "", false);
}

// src/modules/sanitization.ts
var BASE64_PATTERN = /^[A-Za-z0-9+/\n\r]+=*$/;
var SIZE_GATE = 10240;
function sanitizeEvent(event) {
  const result = { ...event };
  if (result.response != null) {
    result.response = sanitizeResponse(result.response);
  }
  if (result.parameters != null) {
    result.parameters = sanitizeParameters(result.parameters);
  }
  return result;
}
function sanitizeResponse(response) {
  if (response == null || typeof response !== "object") {
    return response;
  }
  const result = { ...response };
  if (Array.isArray(result.content)) {
    result.content = result.content.map(sanitizeContentBlock);
  }
  if (result.structuredContent != null && typeof result.structuredContent === "object") {
    result.structuredContent = sanitizeParameters(result.structuredContent);
  }
  return result;
}
function sanitizeContentBlock(block) {
  if (block == null || typeof block !== "object") {
    return block;
  }
  switch (block.type) {
    case "text":
      return block;
    case "image":
      return {
        type: "text",
        text: "[image content redacted - not supported by MCPcat]"
      };
    case "audio":
      return {
        type: "text",
        text: "[audio content redacted - not supported by MCPcat]"
      };
    case "resource":
      return sanitizeResourceBlock(block);
    case "resource_link":
      return block;
    default:
      return {
        type: "text",
        text: `[unsupported content type "${block.type}" redacted - not supported by MCPcat]`
      };
  }
}
function sanitizeResourceBlock(block) {
  if (block.resource && block.resource.blob !== void 0) {
    return {
      type: "text",
      text: "[binary resource content redacted - not supported by MCPcat]"
    };
  }
  return block;
}
function sanitizeParameters(obj) {
  if (obj == null) {
    return obj;
  }
  if (typeof obj === "string") {
    if (obj.length >= SIZE_GATE && BASE64_PATTERN.test(obj)) {
      return "[binary data redacted - not supported by MCPcat]";
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeParameters);
  }
  if (obj instanceof Date) {
    return obj;
  }
  if (typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeParameters(value);
    }
    return result;
  }
  return obj;
}

// src/modules/truncation.ts
var MAX_DEPTH = 10;
var MAX_BREADTH = 100;
var MAX_STRING_LENGTH = 32768;
var MAX_EVENT_BYTES = 102400;
var MAX_USER_INTENT_LENGTH = 2048;
var MAX_ERROR_MESSAGE_LENGTH = 2048;
var MAX_RESOURCE_NAME_LENGTH = 256;
var MAX_METADATA_LENGTH = 256;
var MAX_STACK_FRAMES = 50;
var MAX_CONTENT_TEXT_LENGTH = 32768;
var TRUNCATION_SUFFIX = "...";
function normalize(input, depth = MAX_DEPTH, maxBreadth = MAX_BREADTH, maxStringLength = MAX_STRING_LENGTH) {
  const memo = /* @__PURE__ */ new WeakSet();
  return visit(input, depth, maxBreadth, maxStringLength, memo);
}
function visit(value, remainingDepth, maxBreadth, maxStringLength, memo) {
  if (value === null) return null;
  if (value === void 0) return "[undefined]";
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "[NaN]";
    if (!Number.isFinite(value))
      return value > 0 ? "[Infinity]" : "[-Infinity]";
    return value;
  }
  if (typeof value === "bigint") return `[BigInt: ${value}]`;
  if (typeof value === "string") {
    if (value.length > maxStringLength) {
      return value.slice(0, maxStringLength) + TRUNCATION_SUFFIX;
    }
    return value;
  }
  if (typeof value === "symbol") {
    const desc = value.description;
    return desc ? `[Symbol(${desc})]` : "[Symbol()]";
  }
  if (typeof value === "function") {
    const name = value.name || "<anonymous>";
    return `[Function: ${name}]`;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "[Invalid Date]" : value.toISOString();
  }
  if (typeof value === "object") {
    if (memo.has(value)) return "[Circular ~]";
    if (remainingDepth <= 0) {
      return Array.isArray(value) ? "[Array]" : "[Object]";
    }
    memo.add(value);
    let result;
    if (Array.isArray(value)) {
      result = visitArray(
        value,
        remainingDepth - 1,
        maxBreadth,
        maxStringLength,
        memo
      );
    } else {
      result = visitObject(
        value,
        remainingDepth - 1,
        maxBreadth,
        maxStringLength,
        memo
      );
    }
    memo.delete(value);
    return result;
  }
  return String(value);
}
function visitArray(arr, remainingDepth, maxBreadth, maxStringLength, memo) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (i >= maxBreadth) {
      result.push("[MaxProperties ~]");
      break;
    }
    result.push(
      visit(arr[i], remainingDepth, maxBreadth, maxStringLength, memo)
    );
  }
  return result;
}
function visitObject(obj, remainingDepth, maxBreadth, maxStringLength, memo) {
  const result = {};
  const keys = Object.keys(obj);
  let count = 0;
  for (const key of keys) {
    if (count >= maxBreadth) {
      result["..."] = "[MaxProperties ~]";
      break;
    }
    if (obj[key] === void 0) continue;
    result[key] = visit(
      obj[key],
      remainingDepth,
      maxBreadth,
      maxStringLength,
      memo
    );
    count++;
  }
  return result;
}
function truncateString(str, maxLength2) {
  if (str == null) return str;
  if (str.length <= maxLength2) return str;
  return str.slice(0, maxLength2) + TRUNCATION_SUFFIX;
}
function truncateStackFrames(frames) {
  if (!frames || frames.length <= MAX_STACK_FRAMES) return frames;
  const half = Math.floor(MAX_STACK_FRAMES / 2);
  return [...frames.slice(0, half), ...frames.slice(-half)];
}
function truncateResponseContent(response) {
  if (response == null || typeof response !== "object") return response;
  const result = { ...response };
  if (Array.isArray(result.content)) {
    result.content = result.content.map((block) => {
      if (block?.type === "text" && typeof block.text === "string" && block.text.length > MAX_CONTENT_TEXT_LENGTH) {
        return {
          ...block,
          text: block.text.slice(0, MAX_CONTENT_TEXT_LENGTH) + TRUNCATION_SUFFIX
        };
      }
      return block;
    });
  }
  return result;
}
var textEncoder = new TextEncoder();
function jsonByteSize(value) {
  return textEncoder.encode(JSON.stringify(value)).length;
}
function truncateLargestFields(obj, maxBytes) {
  let result = structuredClone(obj);
  for (let attempt = 0; attempt < 10; attempt++) {
    const currentSize = jsonByteSize(result);
    if (currentSize <= maxBytes) return result;
    const excess = currentSize - maxBytes;
    const stringPaths = [];
    collectStringPaths(result, [], stringPaths);
    stringPaths.sort((a, b) => b.length - a.length);
    if (stringPaths.length === 0) break;
    let remaining = excess + 200;
    let truncated = false;
    for (const { path, length } of stringPaths) {
      if (remaining <= 0) break;
      const reduction = Math.min(remaining, Math.floor(length * 0.5));
      if (reduction < 10) continue;
      const newLength = length - reduction;
      setNestedValue(
        result,
        path,
        getNestedValue(result, path).slice(0, newLength) + TRUNCATION_SUFFIX
      );
      remaining -= reduction;
      truncated = true;
    }
    if (!truncated) break;
  }
  return result;
}
function collectStringPaths(obj, currentPath, results) {
  if (typeof obj === "string" && obj.length > 100) {
    results.push({ path: [...currentPath], length: obj.length });
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach(
      (item, i) => collectStringPaths(item, [...currentPath, String(i)], results)
    );
    return;
  }
  if (obj != null && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      collectStringPaths(value, [...currentPath, key], results);
    }
  }
}
function getNestedValue(obj, path) {
  let current = obj;
  for (const key of path) current = current[key];
  return current;
}
function setNestedValue(obj, path, value) {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) current = current[path[i]];
  current[path[path.length - 1]] = value;
}
function truncateToSize(event) {
  if (jsonByteSize(event) <= MAX_EVENT_BYTES) return event;
  for (let depth = MAX_DEPTH - 1; depth >= 1; depth--) {
    const reduced = { ...event };
    if (reduced.parameters != null)
      reduced.parameters = normalize(reduced.parameters, depth);
    if (reduced.response != null)
      reduced.response = normalize(reduced.response, depth);
    if (reduced.identifyActorData != null)
      reduced.identifyActorData = normalize(reduced.identifyActorData, depth);
    if (reduced.error != null) reduced.error = normalize(reduced.error, depth);
    if (jsonByteSize(reduced) <= MAX_EVENT_BYTES) return reduced;
  }
  const minimal = { ...event };
  if (minimal.parameters != null)
    minimal.parameters = normalize(minimal.parameters, 1);
  if (minimal.response != null)
    minimal.response = normalize(minimal.response, 1);
  if (minimal.identifyActorData != null)
    minimal.identifyActorData = normalize(minimal.identifyActorData, 1);
  if (minimal.error != null) minimal.error = normalize(minimal.error, 1);
  return truncateLargestFields(minimal, MAX_EVENT_BYTES);
}
function truncateEvent(event) {
  const result = { ...event };
  result.userIntent = truncateString(result.userIntent, MAX_USER_INTENT_LENGTH);
  result.resourceName = truncateString(
    result.resourceName,
    MAX_RESOURCE_NAME_LENGTH
  );
  result.serverName = truncateString(result.serverName, MAX_METADATA_LENGTH);
  result.serverVersion = truncateString(
    result.serverVersion,
    MAX_METADATA_LENGTH
  );
  result.clientName = truncateString(result.clientName, MAX_METADATA_LENGTH);
  result.clientVersion = truncateString(
    result.clientVersion,
    MAX_METADATA_LENGTH
  );
  if (result.error != null && typeof result.error === "object") {
    result.error = { ...result.error };
    result.error.message = truncateString(
      result.error.message,
      MAX_ERROR_MESSAGE_LENGTH
    );
    if (result.error.frames !== void 0) {
      result.error.frames = truncateStackFrames(result.error.frames);
    }
  }
  result.response = truncateResponseContent(result.response);
  if (result.parameters != null) {
    result.parameters = normalize(result.parameters);
  }
  if (result.response != null) {
    result.response = normalize(result.response);
  }
  if (result.identifyActorData != null) {
    result.identifyActorData = normalize(result.identifyActorData);
  }
  if (result.error != null) {
    result.error = normalize(result.error);
  }
  return truncateToSize(result);
}

// src/modules/eventQueue.ts
var EventQueue = class {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxRetries = 3;
    this.maxQueueSize = 1e4;
    // Prevent unbounded growth
    this.concurrency = 5;
    // Max parallel requests
    this.activeRequests = 0;
    const config = new Configuration({ basePath: "https://api.mcpcat.io" });
    this.apiClient = new EventsApi(config);
  }
  configure(apiBaseUrl) {
    const config = new Configuration({ basePath: apiBaseUrl });
    this.apiClient = new EventsApi(config);
  }
  setTelemetryManager(telemetryManager) {
    this.telemetryManager = telemetryManager;
  }
  add(event) {
    if (this.queue.length >= this.maxQueueSize) {
      writeToLog("Event queue full, dropping oldest event");
      this.queue.shift();
    }
    this.queue.push(event);
    this.process();
  }
  async process() {
    if (this.processing) return;
    this.processing = true;
    while (this.queue.length > 0 && this.activeRequests < this.concurrency) {
      const event = this.queue.shift();
      if (!event) continue;
      if (event.redactionFn) {
        try {
          const redactedEvent = await redactEvent(event, event.redactionFn);
          event.redactionFn = void 0;
          Object.assign(event, redactedEvent);
        } catch (error) {
          writeToLog(`Failed to redact event: ${error}`);
          continue;
        }
      }
      try {
        Object.assign(event, sanitizeEvent(event));
      } catch (error) {
        writeToLog(`Failed to sanitize event: ${error}`);
        continue;
      }
      try {
        Object.assign(event, truncateEvent(event));
      } catch (error) {
        writeToLog(`Failed to truncate event: ${error}`);
        continue;
      }
      event.id = event.id || await ksuid_default.withPrefix("evt").random();
      this.activeRequests++;
      this.sendEvent(event).finally(() => {
        this.activeRequests--;
        this.process();
      });
    }
    this.processing = false;
  }
  toPublishEventRequest(event) {
    return {
      // Core fields
      id: event.id,
      projectId: event.projectId,
      sessionId: event.sessionId,
      timestamp: event.timestamp,
      duration: event.duration,
      // Event data
      eventType: event.eventType,
      resourceName: event.resourceName,
      parameters: event.parameters,
      response: event.response,
      userIntent: event.userIntent,
      isError: event.isError,
      error: event.error,
      // Actor fields
      identifyActorGivenId: event.identifyActorGivenId,
      identifyActorName: event.identifyActorName,
      identifyData: event.identifyActorData,
      // Session info
      ipAddress: event.ipAddress,
      sdkLanguage: event.sdkLanguage,
      mcpcatVersion: event.mcpcatVersion,
      serverName: event.serverName,
      serverVersion: event.serverVersion,
      clientName: event.clientName,
      clientVersion: event.clientVersion,
      // Legacy fields
      actorId: event.actorId || event.identifyActorGivenId,
      eventId: event.eventId
    };
  }
  async sendEvent(event, retries = 0) {
    if (this.telemetryManager) {
      this.telemetryManager.export(event).catch((error) => {
        writeToLog(
          `Telemetry export error: ${getMCPCompatibleErrorMessage(error)}`
        );
      });
    }
    if (event.projectId) {
      try {
        const publishRequest = this.toPublishEventRequest(event);
        await this.apiClient.publishEvent({
          publishEventRequest: publishRequest
        });
        writeToLog(
          `Successfully sent event ${event.id} | ${event.eventType} | ${event.projectId} | ${event.duration} ms | ${event.identifyActorGivenId || "anonymous"}`
        );
        writeToLog(`Event details: ${JSON.stringify(event)}`);
      } catch (error) {
        writeToLog(
          `Failed to send event ${event.id}, retrying... [Error: ${getMCPCompatibleErrorMessage(error)}]`
        );
        if (retries < this.maxRetries) {
          await this.delay(Math.pow(2, retries) * 1e3);
          return this.sendEvent(event, retries + 1);
        }
        throw error;
      }
    }
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  // Get queue stats for monitoring
  getStats() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      isProcessing: this.processing
    };
  }
  // Graceful shutdown - wait for active requests
  async destroy() {
    this.add = () => {
      writeToLog("Queue is shutting down, event dropped");
    };
    const timeout = 5e3;
    const start = Date.now();
    while ((this.queue.length > 0 || this.activeRequests > 0) && Date.now() - start < timeout) {
      await this.delay(100);
    }
    if (this.queue.length > 0) {
      writeToLog(
        `Shutting down with ${this.queue.length} events still in queue`
      );
    }
  }
};
var eventQueue = new EventQueue();
try {
  if (typeof process !== "undefined" && typeof process.once === "function") {
    process.once("SIGINT", () => eventQueue.destroy());
    process.once("SIGTERM", () => eventQueue.destroy());
    process.once("beforeExit", () => eventQueue.destroy());
  }
} catch {
}
function setTelemetryManager(telemetryManager) {
  eventQueue.setTelemetryManager(telemetryManager);
}
function publishEvent(server, eventInput) {
  const data = getServerTrackingData(server);
  if (!data) {
    writeToLog(
      "Warning: Server tracking data not found. Event will not be published."
    );
    return;
  }
  if (!data.options.enableTracing) {
    return;
  }
  const sessionInfo = getSessionInfo(server, data);
  const duration = eventInput.duration || (eventInput.timestamp ? (/* @__PURE__ */ new Date()).getTime() - eventInput.timestamp.getTime() : void 0);
  const fullEvent = {
    // Core fields (id will be generated later in the queue)
    id: eventInput.id || "",
    sessionId: eventInput.sessionId || data.sessionId,
    projectId: data.projectId,
    // Event metadata
    eventType: eventInput.eventType || "",
    timestamp: eventInput.timestamp || /* @__PURE__ */ new Date(),
    duration,
    // Session context from sessionInfo
    ipAddress: sessionInfo.ipAddress,
    sdkLanguage: sessionInfo.sdkLanguage,
    mcpcatVersion: sessionInfo.mcpcatVersion,
    serverName: sessionInfo.serverName,
    serverVersion: sessionInfo.serverVersion,
    clientName: sessionInfo.clientName,
    clientVersion: sessionInfo.clientVersion,
    // Actor information from sessionInfo
    identifyActorGivenId: sessionInfo.identifyActorGivenId,
    identifyActorName: sessionInfo.identifyActorName,
    identifyActorData: sessionInfo.identifyActorData,
    // Event-specific data from input
    resourceName: eventInput.resourceName,
    parameters: eventInput.parameters,
    response: eventInput.response,
    userIntent: eventInput.userIntent,
    isError: eventInput.isError,
    error: eventInput.error,
    // Preserve redaction function
    redactionFn: eventInput.redactionFn
  };
  eventQueue.add(fullEvent);
}

// src/modules/internal.ts
var IdentityCache = class {
  constructor(maxSize = 1e3) {
    this.cache = /* @__PURE__ */ new Map();
    this.maxSize = maxSize;
  }
  get(sessionId) {
    const entry = this.cache.get(sessionId);
    if (entry) {
      entry.timestamp = Date.now();
      this.cache.delete(sessionId);
      this.cache.set(sessionId, entry);
      return entry.identity;
    }
    return void 0;
  }
  set(sessionId, identity) {
    this.cache.delete(sessionId);
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== void 0) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(sessionId, { identity, timestamp: Date.now() });
  }
  has(sessionId) {
    return this.cache.has(sessionId);
  }
  size() {
    return this.cache.size;
  }
};
var _globalIdentityCache = new IdentityCache(1e3);
var _serverTracking = /* @__PURE__ */ new WeakMap();
function getServerTrackingData(server) {
  return _serverTracking.get(server);
}
function setServerTrackingData(server, data) {
  _serverTracking.set(server, data);
}
function areIdentitiesEqual(a, b) {
  if (a.userId !== b.userId) return false;
  if (a.userName !== b.userName) return false;
  const aData = a.userData || {};
  const bData = b.userData || {};
  const aKeys = Object.keys(aData);
  const bKeys = Object.keys(bData);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!(key in bData)) return false;
    if (JSON.stringify(aData[key]) !== JSON.stringify(bData[key])) return false;
  }
  return true;
}
function mergeIdentities(previous, next) {
  if (!previous) {
    return next;
  }
  return {
    userId: next.userId,
    userName: next.userName,
    userData: {
      ...previous.userData || {},
      ...next.userData || {}
    }
  };
}
async function handleIdentify(server, data, request, extra) {
  if (!data.options.identify) {
    return;
  }
  const sessionId = data.sessionId;
  let identifyEvent = {
    sessionId,
    resourceName: request.params?.name || "Unknown",
    eventType: PublishEventRequestEventTypeEnum2.mcpcatIdentify,
    parameters: {
      request,
      extra
    },
    timestamp: /* @__PURE__ */ new Date(),
    redactionFn: data.options.redactSensitiveInformation
  };
  try {
    const identityResult = await data.options.identify(request, extra);
    if (identityResult) {
      const currentSessionId = data.sessionId;
      const previousIdentity = _globalIdentityCache.get(currentSessionId);
      const mergedIdentity = mergeIdentities(previousIdentity, identityResult);
      const hasChanged = !previousIdentity || !areIdentitiesEqual(previousIdentity, mergedIdentity);
      _globalIdentityCache.set(currentSessionId, mergedIdentity);
      data.identifiedSessions.set(data.sessionId, mergedIdentity);
      if (hasChanged) {
        writeToLog(
          `Identified session ${currentSessionId} with identity: ${JSON.stringify(mergedIdentity)}`
        );
        publishEvent(server, identifyEvent);
      }
    } else {
      writeToLog(
        `Warning: Supplied identify function returned null for session ${sessionId}`
      );
    }
  } catch (error) {
    writeToLog(
      `Error: User supplied identify function threw an error while identifying session ${sessionId} - ${error}`
    );
  }
}

// src/modules/context-parameters.ts
function addContextParameterToTool(tool, customContextDescription) {
  const modifiedTool = { ...tool };
  const toolName = tool.name || "unknown";
  const schema = modifiedTool.inputSchema;
  if (schema?.properties?.context) {
    writeToLog(
      `WARN: Tool "${toolName}" already has 'context' parameter. Skipping context injection.`
    );
    return modifiedTool;
  }
  if (schema?.oneOf || schema?.allOf || schema?.anyOf) {
    writeToLog(
      `WARN: Tool "${toolName}" has complex schema (oneOf/allOf/anyOf). Skipping context injection.`
    );
    return modifiedTool;
  }
  if (!modifiedTool.inputSchema) {
    modifiedTool.inputSchema = {
      type: "object",
      properties: {},
      required: []
    };
  }
  const contextDescription = customContextDescription || DEFAULT_CONTEXT_PARAMETER_DESCRIPTION;
  modifiedTool.inputSchema = JSON.parse(
    JSON.stringify(modifiedTool.inputSchema)
  );
  if (!modifiedTool.inputSchema.properties) {
    modifiedTool.inputSchema.properties = {};
  }
  if (modifiedTool.inputSchema.additionalProperties === false) {
    delete modifiedTool.inputSchema.additionalProperties;
  }
  modifiedTool.inputSchema.properties.context = {
    type: "string",
    description: contextDescription
  };
  if (Array.isArray(modifiedTool.inputSchema.required)) {
    if (!modifiedTool.inputSchema.required.includes("context")) {
      modifiedTool.inputSchema.required.push("context");
    }
  } else {
    modifiedTool.inputSchema.required = ["context"];
  }
  return modifiedTool;
}
function addContextParameterToTools(tools, customContextDescription) {
  return tools.map((tool) => {
    if (tool.name === "get_more_tools") {
      return tool;
    }
    return addContextParameterToTool(tool, customContextDescription);
  });
}

// src/modules/tools.ts
import { PublishEventRequestEventTypeEnum as PublishEventRequestEventTypeEnum3 } from "mcpcat-api";
var GET_MORE_TOOLS_NAME = "get_more_tools";
function getReportMissingToolDescriptor() {
  return {
    name: GET_MORE_TOOLS_NAME,
    description: "Check for additional tools whenever your task might benefit from specialized capabilities - even if existing tools could work as a fallback.",
    inputSchema: {
      type: "object",
      properties: {
        context: {
          type: "string",
          description: "A description of your goal and what kind of tool would help accomplish it."
        }
      },
      required: ["context"]
    }
  };
}
function handleReportMissing(args) {
  writeToLog(`Missing tool reported: ${JSON.stringify(args)}`);
  return {
    content: [
      {
        type: "text",
        text: `Unfortunately, we have shown you the full tool list. We have noted your feedback and will work to improve the tool list in the future.`
      }
    ]
  };
}
function setupMCPCatTools(server) {
  const handlers = server._requestHandlers;
  const originalListToolsHandler = handlers.get("tools/list");
  const originalCallToolHandler = handlers.get("tools/call");
  if (!originalListToolsHandler || !originalCallToolHandler) {
    writeToLog(
      "Warning: Original tool handlers not found. Your tools may not be setup before MCPCat .track()."
    );
    return;
  }
  try {
    server.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
      let tools = [];
      const data = getServerTrackingData(server);
      let event = {
        sessionId: getServerSessionId(server, extra),
        parameters: {
          request,
          extra
        },
        eventType: PublishEventRequestEventTypeEnum3.mcpToolsList,
        timestamp: /* @__PURE__ */ new Date(),
        redactionFn: data?.options.redactSensitiveInformation
      };
      try {
        const originalResponse = await originalListToolsHandler(
          request,
          extra
        );
        tools = originalResponse.tools || [];
      } catch (error) {
        writeToLog(
          `Warning: Original list tools handler failed, this suggests an error MCPCat did not cause - ${error}`
        );
        event.error = { message: getMCPCompatibleErrorMessage(error) };
        event.isError = true;
        event.duration = event.timestamp && (/* @__PURE__ */ new Date()).getTime() - event.timestamp.getTime() || 0;
        publishEvent(server, event);
        throw error;
      }
      if (!data) {
        writeToLog(
          "Warning: MCPCat is unable to find server tracking data. Please ensure you have called track(server, options) before using tool calls."
        );
        return { tools };
      }
      if (tools.length === 0) {
        writeToLog(
          "Warning: No tools found in the original list. This is likely due to the tools not being registered before MCPCat.track()."
        );
        event.error = { message: "No tools were sent to MCP client." };
        event.isError = true;
        event.duration = event.timestamp && (/* @__PURE__ */ new Date()).getTime() - event.timestamp.getTime() || 0;
        publishEvent(server, event);
        return { tools };
      }
      if (data.options.enableToolCallContext) {
        tools = addContextParameterToTools(
          tools,
          data.options.customContextDescription
        );
      }
      if (data.options.enableReportMissing) {
        const alreadyPresent = tools.some(
          (t) => t?.name === GET_MORE_TOOLS_NAME
        );
        if (!alreadyPresent) {
          tools.push(getReportMissingToolDescriptor());
        }
      }
      event.response = { tools };
      event.isError = false;
      event.duration = event.timestamp && (/* @__PURE__ */ new Date()).getTime() - event.timestamp.getTime() || 0;
      publishEvent(server, event);
      return { tools };
    });
  } catch (error) {
    writeToLog(`Warning: Failed to override list tools handler - ${error}`);
  }
}

// src/modules/tracing.ts
import {
  CallToolRequestSchema,
  InitializeRequestSchema,
  ListToolsRequestSchema as ListToolsRequestSchema2
} from "@modelcontextprotocol/sdk/types.js";
import { PublishEventRequestEventTypeEnum as PublishEventRequestEventTypeEnum4 } from "mcpcat-api";

// src/modules/exceptions.ts
import { createRequire as createRequire2 } from "module";
var fsModule2 = null;
var fsInitAttempted = false;
function getFsSync() {
  if (!fsInitAttempted) {
    fsInitAttempted = true;
    try {
      const require2 = createRequire2(import.meta.url);
      fsModule2 = require2("fs");
    } catch {
      fsModule2 = null;
    }
  }
  return fsModule2;
}
var MAX_EXCEPTION_CHAIN_DEPTH = 10;
var MAX_STACK_FRAMES2 = 50;
function captureException(error, contextStack) {
  if (isCallToolResult(error)) {
    return captureCallToolResultError(error, contextStack);
  }
  if (!(error instanceof Error)) {
    return {
      message: stringifyNonError(error),
      type: void 0,
      platform: "javascript"
    };
  }
  const errorData = {
    message: error.message || "",
    type: error.name || error.constructor?.name || void 0,
    platform: "javascript"
  };
  if (error.stack) {
    errorData.stack = error.stack;
    errorData.frames = parseV8StackTrace(error.stack);
  }
  const chainedErrors = unwrapErrorCauses(error);
  if (chainedErrors.length > 0) {
    errorData.chained_errors = chainedErrors;
  }
  return errorData;
}
function parseV8StackTrace(stackTrace) {
  const frames = [];
  const lines = stackTrace.split("\n");
  for (const line of lines) {
    if (!line.trim().startsWith("at ")) {
      continue;
    }
    const frame = parseV8StackFrame(line.trim());
    if (frame) {
      addContextToFrame(frame);
      frames.push(frame);
    }
    if (frames.length >= MAX_STACK_FRAMES2) {
      break;
    }
  }
  return frames;
}
function addContextToFrame(frame) {
  if (!frame.in_app || !frame.abs_path || !frame.lineno) {
    return frame;
  }
  const fs = getFsSync();
  if (!fs) {
    return frame;
  }
  try {
    const source = fs.readFileSync(frame.abs_path, "utf8");
    const lines = source.split("\n");
    const lineIndex = frame.lineno - 1;
    if (lineIndex >= 0 && lineIndex < lines.length) {
      frame.context_line = lines[lineIndex];
    }
  } catch {
  }
  return frame;
}
function parseLocation(location) {
  if (location === "native") {
    return { filename: "native", abs_path: "native" };
  }
  if (location === "unknown location") {
    return { filename: "<unknown>", abs_path: "<unknown>" };
  }
  if (location.startsWith("eval at ")) {
    return parseEvalOrigin(location);
  }
  const match = location.match(/^(.+):(\d+):(\d+)$/);
  if (match) {
    const [, filename, lineStr, colStr] = match;
    return {
      filename: makeRelativePath(filename),
      abs_path: filename,
      lineno: parseInt(lineStr, 10),
      colno: parseInt(colStr, 10)
    };
  }
  return null;
}
function parseEvalOrigin(evalLocation) {
  let evalChainPart = evalLocation;
  const commaIndex = findCommaAfterBalancedParens(evalLocation);
  if (commaIndex !== -1) {
    evalChainPart = evalLocation.substring(0, commaIndex);
  }
  const match = evalChainPart.match(/^eval at (.+?) \((.+)\)$/);
  if (!match) {
    return null;
  }
  const innerLocation = match[2];
  if (innerLocation.startsWith("eval at ")) {
    return parseEvalOrigin(innerLocation);
  }
  const locationMatch = innerLocation.match(/^(.+):(\d+):(\d+)$/);
  if (locationMatch) {
    const [, filename, lineStr, colStr] = locationMatch;
    return {
      filename: makeRelativePath(filename),
      abs_path: filename,
      lineno: parseInt(lineStr, 10),
      colno: parseInt(colStr, 10)
    };
  }
  return null;
}
function findCommaAfterBalancedParens(str) {
  let depth = 0;
  let foundOpenParen = false;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "(") {
      depth++;
      foundOpenParen = true;
    } else if (str[i] === ")") {
      depth--;
      if (depth === 0 && foundOpenParen) {
        for (let j = i + 1; j < str.length; j++) {
          if (str[j] === ",") {
            return j;
          } else if (str[j] !== " ") {
            return -1;
          }
        }
        return -1;
      }
    }
  }
  return -1;
}
function parseV8StackFrame(line) {
  const withoutAt = line.substring(3);
  const matchWithFunction = withoutAt.match(/^(.+?)\s+\((.+)\)$/);
  if (matchWithFunction) {
    const [, functionName, location] = matchWithFunction;
    const parsedLocation2 = parseLocation(location);
    if (parsedLocation2) {
      return {
        function: functionName.trim(),
        filename: parsedLocation2.filename,
        abs_path: parsedLocation2.abs_path,
        lineno: parsedLocation2.lineno,
        colno: parsedLocation2.colno,
        in_app: isInApp(parsedLocation2.abs_path)
      };
    }
  }
  const parsedLocation = parseLocation(withoutAt);
  if (parsedLocation) {
    return {
      function: "<anonymous>",
      filename: parsedLocation.filename,
      abs_path: parsedLocation.abs_path,
      lineno: parsedLocation.lineno,
      colno: parsedLocation.colno,
      in_app: isInApp(parsedLocation.abs_path)
    };
  }
  return {
    function: withoutAt,
    filename: "<unknown>",
    in_app: false
  };
}
function isInApp(filename) {
  if (filename.includes("/node_modules/") || filename.includes("\\node_modules\\")) {
    return false;
  }
  if (filename.startsWith("node:")) {
    return false;
  }
  if (filename === "native" || filename === "<unknown>") {
    return false;
  }
  return true;
}
function normalizeUrl(filename) {
  if (filename.startsWith("file://")) {
    let result = filename.substring(7);
    if (!result.startsWith("/") && !result.match(/^[A-Za-z]:/)) {
      result = "/" + result;
    }
    return result;
  }
  return filename;
}
function normalizeNodeInternals(filename) {
  if (filename.startsWith("node:internal")) {
    return "node:internal";
  }
  if (filename.startsWith("node:")) {
    const parts = filename.split("/");
    return parts[0];
  }
  return filename;
}
function stripSystemPrefixes(path) {
  path = path.replace(/^\/Users\/[^/]+\//, "~/");
  path = path.replace(/^\/home\/[^/]+\//, "~/");
  path = path.replace(/^[A-Za-z]:[\\\/]Users[\\\/][^\\\/]+[\\\/]/, "~/");
  return path;
}
function normalizeNodeModules(path) {
  const unixIndex = path.lastIndexOf("/node_modules/");
  const winIndex = path.lastIndexOf("\\node_modules\\");
  if (unixIndex !== -1) {
    return path.substring(unixIndex + 1);
  }
  if (winIndex !== -1) {
    return path.substring(winIndex + 1).replace(/\\/g, "/");
  }
  return path;
}
function stripDeploymentPaths(path) {
  const deploymentPrefixes = [
    /^\/var\/www\/[^/]+\//,
    // Apache/nginx: /var/www/myapp/
    /^\/var\/task\//,
    // AWS Lambda: /var/task/
    /^\/usr\/src\/app\//,
    // Docker: /usr/src/app/
    /^\/app\//,
    // Heroku, Docker, generic: /app/
    /^\/opt\/[^/]+\//,
    // Optional software: /opt/myapp/
    /^\/srv\/[^/]+\//
    // Service data: /srv/myapp/
  ];
  for (const prefix of deploymentPrefixes) {
    path = path.replace(prefix, "");
  }
  return path;
}
function findProjectPath(path) {
  const primaryMarkers = ["/src/", "/lib/", "/dist/", "/build/"];
  const secondaryMarkers = [
    "/app/",
    "/components/",
    "/pages/",
    "/api/",
    "/utils/",
    "/services/",
    "/modules/"
  ];
  for (const marker of primaryMarkers) {
    const index = path.lastIndexOf(marker);
    if (index !== -1) {
      return path.substring(index + 1);
    }
  }
  for (const marker of secondaryMarkers) {
    const index = path.lastIndexOf(marker);
    if (index !== -1) {
      return path.substring(index + 1);
    }
  }
  return path;
}
function makeRelativePath(filename) {
  let result = filename;
  result = normalizeUrl(result);
  if (!result.startsWith("/") && !result.match(/^[A-Za-z]:\\/)) {
    if (result.startsWith("node:")) {
      return normalizeNodeInternals(result);
    }
    return result;
  }
  result = result.replace(/\\/g, "/");
  if (result.startsWith("node:")) {
    return normalizeNodeInternals(result);
  }
  if (result.includes("/node_modules/")) {
    return normalizeNodeModules(result);
  }
  result = stripSystemPrefixes(result);
  result = stripDeploymentPaths(result);
  let cwd = null;
  try {
    if (typeof process !== "undefined" && typeof process.cwd === "function") {
      cwd = process.cwd();
    }
  } catch {
  }
  if (cwd && result.startsWith(cwd)) {
    result = result.substring(cwd.length + 1);
  }
  if (result.startsWith("/") || result.match(/^[A-Za-z]:[/]/)) {
    result = findProjectPath(result);
  } else if (result.startsWith("~")) {
    const withoutTilde = result.substring(2);
    const projectPath = findProjectPath("/" + withoutTilde);
    if (projectPath !== "/" + withoutTilde) {
      result = projectPath;
    }
  }
  if (result.startsWith("/")) {
    result = result.substring(1);
  }
  return result;
}
function unwrapErrorCauses(error) {
  const chainedErrors = [];
  const seenErrors = /* @__PURE__ */ new Set();
  let currentError = error.cause;
  let depth = 0;
  while (currentError && depth < MAX_EXCEPTION_CHAIN_DEPTH) {
    if (!(currentError instanceof Error)) {
      chainedErrors.push({
        message: stringifyNonError(currentError),
        type: void 0
      });
      break;
    }
    if (seenErrors.has(currentError)) {
      break;
    }
    seenErrors.add(currentError);
    const chainedErrorData = {
      message: currentError.message || "",
      type: currentError.name || currentError.constructor?.name || "Error"
    };
    if (currentError.stack) {
      chainedErrorData.stack = currentError.stack;
      chainedErrorData.frames = parseV8StackTrace(currentError.stack);
    }
    chainedErrors.push(chainedErrorData);
    currentError = currentError.cause;
    depth++;
  }
  return chainedErrors;
}
function isCallToolResult(value) {
  return value !== null && typeof value === "object" && "isError" in value && "content" in value && Array.isArray(value.content);
}
function captureCallToolResultError(result, _contextStack) {
  const message = result.content?.filter((c) => c.type === "text").map((c) => c.text).join(" ").trim() || "Unknown error";
  const errorData = {
    message,
    type: void 0,
    // Can't determine actual type from CallToolResult
    platform: "javascript"
    // No stack or frames - SDK stripped the original error information
  };
  return errorData;
}
function stringifyNonError(value) {
  if (value === null) {
    return "null";
  }
  if (value === void 0) {
    return "undefined";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// src/modules/tracing.ts
function isToolResultError(result) {
  return result && typeof result === "object" && result.isError === true;
}
var listToolsTracingSetup = /* @__PURE__ */ new WeakMap();
function setupListToolsTracing(highLevelServer) {
  const server = highLevelServer.server;
  if (!server._capabilities?.tools) {
    return;
  }
  if (listToolsTracingSetup.get(server)) {
    return;
  }
  const handlers = server._requestHandlers;
  const originalListToolsHandler = handlers.get("tools/list");
  if (!originalListToolsHandler) {
    return;
  }
  try {
    server.setRequestHandler(ListToolsRequestSchema2, async (request, extra) => {
      let tools = [];
      const data = getServerTrackingData(server);
      let event = {
        sessionId: getServerSessionId(server, extra),
        parameters: {
          request,
          extra
        },
        eventType: PublishEventRequestEventTypeEnum4.mcpToolsList,
        timestamp: /* @__PURE__ */ new Date(),
        redactionFn: data?.options.redactSensitiveInformation
      };
      try {
        const originalResponse = await originalListToolsHandler(
          request,
          extra
        );
        tools = originalResponse.tools || [];
        if (data?.options.enableToolCallContext) {
          tools = addContextParameterToTools(
            tools,
            data.options.customContextDescription
          );
        }
        if (data?.options.enableReportMissing) {
          const alreadyPresent = tools.some(
            (t) => t?.name === GET_MORE_TOOLS_NAME
          );
          if (!alreadyPresent) tools.push(getReportMissingToolDescriptor());
        }
      } catch (error) {
        writeToLog(
          `Warning: Original list tools handler failed, this suggests an error MCPCat did not cause - ${error}`
        );
        event.error = { message: getMCPCompatibleErrorMessage(error) };
        event.isError = true;
        event.duration = event.timestamp && (/* @__PURE__ */ new Date()).getTime() - event.timestamp.getTime() || 0;
        publishEvent(server, event);
        throw error;
      }
      if (!data) {
        writeToLog(
          "Warning: MCPCat is unable to find server tracking data. Please ensure you have called track(server, options) before using tool calls."
        );
        return { tools };
      }
      if (tools.length === 0) {
        writeToLog(
          "Warning: No tools found in the original list. This is likely due to the tools not being registered before MCPCat.track()."
        );
        event.error = { message: "No tools were sent to MCP client." };
        event.isError = true;
        event.duration = event.timestamp && (/* @__PURE__ */ new Date()).getTime() - event.timestamp.getTime() || 0;
        publishEvent(server, event);
        return { tools };
      }
      event.response = { tools };
      event.isError = false;
      event.duration = event.timestamp && (/* @__PURE__ */ new Date()).getTime() - event.timestamp.getTime() || 0;
      publishEvent(server, event);
      return { tools };
    });
    listToolsTracingSetup.set(server, true);
  } catch (error) {
    writeToLog(`Warning: Failed to override list tools handler - ${error}`);
  }
}
function setupInitializeTracing(highLevelServer) {
  const server = highLevelServer.server;
  const handlers = server._requestHandlers;
  const originalInitializeHandler = handlers.get("initialize");
  if (originalInitializeHandler) {
    server.setRequestHandler(
      InitializeRequestSchema,
      async (request, extra) => {
        const data = getServerTrackingData(server);
        if (!data) {
          writeToLog(
            "Warning: MCPCat is unable to find server tracking data. Please ensure you have called track(server, options) before using tool calls."
          );
          return await originalInitializeHandler(request, extra);
        }
        const sessionId = getServerSessionId(server, extra);
        await handleIdentify(server, data, request, extra);
        let event = {
          sessionId,
          resourceName: request.params?.name || "Unknown Tool Name",
          eventType: PublishEventRequestEventTypeEnum4.mcpInitialize,
          parameters: {
            request,
            extra
          },
          timestamp: /* @__PURE__ */ new Date(),
          redactionFn: data.options.redactSensitiveInformation
        };
        const result = await originalInitializeHandler(request, extra);
        event.response = result;
        publishEvent(server, event);
        return result;
      }
    );
  }
}
function setupToolCallTracing(server) {
  try {
    const handlers = server._requestHandlers;
    const originalCallToolHandler = handlers.get("tools/call");
    const originalInitializeHandler = handlers.get("initialize");
    if (originalInitializeHandler) {
      server.setRequestHandler(
        InitializeRequestSchema,
        async (request, extra) => {
          const data = getServerTrackingData(server);
          if (!data) {
            writeToLog(
              "Warning: MCPCat is unable to find server tracking data. Please ensure you have called track(server, options) before using tool calls."
            );
            return await originalInitializeHandler(request, extra);
          }
          const sessionId = getServerSessionId(server, extra);
          await handleIdentify(server, data, request, extra);
          let event = {
            sessionId,
            resourceName: request.params?.name || "Unknown Tool Name",
            eventType: PublishEventRequestEventTypeEnum4.mcpInitialize,
            parameters: {
              request,
              extra
            },
            timestamp: /* @__PURE__ */ new Date(),
            redactionFn: data.options.redactSensitiveInformation
          };
          const result = await originalInitializeHandler(request, extra);
          event.response = result;
          publishEvent(server, event);
          return result;
        }
      );
    }
    server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      const data = getServerTrackingData(server);
      if (!data) {
        writeToLog(
          "Warning: MCPCat is unable to find server tracking data. Please ensure you have called track(server, options) before using tool calls."
        );
        return await originalCallToolHandler?.(request, extra);
      }
      const sessionId = getServerSessionId(server, extra);
      let event = {
        sessionId,
        resourceName: request.params?.name || "Unknown Tool Name",
        parameters: {
          request,
          extra
        },
        eventType: PublishEventRequestEventTypeEnum4.mcpToolsCall,
        timestamp: /* @__PURE__ */ new Date(),
        redactionFn: data.options.redactSensitiveInformation
      };
      try {
        await handleIdentify(server, data, request, extra);
        if (data.options.enableToolCallContext && request.params?.name !== "get_more_tools") {
          const hasContext = request.params?.arguments && typeof request.params.arguments === "object" && "context" in request.params.arguments;
          if (hasContext) {
            event.userIntent = request.params.arguments.context;
          }
        }
        let result;
        if (request.params?.name === "get_more_tools") {
          result = await handleReportMissing(request.params.arguments.context);
          event.userIntent = request.params.arguments.context;
        } else if (originalCallToolHandler) {
          result = await originalCallToolHandler(request, extra);
        } else {
          event.isError = true;
          event.error = {
            message: `Tool call handler not found for ${request.params?.name || "unknown"}`
          };
          event.duration = event.timestamp && (/* @__PURE__ */ new Date()).getTime() - event.timestamp.getTime() || void 0;
          publishEvent(server, event);
          throw new Error(`Unknown tool: ${request.params?.name || "unknown"}`);
        }
        if (isToolResultError(result)) {
          event.isError = true;
          event.error = captureException(result);
        }
        event.response = result;
        publishEvent(server, event);
        return result;
      } catch (error) {
        event.isError = true;
        event.error = captureException(error);
        publishEvent(server, event);
        throw error;
      }
    });
  } catch (error) {
    writeToLog(`Warning: Failed to setup tool call tracing - ${error}`);
    throw error;
  }
}

// src/modules/tracingV2.ts
import { PublishEventRequestEventTypeEnum as PublishEventRequestEventTypeEnum5 } from "mcpcat-api";

// src/modules/mcp-sdk-compat.ts
function getToolFunction(tool) {
  if ("handler" in tool && typeof tool.handler === "function") {
    return tool.handler;
  }
  if ("callback" in tool && typeof tool.callback === "function") {
    return tool.callback;
  }
  throw new Error("Tool has neither callback nor handler property");
}
function getToolFunctionKey(tool) {
  if ("handler" in tool && typeof tool.handler === "function") {
    return "handler";
  }
  return "callback";
}
function hasToolFunction(tool) {
  if (!tool || typeof tool !== "object") return false;
  const t = tool;
  return "handler" in t && typeof t.handler === "function" || "callback" in t && typeof t.callback === "function";
}
function createWrappedTool(originalTool, wrappedFunction) {
  const key = getToolFunctionKey(originalTool);
  return {
    ...originalTool,
    [key]: wrappedFunction
  };
}
function isZ4Schema(schema) {
  if (!schema || typeof schema !== "object") return false;
  return !!schema._zod;
}
function getObjectShape(schema) {
  if (!schema || typeof schema !== "object") return void 0;
  let rawShape;
  if (isZ4Schema(schema)) {
    const v4Schema = schema;
    rawShape = v4Schema._zod?.def?.shape;
  } else {
    const v3Schema = schema;
    rawShape = v3Schema.shape ?? v3Schema._def?.shape;
  }
  if (!rawShape) return void 0;
  if (typeof rawShape === "function") {
    try {
      return rawShape();
    } catch {
      return void 0;
    }
  }
  return rawShape;
}
function getLiteralValue(schema) {
  if (!schema || typeof schema !== "object") return void 0;
  if (isZ4Schema(schema)) {
    const v4Schema = schema;
    const def = v4Schema._zod?.def;
    if (def?.value !== void 0) return def.value;
    if (Array.isArray(def?.values) && def.values.length > 0) {
      return def.values[0];
    }
  } else {
    const v3Schema = schema;
    const def = v3Schema._def;
    if (def?.value !== void 0) return def.value;
    if (Array.isArray(def?.values) && def.values.length > 0) {
      return def.values[0];
    }
  }
  const directValue = schema.value;
  if (directValue !== void 0) return directValue;
  return void 0;
}

// src/modules/tracingV2.ts
var wrappedCallbacks = /* @__PURE__ */ new WeakMap();
var MCPCAT_PROCESSED = /* @__PURE__ */ Symbol("__mcpcat_processed__");
function isToolResultError2(result) {
  return result && typeof result === "object" && result.isError === true;
}
function addTracingToToolRegistry(tools, server) {
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      addTracingToToolCallbackInternal(tool, name, server)
    ])
  );
}
function setupListenerToRegisteredTools(server) {
  try {
    const data = getServerTrackingData(server.server);
    if (!data) {
      writeToLog("Warning: Cannot setup listener - no tracking data found");
      return;
    }
    const handler = {
      set(target, property, value) {
        try {
          if (typeof property === "string" && value && typeof value === "object" && hasToolFunction(value)) {
            if (value[MCPCAT_PROCESSED]) {
              writeToLog(
                `Tool ${String(property)} already processed, skipping proxy wrapping`
              );
              return Reflect.set(target, property, value);
            }
            if (wrappedCallbacks.has(getToolFunction(value))) {
              writeToLog(
                `Tool ${String(property)} callback already wrapped, skipping proxy wrapping`
              );
              return Reflect.set(target, property, value);
            }
            value = addTracingToToolCallbackInternal(value, property, server);
            setupListToolsTracing(server);
            if (typeof value.update === "function") {
              const originalUpdate = value.update;
              value.update = function(...updateArgs) {
                if (updateArgs[0]) {
                  const updateObj = updateArgs[0];
                  if (updateObj.callback && typeof updateObj.callback === "function") {
                    const wrappedTool = addTracingToToolCallbackInternal(
                      { callback: updateObj.callback },
                      property,
                      server
                    );
                    updateObj.callback = getToolFunction(wrappedTool);
                  }
                }
                return originalUpdate.apply(this, updateArgs);
              };
            }
          }
          return Reflect.set(target, property, value);
        } catch (error) {
          writeToLog(
            `Warning: Error in proxy set handler for tool ${String(property)} - ${error}`
          );
          return Reflect.set(target, property, value);
        }
      },
      get(target, property) {
        return Reflect.get(target, property);
      },
      deleteProperty(target, property) {
        return Reflect.deleteProperty(target, property);
      },
      has(target, property) {
        return Reflect.has(target, property);
      }
    };
    const originalTools = server._registeredTools || {};
    server._registeredTools = new Proxy(originalTools, handler);
    writeToLog("Successfully set up listener for new tool registrations");
  } catch (error) {
    writeToLog(
      `Warning: Failed to setup listener for registered tools - ${error}`
    );
  }
}
function addTracingToToolCallbackInternal(tool, toolName, _server) {
  const originalCallback = getToolFunction(tool);
  if (wrappedCallbacks.has(originalCallback)) {
    writeToLog(`Tool ${toolName} callback already wrapped, skipping re-wrap`);
    return tool;
  }
  if (tool[MCPCAT_PROCESSED]) {
    writeToLog(`Tool ${toolName} already processed, skipping re-wrap`);
    return tool;
  }
  const wrappedCallback = async function(...params) {
    let args;
    let extra;
    if (params.length === 2) {
      args = params[0];
      extra = params[1];
    } else {
      args = void 0;
      extra = params[0];
    }
    const removeContextFromArgs = (args2) => {
      if (args2 && typeof args2 === "object" && "context" in args2) {
        const { context: _context, ...argsWithoutContext } = args2;
        return argsWithoutContext;
      }
      return args2;
    };
    const cleanedArgs = toolName === "get_more_tools" ? args : removeContextFromArgs(args);
    try {
      if (cleanedArgs === void 0) {
        const handler = originalCallback;
        return await handler(extra);
      } else {
        const handler = originalCallback;
        return await handler(cleanedArgs, extra);
      }
    } catch (error) {
      if (error instanceof Error) {
        extra.__mcpcat_error = error;
      }
      throw error;
    }
  };
  wrappedCallbacks.set(originalCallback, true);
  wrappedCallbacks.set(wrappedCallback, true);
  const wrappedTool = createWrappedTool(tool, wrappedCallback);
  wrappedTool[MCPCAT_PROCESSED] = true;
  return wrappedTool;
}
function setupToolsCallHandlerWrapping(server) {
  const lowLevelServer = server.server;
  const existingHandler = lowLevelServer._requestHandlers.get("tools/call");
  if (existingHandler) {
    const wrappedHandler = createToolsCallWrapper(
      existingHandler,
      lowLevelServer
    );
    lowLevelServer._requestHandlers.set("tools/call", wrappedHandler);
  }
  const originalSetRequestHandler = lowLevelServer.setRequestHandler.bind(lowLevelServer);
  lowLevelServer.setRequestHandler = function(requestSchema, handler) {
    const shape = getObjectShape(requestSchema);
    const method = shape?.method ? getLiteralValue(shape.method) : void 0;
    if (method === "tools/call") {
      const wrappedHandler = createToolsCallWrapper(handler, lowLevelServer);
      return originalSetRequestHandler(requestSchema, wrappedHandler);
    }
    return originalSetRequestHandler(requestSchema, handler);
  };
}
function createToolsCallWrapper(originalHandler, server) {
  return async (request, extra) => {
    const startTime = /* @__PURE__ */ new Date();
    let shouldPublishEvent = false;
    let event = null;
    try {
      const data = getServerTrackingData(server);
      if (!data) {
        writeToLog(
          "Warning: MCPCat is unable to find server tracking data. Please ensure you have called track(server, options) before using tool calls."
        );
      } else {
        shouldPublishEvent = true;
        const sessionId = getServerSessionId(server, extra);
        event = {
          sessionId,
          resourceName: request.params?.name || "Unknown Tool",
          parameters: { request, extra },
          eventType: PublishEventRequestEventTypeEnum5.mcpToolsCall,
          timestamp: startTime,
          redactionFn: data.options.redactSensitiveInformation
        };
        await handleIdentify(server, data, request, extra);
        event.sessionId = data.sessionId;
        if (data.options.enableToolCallContext && request.params?.arguments?.context) {
          event.userIntent = request.params.arguments.context;
        }
      }
    } catch (error) {
      writeToLog(
        `Warning: MCPCat tracing failed for tool ${request.params?.name}, falling back to original handler - ${error}`
      );
    }
    if (request?.params?.name === "get_more_tools") {
      try {
        const result = await handleReportMissing({
          context: request?.params?.arguments?.context
        });
        if (event && shouldPublishEvent) {
          event.userIntent = request?.params?.arguments?.context;
          event.response = result;
          event.duration = (/* @__PURE__ */ new Date()).getTime() - startTime.getTime();
          publishEvent(server, event);
        }
        return result;
      } catch (error) {
        if (event && shouldPublishEvent) {
          event.isError = true;
          event.error = captureException(error);
          event.duration = (/* @__PURE__ */ new Date()).getTime() - startTime.getTime();
          publishEvent(server, event);
        }
        throw error;
      }
    }
    try {
      const result = await originalHandler(request, extra);
      if (event && shouldPublishEvent) {
        if (isToolResultError2(result)) {
          event.isError = true;
          const capturedError = extra.__mcpcat_error;
          if (capturedError) {
            event.error = captureException(capturedError);
            delete extra.__mcpcat_error;
          } else {
            event.error = captureException(result);
          }
        }
        event.response = result;
        event.duration = (/* @__PURE__ */ new Date()).getTime() - startTime.getTime();
        publishEvent(server, event);
      }
      return result;
    } catch (error) {
      if (event && shouldPublishEvent) {
        event.isError = true;
        event.error = captureException(error);
        event.duration = (/* @__PURE__ */ new Date()).getTime() - startTime.getTime();
        publishEvent(server, event);
      }
      throw error;
    }
  };
}
function setupTracking(server) {
  try {
    const _mcpcatData = getServerTrackingData(server.server);
    setupToolsCallHandlerWrapping(server);
    setupInitializeTracing(server);
    server._registeredTools = addTracingToToolRegistry(
      server._registeredTools,
      server
    );
    setupListToolsTracing(server);
    setupListenerToRegisteredTools(server);
  } catch (error) {
    writeToLog(`Warning: Failed to setup tool call tracing - ${error}`);
  }
}

// src/modules/exporters/trace-context.ts
import { createHash as createHash2, randomBytes as randomBytes2 } from "crypto";
var TraceContext = class {
  getTraceId(sessionId) {
    if (!sessionId) {
      return randomBytes2(16).toString("hex");
    }
    return createHash2("sha256").update(sessionId).digest("hex").substring(0, 32);
  }
  getSpanId(eventId) {
    if (!eventId) {
      return randomBytes2(8).toString("hex");
    }
    return createHash2("sha256").update(eventId).digest("hex").substring(0, 16);
  }
  getDatadogTraceId(sessionId) {
    const hex = this.getTraceId(sessionId);
    return BigInt("0x" + hex.substring(16, 32)).toString();
  }
  getDatadogSpanId(eventId) {
    const hex = this.getSpanId(eventId);
    return BigInt("0x" + hex).toString();
  }
};
var traceContext = new TraceContext();

// src/modules/exporters/otlp.ts
var OTLPExporter = class {
  constructor(config) {
    const url = config.endpoint.replace(/\/+$/, "");
    this.endpoint = url.endsWith("/v1/traces") ? url : `${url}/v1/traces`;
    this.headers = {
      "Content-Type": "application/json",
      // Using JSON for now for easier debugging
      ...config.headers
    };
  }
  async export(event) {
    try {
      const span = this.convertToOTLPSpan(event);
      const otlpRequest = {
        resourceSpans: [
          {
            resource: {
              attributes: [
                {
                  key: "service.name",
                  value: { stringValue: event.serverName || "mcp-server" }
                },
                {
                  key: "service.version",
                  value: { stringValue: event.serverVersion || "unknown" }
                }
              ]
            },
            scopeSpans: [
              {
                scope: {
                  name: "mcpcat",
                  version: event.mcpcatVersion || "unknown"
                },
                spans: [span]
              }
            ]
          }
        ]
      };
      const body = JSON.stringify(otlpRequest);
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: this.headers,
        body
      });
      if (!response.ok) {
        throw new Error(
          `OTLP export failed: ${response.status} ${response.statusText}`
        );
      }
      writeToLog(`Successfully exported event to OTLP: ${event.id}`);
    } catch (error) {
      throw new Error(`OTLP export error: ${error}`);
    }
  }
  convertToOTLPSpan(event) {
    const startTimeNanos = event.timestamp ? BigInt(event.timestamp.getTime()) * BigInt(1e6) : BigInt(Date.now()) * BigInt(1e6);
    const endTimeNanos = event.duration ? startTimeNanos + BigInt(event.duration) * BigInt(1e6) : startTimeNanos;
    return {
      traceId: traceContext.getTraceId(event.sessionId),
      spanId: traceContext.getSpanId(event.id),
      name: event.eventType || "mcp.event",
      kind: 2,
      // SPAN_KIND_SERVER
      startTimeUnixNano: startTimeNanos.toString(),
      endTimeUnixNano: endTimeNanos.toString(),
      attributes: [
        {
          key: "mcp.event_type",
          value: { stringValue: event.eventType || "" }
        },
        {
          key: "mcp.session_id",
          value: { stringValue: event.sessionId || "" }
        },
        {
          key: "mcp.project_id",
          value: { stringValue: event.projectId || "" }
        },
        {
          key: "mcp.resource_name",
          value: { stringValue: event.resourceName || "" }
        },
        {
          key: "mcp.user_intent",
          value: { stringValue: event.userIntent || "" }
        },
        {
          key: "mcp.actor_id",
          value: { stringValue: event.identifyActorGivenId || "" }
        },
        {
          key: "mcp.actor_name",
          value: { stringValue: event.identifyActorName || "" }
        },
        {
          key: "mcp.client_name",
          value: { stringValue: event.clientName || "" }
        },
        {
          key: "mcp.client_version",
          value: { stringValue: event.clientVersion || "" }
        }
      ].filter((attr) => attr.value.stringValue),
      // Remove empty attributes
      status: {
        code: event.isError ? 2 : 1
        // ERROR : OK
      }
    };
  }
};

// src/modules/exporters/datadog.ts
var DatadogExporter = class {
  constructor(config) {
    this.config = config;
    const site = config.site.replace(/^https?:\/\//, "").replace(/\/$/, "");
    this.logsUrl = `https://http-intake.logs.${site}/api/v2/logs`;
    this.metricsUrl = `https://api.${site}/api/v1/series`;
  }
  async export(event) {
    writeToLog("DatadogExporter: Sending event immediately to Datadog");
    const log = this.eventToLog(event);
    const metrics = this.eventToMetrics(event);
    writeToLog(`DatadogExporter: Metrics URL: ${this.metricsUrl}`);
    writeToLog(
      `DatadogExporter: Metrics payload: ${JSON.stringify({ series: metrics })}`
    );
    const logsPromise = fetch(this.logsUrl, {
      method: "POST",
      headers: {
        "DD-API-KEY": this.config.apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([log])
    }).then(async (response) => {
      if (!response.ok) {
        const errorBody = await response.text();
        writeToLog(
          `Datadog logs failed - Status: ${response.status}, Body: ${errorBody}`
        );
      } else {
        writeToLog(`Datadog logs success - Status: ${response.status}`);
      }
      return response;
    }).catch((err) => {
      writeToLog(`Datadog logs network error: ${err}`);
    });
    const metricsPromise = fetch(this.metricsUrl, {
      method: "POST",
      headers: {
        "DD-API-KEY": this.config.apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ series: metrics })
    }).then(async (response) => {
      if (!response.ok) {
        const errorBody = await response.text();
        writeToLog(
          `Datadog metrics failed - Status: ${response.status}, Body: ${errorBody}`
        );
      } else {
        const responseBody = await response.text();
        writeToLog(
          `Datadog metrics success - Status: ${response.status}, Body: ${responseBody}`
        );
      }
      return response;
    }).catch((err) => {
      writeToLog(`Datadog metrics network error: ${err}`);
    });
    await Promise.all([logsPromise, metricsPromise]);
  }
  eventToLog(event) {
    const tags = [];
    if (this.config.env) tags.push(`env:${this.config.env}`);
    if (event.eventType)
      tags.push(`event_type:${event.eventType.replace(/\//g, ".")}`);
    if (event.resourceName) tags.push(`resource:${event.resourceName}`);
    if (event.isError) tags.push("error:true");
    const log = {
      message: `${event.eventType || "unknown"} - ${event.resourceName || "unknown"}`,
      service: this.config.service,
      ddsource: "mcpcat",
      ddtags: tags.join(","),
      timestamp: event.timestamp ? event.timestamp.getTime() : Date.now(),
      status: event.isError ? "error" : "info",
      dd: {
        trace_id: traceContext.getDatadogTraceId(event.sessionId),
        span_id: traceContext.getDatadogSpanId(event.id)
      },
      mcp: {
        session_id: event.sessionId,
        event_id: event.id,
        event_type: event.eventType,
        resource: event.resourceName,
        duration_ms: event.duration,
        user_intent: event.userIntent,
        actor_id: event.identifyActorGivenId,
        actor_name: event.identifyActorName,
        client_name: event.clientName,
        client_version: event.clientVersion,
        server_name: event.serverName,
        server_version: event.serverVersion,
        is_error: event.isError,
        error: event.error
      }
    };
    if (event.isError && event.error) {
      log.error = {
        message: typeof event.error === "string" ? event.error : JSON.stringify(event.error)
      };
    }
    return log;
  }
  eventToMetrics(event) {
    const metrics = [];
    const timestamp = Math.floor(
      (event.timestamp?.getTime() || Date.now()) / 1e3
    );
    const tags = [`service:${this.config.service}`];
    if (this.config.env) tags.push(`env:${this.config.env}`);
    if (event.eventType)
      tags.push(`event_type:${event.eventType.replace(/\//g, ".")}`);
    if (event.resourceName) tags.push(`resource:${event.resourceName}`);
    metrics.push({
      metric: "mcp.events.count",
      type: "count",
      points: [[timestamp, 1]],
      tags
    });
    if (event.duration) {
      metrics.push({
        metric: "mcp.event.duration",
        type: "gauge",
        points: [[timestamp, event.duration]],
        tags
      });
    }
    if (event.isError) {
      metrics.push({
        metric: "mcp.errors.count",
        type: "count",
        points: [[timestamp, 1]],
        tags
      });
    }
    return metrics;
  }
};

// src/modules/exporters/sentry.ts
var SentryExporter = class {
  constructor(config) {
    this.config = config;
    this.parsedDSN = this.parseDSN(config.dsn);
    this.endpoint = `${this.parsedDSN.protocol}://${this.parsedDSN.host}${this.parsedDSN.port ? `:${this.parsedDSN.port}` : ""}${this.parsedDSN.path}/api/${this.parsedDSN.projectId}/envelope/`;
    this.authHeader = `Sentry sentry_version=7, sentry_client=mcpcat/1.0.0, sentry_key=${this.parsedDSN.publicKey}`;
    writeToLog(`SentryExporter: Initialized with endpoint ${this.endpoint}`);
  }
  parseDSN(dsn) {
    const regex = /^(https?):\/\/([a-f0-9]+)@([\w.-]+)(:\d+)?(\/.*)?\/(\d+)$/;
    const match = dsn.match(regex);
    if (!match) {
      throw new Error(`Invalid Sentry DSN: ${dsn}`);
    }
    return {
      protocol: match[1],
      publicKey: match[2],
      host: match[3],
      port: match[4]?.substring(1),
      // Remove leading ':'
      path: match[5] || "",
      projectId: match[6]
    };
  }
  async export(event) {
    try {
      const log = this.eventToLog(event);
      const logEnvelope = this.createLogEnvelope(log);
      writeToLog(`SentryExporter: Sending log for event ${event.id} to Sentry`);
      const logResponse = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "X-Sentry-Auth": this.authHeader,
          "Content-Type": "application/x-sentry-envelope"
        },
        body: logEnvelope
      });
      if (!logResponse.ok) {
        const errorBody = await logResponse.text();
        writeToLog(
          `Sentry log export failed - Status: ${logResponse.status}, Body: ${errorBody}`
        );
      } else {
        writeToLog(`Sentry log export success - Event: ${event.id}`);
      }
      if (this.config.enableTracing) {
        const transaction = this.eventToTransaction(event);
        const transactionEnvelope = this.createTransactionEnvelope(transaction);
        writeToLog(
          `SentryExporter: Sending transaction ${transaction.event_id} to Sentry`
        );
        const transactionResponse = await fetch(this.endpoint, {
          method: "POST",
          headers: {
            "X-Sentry-Auth": this.authHeader,
            "Content-Type": "application/x-sentry-envelope"
          },
          body: transactionEnvelope
        });
        if (!transactionResponse.ok) {
          const errorBody = await transactionResponse.text();
          writeToLog(
            `Sentry transaction export failed - Status: ${transactionResponse.status}, Body: ${errorBody}`
          );
        } else {
          writeToLog(`Sentry transaction export success - Event: ${event.id}`);
        }
      }
      if (event.isError) {
        const errorEvent = this.config.enableTracing ? this.eventToErrorEvent(event, this.eventToTransaction(event)) : this.eventToErrorEvent(event);
        const errorEnvelope = this.createErrorEnvelope(errorEvent);
        writeToLog(
          `SentryExporter: Sending error event ${errorEvent.event_id} to Sentry for Issue creation`
        );
        const errorResponse = await fetch(this.endpoint, {
          method: "POST",
          headers: {
            "X-Sentry-Auth": this.authHeader,
            "Content-Type": "application/x-sentry-envelope"
          },
          body: errorEnvelope
        });
        if (!errorResponse.ok) {
          const errorBody = await errorResponse.text();
          writeToLog(
            `Sentry error export failed - Status: ${errorResponse.status}, Body: ${errorBody}`
          );
        } else {
          writeToLog(`Sentry error export success - Event: ${event.id}`);
        }
      }
    } catch (error) {
      writeToLog(`Sentry export error: ${error}`);
    }
  }
  eventToLog(event) {
    const timestamp = event.timestamp ? new Date(event.timestamp).getTime() / 1e3 : Date.now() / 1e3;
    const traceId = traceContext.getTraceId(event.sessionId);
    const eventId = traceContext.getSpanId(event.id) + traceContext.getSpanId(event.id);
    const message = event.resourceName ? `MCP ${event.eventType || "event"}: ${event.resourceName}` : `MCP ${event.eventType || "event"}`;
    return {
      timestamp,
      trace_id: traceId,
      event_id: eventId,
      level: event.isError ? "error" : "info",
      body: message,
      attributes: this.buildLogAttributes(event)
    };
  }
  buildLogAttributes(event) {
    const attributes = {};
    if (event.eventType) {
      attributes.eventType = { value: event.eventType, type: "string" };
    }
    if (event.resourceName) {
      attributes.resourceName = { value: event.resourceName, type: "string" };
    }
    if (event.serverName) {
      attributes.serverName = { value: event.serverName, type: "string" };
    }
    if (event.clientName) {
      attributes.clientName = { value: event.clientName, type: "string" };
    }
    if (event.sessionId) {
      attributes.sessionId = { value: event.sessionId, type: "string" };
    }
    if (event.projectId) {
      attributes.projectId = { value: event.projectId, type: "string" };
    }
    if (event.duration !== void 0) {
      attributes.duration_ms = { value: event.duration, type: "double" };
    }
    if (event.identifyActorGivenId) {
      attributes.actorId = {
        value: event.identifyActorGivenId,
        type: "string"
      };
    }
    if (event.identifyActorName) {
      attributes.actorName = { value: event.identifyActorName, type: "string" };
    }
    if (event.userIntent) {
      attributes.userIntent = { value: event.userIntent, type: "string" };
    }
    if (event.serverVersion) {
      attributes.serverVersion = { value: event.serverVersion, type: "string" };
    }
    if (event.clientVersion) {
      attributes.clientVersion = { value: event.clientVersion, type: "string" };
    }
    if (event.isError !== void 0) {
      attributes.isError = { value: event.isError, type: "boolean" };
    }
    return attributes;
  }
  createLogEnvelope(log) {
    const envelopeHeader = {
      event_id: log.event_id,
      sent_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const itemHeader = {
      type: "log",
      item_count: 1,
      // MANDATORY - must match number of logs
      content_type: "application/vnd.sentry.items.log+json"
      // MANDATORY - exact string
    };
    const payload = {
      items: [log]
      // Changed from 'logs' to 'items'
    };
    return [
      JSON.stringify(envelopeHeader),
      JSON.stringify(itemHeader),
      JSON.stringify(payload)
    ].join("\n") + "\n";
  }
  eventToTransaction(event) {
    const endTimestamp = event.timestamp ? new Date(event.timestamp).getTime() / 1e3 : Date.now() / 1e3;
    const startTimestamp = event.duration ? endTimestamp - event.duration / 1e3 : endTimestamp;
    const traceId = traceContext.getTraceId(event.sessionId);
    const spanId = traceContext.getSpanId(event.id);
    const transactionName = event.resourceName ? `${event.eventType || "mcp"} - ${event.resourceName}` : event.eventType || "mcp.event";
    const transaction = {
      type: "transaction",
      event_id: traceContext.getSpanId(event.id) + traceContext.getSpanId(),
      timestamp: endTimestamp,
      start_timestamp: startTimestamp,
      transaction: transactionName,
      contexts: {
        trace: {
          trace_id: traceId,
          span_id: spanId,
          op: event.eventType || "mcp.event",
          status: event.isError ? "internal_error" : "ok"
        }
      },
      tags: this.buildTags(event),
      extra: this.buildExtra(event)
    };
    return transaction;
  }
  buildTags(event) {
    const tags = {};
    if (this.config.environment) tags.environment = this.config.environment;
    if (this.config.release) tags.release = this.config.release;
    if (event.eventType) tags.event_type = event.eventType;
    if (event.resourceName) tags.resource = event.resourceName;
    if (event.serverName) tags.server_name = event.serverName;
    if (event.clientName) tags.client_name = event.clientName;
    if (event.identifyActorGivenId) tags.actor_id = event.identifyActorGivenId;
    return tags;
  }
  buildExtra(event) {
    const extra = {};
    if (event.sessionId) extra.session_id = event.sessionId;
    if (event.projectId) extra.project_id = event.projectId;
    if (event.userIntent) extra.user_intent = event.userIntent;
    if (event.identifyActorName) extra.actor_name = event.identifyActorName;
    if (event.serverVersion) extra.server_version = event.serverVersion;
    if (event.clientVersion) extra.client_version = event.clientVersion;
    if (event.duration !== void 0) extra.duration_ms = event.duration;
    if (event.error) extra.error = event.error;
    return extra;
  }
  eventToErrorEvent(event, transaction) {
    let errorMessage = "Unknown error";
    let errorType = "ToolCallError";
    if (event.error) {
      if (typeof event.error === "string") {
        errorMessage = event.error;
      } else if (typeof event.error === "object" && event.error !== null) {
        if ("message" in event.error) {
          errorMessage = String(event.error.message);
        } else {
          errorMessage = JSON.stringify(event.error);
        }
        if ("type" in event.error) {
          errorType = String(event.error.type);
        }
      }
    }
    const traceId = transaction ? transaction.contexts.trace.trace_id : traceContext.getTraceId(event.sessionId);
    const spanId = traceContext.getSpanId(event.id);
    const timestamp = transaction ? transaction.timestamp : event.timestamp ? new Date(event.timestamp).getTime() / 1e3 : Date.now() / 1e3;
    const errorEvent = {
      type: "event",
      event_id: traceContext.getSpanId(event.id) + traceContext.getSpanId(),
      timestamp,
      level: "error",
      exception: {
        values: [
          {
            type: errorType,
            value: errorMessage,
            mechanism: {
              type: "mcp_tool_call",
              handled: false
            }
          }
        ]
      },
      contexts: {
        trace: {
          trace_id: traceId,
          // Same trace ID as transaction/log for correlation
          span_id: spanId,
          parent_span_id: transaction?.contexts.trace.span_id,
          // Link to transaction span if available
          op: transaction?.contexts.trace.op || event.eventType || "mcp.event"
        },
        mcp: {
          resource_name: event.resourceName,
          session_id: event.sessionId,
          event_type: event.eventType,
          user_intent: event.userIntent
        }
      },
      tags: this.buildTags(event),
      extra: this.buildExtra(event),
      transaction: transaction?.transaction || (event.resourceName ? `${event.eventType || "mcp"} - ${event.resourceName}` : event.eventType || "mcp.event")
      // Generate transaction name if not available
    };
    return errorEvent;
  }
  createTransactionEnvelope(transaction) {
    const envelopeHeader = {
      event_id: transaction.event_id,
      sent_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const itemHeader = {
      type: "transaction"
    };
    return [
      JSON.stringify(envelopeHeader),
      JSON.stringify(itemHeader),
      JSON.stringify(transaction)
    ].join("\n");
  }
  createErrorEnvelope(errorEvent) {
    const envelopeHeader = {
      event_id: errorEvent.event_id,
      sent_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const itemHeader = {
      type: "event",
      content_type: "application/json"
    };
    return [
      JSON.stringify(envelopeHeader),
      JSON.stringify(itemHeader),
      JSON.stringify(errorEvent)
    ].join("\n");
  }
};

// src/modules/exporters/posthog.ts
import { PublishEventRequestEventTypeEnum as PublishEventRequestEventTypeEnum6 } from "mcpcat-api";
var PostHogExporter = class {
  constructor(config) {
    const host = (config.host || "https://us.i.posthog.com").replace(/\/$/, "");
    this.batchUrl = `${host}/batch`;
    this.apiKey = config.apiKey;
    writeToLog(`PostHogExporter: Initialized with endpoint ${this.batchUrl}`);
  }
  async export(event) {
    try {
      const batch = [];
      batch.push(this.buildCaptureEvent(event));
      if (event.isError && event.error) {
        batch.push(this.buildExceptionEvent(event));
      }
      writeToLog(
        `PostHogExporter: Sending ${batch.length} event(s) for ${event.id}`
      );
      const response = await fetch(this.batchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          batch
        })
      });
      if (!response.ok) {
        const errorBody = await response.text();
        writeToLog(
          `PostHog export failed - Status: ${response.status}, Body: ${errorBody}`
        );
      } else {
        writeToLog(`PostHog export success - Event: ${event.id}`);
      }
    } catch (error) {
      writeToLog(`PostHog export error: ${error}`);
    }
  }
  buildCaptureEvent(event) {
    const distinctId = event.identifyActorGivenId || event.sessionId || "anonymous";
    const eventName = this.mapEventType(event.eventType);
    const timestamp = event.timestamp ? event.timestamp.toISOString() : (/* @__PURE__ */ new Date()).toISOString();
    const properties = {
      $session_id: event.sessionId
    };
    if (event.resourceName) {
      properties.resource_name = event.resourceName;
      if (event.eventType === PublishEventRequestEventTypeEnum6.mcpToolsCall) {
        properties.tool_name = event.resourceName;
      }
    }
    if (event.duration !== void 0) {
      properties.duration_ms = event.duration;
    }
    if (event.serverName) properties.server_name = event.serverName;
    if (event.serverVersion) properties.server_version = event.serverVersion;
    if (event.clientName) properties.client_name = event.clientName;
    if (event.clientVersion) properties.client_version = event.clientVersion;
    if (event.projectId) properties.project_id = event.projectId;
    if (event.userIntent) properties.user_intent = event.userIntent;
    if (event.isError !== void 0) properties.is_error = event.isError;
    if (event.parameters !== void 0) {
      properties.parameters = event.parameters;
    }
    if (event.response !== void 0) {
      properties.response = event.response;
    }
    const $set = {};
    if (event.identifyActorName) $set.name = event.identifyActorName;
    if (event.identifyActorData) {
      Object.assign($set, event.identifyActorData);
    }
    if (Object.keys($set).length > 0) {
      properties.$set = $set;
    }
    return {
      event: eventName,
      distinct_id: distinctId,
      properties,
      timestamp,
      type: "capture"
    };
  }
  buildExceptionEvent(event) {
    const distinctId = event.identifyActorGivenId || event.sessionId || "anonymous";
    const timestamp = event.timestamp ? event.timestamp.toISOString() : (/* @__PURE__ */ new Date()).toISOString();
    const properties = {
      $exception_source: "backend",
      $session_id: event.sessionId
    };
    if (event.error) {
      if (event.error.message) {
        properties.$exception_message = event.error.message;
      }
      if (event.error.type) {
        properties.$exception_type = event.error.type;
      }
      if (event.error.stack) {
        properties.$exception_stacktrace = event.error.stack;
      }
    }
    if (event.resourceName) {
      properties.resource_name = event.resourceName;
      if (event.eventType === PublishEventRequestEventTypeEnum6.mcpToolsCall) {
        properties.tool_name = event.resourceName;
      }
    }
    if (event.serverName) properties.server_name = event.serverName;
    if (event.serverVersion) properties.server_version = event.serverVersion;
    if (event.clientName) properties.client_name = event.clientName;
    if (event.clientVersion) properties.client_version = event.clientVersion;
    return {
      event: "$exception",
      distinct_id: distinctId,
      properties,
      timestamp,
      type: "capture"
    };
  }
  mapEventType(eventType) {
    const mapping = {
      [PublishEventRequestEventTypeEnum6.mcpToolsCall]: "mcp_tool_call",
      [PublishEventRequestEventTypeEnum6.mcpToolsList]: "mcp_tools_list",
      [PublishEventRequestEventTypeEnum6.mcpInitialize]: "mcp_initialize",
      [PublishEventRequestEventTypeEnum6.mcpResourcesRead]: "mcp_resource_read",
      [PublishEventRequestEventTypeEnum6.mcpResourcesList]: "mcp_resources_list",
      [PublishEventRequestEventTypeEnum6.mcpPromptsGet]: "mcp_prompt_get",
      [PublishEventRequestEventTypeEnum6.mcpPromptsList]: "mcp_prompts_list"
    };
    return mapping[eventType] || `mcp_${eventType.replace(/^mcp:/, "").replace(/\//g, "_")}`;
  }
};

// src/modules/exporters/umami.ts
import { PublishEventRequestEventTypeEnum as PublishEventRequestEventTypeEnum7 } from "mcpcat-api";
var UmamiExporter = class {
  constructor(config) {
    const host = (config.host || "https://cloud.umami.is").replace(/\/$/, "");
    this.sendUrl = `${host}/api/send`;
    this.websiteId = config.websiteId;
    writeToLog(`UmamiExporter: Initialized with endpoint ${this.sendUrl}`);
  }
  async export(event) {
    try {
      const payload = this.buildPayload(event);
      writeToLog(`UmamiExporter: Sending event ${event.id}`);
      const response = await fetch(this.sendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "mcpcat-sdk"
        },
        body: JSON.stringify({
          payload,
          type: "event"
        })
      });
      if (!response.ok) {
        const errorBody = await response.text();
        writeToLog(
          `Umami export failed - Status: ${response.status}, Body: ${errorBody}`
        );
      } else {
        writeToLog(`Umami export success - Event: ${event.id}, body: ${JSON.stringify({ payload, type: "event" })}`);
      }
    } catch (error) {
      writeToLog(`Umami export error: ${error}`);
    }
  }
  buildPayload(event) {
    const eventName = this.mapEventType(event.eventType);
    const data = {};
    if (event.sessionId) data.session_id = event.sessionId;
    if (event.identifyActorGivenId) data.actor_id = event.identifyActorGivenId;
    if (event.identifyActorName) data.actor_name = event.identifyActorName;
    if (event.resourceName) {
      data.resource_name = event.resourceName;
      if (event.eventType === PublishEventRequestEventTypeEnum7.mcpToolsCall) {
        data.tool_name = event.resourceName;
      }
    }
    if (event.duration !== void 0) data.duration_ms = event.duration;
    if (event.serverName) data.server_name = event.serverName;
    if (event.serverVersion) data.server_version = event.serverVersion;
    if (event.clientName) data.client_name = event.clientName;
    if (event.clientVersion) data.client_version = event.clientVersion;
    if (event.projectId) data.project_id = event.projectId;
    if (event.userIntent) data.user_intent = event.userIntent;
    if (event.isError !== void 0) data.is_error = event.isError;
    if (event.parameters !== void 0) data.parameters = event.parameters;
    if (event.response !== void 0) data.response = event.response;
    if (event.isError && event.error) {
      data.error_message = event.error.message;
      if (event.error.type) data.error_type = event.error.type;
      if (event.error.stack) data.error_stack = event.error.stack;
    }
    const payload = {
      hostname: "localhost",
      // event.serverName || "mcp-server",
      language: "en",
      url: event.resourceName ? `/${eventName}/${event.resourceName}` : `/${eventName}`,
      website: this.websiteId,
      name: eventName,
      data
    };
    if (event.serverName) {
      payload.title = event.serverName;
    }
    return payload;
  }
  mapEventType(eventType) {
    const mapping = {
      [PublishEventRequestEventTypeEnum7.mcpToolsCall]: "mcp_tool_call",
      [PublishEventRequestEventTypeEnum7.mcpToolsList]: "mcp_tools_list",
      [PublishEventRequestEventTypeEnum7.mcpInitialize]: "mcp_initialize",
      [PublishEventRequestEventTypeEnum7.mcpResourcesRead]: "mcp_resource_read",
      [PublishEventRequestEventTypeEnum7.mcpResourcesList]: "mcp_resources_list",
      [PublishEventRequestEventTypeEnum7.mcpPromptsGet]: "mcp_prompt_get",
      [PublishEventRequestEventTypeEnum7.mcpPromptsList]: "mcp_prompts_list"
    };
    return mapping[eventType] || `mcp_${eventType.replace(/^mcp:/, "").replace(/\//g, "_")}`;
  }
};

// src/modules/telemetry.ts
var TelemetryManager = class {
  constructor(exporterConfigs) {
    this.exporters = /* @__PURE__ */ new Map();
    if (!exporterConfigs) return;
    for (const [name, config] of Object.entries(exporterConfigs)) {
      try {
        const exporter = this.createExporter(name, config);
        if (exporter) {
          this.exporters.set(name, exporter);
          writeToLog(`Initialized telemetry exporter: ${name}`);
        }
      } catch (error) {
        writeToLog(`Failed to initialize exporter ${name}: ${error}`);
      }
    }
  }
  createExporter(name, config) {
    switch (config.type) {
      case "otlp":
        return new OTLPExporter(config);
      case "datadog":
        return new DatadogExporter(config);
      case "sentry":
        return new SentryExporter(config);
      case "posthog":
        return new PostHogExporter(config);
      case "umami":
        return new UmamiExporter(config);
      default:
        writeToLog(`Unknown exporter type: ${config.type}`);
        return null;
    }
  }
  async export(event) {
    if (this.exporters.size === 0) return;
    for (const [name, exporter] of this.exporters) {
      exporter.export(event).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        writeToLog(`Telemetry export failed for ${name}: ${errorMessage}`);
      });
    }
  }
  getExporterCount() {
    return this.exporters.size;
  }
};

// src/index.ts
function track(server, projectId, options = {}) {
  try {
    const validatedServer = isCompatibleServerType(server);
    const apiBaseUrl = options.apiBaseUrl || process.env.MCPCAT_API_URL;
    if (apiBaseUrl) {
      eventQueue.configure(apiBaseUrl);
    }
    const lowLevelServer = isHighLevelServer(validatedServer) ? validatedServer.server : validatedServer;
    const existingData = getServerTrackingData(lowLevelServer);
    if (existingData) {
      writeToLog(
        "[SESSION DEBUG] track() - Server already being tracked, skipping initialization"
      );
      return validatedServer;
    }
    if (options.exporters) {
      const telemetryManager = new TelemetryManager(options.exporters);
      setTelemetryManager(telemetryManager);
      writeToLog(
        `Initialized telemetry with ${Object.keys(options.exporters).length} exporters`
      );
    }
    if (!projectId && !options.exporters) {
      writeToLog(
        "Warning: No projectId provided and no exporters configured. Events will not be sent anywhere."
      );
    }
    const sessionInfo = getSessionInfo(lowLevelServer, void 0);
    const mcpcatData = {
      projectId: projectId || "",
      // Use empty string for null projectId
      sessionId: newSessionId(),
      lastActivity: /* @__PURE__ */ new Date(),
      identifiedSessions: /* @__PURE__ */ new Map(),
      sessionInfo,
      options: {
        enableReportMissing: options.enableReportMissing ?? true,
        enableTracing: options.enableTracing ?? true,
        enableToolCallContext: options.enableToolCallContext ?? true,
        customContextDescription: options.customContextDescription,
        identify: options.identify,
        redactSensitiveInformation: options.redactSensitiveInformation
      },
      sessionSource: "mcpcat"
      // Initially MCPCat-generated, will change to "mcp" if MCP sessionId is provided in requests
    };
    setServerTrackingData(lowLevelServer, mcpcatData);
    if (isHighLevelServer(validatedServer)) {
      const highLevelServer = validatedServer;
      setupTracking(highLevelServer);
    } else {
      if (mcpcatData.options.enableReportMissing) {
        try {
          setupMCPCatTools(lowLevelServer);
        } catch (error) {
          writeToLog(`Warning: Failed to setup report missing tool - ${error}`);
        }
      }
      if (mcpcatData.options.enableTracing) {
        try {
          setupToolCallTracing(lowLevelServer);
        } catch (error) {
          writeToLog(`Warning: Failed to setup tool call tracing - ${error}`);
        }
      }
    }
    return validatedServer;
  } catch (error) {
    writeToLog(`Warning: Failed to track server - ${error}`);
    return server;
  }
}
async function publishCustomEvent(serverOrSessionId, projectId, eventData) {
  if (!projectId) {
    throw new Error("projectId is required for publishCustomEvent");
  }
  let sessionId;
  const isServer = typeof serverOrSessionId === "object" && serverOrSessionId !== null;
  let lowLevelServer = null;
  if (isServer) {
    lowLevelServer = serverOrSessionId.server ? serverOrSessionId.server : serverOrSessionId;
    const trackingData = getServerTrackingData(lowLevelServer);
    if (trackingData) {
      sessionId = trackingData.sessionId;
    } else {
      throw new Error(
        "Server is not tracked. Please call mcpcat.track() first or provide a session ID string."
      );
    }
  } else if (typeof serverOrSessionId === "string") {
    sessionId = deriveSessionIdFromMCPSession(serverOrSessionId, projectId);
  } else {
    throw new Error(
      "First parameter must be either an MCP server object or a session ID string"
    );
  }
  const event = {
    // Core fields
    sessionId,
    projectId,
    // Fixed event type for custom events
    eventType: MCPCAT_CUSTOM_EVENT_TYPE,
    // Timestamp
    timestamp: /* @__PURE__ */ new Date(),
    // Event data from parameters
    resourceName: eventData?.resourceName,
    parameters: eventData?.parameters,
    response: eventData?.response,
    userIntent: eventData?.message,
    duration: eventData?.duration,
    isError: eventData?.isError,
    error: eventData?.error
  };
  if (lowLevelServer && getServerTrackingData(lowLevelServer)) {
    publishEvent(lowLevelServer, event);
  } else {
    eventQueue.add(event);
  }
  writeToLog(
    `Published custom event for session ${sessionId} with type 'mcpcat:custom'`
  );
}
export {
  publishCustomEvent,
  track
};
//# sourceMappingURL=index.mjs.map