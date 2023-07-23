const {google} = require('googleapis');
const customsearch = google.customsearch('v1');

let GOOLE_API_KEY = null;
let CX = null;

const search = {
  do : async function (query) {
  
    console.log("Do Search : ", query);
    const res = await customsearch.cse.list({
      cx: CX,
      q: query,
      auth: GOOLE_API_KEY,
    })

    console.log(res.data.items);
    let returnValue = "";
    if (!res.data.items) {
      return "No result found for this query";
    }
    for (let item of res.data.items) { 
      returnValue += `- [${item.title}](${item.link}) ${item.snippet}\n`;
    }
    console.log("Search result : ", returnValue);
    return returnValue;
  },
  configure: function(gooleApiKey, cx) {
    GOOLE_API_KEY = gooleApiKey;
    CX = cx;
  }
}

module.exports = {
  do: search.do,
  configure: search.configure,
  instruction : "SEARCH <query> the internet for a given query and return a list of website",
  keyword: "SEARCH"
}
