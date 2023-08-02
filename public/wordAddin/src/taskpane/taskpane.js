/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global document, Office, Word */

Office.onReady((info) => {
  if (info.host === Office.HostType.Word) {
    document.getElementById("sideload-msg").style.display = "none";
    document.getElementById("app-body").style.display = "flex";
    document.getElementById("run").onclick = run;
  }
});

export async function run() {
  return Word.run(async (context) => {
    /**
     * Insert your Word code here
     */
    document.getElementById("app-body").innerHTML = `<b>Analysing document...</b>
    <br>
    <div id='progress'>...</div>
    `;

    let paragraphs = context.document.body.paragraphs;

    // for each paragraph in document
    context.load(paragraphs, 'text');     
    return context.sync().then( async () => {
      for (var i = 0; i < paragraphs.items.length; i++) {
        document.getElementById('progress').innerHTML = `Analysing paragraph ${i} of ${paragraphs.items.length}`;
        if (paragraphs.items[i].text.length < 256) {
          // skip paragraphs that are too shorts
          continue;
        }
        let res = await fetch('https://mna-review-8926c18873bf.herokuapp.com/api/evaluate', {
          method: 'POST',
          cors: 'no-cors',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({clause: paragraphs.items[i].text})
        });
  
        let data = await res.json();

        if (data.why) {
         // add data why after the paragraph text / color paragraph in yellow

          paragraphs.items[i].getRange(Word.RangeCollection.whole).insertComment(data.why, 'MNA Review')
          paragraphs.items[i].font.highlightColor = 'yellow';
          
          // sync
          await context.sync();


        
        }
  
      }
    });
  

  });
}
