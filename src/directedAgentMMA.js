const fs = require('fs');
const cheerio = require('cheerio');
const agent = require('./agent.js');
const { Configuration, OpenAIApi } = require("openai");
var iconv = require('iconv-lite');
const Diff2html = require('diff2html');
var xlsx = require('node-xlsx').default;

const Diff = require('diff');

const configuration = new Configuration({
  apiKey: process.env.OPEN_AI_KEY,
});

const logIt = require('./logIt.js');


const openai = new OpenAIApi(configuration);

function getPlayBook(path) {
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

  if (id.indexOf('.dx')) {
    data = fs.readFileSync(`${__dirname}/../uploads/${id}`);
  }
  else {
    data = iconv.decode(Buffer.from(fs.readFileSync(`${__dirname}/../uploads/${id}`)), 'win1252');

    data = data.replace(/�/g, '\'');
    data = data.replace(/�/g, '\'');
  }

  
  let parsed = cheerio.load(data);

  let p = parsed('p');
  let collection = [];

  let systemPrompt = `You are a lawyer rewieving a extract of a contract (a clause). You are taks with determining the type of the clause:

If it seems to not be a legal clause output: IRREVELANT
If you think the text is not a full clause ouput : NO_CONTEXT
If you think it is not a clause but a paragraph / section title output: TITLE

Else output one of this class that correspond to the clause:

${playBook.classifier}

If it seems be classify in previously give category output: OTHER

Only output the type of clause, no other text`
  
  
  for (let item of p) {
   
    if (parsed(item).text().length < 64) {
      continue;
    } 
    let type = await promptIt([
      {"role": "system", "content": systemPrompt},
      {"role": "user", "content": parsed(item).text()}
    ]);

    console.log(type);

    logIt({ 
      type: "CLASSIFY",
      taskId: 1,
      clause: parsed(item).text(),
      result: type
    }, agentId);
    collection.push({
      clause: parsed(item).text(),
      type: type
    });
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
      
${parsed(item).text()}

Return the clause and your reasoning for editing after the keyword END_RESULT. If you think the clause is not well written, propose a rewritte and a reasoning. DO not only say that it is not well written without justification! If a clause is well written do not forget the smilley :)`,
      agentId, 1);
    logIt({ 
      type: "REWRITE",
      taskId: 1,
      clause: parsed(item).text(),
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
      && rewrite.data.toLowerCase().trim() != parsed(item).text().trim()) {
 
      parsed(item).html(`<div style='border-left: 2px solid #aaa; background-color: #f8f8f8; padding: 8px; border-radius: 4px'>
        <div style='border-left: 2px solid #33F; padding-left : 10px'>
        ${parsed(item).html().replace(/\n/g, '<br/>').replace(/END_RESULT/g, ' ')}
        </div><br/><div style='border-left: 2px solid #F33; padding-left : 10px'>
      ${rewrite.data.replace(/\n/g, '<br/>').replace(/END_RESULT/g, ' ')}
      </div>`);
      fs.writeFileSync(__dirname+ '/../public/html/' + agentId + '.html', parsed.html().replace("windows-1252", "utf8"), 'utf8');
    }
    

}

  console.log(JSON.stringify(collection, null, 2));




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


module.exports = directedAgentMMA;