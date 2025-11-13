/*
# TODO:
#  Try `max_tokens` parameter. It sets the maximum length of the AI's response. The AI will stop generating text once it hits this limit.
#  User massage: What is token when we are working with LLM?

# Previously, we have seen that the `finish_reason` in choice was `stop`, but now it is `length`, and if you check the
# `content,` it is clearly unfinished.
*/

import run from './main';

const deploymentName = 'gpt-4o';
run(deploymentName, { max_tokens: 20 }).catch((error) => {
  console.error('Error during execution:', error);
});