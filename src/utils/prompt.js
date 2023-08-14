

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPEN_AI_KEY,
});


const openai = new OpenAIApi(configuration);

async function prompt(messages) {
  let openaiResponse = null;
  console.log("OPEN AI", messages);
  let model = "gpt-3.5-turbo"
  if (JSON.stringify(messages).length > 2000) {
    model = "gpt-3.5-turbo-16k"
  } 
  console.log("Model", model)
  try {
    const response = await openai.createChatCompletion({
      model: model,
      messages:messages
    });
    openaiResponse = response;
    return response.data.choices[0].message.content;
  }
  catch (e) {
    // sleep 

    console.log("OPEN AI JAM, wait 10 sec")
    if (openaiResponse) {
      console.log(openaiResponse);
    }
    await new Promise(resolve => setTimeout(resolve, 10000));
    return await prompt(messages);
  }
}

module.exports = prompt;