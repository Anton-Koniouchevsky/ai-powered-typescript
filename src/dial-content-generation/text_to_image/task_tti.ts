import 'dotenv/config';
import fs from 'fs';
import CustomClient from "../../clients/CustomClient";
import Role from '../../models/Role';
import DialBucketClient from '../../clients/BucketClient';

/*
# TODO:
#  1. Create DIAL bucket client
#  2. Iterate through Images from attachments, download them and then save here
#  3. Print confirmation that image has been saved locally
*/
async function saveImages(attachments: Array<{ type: string; url: string }>) {
  const bucketClient = new DialBucketClient(process.env.DIAL_ENDPOINT || "", process.env.DIAL_API_KEY || "");

  console.log('Generated image attachments:');
  for (const attachment of attachments) {
    if (attachment.type && attachment.url) {
      console.log(`- Type: ${attachment.type}, URL: ${attachment.url}`);
      const imageData = await bucketClient.getFile(attachment.url);
      const filename = `assets/${Date.now()}.png`;

      const buffer = Buffer.from(imageData);
      fs.writeFileSync(filename, buffer);
      console.log(`Image saved locally as ${filename}`);
    }
  }
}

/*
# TODO:
#  1. Create DialModelClient
#  2. Generate image for "Sunny day on Bali"
#  3. Get attachments from response and save generated message (use method `saveImages`)
#  4. Try to configure the picture for output via `custom_fields` parameter.
#    - Documentation: See `custom_fields`. https://dialx.ai/dial_api#operation/sendChatCompletionRequest
#  5. Test it with the 'imagegeneration@005' (Google image generation model)
*/
async function run() {
  const dalleClient = new CustomClient('dall-e-3', {
    custom_fields: {
      configuration: {
        size: "1024x1024" as const,
        style: "vivid" as const,
        quality: "standard" as const
      }
    },
  });

  const userInput = "Sunny day on Bali";

  const aiMessage = await dalleClient.getCompletion([
    { role: Role.User, content: userInput }
  ]);

  console.log(`AI Message Content: `, aiMessage);

  if (aiMessage.custom_content && aiMessage.custom_content.attachments) {
    await saveImages(aiMessage.custom_content.attachments);
  } else {
    console.log('No attachments found in the AI response.');
  }
}

run();