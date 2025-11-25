import Role from './Role';

type TextContent = {
  type: 'text';
  text: string;
}

type ImageUrlContent = {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

interface Message {
  role: Role;
  content: string | Array<TextContent | ImageUrlContent>;
  custom_content?: {
    attachments: Array<{
      type: string;
      url: string;
    }>;
  };
  metadata?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export default Message;