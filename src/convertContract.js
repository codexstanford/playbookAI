
const fs = require('fs/promises');
const dataDir = `${__dirname}/../data`
const prompt = require('./utils/prompt.js');

async function convertContract(id, originalName) {

  let contract = {
    name: originalName,
    uploaded: new Date().getTime(),
    processing: true,
    data : []
  }

  await fs.writeFile(`${dataDir}/${id}.json`, JSON.stringify(contract, null, 2));

  let html = await fs.readFile(`${__dirname}/../uploads/${id}`, 'utf8');

  while (html.length) {

    let fragment = html.substring(0, 5000);
    let systemPrompt = `Your goal is to convert an HTML fragment document provided by the user into markdown. Convert it to markdown with a title heirarchy that make sense. Keep all the original content, do not summarize. Do not try to understand document, Only translate HTML to Markdown while keeping ALL content. Make sure no content is missing.`

    let messages = [{
      role: "system",
      content : "systemPrompt"
    }];

    messages.push({
      role: "user",
      content : fragment
    })
    let data = await prompt(messages);

    debugger;
  }

}

module.exports = convertContract;