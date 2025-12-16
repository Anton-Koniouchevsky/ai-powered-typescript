export interface ErrorResponse {
  code: number;
  message: string;
  data?: Record<string, any> | null;
}

export interface ContentItem {
  type: string;
  text: string;
}

export interface ToolCallResult {
  content: ContentItem[];
  isError?: boolean;
}

export interface MCPResponse {
  jsonrpc: string;
  id?: string | number | null;
  result?: Record<string, any> | null;
  error?: ErrorResponse | null;
}
