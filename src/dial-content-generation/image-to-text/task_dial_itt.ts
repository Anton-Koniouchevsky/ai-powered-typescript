/*
# TODO:
#  1. Create DialModelClient
#  2. Upload image (use `_put_image` method )
#  3. Print attachment to see result
#  4. Call chat completion via client with list containing one Message:
#    - role: Role.USER
#    - content: "What do you see on this picture?"
#    - custom_content: CustomContent(attachments=[attachment])
#  ---------------------------------------------------------------------------------------------------------------
#  Note: This approach uploads the image to DIAL bucket and references it via attachment. The key benefit of this
#        approach that we can use Models from different vendors (OpenAI, Google, Anthropic). The DIAL Core
#        adapts this attachment to Message content in appropriate format for Model.
#  TRY THIS APPROACH WITH DIFFERENT MODELS!
#  Optional: Try upload 2+ pictures for analysis
*/

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import BucketClient from "../../clients/BucketClient";
import CustomClient from "../../clients/CustomClient";
import Conversation from "../../models/Conversation";
import Role from "../../models/Role";

async function putImage(): Promise<string> {
  const fileName = 'dialx-banner.png';
  const imagePath = path.resolve(`assets/${fileName}`);
  const mimeType = 'image/png';

  // Read the image file as buffer
  const imageBuffer = fs.readFileSync(imagePath);
  
  // Create blob from the image buffer
  const blob = new Blob([imageBuffer], { type: mimeType });

  const bucketClient = new BucketClient(process.env.DIAL_ENDPOINT || "", process.env.DIAL_API_KEY || "");
  const uploadResponse = await bucketClient.putFile(fileName, blob);
  return uploadResponse.url;
}

async function run(deploymentName: string): Promise<void> {
  const client = new CustomClient(deploymentName);
  const conversation = new Conversation();
  conversation.addMessage({ role: Role.System, content: process.env.DEFAULT_SYSTEM_PROMPT || "" });

  const url = await putImage();
  console.log('Uploaded image URL:', url);

  const customContent = {
    attachments: [
      {
        type: "image/png" as const,
        url: url,
      }
    ]
  };

  conversation.addMessage({ role: Role.User, content: "What is in this image?", custom_content: customContent });
  const response = await client.getCompletion(conversation.getMessages());
  conversation.addMessage(response);
  console.log(`AI: ${response.content}`);
}

run('gpt-4o');
