/*
# TODO:
    #  1. Create DialModelClient
    #  2. Call client to analyze image:
    #    - try with base64 encoded format
    #    - try with URL: https://a-z-animals.com/media/2019/11/Elephant-male-1024x535.jpg
    #  ----------------------------------------------------------------------------------------------------------------
    #  Note: This approach embeds the image directly in the message as base64 data URL! Here we follow the OpenAI
    #        Specification but since requests are going to the DIAL Core, we can use different models and DIAL Core
    #        will adapt them to format Gemini or Anthropic is using. In case if we go directly to
    #        the https://api.anthropic.com/v1/complete we need to follow Anthropic request Specification (the same for gemini)
*/

import 'dotenv/config';
import CustomClient from "../../clients/CustomClient";
import Conversation from "../../models/Conversation";
import Role from "../../models/Role";
import { imageToBase64 } from "../../utils/imageToBase64";

async function run(deploymentName: string): Promise<void> {
  const client = new CustomClient(deploymentName);
  const conversation = new Conversation();
  conversation.addMessage({ role: Role.System, content: process.env.DEFAULT_SYSTEM_PROMPT || "" });

  const contentWithImage = [
    {
      type: "text" as const,
      text: "What is in this image?"
    },
    /* {
      type: "image_url" as const,
      image_url: {
        url: "https://a-z-animals.com/media/2019/11/Elephant-male-1024x535.jpg"
      }
    } */
    {
      type: "image_url" as const,
      image_url: {
        url: imageToBase64("assets/dialx-banner.png")
      }
    }
  ];

  conversation.addMessage({ role: Role.User, content: contentWithImage });
  const response = await client.getCompletion(conversation.getMessages());
  conversation.addMessage(response);
  console.log(`AI: ${response.content}`);
}

run('gpt-4o');
