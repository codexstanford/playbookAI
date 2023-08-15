
const fs = require('fs/promises');
const dataDir = `${__dirname}/../data`
const prompt = require('./utils/prompt.js');

const FragmentLength = 8000;
async function convertContract(id, originalName) {

  let contract = {
    name: originalName,
    id: id,
    uploaded: new Date().getTime(),
    status : {
      md: false
    },
    data : [],
    md: ""
  }

  await fs.writeFile(`${dataDir}/${id}.json`, JSON.stringify(contract, null, 2));

  let html = await fs.readFile(`${__dirname}/../uploads/${id}`, 'utf8');

  let md = "";
  let oldMessages = [];

  // Remove all dataimage to simplify
  html = html.replace(/data:image\/[a-z]+;base64,[a-z0-9/\+=]+/gi, "");
  while (html.length) {
    console.log(html.length + " left... (" + ((html.length / 8000 | 0) + 1) + ")")
    let fragment = html.substring(0, FragmentLength);
    let systemPrompt = `Your task is to convert HTML fragments  provided by the user into markdown. Convert it to markdown with a title hierarchy that make sense, especially in the context of previous message. Keep all the original content, do not summarize. Do not try to understand document, Only translate HTML to Markdown while keeping ALL content. Make sure no content is missing. ONLY output markdown. Do not forget content. Try to identify titles and subtitle, do not use bold to denote that something is a title.`

    let messages = [{
      role: "system",
      content : systemPrompt
    }];

    if (oldMessages.length) {
      messages = [...messages, ...oldMessages];
    }

    messages.push({
      role: "user",
      content : fragment
    })
    let data = await prompt(messages);
    md += data;
    contract.md = md;
    await fs.writeFile(`${dataDir}/${id}.json`, JSON.stringify(contract, null, 2));

    if (html.length > 8000) {
      let fragment = "[Truncated...]" + html.substring(FragmentLength - 500, FragmentLength);
      oldMessages = [];
      oldMessages.push(
        {"role" : "user", "content": fragment});

      oldMessages.push(
        {role: "assistant", content: getHierarchyAndContent(md)}
      );
      html = html.substring(FragmentLength);
    }
    else {
      break;
    }

  }

  contract.status.md = true;
  contract.data = buildArrayFromMd(md);
  await fs.writeFile(`${dataDir}/${id}.json`, JSON.stringify(contract, null, 2));

}

function getHierarchyAndContent(md) {
  let data = [];

  md = md.split('\n');

  let maxLevel = -1;
  for (let i = md.length - 1; i >= 0; --i) {

    let lineLvl = 0;
    while (lineLvl < md[i].length && md[i][lineLvl] == '#') {
      lineLvl++;
    }

    if (maxLevel == -1 || lineLvl < maxLevel) {
      if (lineLvl) {
        maxLevel = lineLvl;
      }
      data.unshift(md[i]);
    }
  }

  return data.join('\n');
}

function buildArrayFromMd(md) {
  let data = [];

  md = md.split('\n');

  let maxLevel = -1;
  let tableBuffer = [];
  for (let line of md) {
    if (tableBuffer.length && line[0] != '|') {
      data.push({
        type: "table",
        content: tableBuffer.join('\n')
      })
      tableBuffer = [];
    }
    if (line[0] == '#') {
      let titleLvl = 0;
      while (titleLvl < line.length && line[titleLvl++] == '#');
      data.push({
        type: "title",
        title: titleLvl,
        content: line.substring(titleLvl)
      });
    }
    else if (line[0] == '|') {
      tableBuffer.push(line);
    }
    else {
    data.push({
      type: "content",
      content: line
    })
    }

    
  }
  if (tableBuffer) {
    data.push({
      type: "table",
      content: tableBuffer.join('\n')
    });
  }
  return data;
}


module.exports = convertContract;