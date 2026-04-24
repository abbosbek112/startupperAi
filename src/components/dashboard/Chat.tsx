import { Startup, ChatMessage } from '../../types';
import { useState, useRef, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useChatMessages } from '../../hooks/useChatMessages';
import { createStartupChat } from '../../lib/gemini';
import { Send, User as UserIcon, Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

export default function Chat({ startup }: { startup: Startup }) {
  const messages = useChatMessages(startup.id);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reconstruct history for Gemini SDK
  const geminiHistory = useMemo(() => {
    return messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setLoading(true);

    try {
      // 1. Save user message to Firestore
      await addDoc(collection(db, 'startups', startup.id, 'chats'), {
        role: 'user',
        content: userMessage,
        timestamp: serverTimestamp()
      });

      // 2. Initialize chat with history and send message
      // We use the latest history to ensure context is maintained
      const chat = createStartupChat(startup, geminiHistory);
      const result = await chat.sendMessage({ message: userMessage });
      const aiResponse = result.text;

      // 3. Save AI message to Firestore
      await addDoc(collection(db, 'startups', startup.id, 'chats'), {
        role: 'model',
        content: aiResponse,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
        <div className="space-y-8">
            <div className="flex items-center space-x-2 border-b border-line pb-4">
                <Bot className="w-5 h-5 text-ink" />
                <span className="text-sm font-semibold">AI Ko-Faunder</span>
            </div>
            
            <div className="space-y-6">
                <AnimatePresence initial={false}>
                {messages.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center space-y-4 opacity-40">
                    <Bot className="w-8 h-8 text-muted" />
                    <p className="text-sm">Assalomu alaykum. Loyihani muhokama qilamizmi?</p>
                  </div>
                )}
                {messages.map((message, i) => (
                    <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                    <div className={`max-w-[85%] flex items-end space-x-3 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center bg-card shadow-sm border border-line ${
                            message.role === 'user' ? 'text-ink' : 'text-ink'
                        }`}>
                        {message.role === 'user' ? <UserIcon className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                        </div>
                        <div className={`px-4 py-3 rounded-2xl ${
                            message.role === 'user' 
                            ? 'bg-ink text-bg rounded-br-sm' 
                            : 'bg-card border border-line text-ink rounded-bl-sm'
                        }`}>
                            <div className="prose prose-sm max-w-none text-sm leading-relaxed">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                    </motion.div>
                ))}
                </AnimatePresence>
                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="flex items-center space-x-2 text-muted px-4 py-3 bg-card border border-line rounded-2xl rounded-bl-sm">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="text-xs">Yozmoqda...</span>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
      </div>

      <div className="p-4 border-t border-line bg-bg">
        <form onSubmit={handleSend} className="w-full">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Xabar yozing..."
              className="w-full bg-card border border-line rounded-full py-3 pl-4 pr-12 focus:outline-none focus:border-ink/50 text-sm transition-all"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 w-8 h-8 rounded-full flex items-center justify-center bg-ink text-bg disabled:opacity-50 transition-all hover:scale-105"
            >
              <Send className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
