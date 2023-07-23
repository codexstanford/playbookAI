
const fs = require('fs');

let logStack = [];

async function logIt(data, id) { 

  if (fs.existsSync(`${__dirname}/public/trace/log-${id}.json`)) {
    logStack = JSON.parse(
        fs.readFileSync(`${__dirname}/public/trace/log-${id}.json`, 'utf8')
        );
  }
  logStack.push(data);
  fs.writeFileSync(`${__dirname}/public/trace/log-${id}.json`, 
    JSON.stringify(logStack, null, 2)
  );
}

module.exports = logIt;