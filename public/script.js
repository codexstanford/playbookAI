// get content after hashbang
var hash = window.location.hash.substr(1);
let agentID  = null;

if (hash.length) {

  renderFlow(hash);
}

async function renderFlow(id) {


    try {
    if (id) {
      agentID = id;
    }

    MainView.style.display = 'none';
    FlowView.style.display = 'block';
    
    let res = await fetch(`/trace/contract-${agentID}.json`);
    let data = await res.json();

    let flowContent = document.getElementById('flowContent');

    if (data.status.md) {
      // remove spinner if doc is complete
      document.getElementById('flowWaiting').innerHTML = "";
    }
    let itemId = 0;
    for (let item of data.data) {
      item.id = 'item_' + itemId++;
      renderItem(item);
    }
    }
    catch (e) {
      console.log(e);
    }
    setTimeout(function () {
      var hash = window.location.hash.substr(1);
      if (hash.length) {
        renderFlow(hash);
      }
    }, 2000);
}

let pastElements = {};
function renderItem(item) {
  console.log(item);
  // this is insanity I should be using Vue. Hackathon style.
  if (pastElements[item.id]) {
    // cached
    return;
  }
  let div = null;
  if (pastElements[item.id]) {
    div = document.getElementById(item.id);
  }
  else {
    div = document.createElement('div');
    div.id = item.id;
    flowContent.appendChild(div);
  }
  pastElements[item.id] = true;
  let html = `<div class='row'>`;

  html += `<div class='col-3'></div>`;

  html += `<div class='col-6'>`

  if (item.type == 'title') {
    html += `<h${item.title}>${item.content}</h${item.titleLvl}>`;
  }
  if (item.type == 'content') {
    html += `<p>${item.content}</p>`;
  }
  if (item.type == 'table') {
    html += `<p>${item.content}</p>`;
  }

  html += `</div><div class='col-3'></div>`

  html += '</div>'
  if (div.innerHTML != html) {
    div.innerHTML = html;
  }

}

async function answer(taskId) {
  let answer = document.getElementById('answer').value;

  await fetch(`/api/agent/${agentID}/${taskId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({answer : answer})
  });
  renderFlow(agentID);
}



function renderAgentLog() {
  for (let item of data) {
    let div = document.createElement('div');
    div.className = 'collection-item';

    div.innerHTML = `
      <div class='actionType'>${item.type}</div>
    `

    if (item.type === 'NEW_TASK') {
      div.innerHTML += `
        <div class='goal'>${item.goal}</div>
      `
    }
    if (item.type === 'REWRITE') {
      htmlOutput.innerHTML = `<a href="/html/${window.hash}.html" target="_blank">html output</a>`;
      div.innerHTML += `
        <div class='goal'>${item.rewrite.data}</div>
      `
    }
    else if (item.type === 'REASONING') {
      div.innerHTML += `
        <pre class='reasoning'>${item.answer.replace(/::/g, "Do ")}</pre>
      `
    }
    else if (item.type === 'SEARCH') {
      div.innerHTML += `
        <pre class='query'>${item.query}</pre>
        <pre class='result'>${item.result}</pre>
      `
    }
    else if (item.type === 'GET_PAGE') {
      div.innerHTML += `
        <pre class='url'>${item.query}</pre>
        <div class='result'>${item.result}</div>
      `
    }
    else if (item.type === 'CLASSIFY') {
      div.innerHTML += `
        <div class='result'><b>${item.result}</b></div>
        <pre class='query'>${item.clause}</pre>
        
      `
    }
    else if (item.type === 'ASK_CLARIFICATION') {
      div.innerHTML += `
        <div>${item.args}</div>
      `
      if (!item.parentTaskId && item == data[data.length - 1]) {
        div.innerHTML += `
        <input type='text' id='answer'>
        <input type='button' value='Send' onclick="answer('${item.taskId}')">
        `
        refresh = false;
      }
    }
    else {
      div.innerHTML += `
        <div class='JSON'><pre>${JSON.stringify(item, null, 2)}</pre></div>
      `
    }
    if (item.type == "NEW_TASK") {
      taskList[item.taskId] = div;
      div.className = 'task';

      if (item.parentTaskId) {
        taskList[item.parentTaskId].appendChild(div);
      }
      else {
        flowContent.appendChild(div);
      }
    }
    else {
      if (!taskList[item.taskId]) {
        let ndiv = document.createElement('div');
        ndiv.className = 'task';

        taskList[item.taskId] = ndiv;
        flowContent.appendChild(ndiv);
      }
      taskList[item.taskId].appendChild(div);
    }
    
  }
}