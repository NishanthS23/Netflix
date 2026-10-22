import axios from 'axios';
import { ENV_VARS } from '../config/env.config.js';

const SYSTEM_PROMPT = `You are "Netflix Copilot", an AI cinematic assistant embedded directly in the Netflix Clone platform.
Your mission:
- Recommend movies, TV shows, anime, and hidden gems tailored to the user's mood, taste, and preferred genres.
- Answer questions about movies, plot summaries (no spoilers unless requested!), directors, cast members, and trivia.
- Keep responses engaging, energetic, concise (under 150 words unless asked for an in-depth review), and formatted in clean GitHub markdown.
- Suggest 2-3 specific movie/series titles with release year and a 1-sentence hook for each.
- If asked about Netflix Clone features, remind them they can watch trailers, explore trending feeds, browse custom videos, and search across movies and TV shows.`;

/**
 * Sends a chat completion request to the Ollama container
 *
 * @param {Array<{role: string, content: string}>} messages - Conversation history
 * @param {string} [customModel] - Optional override model name
 * @returns {Promise<{reply: string, model: string, durationMs: number}>}
 */
export const generateAIChatReply = async (messages, customModel) => {
  const model = customModel || ENV_VARS.OLLAMA_MODEL || 'qwen2.5:0.5b';
  const ollamaUrl = `${ENV_VARS.OLLAMA_HOST || 'http://localhost:11434'}/api/chat`;

  const formattedMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(Array.isArray(messages) ? messages.slice(-10) : []), // keep last 10 messages for context
  ];

  const startTime = Date.now();

  try {
    const response = await axios.post(
      ollamaUrl,
      {
        model,
        messages: formattedMessages,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 256, // keep responses fast & bounded on CPU
          num_ctx: 2048,
        },
      },
      {
        timeout: 30000, // 30s timeout for CPU generation
      }
    );

    const reply = response.data?.message?.content || 'Sorry, I could not generate a recommendation right now.';
    const durationMs = Date.now() - startTime;

    return {
      reply,
      model,
      durationMs,
    };
  } catch (error) {
    console.error('Ollama Chat Error:', error?.message || error);

    // Fallback response if Ollama container is starting up or temporarily unreachable
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return {
        reply: "🎬 **Netflix Copilot** is warming up! Here are 3 instant binge recommendations while I connect:\n- **Stranger Things (2016)** - Supernatural 80s sci-fi nostalgia.\n- **Inception (2010)** - Mind-bending sci-fi heist thriller.\n- **Breaking Bad (2008)** - The ultimate high-stakes drama masterpiece.\n\n_Ask me again in a few moments!_",
        model: `${model} (fallback)`,
        durationMs: Date.now() - startTime,
        isFallback: true,
      };
    }

    throw new Error(`AI service failed: ${error.message}`);
  }
};

/**
 * Checks the connectivity and loaded models in Ollama
 */
export const checkOllamaHealth = async () => {
  try {
    const res = await axios.get(`${ENV_VARS.OLLAMA_HOST || 'http://localhost:11434'}/api/tags`, {
      timeout: 5000,
    });
    return {
      status: 'connected',
      models: res.data?.models || [],
      host: ENV_VARS.OLLAMA_HOST,
      activeModel: ENV_VARS.OLLAMA_MODEL,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error.message,
      host: ENV_VARS.OLLAMA_HOST,
      activeModel: ENV_VARS.OLLAMA_MODEL,
    };
  }
};
