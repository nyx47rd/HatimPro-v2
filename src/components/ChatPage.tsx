import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Send, Bot, User, Loader2, Trash2, ArrowLeft, Shield } from 'lucide-react';
import { encryptData, decryptData, getRawKeyBase64 } from '../lib/encryption';
import { HatimData } from '../types';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatPageProps {
  onBack?: () => void;
  appData?: HatimData;
  setData?: React.Dispatch<React.SetStateAction<HatimData>>;
}

const LIMITS = {
  minute: 5,
  hour: 20,
  day: 100
};

const PENDING_CHAT_KEY = 'hatim_pending_chat';

export const ChatPage: React.FC<ChatPageProps> = ({ onBack, appData, setData }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Selamün Aleyküm! Size dini konularda nasıl yardımcı olabilirim? Konuşmalarımız uçtan uca şifrelenmektedir.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history
  useEffect(() => {
    const loadHistory = async () => {
      if (appData?.chatHistory && !isHistoryLoaded) {
        try {
          const decrypted = await decryptData(appData.chatHistory);
          if (decrypted) {
            const parsed = JSON.parse(decrypted);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
            }
          }
        } catch (e) {
          console.error("Failed to load chat history", e);
        }
      }
      setIsHistoryLoaded(true);
    };
    loadHistory();
  }, [appData?.chatHistory, isHistoryLoaded]);

  // Save chat history whenever messages change
  useEffect(() => {
    const saveHistory = async () => {
      if (isHistoryLoaded && setData && messages.length > 1) {
        try {
          const encrypted = await encryptData(JSON.stringify(messages));
          setData(prev => ({ ...prev, chatHistory: encrypted }));
        } catch (e) {
          console.error("Failed to save chat history", e);
        }
      }
    };
    saveHistory();
  }, [messages, isHistoryLoaded, setData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for pending chat
  useEffect(() => {
    const pendingChatId = localStorage.getItem(PENDING_CHAT_KEY);
    if (pendingChatId) {
      setIsLoading(true);
      const poll = setInterval(async () => {
        try {
          const res = await fetch(`/api/chat/status/${pendingChatId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'completed') {
              clearInterval(poll);
              localStorage.removeItem(PENDING_CHAT_KEY);
              
              const keyBase64 = getRawKeyBase64();
              if (keyBase64 && data.encryptedData) {
                // The server encrypted it with AES-GCM. We can decrypt it using decryptData if we format it correctly.
                // Wait, the server sends base64 of (iv + encrypted + authTag). This is exactly what decryptData expects!
                const decrypted = await decryptData(data.encryptedData);
                setMessages(prev => [...prev, { role: 'assistant', content: decrypted }]);
              } else {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Hata: Şifre çözülemedi.' }]);
              }
              setIsLoading(false);
            } else if (data.status === 'error') {
              clearInterval(poll);
              localStorage.removeItem(PENDING_CHAT_KEY);
              setMessages(prev => [...prev, { role: 'assistant', content: `Hata: ${data.error}` }]);
              setIsLoading(false);
            }
          } else if (res.status === 404) {
            // Not found on server, maybe server restarted
            clearInterval(poll);
            localStorage.removeItem(PENDING_CHAT_KEY);
            setIsLoading(false);
          }
        } catch (e) {
          // Network error, keep polling
        }
      }, 3000);
      return () => clearInterval(poll);
    }
  }, []);

  const handleClearChat = async () => {
    const defaultMessages: Message[] = [
      { role: 'assistant', content: 'Selamün Aleyküm! Size dini konularda nasıl yardımcı olabilirim? Konuşmalarımız uçtan uca şifrelenmektedir.' }
    ];
    setMessages(defaultMessages);
    if (setData) {
      try {
        const encrypted = await encryptData(JSON.stringify(defaultMessages));
        setData(prev => ({ ...prev, chatHistory: encrypted }));
      } catch (e) {
        console.error("Failed to clear chat history", e);
      }
    }
  };

  const checkRateLimit = (): boolean => {
    if (!appData || !setData) return true;
    
    const now = new Date();
    const currentMinute = Math.floor(now.getTime() / 60000);
    const currentHour = Math.floor(now.getTime() / 3600000);
    const currentDay = Math.floor(now.getTime() / 86400000);

    const usage = appData.aiUsage || {
      minute: { count: 0, timestamp: 0 },
      hour: { count: 0, timestamp: 0 },
      day: { count: 0, timestamp: 0 }
    };

    // Check limits first
    if (usage.minute.timestamp === currentMinute && usage.minute.count >= LIMITS.minute) return false;
    if (usage.hour.timestamp === currentHour && usage.hour.count >= LIMITS.hour) return false;
    if (usage.day.timestamp === currentDay && usage.day.count >= LIMITS.day) return false;

    let newUsage = {
      minute: { ...usage.minute },
      hour: { ...usage.hour },
      day: { ...usage.day }
    };

    // Increment Minute
    if (newUsage.minute.timestamp === currentMinute) {
      newUsage.minute.count += 1;
    } else {
      newUsage.minute = { count: 1, timestamp: currentMinute };
    }

    // Increment Hour
    if (newUsage.hour.timestamp === currentHour) {
      newUsage.hour.count += 1;
    } else {
      newUsage.hour = { count: 1, timestamp: currentHour };
    }

    // Increment Day
    if (newUsage.day.timestamp === currentDay) {
      newUsage.day.count += 1;
    } else {
      newUsage.day = { count: 1, timestamp: currentDay };
    }

    setData(prev => ({ ...prev, aiUsage: newUsage }));
    return true;
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!checkRateLimit()) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hata: Yapay zeka kullanım limitinize ulaştınız. Lütfen daha sonra tekrar deneyin. Limitlerinizi "Diğer" menüsünden kontrol edebilirsiniz.' }]);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    const appDataSummary = appData ? {
      xp: appData.xp,
      level: appData.level,
      streak: appData.streak,
      tasks: appData.tasks?.slice(0, 10),
      recentLogs: appData.logs?.slice(0, 5)
    } : {};

    const systemPrompt = `Sen HatimPro uygulamasının akıllı asistanısın. Hem dini konularda (İslami sorular, ayet, hadis) yardımcı olursun, hem de kullanıcının uygulama içi verilerini analiz edip ona rehberlik edersin. Dini olmayan genel sohbetlere nazikçe kapalı olduğunu belirt.
    
    Kullanıcının güncel uygulama verileri (Özet) JSON formatında aşağıdadır. Bu verileri kullanarak kullanıcının durumuna özel cevaplar verebilirsin:
    ${JSON.stringify(appDataSummary)}`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...newMessages.filter(m => m.role !== 'system')
    ];

    const encryptionKey = getRawKeyBase64();
    if (!encryptionKey) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hata: Şifreleme anahtarı bulunamadı.' }]);
      setIsLoading(false);
      return;
    }

    const chatId = window.crypto.randomUUID();
    localStorage.setItem(PENDING_CHAT_KEY, chatId);

    try {
      const response = await fetch('/api/chat/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: apiMessages,
          encryptionKey,
          chatId
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Sunucu Hatası (${response.status}): ${errText.slice(0, 100)}...`);
      }

      // Start polling
      const poll = setInterval(async () => {
        try {
          const res = await fetch(`/api/chat/status/${chatId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'completed') {
              clearInterval(poll);
              localStorage.removeItem(PENDING_CHAT_KEY);
              
              const decrypted = await decryptData(data.encryptedData);
              setMessages(prev => [...prev, { role: 'assistant', content: decrypted }]);
              setIsLoading(false);
            } else if (data.status === 'error') {
              clearInterval(poll);
              localStorage.removeItem(PENDING_CHAT_KEY);
              setMessages(prev => [...prev, { role: 'assistant', content: `Hata: ${data.error}` }]);
              setIsLoading(false);
            }
          }
        } catch (e) {
          // Network error, keep polling
        }
      }, 3000);

    } catch (error: any) {
      localStorage.removeItem(PENDING_CHAT_KEY);
      setMessages([...newMessages, { role: 'assistant', content: `Hata: ${error.message}` }]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-screen max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 -ml-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors md:hidden"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <Bot size={20} className="text-emerald-500" />
          </div>
          <div>
            <h2 className="text-white font-bold flex items-center gap-2">
              Dini Asistan
              <Shield size={14} className="text-emerald-500" title="Uçtan Uca Şifreli" />
            </h2>
            <p className="text-xs text-emerald-500">Çevrimiçi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title="Sohbeti Temizle"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.filter(m => m.role !== 'system').map((msg, index) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={index}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-blue-500/20 text-blue-500' : 'bg-emerald-500/20 text-emerald-500'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-sm' 
                : 'bg-neutral-800 text-neutral-200 rounded-tl-sm border border-neutral-700'
            }`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-neutral-800 border border-neutral-700 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
              <Loader2 size={16} className="text-emerald-500 animate-spin" />
              <span className="text-sm text-neutral-400">Düşünüyor...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 backdrop-blur-md">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Dini konularda veya uygulama hakkında bir soru sorun..."
            className="flex-1 bg-neutral-800 border border-neutral-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white px-4 py-3 rounded-xl transition-colors flex items-center justify-center shrink-0"
          >
            <Send size={20} />
          </button>
        </form>
        <p className="text-center text-[10px] text-neutral-500 mt-2 flex items-center justify-center gap-1">
          <Shield size={10} />
          Mesajlarınız cihazınızda uçtan uca şifrelenir. Yapay zeka hata yapabilir.
        </p>
      </div>
    </div>
  );
};
