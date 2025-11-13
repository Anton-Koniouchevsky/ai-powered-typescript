/*
  HINT: All available models you can find here: https://ai-proxy.lab.epam.com/openai/models
  TODO:
    Try different models (`deployment_name`) with such user request:
    User massage: What LLMs can do?

  Models to try:
    - gpt-4o
    - claude-3-7-sonnet@20250219
    - gemini-2.5-pro
*/

import run from './main';

const deploymentName = 'gpt-4o'; // Change the model name here to test different models

run(deploymentName).catch((error) => {
  console.error('Error during execution:', error);
});