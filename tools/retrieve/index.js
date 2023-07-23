
const retrieve = {
  do : async function (query) {
  
    console.log("Do Retrieve : ", query);

    let returnValue = "";




    if (!res.data.items) {
      return "No result found for this query";
    }
    for (let item of res.data.items) { 
      returnValue += `- [${item.title}](${item.link}) ${item.snippet}\n`;
    }
    console.log("Search result : ", returnValue);
    return returnValue;
  }
}

module.exports = {
  do: retrieve.do,

  instruction : "RETRIEVE_FROM_URL <url> <description of the information to retrieve> <format>",
  keyword: "RETRIEVE_FROM_URL"
}
