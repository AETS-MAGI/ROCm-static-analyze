import path from "node:path";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfig, type LoadedConfig } from "./util/config.js";
import { grepCode } from "./tools/grep_code.js";
import { findSymbols } from "./tools/find_symbols.js";
import { buildCtags } from "./tools/build_ctags.js";
import { queryCtags } from "./tools/query_ctags.js";
import { buildCscope } from "./tools/build_cscope.js";
import { queryCscope } from "./tools/query_cscope.js";
import { findCompileCommands } from "./tools/find_compile_commands.js";

function getArgValue(flag: string): string | null
{
  const index = process.argv.indexOf(flag);
  if(index === -1)
    return null;
  return process.argv[index + 1] ?? null;
}

function formatContent(result: unknown)
{
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

function getEnabledTools(loaded: LoadedConfig): Tool[]
{
  const tools: Tool[] = [];
  const enabled = loaded.config.tools;

  if(enabled.grep_code?.enabled)
  {
    tools.push({
      name: "grep_code",
      description: "Run read-only regex search across a configured ROCm repository root.",
      inputSchema: {
        type: "object",
        properties: {
          pattern: { type: "string" },
          root: { type: "string" },
          glob: { type: "string" },
          maxResults: { type: "integer", minimum: 1 },
        },
        required: ["pattern", "root"],
        additionalProperties: false,
      },
    });
  }

  if(enabled.find_symbols?.enabled)
  {
    tools.push({
      name: "find_symbols",
      description: "Find candidate definitions and symbol mentions inside a configured ROCm repository root.",
      inputSchema: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          root: { type: "string" },
        },
        required: ["symbol", "root"],
        additionalProperties: false,
      },
    });
  }

  if(enabled.build_ctags?.enabled)
  {
    tools.push({
      name: "build_ctags",
      description: "Build a read-only ctags index into the MCP cache for a configured repository root.",
      inputSchema: {
        type: "object",
        properties: {
          root: { type: "string" },
        },
        required: ["root"],
        additionalProperties: false,
      },
    });
  }

  if(enabled.query_ctags?.enabled)
  {
    tools.push({
      name: "query_ctags",
      description: "Query an existing ctags index. Optionally build it first with autoBuild=true.",
      inputSchema: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          root: { type: "string" },
          autoBuild: { type: "boolean" },
        },
        required: ["symbol", "root"],
        additionalProperties: false,
      },
    });
  }

  if(enabled.find_compile_commands?.enabled)
  {
    tools.push({
      name: "find_compile_commands",
      description: "Find compile_commands.json files under a configured repository root.",
      inputSchema: {
        type: "object",
        properties: {
          root: { type: "string" },
        },
        required: ["root"],
        additionalProperties: false,
      },
    });
  }

  if(enabled.build_cscope?.enabled)
  {
    tools.push({
      name: "build_cscope",
      description: "Build a read-only cscope database into the MCP cache for a configured repository root.",
      inputSchema: {
        type: "object",
        properties: {
          root: { type: "string" },
        },
        required: ["root"],
        additionalProperties: false,
      },
    });
  }

  if(enabled.query_cscope?.enabled)
  {
    tools.push({
      name: "query_cscope",
      description: "Query an existing cscope database. Optionally build it first with autoBuild=true.",
      inputSchema: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["definition", "callers", "callees", "text"],
          },
          symbol: { type: "string" },
          root: { type: "string" },
          autoBuild: { type: "boolean" },
        },
        required: ["mode", "symbol", "root"],
        additionalProperties: false,
      },
    });
  }

  return tools;
}

async function createServer(loaded: LoadedConfig)
{
  const server = new Server(
    {
      name: loaded.config.name,
      version: loaded.config.version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getEnabledTools(loaded),
  }));

  server.setRequestHandler(CallToolRequestSchema, async request => {
    const args = request.params.arguments ?? {};

    try
    {
      switch(request.params.name)
      {
      case "grep_code":
        return formatContent(await grepCode(loaded, {
          pattern: String(args.pattern),
          root: String(args.root),
          glob: typeof args.glob === "string" ? args.glob : undefined,
          maxResults: typeof args.maxResults === "number" ? args.maxResults : undefined,
        }));

      case "find_symbols":
        return formatContent(await findSymbols(loaded, {
          symbol: String(args.symbol),
          root: String(args.root),
        }));

      case "build_ctags":
        return formatContent(await buildCtags(loaded, {
          root: String(args.root),
        }));

      case "query_ctags":
        return formatContent(await queryCtags(loaded, {
          symbol: String(args.symbol),
          root: String(args.root),
          autoBuild: typeof args.autoBuild === "boolean" ? args.autoBuild : false,
        }));

      case "build_cscope":
        return formatContent(await buildCscope(loaded, {
          root: String(args.root),
        }));

      case "query_cscope":
        return formatContent(await queryCscope(loaded, {
          mode: String(args.mode) as "definition" | "callers" | "callees" | "text",
          symbol: String(args.symbol),
          root: String(args.root),
          autoBuild: typeof args.autoBuild === "boolean" ? args.autoBuild : false,
        }));

      case "find_compile_commands":
        return formatContent(await findCompileCommands(loaded, {
          root: String(args.root),
        }));

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }
    }
    catch(error)
    {
      const message = error instanceof Error ? error.message : String(error);
      throw new McpError(ErrorCode.InternalError, message);
    }
  });

  return server;
}

async function main()
{
  const configArg = getArgValue("--config") ?? path.resolve(process.cwd(), "config/rocm-static.json");
  const loaded = await loadConfig(configArg);
  const server = await createServer(loaded);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(error => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
