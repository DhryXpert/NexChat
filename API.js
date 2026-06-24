import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
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