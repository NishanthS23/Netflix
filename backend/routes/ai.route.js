import express from 'express';
import { handleAIChat, getAIStatus } from '../controllers/ai.controller.js';

const router = express.Router();

/**
 * @route   POST /api/v1/ai/chat
 * @desc    Send a message or conversation history to Qwen on Ollama
 * @access  Public (or protected if user is logged in)
 */
router.post('/chat', handleAIChat);

/**
 * @route   GET /api/v1/ai/status
 * @desc    Check Ollama connectivity and loaded models
 * @access  Public
 */
router.get('/status', getAIStatus);

export default router;
