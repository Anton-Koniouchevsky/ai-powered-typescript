/*
# TODO:
#  Try the `temperature` parameter that controls the randomness of the output. It's a parameter for balancing creativity
#        and determinism. Range: 0.0 to 2.0, Default: 1.0
#  User massage: Describe the sound that the color purple makes when it's angry
*/

import run from './main';

const deploymentName = 'gpt-4o';
run(deploymentName, { temperature: 1.5 }).catch((error) => {
  console.error('Error during execution:', error);
});