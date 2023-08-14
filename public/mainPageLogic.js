
// dropzone

$('#goButtonPopover').popover();

let PLAYBOOK = "MNA";
let FILE_ID = "";

let contractDropZone = new Dropzone("#contract-dropzone", { 
  // only doc and docx
  maxFiles: 1,
  acceptedFiles: ".docx,.htm,.html" });
  contractDropZone.on("success", async file => {
  console.log("A file has been added");
  console.log(file);
  FILE_ID = file.xhr.response;
  
  goButton.setAttribute("disable", 'false');
  $('#goButtonPopover').popover('dispose');

  goButton.className = "btn btn-primary btn-lg";
  // FETCH POST '/api/agent'
});

let playbookZone = new Dropzone("#playbook-dropzone", { /* options , only xlsx files*/ 
  acceptedFiles: ".xlsx",
  maxFiles: 1,
});

playbookZone.on("success", async file => {
  console.log("A file has been added");
  console.log(file);
  PLAYBOOK = file.xhr.response;      
});

async function launchAgent() {
  let res = await fetch('/api/agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({goal: id, playbook: PLAYBOOK})
  });

  let data = await res.json();

  // add hashbang to urkl
  window.location.hash = data.agentID;
  renderFlow(data.agentID);
  setTimeout(function() {
    window.location.reload();
  }, 1000);

}
