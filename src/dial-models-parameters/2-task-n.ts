/*
# TODO:
#  Try the `n` parameter with different models (`deployment_name`). With the parameter `n`, we can configure how many
#       chat completion choices to generate for each input message
#  User massage: Why is the snow white?

# Models to try:
# - gpt-4o
# - claude-3-7-sonnet@20250219
# - gemini-2.5-pro
*/

import run from './main';

const deploymentName = 'gpt-4o'; // Change the model name here to test different models

run(deploymentName, { n: 5 }).catch((error) => {
  console.error('Error during execution:', error);
});