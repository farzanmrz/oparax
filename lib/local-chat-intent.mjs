export function cheapIntent(message) {
  const prompt=message.trim().toLowerCase().replace(/[?.!]+$/,'');
  if(/^(status|progress|research status|what is the status of this research|what('|’)s the status|how is (it|the search|the research) going|how many (contacts|people|prospects|leads) (have you found|so far))$/.test(prompt))return {action:'status'};
  if(/^(show (me )?(the |my |our )?(results|prospects|matches|qualified leads)|list (the |my )?(results|prospects|qualified leads)|who did you find|results)$/.test(prompt))return {action:'results'};
}

