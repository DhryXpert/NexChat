import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})

async function main() {
  const completion = await openai.chat.completions.create({
    model: "google/gemma-2-2b-it",
    messages: [{"role":"user","content":""}],
    temperature: 0.2,
    top_p: 0.7,
    max_tokens: 1024,
    stream: true,
  })
   
  for await (const chunk of completion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '')
  }
  
}

main();