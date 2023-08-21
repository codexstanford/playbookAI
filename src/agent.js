

const prompt = require('./utils/prompt.js');

const logIt = require('./logIt.js');

let ID = 100


let MESSAGES = {
  
}





let defaultTools = []

async function agent(goal, agentId, parentTaskId=null, tools=defaultTools) {
  let taskId = ++ID;
  console.log(`New Task (#${taskId}): ${goal}`);

  await logIt.log({
    type: "NEW_TASK",
    taskId : taskId,
    goal : goal,
    parentTaskId: parentTaskId
  }, agentId);

  return think(taskId, goal, agentId, tools, parentTaskId);

}




async function agentContinue(answer, agentId, taskId) {

  console.log(`NEW INFORMATION (#${taskId}): ${answer}`);

  await logIt.log({
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

  let ms = 10;
  while (true) {
    ms--;
    if (ms < 0) { 
      console.log("Timeout");
      await logIt.log({ 
        type: "END_RESULT",
        taskId: taskId,
        goal: goal,
        args: 'timeout'
      }, agentId);
      return {
        type: 'end',
            data : 'timeout',
            taskId: taskId
      };
    }
    let answer = await(prompt([{"role": "system", "content": systemPrompt}, ...stack]));
    
    stack.push({"role": "assistant", "content": answer});
    await logIt.log({ 
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
          await logIt.log({ 
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
        await logIt.log({ 
          type: "RETRIEVE",
          taskId: taskId,
          key: key,
          value: value
        }, agentId);
        stack.push({"role": "user", "content": `RETRIEVE result for ${args} : ${value}`});
      }

      if (instruction === 'ASK') {
        const res = await agent(args, agentId, taskId);
        await logIt.log({ 
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
    
      if (instruction === 'END_RESULT' || line.indexOf('END_RESULT') > -1) {
        args = answer.substring(answer.indexOf('END_RESULT') + 'END_RESULT'.length);
        await logIt.log({ 
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
          logs: stack,
          taskId: taskId
        };
      }
        
    }
  }
  

}



module.exports = {
  start: agent,
  continue: agentContinue
}

