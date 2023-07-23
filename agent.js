

const fs = require('fs');


const search = require('./tools/googleSearch');
search.configure(process.env.GOOLE_API_KEY, "3359060177f7e45c6");

const browse = require('./tools/browse');
const { AsyncResource } = require('async_hooks');

const store = require('./tools/store');


const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPEN_AI_KEY,
});


const openai = new OpenAIApi(configuration);

const logIt = require('./logIt.js');

let ID = 100


let MESSAGES = {
  
}



let retrieveFromUrl = {
  instruction : "EXTRACT_DATA_FROM_URL <url> <description of the data to be extract> <output data format> retrieve information from a url and return it in the specified format. Be specific in what kind of information you want to extract and what it is. add some context",
  keyword: "EXTRACT_DATA_FROM_URL",
  do: async (args,  agentId, taskId) => {

    args = args.replace(/\"/g, '');
    let url = args.split(' ')[0];
    let format = args.split(' ')[args.length - 1];
    let instruct = args.split(' ').slice(1, args.length - 1).join(' ');

    const res = await agent(`Get content from the url : ${url}, then extract the following information: ${instruct}. Return it in ${format}` , agentId, taskId, [...mainTools, browse]);
    logIt({ 
      type: "EXTRACT_DATA_FROM_URL",
      taskId: taskId,
      url: args,
      result: res
    }, agentId);
   return res;
  }
}

let mainTools = [search]

let defaultTools = []// [search, retrieveFromUrl];

async function agent(goal, agentId, parentTaskId=null, tools=defaultTools) {
  let taskId = ++ID;
  console.log(`New Task (#${taskId}): ${goal}`);

  await logIt({
    type: "NEW_TASK",
    taskId : taskId,
    goal : goal,
    parentTaskId: parentTaskId
  }, agentId);

  return think(taskId, goal, agentId, tools, parentTaskId);

}




async function agentContinue(answer, agentId, taskId) {

  console.log(`NEW INFORMATION (#${taskId}): ${answer}`);

  await logIt({
    type: "INFORMATION",
    taskId : taskId,
    answer : answer
  }, agentId);

  return think(taskId, answer, agentId, mainTools);

}

async function think(taskId, goal, agentId, tools=defaultTools, parrentId=null) {
  console.log(`Starting agent with tools ${tools.map(t => t.keyword).join(', ')}`);
  let systemPrompt = `The user will give you a task.
To achieve this goal you can do the following actions by outputing instructions as new lines:`

for (let tool of tools) { 
  systemPrompt += tool.instruction + '\n';
}

systemPrompt += 
`
PLAN <task> Plan to do a task in the future
END_RESULT <result>  output the result of the task once it is successfully completed. result should be an output of the result of the task



Parameter do not need to be quoted, even if they contain spaces. parameters do not support new lines
Instuction should be at the start of a line.
You should select only one instruction.

When given a task it is good to start by trying to determine how it should be solved and what step should be taken. Do not list your step in a numeric list, just output one step per line.

Once a task is complete it is good to check if the task was completed successfully.

If the task was not completed successfully it is good to try to determine why it was not completed successfully and to retry it.

You can only output one instruction. do not output multiple instructions.
`;

  // we backup the prompt
  if (!MESSAGES[taskId]) {
    MESSAGES[taskId] = [{"role": "user", "content": goal}];
  }
  else {
    MESSAGES[taskId].push({"role": "user", "content": goal});
  }
  let stack = MESSAGES[taskId];

  while (true) {

    let answer = await(prompt([{"role": "system", "content": systemPrompt}, ...stack]));
    
    stack.push({"role": "assistant", "content": answer});
    logIt({ 
      type: "REASONING",
      taskId: taskId,
      answer: answer
    }, agentId);
    console.log("Reasoning:", answer);
    // parse instructions!
    const lines = answer.split('\n');
    for (let line of lines) {
        const instruction = line.split(' ')[0];
        let args = line.split(' ').slice(1).join(' ');
        if (args[0] == '"' && args[args.length - 1] == '"') { 
          args = args.substring(1, args.length - 1);
        }

        // handle tools
        for (let tool of tools) { 
          if (instruction === tool.keyword) {
            const res = await tool.do(args, agentId, taskId);
            logIt({ 
              type: tool.keyword,
              taskId: taskId,
              query: args,
              result: res
            }, agentId);
            stack.push({"role": "user", "content": `Result for ${tool.keyword} with ${args} : ${res}`});
          }
        }

        if (instruction === 'RETRIEVE') { 
          console.log(`RETRIEVE ${args} from memory`)
          let key = args.split(' ')[0];
          let value = STORE[key];
          logIt({ 
            type: "RETRIEVE",
            taskId: taskId,
            key: key,
            value: value
          }, agentId);
          stack.push({"role": "user", "content": `RETRIEVE result for ${args} : ${value}`});
        }

        if (instruction === 'ASK') {
          const res = await agent(args, agentId, taskId);
          logIt({ 
            type: "ASK",
            taskId: taskId,
            url: args,
            result: res
          }, agentId);
          if (res.type == 'end') {
            stack.push({"role": "user", "content": `I did ${args}. The results are: ${res}`});
          }
          else if (res.type == 'missingContext') {
            stack.push({"role": "user", "content": `I'm missing context to do ${args}: ${res}. To ask me to continue this task, use the clarify instruction with id ${res.taskId}`});
          }
        }
     
        if (instruction === 'END_RESULT') {
          args = answer.substring(answer.indexOf('END_RESULT') + 'END_RESULT'.length);
          logIt({ 
            type: "END_RESULT",
            taskId: taskId,
            goal: goal,
            args: args
          }, agentId);
          console.log(`Task #${taskId} completed successfully (${goal})with results:
  ${args}`);
          return {
            type: 'end',
            data : args,
            taskId: taskId
          };
        }
        if (instruction === 'ASK_CLARIFICATION') {
          logIt({ 
            type: "ASK_CLARIFICATION",
            taskId: taskId,
            args: args
          }, agentId);
          console.log(`Task #${taskId} ask clarification:
  ${args}`);
          return {
            type: 'missingContext',
            data : args,
            taskId: taskId
          };
        }
        if (instruction === 'CLARIFY') {
          logIt({ 
            type: "CLARIFY",
            taskId: taskId,
            args: args
          }, agentId);
          let asktaskId = args.split(' ')[0];
          let clarification = args.split(' ').slice(1).join(' ');

          const res = await think(asktaskId, clarification, agentId);
         
          if (res.type == 'end') {
            stack.push({"role": "user", "content": `I did ${args}. The results are: ${res}`});
          }
          else if (res.type == 'missingContext') {
            stack.push({"role": "user", "content": `I'm missing context to do ${args}: ${res}. To ask me to continue this task, use the clarify instruction with id ${res.taskId}`});
          }
          
        }
        
    }
  }
  

}


async function prompt(messages) {
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

module.exports = {
  start: agent,
  continue: agentContinue
}

