import OpenAI from 'openai'
import dotenv from 'dotenv'
dotenv.config()

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is not set in your .env file')
    }
    client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
    })
  }
  return client
}

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface DeepSeekOptions {
  maxTokens?: number
  temperature?: number
  model?: string
}

/**
 * Core DeepSeek call - returns full response text
 */
export async function callDeepSeek(
  messages: Message[],
  options: DeepSeekOptions = {}
): Promise<string> {
  const c = getClient()
  const response = await c.chat.completions.create({
    model: options.model ?? process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
    messages,
    max_tokens: options.maxTokens ?? 2048,
    temperature: options.temperature ?? 0.7,
  })
  return response.choices[0]?.message?.content ?? ''
}

/**
 * DeepSeek call with tool/function calling support
 */
export async function callDeepSeekWithTools(
  messages: Message[],
  tools: OpenAI.Chat.ChatCompletionTool[],
  options: DeepSeekOptions = {}
): Promise<OpenAI.Chat.ChatCompletionMessage> {
  const c = getClient()
  const response = await c.chat.completions.create({
    model: options.model ?? process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
    messages,
    tools,
    tool_choice: 'auto',
    max_tokens: options.maxTokens ?? 2048,
    temperature: options.temperature ?? 0.7,
  })
  return response.choices[0]?.message
}

/**
 * Streaming DeepSeek call - calls onChunk for each token
 */
export async function callDeepSeekStream(
  messages: Message[],
  onChunk: (chunk: string) => void,
  options: DeepSeekOptions = {}
): Promise<string> {
  const c = getClient()
  const stream = await c.chat.completions.create({
    model: options.model ?? process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
    messages,
    max_tokens: options.maxTokens ?? 2048,
    temperature: options.temperature ?? 0.7,
    stream: true,
  })

  let full = ''
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? ''
    if (text) {
      full += text
      onChunk(text)
    }
  }
  return full
}