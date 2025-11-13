/*
# TODO:
#  Try the `seed` parameter:
#       It allows us to reduce entropy by making the model's output more deterministic.
#       There's no universally "best" seed - any integer works fine. Common approaches:
#            - For testing: Use simple values like 42, 123, or 1000
#       Default: None or random unless specified on the LLM side
#  User massage: Name a random animal

# Check the content in choices. The expected result is that in almost all choices the result will be the same.
# If you restart the app and retry, it should be mostly the same.
# Also, try it without `seed` parameter.
# For Anthropic and Gemini this parameter will be ignored
*/

import run from './main';

const deploymentName = 'gpt-4o';
run(deploymentName, { seed: 2020327 }).catch((error) => {
  console.error('Error during execution:', error);
});