
const fs = require('fs/promises');

let logStack = {};

async function logIt(data, id) { 

  if (!logStack[id]) {
    logStack[id] = [];
  }
  /*if (await fs.exist(`${__dirname}/../public/trace/log-${id}.json`)) {
    logStack[id] = JSON.parse(
        await fs.readFile(`${__dirname}/../public/trace/log-${id}.json`, 'utf8')
        );
  }*/
  logStack[id].push(data);
  await fs.writeFile(`${__dirname}/../public/trace/log-${id}.json`, 
    JSON.stringify(logStack[id], null, 2)
  );
}

async function get(id) {
  if (logStack[id]) {
    return logStack[id];
  }
  /* else if (await fs.exist(`${__dirname}/../public/trace/log-${id}.json`)) { 
    return await JSON.parse(fs.readFile(`${__dirname}/../public/trace/log-${id}.json`, 'utf8'));
  }*/
  return []
}
module.exports = {
  log : logIt,
  get : get
}