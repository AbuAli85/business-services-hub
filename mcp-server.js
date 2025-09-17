#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Create MCP server
const server = new Server(
  {
    name: 'business-services-hub-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_user_profile',
        description: 'Get user profile information from the business services hub',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'The user ID to get profile for',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'get_company_info',
        description: 'Get company information from the business services hub',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The company ID to get info for',
            },
          },
          required: ['companyId'],
        },
      },
      {
        name: 'get_invoice_data',
        description: 'Get invoice data from the business services hub',
        inputSchema: {
          type: 'object',
          properties: {
            invoiceId: {
              type: 'string',
              description: 'The invoice ID to get data for',
            },
          },
          required: ['invoiceId'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_user_profile':
      return {
        content: [
          {
            type: 'text',
            text: `User profile for ID: ${args.userId || 'No ID provided'}\n\nThis would typically fetch user profile data from your Supabase database.\n\nArguments received: ${JSON.stringify(args, null, 2)}`,
          },
        ],
      };

    case 'get_company_info':
      return {
        content: [
          {
            type: 'text',
            text: `Company info for ID: ${args.companyId}\n\nThis would typically fetch company data from your Supabase database.`,
          },
        ],
      };

    case 'get_invoice_data':
      return {
        content: [
          {
            type: 'text',
            text: `Invoice data for ID: ${args.invoiceId}\n\nThis would typically fetch invoice data from your Supabase database.`,
          },
        ],
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Business Services Hub MCP server running on stdio');
}

main().catch((error) => {
  console.error('MCP server error:', error);
  process.exit(1);
});
