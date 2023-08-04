const fs = require('fs');
const cheerio = require('cheerio');
const agent = require('./agent.js');
const { Configuration, OpenAIApi } = require("openai");
var iconv = require('iconv-lite');
const Diff2html = require('diff2html');

const Diff = require('diff');

const configuration = new Configuration({
  apiKey: process.env.OPEN_AI_KEY,
});

const logIt = require('./logIt.js');


const openai = new OpenAIApi(configuration);


async function directedAgentMMA(id, agentId) {

  // read File
  id = id.replace(/\//g, '');

  let data = "";

  if (id.indexOf('.dx')) {
    data = fs.readFileSync('./uploads/' + id);
  }
  else {
    data = iconv.decode(Buffer.from(fs.readFileSync('./uploads/' + id)), 'win1252');

    data = data.replace(/�/g, '\'');
    data = data.replace(/�/g, '\'');
  }

  
  let parsed = cheerio.load(data);

  let p = parsed('p');
  console.log(p);
  let collection = [];

  let systemPrompt = `You are a lawyer rewieving a extract of a contract (a clause). You are taks with determining the type of the clause:

If it seems to not be a legal clause output: IRREVELANT
If you think the text is not a full clause ouput : NO_CONTEXT
If you think it is not a clause but a paragraph / section title output: TITLE

Else output one of this class that correspond to the clause:

Acquisition Proposal Definition
Defined term implicated in the “no-shop” and “fiduciary out” clauses ina merger agreement. Under the “no shop,” the target agrees not to solicitbids (“Acquisition Proposals”) from third parties or to negotiated withthem. Under the “fiduciary out,” if the target receives an unsolicited bidfrom a third party that is superior to the terms of the merger agreement,then the target may be permitted to negotiate with the bidder and withdraw the board recommendation that stockholders vote in favor of themerger agreement.

Appraisal Rights Condition:
Condition to the target's obligation to complete the merger requiring thatthe proportion of target shares voted against the merger not exceed aspecified threshold.

Board Reaffirmation Recommendation	
Covenant prohibiting the target board of directors from withdrawing itsrecommendation that stockholders vote in favor of the merger agreementand requiring the target board to reaffirm its recommendation in a pressrelease upon the buyer's request, unless the “fiduciary out” applies.

Bring-down Representations and Warranties	
Condition to the buyer's obligation to complete the merger requiring thatall of the company's representations and warranties in the merger agreement be true and correct (with qualifications) as of the closing date.

Buyer Match Right	
Provision requiring the target to allow the buyer to match or beat a thirdparty's bid for the target that is superior to the terms of the mergeragreement.

Compliance with Laws and Permits Representation	
Representation by the target that it has complied with all applicable lawsand obtained all required permits and approvals for its business.

Conduct of Business in the Ordinary Course Convenants	
Covenant requiring the target company to conduct its business in theordinary and usual course between the signing of the merger agreementand the deal closing, and prohibiting specified actions or changes by thetarget without prior approval by the buyer.

Covenant Compliance Condition	
Condition to the buyer's obligation to complete the merger requiring thatthe company have performed or complied with all of its pre-closing obligations in the merger agreement.

Directors' and Officers' Indemnification
Covenant requiring the company surviving the merger to indemnify thetarget's pre-closing directors and officers for losses relating to pre-closingconduct, and to continue to maintain their D&O insurance for a specifiedperiod post-closing

Dispute Settlement Provision
Provision whereby the parties submit to the jurisdiction of a particularcourt and accept it as appropriate venue (or agree to alternative disputeresolution).

Efforts Standard Applicable to Closing Conditions	
Covenant requiring the parties to take all actions to achieve completionof the merger (and setting the standard for what specific level of effort isrequired of the parties).

Exclusive Remedy	
Provision stating that the target's right to receive payment of the reversebreak-up fee from the buyer is the target's sole available remedy for thebuyer's failure to complete the merger.

Express Non-Compliance	
Provision stating that the parties are entitled to rely only on the representations and warranties included in the merger agreement.

Fiduciary Out	
Provision excepting the target board from the no-shop, stockholder voterecommendation, and requirement to close the merger according to themerger agreement, if the target receives an unsolicited third-party bidthat is superior to the terms of the merger agreement.

Fiduciary Termination Right	
Provision allowing the target board to terminate the merger agreementwith the buyer if it receives an unsolicited third-party bid—prior to thestockholder vote approving the merger agreement—that is superior to theterms of the merger agreement.

Financial Statements Representation	
Representation by the target that its financial statements fairly presentedthe target's financial position and complied with GAAP, and that thetarget's disclosure controls and procedures are adequate

Full Disclosure/No Misleading Statements Representation	
Representation by the target that its securities filings complied with applicable law and did not contain any untrue statement or omit a materialfact that would render the filing misleading.

Governing Law	
Provision selecting which state's laws will govern the merger agreementand any disputes relating to it.

Intervening Event Definition	
Defined term that covers an unforeseen material event for the target (otherthan a superior third-party bid) occurring after the merger agreement issigned. In this case, the target board may be permitted to change its recommendation that the stockholders vote in favor of the merger agreement.

Knowledge Definition	
Defined term used in various representations and warranties of the target that determines when information known or knowable to officers andemployees of the target will be attributed to the target itself.

Material Adverse Effect Definition	
Defined term that is central to the termination rights and the riskallocation and disclosure provisions in the merger agreement; designedto capture an event having a serious negative impact on the target (withvarious exceptions). In addition to being used as the materiality standardin several of the target's representations and warranties, the occurrenceof a material adverse event typically permits the buyer to terminate themerger agreement without any obligation to pay a reverse break-up fee.

No Undisclosed Liabilities Representation	Representation by the target that it has no material liabilities or obligations other than those disclosed in its most recent financial statements.Share Conversion/Exchange	
Provision describing the mechanics for the conversion of the target's stockinto the right to receive the merger consideration.

Shareholder Approval	
Representation by the target as to precisely what approvals are requiredunder state corporate law for the merger agreement and merger.

Specific Performance	
Provision granting each party the right to have a court force the otherparty to perform some or all of its obligations under the merger agreement,in addition to seeking monetary damages or other available remedies.

Superior Proposal Definition	
Defined term that determines whether a third-party bid for the target issuperior to the terms in the merger agreement, such that the target boardshould be permitted to terminate the merger agreement.

Termination Purchase/Merger Agreement	
Provision setting forth the various circumstances under which a party mayterminate the merger agreement.

Termination for Material Adverse Effect	
Condition to the buyer's obligation to complete the merger requiring thatthe company not have experienced a serious negative event between signing and closing.

Willful Breach Definition	
Defined term that sets the standard for when a party is sufficiently responsible for breaching the merger agreement that it should not get the benefitof any of the limitations on liability contained in the merger agreement.

If it seems be classify in previously give category output: OTHER

Only output the type of clause, no other text`
  
  
  for (let item of p) {
   
    if (parsed(item).text().length < 64) {
      continue;
    } 
    let type = await promptIt([
      {"role": "system", "content": systemPrompt},
      {"role": "user", "content": parsed(item).text()}
    ]);

    console.log(type);

    logIt({ 
      type: "CLASSIFY",
      taskId: 1,
      clause: parsed(item).text(),
      result: type
    }, agentId);
    collection.push({
      clause: parsed(item).text(),
      type: type
    });
    if (type == "IRRELEVANT" || type == "NO_CONTEXT" || type == "TITLE" || type == "OTHER") { 
      continue;
    }

    let knowledgeMap = {
      "Acquisition Proposal Definition" : "",
      "Appraisal Rights Condition" : "It is specified the ratio of approved votes to adopt the merger relative to the rejected votes. ",
      "Board Reaffirmation Recommendation" : "It is specified in the Stockholder Agreement a recommendation to adopt the merger agreement.",
      "Bring-down Representations and Warranties" : "It is specified that what the Parent has described in their representations and warranties are true and correct. ",
      "Buyer Match Right" : "",
      "Compliance with Laws and Permits Representation" : "",
      "Conduct of Business in the Ordinary Course Convenants" : "It is specified what the Company is not permitted to do in the time between the signing of the merger agreement and the deal closing.",
      "Covenant Compliance Condition" : "",
      "Directors' and Officers' Indemnification" : "A time period of six years is specified for the indemnification period to directors and officers. ",
      "Dispute Settlement Provision" : "A court needs to be specified/included when a dispute arises",
      "Efforts Standard Applicable to Closing Conditions" : "A specific time is agreed upon for the official closing of the agreement. ",
      "Exclusive Remedy" : "A termination fee must be specified and that there is no other option in the event that the party buying the company does not fulfil the agreement. ",
      "Express Non-Compliance" : "The obligations of each party, Parent and Company, must be specified and that only the terms and provisions of the agreement govern the obligations of each party.  ",
      "Fiduciary Out" : "It is specified in relation to the superior proposal.  ",
      "Fiduciary Termination Right" : "It is specified that prior written notice is given to the Parent and there is otherwise no breach of the merger agreement. ",
      "Financial Statements Representation" : "It is specified that sufficient due diligence will be done. ",
      "Full Disclosure/No Misleading Statements Representation" : "It is specified that sufficient due diligence will be done. ",
      "Governing Law" : "A state or jurisdiction is specified",
      "Intervening Event Definition" : "",
      "Knowledge Definition" : "It is specified the type or types of information the Company or subsidiary of the Company should know.  ",
      "Material Adverse Effect Definition" : "It should specify some examples that qualify the definition of material adverse effect. Also, additional definitions that may be related to material adverse effect should be explicitly defined.   ",
      "No Undisclosed Liabilities Representation" : "",
      "Share Conversion/Exchange" : "The capital structure is defined. ",
      "Shareholder Approval" : "It is specified that all shareholders or stockholders of the Company agree to the merger agreement and that the Company will be solely responsible for soliciting the votes in favor of the merger. ",
      "Specific Performance" : "A court is specified. ",
      "Superior Proposal Definition" : "It is specified that the proposal is unsolicited by Company, should be more than 50% of the Company's assets, and Board of Directors views as good faith. ",
      "Termination Purchase/Merger Agreement" : "A termination fee is specified. ",
      "Termination for Material Adverse Effect" : "It is specified that the Parent should fulfil the terms of the merger agreement with the exception that it meets the requirements of the material adverse effect. ",
      "Willful Breach Definition" : "The reason of termination is not by consent of the Parent."
    }

    let instruction = "";
    if (knowledgeMap[type]) { 
      instruction = knowledgeMap[type];
    }
    else {
      continue;
    }
    let rewrite = await agent.start(
      `Check if this clause is well written. If it is not well written suggest a new version and output it after the keyword END_RESULT.
If the clause is ok output the string "well written :)" after the END_RESULT keyword. 
This kind of clause generally respects the following playbook: 
${instruction}    
 
The clause is : 
      
${parsed(item).text()}

Return the clause and your reasoning for editing after the keyword END_RESULT. If you think the clause is not well written, propose a rewritte and a reasoning. DO not only say that it is not well written without justification! If a clause is well written do not forget the smilley :)`,
      agentId, 1);
    logIt({ 
      type: "REWRITE",
      taskId: 1,
      clause: parsed(item).text(),
      result: type,
      rewrite: rewrite
    }, agentId);

    if (rewrite.data.trim().length  
      && rewrite.data.toLowerCase().indexOf("well written :)") == -1 
      && rewrite.data.toLowerCase().indexOf("well-written :)") == -1 
      && rewrite.data.toLowerCase().indexOf("well written. :)") == -1 
      && rewrite.data.toLowerCase().indexOf("is well written") == -1 
      && rewrite.data.toLowerCase().indexOf("is well-written") == -1 
      && rewrite.data.toLowerCase().indexOf(":)") == -1
      && rewrite.data.toLowerCase().trim() != parsed(item).text().trim()) {
 
      parsed(item).html(`<div style='border-left: 2px solid #aaa; background-color: #f8f8f8; padding: 8px; border-radius: 4px'>
        <div style='border-left: 2px solid #33F; padding-left : 10px'>
        ${parsed(item).html().replace(/\n/g, '<br/>').replace(/END_RESULT/g, ' ')}
        </div><br/><div style='border-left: 2px solid #F33; padding-left : 10px'>
      ${rewrite.data.replace(/\n/g, '<br/>').replace(/END_RESULT/g, ' ')}
      </div>`);
      fs.writeFileSync('./public/' + agentId + '.html', parsed.html().replace("windows-1252", "utf8"), 'utf8');
    }
    

}

  console.log(JSON.stringify(collection, null, 2));




}



async function promptIt(messages) {
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


module.exports = directedAgentMMA;