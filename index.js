var mammoth = require("mammoth");
const fs = require('fs');
const express = require('express');
const multer  = require('multer');
const upload = multer({ dest: 'uploads/'});

const app = express();
const port = process.env.PORT || 3000; 

const agent = require('./src/agent.js')

const directedAgentMMA = require('./src/directedAgentMMA.js');
const clauseEval = require('./src/clauseEval.js');
const playbookEval = require('./src/playBookEval.js');
const playbookBuild = require('./src/playbookBuild.js');

const convertContract = require('./src/convertContract.js');

app.use(express.static('public'));

// parse body jon
app.use(express.json());

// allow query fron all origins!
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // allow requests from all origins
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.post('/api/agent', async (req, res) => { 
  console.log(req.body)
  if (!req.body.goal) {
    res.json({error: "no goal?"});
    return;
  }
  let goal = JSON.parse(req.body.goal);
  
  let agentID = btoa(new Date().getTime() * Math.random() + " ").substring(0, 8);

  res.json({
    agentID : agentID
  });


  await directedAgentMMA(goal, agentID);


  //await agent.start(goal, agentID);
});


app.post('/api/evaluate', async (req, res) => { 
  if (!req.body.clause) {
    res.json({error: "no clause", echo: req.body});
    return;
  }
  console.log(req.body.clause);
  try {
    let a = await clauseEval(req.body.clause);  
    res.json(a);
  }
  catch (E) {
    res.json({error: E, echo: req.body});
    console.log(E);
  }

 
});

app.post('/api/evaluatePlaybook', async (req, res) => { 
  if (!req.body.clause) {
    res.json({error: "no clause", echo: req.body});
    return;
  }

  if (!req.body.playBook) {
    res.json({error: "no playbooks", echo: req.body});
    return;
  }

  console.log(req.body.clause);
  console.log(req.body.playBook);
  
  try {
    let a = await playBookEval(req.body.clause, req.body.playBook);  
    res.json(a);
  }
  catch (E) {
    res.json({error: E, echo: req.body});
    console.log(E);
  }

 
});


//server side express file upload

app.post('/api/contractUpload', upload.single('file'), async (req, res) => {
  let file = req.file; 

  if (file.originalname.indexOf('.docx') == file.originalname.length - 5
  || file.originalname.indexOf('.doc') == file.originalname.length - 4) {
    try {
      const html = await mammoth.convertToHtml({path:`${__dirname}/uploads/${file.filename}`});;
      fs.writeFileSync(`${__dirname}/uploads/${file.filename}`, html.value);
      res.json(`${file.filename}`);
    } catch (e) {
      res.status(503);
      res.send('Could not convert file');
    }
  
  } else {
    res.json(file.filename);
  }

  convertContract(file.filename, file.originalname);
});


app.post('/api/playbookUpload', upload.single('file'), async (req, res) => {
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
});



app.post('/api/v1/playbook/build', async (req, res) => { 
  const original = req.body.original;
  const edited = req.body.edited;
  
  const playbook = await playbookBuild(original, edited);
 
  res.json({
    playbook: playbook
  })
});
