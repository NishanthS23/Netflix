import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  X,
  Sparkles,
  RotateCcw,
  Film,
  Minimize2,
  Maximize2,
  ChevronDown,
} from 'lucide-react';

const SUGGESTIONS = [
  '🍿 Recommend a mind-bending sci-fi thriller',
  '🔥 What are the top trending series right now?',
  '🔦 Recommend shows similar to Stranger Things',
  '😂 A feel-good comedy for the weekend',
];

const AIChatBox = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        '👋 Welcome to **Netflix Copilot**! Powered by local AI (Qwen 0.6B). Ask me for movie recommendations, plot trivia, or what to binge next!',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelInfo, setModelInfo] = useState('Qwen 0.6B');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const userText = (textToSend || input).trim();
    if (!userText || isLoading) return;

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/v1/ai/chat', {
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
      });

      if (response.data?.success && response.data?.reply) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: response.data.reply },
        ]);
        if (response.data.model) {
          setModelInfo(response.data.model);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "Sorry, I couldn't get a recommendation right now. Please try again!",
          },
        ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Unable to connect to the AI service. Please make sure Ollama is running.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat reset. What genre or mood are you in the mood for today?',
      },
    ]);
  };

  // Helper to format basic markdown lines
  const renderFormattedText = (text) => {
    return text.split('\n').map((line, idx) => {
      // Bold tags formatting
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className={line.startsWith('- ') ? 'ml-2 my-0.5' : 'my-1'}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="text-red-400 font-semibold">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-[92vw] sm:w-[380px] h-[520px] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-3"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-900 rounded-full animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Netflix AI Copilot
                  </h3>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                    {modelInfo}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={clearChat}
                  title="Clear conversation"
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-800">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] text-xs leading-relaxed rounded-2xl px-3.5 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-red-600 text-white rounded-br-xs shadow-md'
                        : 'bg-zinc-900/90 text-zinc-200 border border-zinc-800 rounded-bl-xs shadow-sm'
                    }`}
                  >
                    {renderFormattedText(msg.content)}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl rounded-bl-xs px-4 py-3 flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions Chips (shown when few messages) */}
            {messages.length <= 2 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item)}
                    disabled={isLoading}
                    className="text-[11px] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1 rounded-full border border-zinc-800 hover:border-zinc-700 transition-all text-left"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-zinc-950 border-t border-zinc-800/80 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about movies, actors, plots..."
                disabled={isLoading}
                className="flex-1 bg-zinc-900/90 border border-zinc-800 focus:border-red-500/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-8 h-8 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white flex items-center justify-center transition-all flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full shadow-2xl shadow-red-900/40 border border-red-500/40 cursor-pointer transition-all"
        >
          <Sparkles className="w-4 h-4 animate-spin [animation-duration:6s]" />
          <span className="text-xs font-semibold tracking-wide">AI Copilot</span>
        </motion.button>
      )}
    </div>
  );
};

export default AIChatBox;
