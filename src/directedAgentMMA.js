const fs = require('fs/promises');
const xlsx = require('node-xlsx').default;

const prompt = require('./utils/prompt.js')
const agent = require('./agent.js');
const logIt = require('./logIt.js');


function getPlayBook(path) {
  console.log("loading playbook", path);
  let playBook = {
    classifier:  "",
    knowledgeMap : {}
  };
  const workSheetsFromFile = xlsx.parse(path);

  let data = workSheetsFromFile[0].data;
  for (let row of data) {
    if (row[0] == 'clauseType') {
      continue;
    }
    
    playBook.classifier += `
${row[0]} : ${row[1]}`;
    playBook.knowledgeMap[row[0]] = row[2];
  }
  
  return playBook;


}

async function directedAgentMMA(id, agentId, playbookPath="MNA") {

  // read File
  id = id.replace(/\//g, '');

  let data = "";

  let playBook = {};
  if (playbookPath == "MNA") {
    playBook= getPlayBook(`${__dirname}/playbookMNA.xlsx`)
  }
  else {
    playBook = getPlayBook(`${__dirname}/../uploads/${playbookPath}`);
  }

  
  let contractData =  JSON.parse(await fs.readFile(`${__dirname}/../data/${id}.json`));

  await fs.writeFile(`${__dirname}/../public/trace/contract-${agentId}.json`, JSON.stringify(contractData, null, 2));
  // wait the md process is over
  while (contractData.status.md == false) {
    await new Promise(resolve => setTimeout(resolve, 10000));

    contractData =  JSON.parse(await fs.readFile(`${__dirname}/../data/${id}.json`));
    await fs.writeFile(`${__dirname}/../public/trace/contract-${agentId}.json`, JSON.stringify(contractData, null, 2));

  }

  let systemPrompt = `You are a lawyer rewieving a extract of a contract (a clause). You are taks with determining the type of the clause:

If it seems to not be a legal clause output: IRREVELANT
If you think the text is not a full clause ouput : NO_CONTEXT
If you think it is not a clause but a paragraph / section title output: TITLE

Else output one of this class that correspond to the clause:

${playBook.classifier}

If it seems be classify in previously give category output: OTHER

Only output the type of clause, no other text`
  
  
  for (let item of contractData.data) {
   
    if (item.type == 'title' ) {
      item.classifier = "TITLE";
      continue;
    }

    if (item.content.length < 64) {
      item.classifier = "SHORT_TEXT";
      continue;
    }
     
    let type = await prompt([
      {"role": "system", "content": systemPrompt},
      {"role": "user", "content": item.content}
    ]);

    console.log(type);
    item.classifier = type;
    await logIt.log({ 
      type: "CLASSIFY",
      taskId: 1,
      clause: item.content,
      result: type
    }, agentId);



    await fs.writeFile(`${__dirname}/../public/trace/contract-${agentId}.json`, JSON.stringify(contractData, null, 2));

    if (type == "IRRELEVANT" || type == "NO_CONTEXT" || type == "TITLE" || type == "OTHER") { 
      continue;
    }

    let knowledgeMap = playBook.knowledgeMap;

    let instruction = "";
    if (knowledgeMap[type]) { 
      instruction = knowledgeMap[type];
    }
    else {
      continue;
    }
    let rewrite = await agent.start(
      `Check if this clause is well written. If it is not well written suggest a new version and output it after the keyword END_RESULT.
If the clause is ok output the string "well written :)" after the END_RESULT keyword. 
This kind of clause generally respects the following playbook: 
${instruction}    
 
The clause is : 
      
${item.content}

Return the clause and your reasoning for editing after the keyword END_RESULT. If you think the clause is not well written, propose a rewritte and a reasoning. DO not only say that it is not well written without justification! If a clause is well written do not forget the smilley :)`,
      agentId, 1);
    await logIt.log({ 
      type: "REWRITE",
      taskId: 1,
      clause: item.content,
      result: type,
      rewrite: rewrite
    }, agentId);

    if (rewrite.data.trim().length  
      && rewrite.data.toLowerCase().indexOf("well written :)") == -1 
      && rewrite.data.toLowerCase().indexOf("well-written :)") == -1 
      && rewrite.data.toLowerCase().indexOf("well written. :)") == -1 
      && rewrite.data.toLowerCase().indexOf("is well written") == -1 
      && rewrite.data.toLowerCase().indexOf("is well-written") == -1 
      && rewrite.data.toLowerCase().indexOf(":)") == -1
      && rewrite.data.toLowerCase().trim() != item.content.trim()) {
      
      item.playbook = {
        status: "failed",
        comment : rewrite.data,
        logs: rewrite.logs
      }

    }
    else {
      item.playbook = {
        status: "success",
        comment : rewrite.data,
        logs: rewrite.logs
      }
    }
    
  await fs.writeFile(`${__dirname}/../public/trace/contract-${agentId}.json`, JSON.stringify(contractData, null, 2));

}

  await fs.writeFile(`${__dirname}/../public/trace/contract-${agentId}.json`, JSON.stringify(contractData, null, 2));


}

module.exports = directedAgentMMA;