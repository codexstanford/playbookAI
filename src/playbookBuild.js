const agent = require('./agent.js');
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPEN_AI_KEY,
});

const openai = new OpenAIApi(configuration);


async function playbookBuild(original, edited) {


  let systemPrompt = `You are a lawyer, reviewing contract correction done by collegue and trying to fomalize them in a playbook. A good entry of a playbook contain:
- The type of the clause the playbook entry apply too
- Clear instruction on how to edit the clause and what to look for / why.

You are provide with clause and it's edited version. Try to write a playbook entry for the provided clauses.
`;
 
  let newRule = await promptIt([
    {"role": "system", "content": systemPrompt},
    {"role": "user", "content": `Original clause:
    ${original}
    
    Edited clause:
    ${edited}`}
  ]);

  return newRule;
  

}

async function promptIt(messages) {
  let r = null;
  console.log("OPEN AI", messages);
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages:messages
    });
    r = response;
    return response.data.choices[0].message.content;
  }
  catch (e) {
    // sleep 

    console.log("OPEN AI JAM, wait 10 sec")
    if (r) {
      console.log(r);
    }
    await new Promise(resolve => setTimeout(resolve, 10000));
    return await prompt(messages);
  }
}


module.exports = playbookBuild;
