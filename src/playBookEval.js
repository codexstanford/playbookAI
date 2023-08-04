const agent = require('./agent.js');
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPEN_AI_KEY,
});

const openai = new OpenAIApi(configuration);


async function clauseEval(clause, playBook) {

  console.log(clause);

  let systemPrompt = `You are a lawyer rewieving a extract of a contract (a clause). You are taks with determining the type of the clause:

If it seems to not be a legal clause output: IRREVELANT
If you think the text is not a full clause ouput : NO_CONTEXT
If you think it is not a clause but a paragraph / section title output: TITLE

Else output one of this class that correspond to the clause:

${playbook.classifier}

If it seems be classify in previously give category output: OTHER

Only output the type of clause, no other text`
  

  if (clause.length < 64) {
    return {
      type: "IRRELEVANT"
    };
  } 
  let type = await promptIt([
    {"role": "system", "content": systemPrompt},
    {"role": "user", "content": clause}
  ]);

  console.log(type);

  if (type == "IRRELEVANT" || type == "NO_CONTEXT" || type == "TITLE" || type == "OTHER") { 
    return {
      type: type
    };
  }

    let knowledgeMap = playbook.knowledgeMap

    let instruction = "";
    if (knowledgeMap[type]) { 
      instruction = knowledgeMap[type];
    }
    else {
      return {
        type: "IRRELEVANT",
        info: "no playbook"
      };
    }
    let rewrite = await agent.start(
      `Check if this clause is well written. If it is not well written suggest a new version and output it after the keyword END_RESULT.
If the clause is ok output the string "well written :)" after the END_RESULT keyword. 
This kind of clause generally respects the following playbook: 
${instruction}    
 
The clause is : 
      
${clause}

Return the clause and your reasoning for editing after the keyword END_RESULT. If you think the clause is not well written, propose a rewritte and a reasoning. DO not only say that it is not well written without justification! If a clause is well written do not forget the smilley :)`,
btoa(new Date().getTime() * Math.random() + " ").substring(0, 8), 1);
  
    console.log(rewrite);
    if (!rewrite.data) { 
      return {
        type: type,
        info: "rewrite failed",
        rewrite: rewrite
      };

    }
    return {
      type: type,
      info: "well written",
      why: rewrite.data.replace(/END_RESULT/g, '')
    };
    

}

async function promptIt(messages) {
  let r = null;
  console.log("OPEN AI", messages);
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-16k",
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


module.exports = clauseEval;