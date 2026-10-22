import { generateAIChatReply, checkOllamaHealth } from '../services/ai.service.js';

/**
 * Handles incoming chat messages from the frontend and queries Ollama / Qwen
 *
 * @route POST /api/v1/ai/chat
 */
export const handleAIChat = async (req, res) => {
  try {
    const { messages, message } = req.body;

    let chatHistory = [];
    if (Array.isArray(messages)) {
      chatHistory = messages;
    } else if (typeof message === 'string' && message.trim()) {
      chatHistory = [{ role: 'user', content: message.trim() }];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: "messages" array or "message" string is required',
      });
    }

    const aiResult = await generateAIChatReply(chatHistory);

    return res.status(200).json({
      success: true,
      reply: aiResult.reply,
      model: aiResult.model,
      durationMs: aiResult.durationMs,
      isFallback: aiResult.isFallback || false,
    });
  } catch (error) {
    console.error('Controller Error in handleAIChat:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process AI chat request',
      error: error.message,
    });
  }
};

/**
 * Health check & status endpoint for the AI / Ollama service
 *
 * @route GET /api/v1/ai/status
 */
export const getAIStatus = async (req, res) => {
  try {
    const status = await checkOllamaHealth();
    return res.status(200).json({
      success: true,
      ...status,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'error',
      error: error.message,
    });
  }
};
