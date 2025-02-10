const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.gemini_token);
const fs = require('fs').promises;

async function generative(prompt, user) {
    const personalityFilePath = './personality.txt';
    const ask = './asks-respostas.txt';
    const personalityContent = await fs.readFile(personalityFilePath, 'utf-8');
    const personalityLines = personalityContent.split('\n');

  
  try {  
    const safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ];
      
      const generationConfig = { maxOutputTokens: 750, temperature: 1 };
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp", safetySettings, generationConfig });
     // console.log(model)
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [
              { text: `${personalityLines}\n Cumprimente o usuário com uma saudação e depois seu nome, que é: <@${user}>.` },
            ],
          },
          {
            role: "model",
            parts: [
              {
                text: `Vou cumprimentar o usuário com seu nome: <@${user}>. Também limitarei todas as minhas respostas a 2.000 caracteres ou menos, independentemente do que você disser. Sinta-se à vontade para me perguntar qualquer coisa! `,
              },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 750, temperature: 0.5 },
      });
      
      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      response.truncated = response.text().length > 2000;
      if (response.truncated) {
        response.text =
          response.text().substring(0, 1928 - "... \n\n".length) + "... \n\n*A resposta foi interrompida devido ao limite de caracteres do Discords de 2.000*";
      }
      const resposta = await response.text();
  fs.appendFile(ask, `${prompt} - ${resposta}\n`)
  console.log(resposta)
  return resposta
} catch(err) {
return err
}
}

module.exports = generative;