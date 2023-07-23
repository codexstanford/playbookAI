
const express = require('express');
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })
const app = express();
const port = process.env.PORT || 3000; 

const agent = require('./agent.js')

const directedAgentMMA = require('./directedAgentMMA.js');
app.use(express.static('public'));

// parse body jon
app.use(express.json());

app.post('/api/agent', async (req, res) => { 
  let goal = JSON.parse(req.body.goal);

  let agentID = btoa(new Date().getTime() * Math.random() + " ").substring(0, 8);

  res.json({
    agentID : agentID
  });
  await directedAgentMMA(goal, agentID);  

  //await agent.start(goal, agentID);
});


//server side express file upload

app.post('/api/fileUpload', upload.single('file'), async (req, res) => {
  let file = req.file; 
  
  res.json(file.filename);
  console.log(file);
});

app.post('/api/agent/:agentId/:taskId', async (req, res) => { 
  let answer = req.body.answer;
  console.log(req.body);
  let agentId = req.params.agentId; 
  let taskId = req.params.taskId;
  res.json({});
  await agent.continue(answer, agentId, taskId);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
}
);

