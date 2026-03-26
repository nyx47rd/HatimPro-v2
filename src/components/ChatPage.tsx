import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Send, Bot, User, Key, AlertCircle, Loader2, Trash2, ArrowLeft } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatPageProps {
  onBack?: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ onBack }) => {
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('pollinations_api_key'));
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'Sen dini konularda yardımcı olan bir asistansın. Sadece İslami ve dini konulardaki sorulara cevap ver. Diğer konulardaki sorulara nazikçe sadece dini konularda yardımcı olabileceğini söyle.' },
    { role: 'assistant', content: 'Selamün Aleyküm! Size dini konularda nasıl yardımcı olabilirim?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check URL fragment for API key after redirect
    if (window.location.hash.includes('api_key=')) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const key = params.get('api_key');
      if (key) {
        setApiKey(key);
        localStorage.setItem('pollinations_api_key', key);
        // Clean up URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleConnect = () => {
    const redirectUrl = `${window.location.origin}/chat`;
    const appKey = 'pk_FYmGkXYGHUd4Izm3';
    const models = 'qwen-safety';
    const authUrl = `https://enter.pollinations.ai/authorize?redirect_url=${encodeURIComponent(redirectUrl)}&app_key=${appKey}&models=${models}`;
    window.location.href = authUrl;
  };

  const handleDisconnect = () => {
    setApiKey(null);
    localStorage.removeItem('pollinations_api_key');
  };

  const handleClearChat = () => {
    setMessages([
      { role: 'system', content: 'Sen dini konularda yardımcı olan bir asistansın. Sadece İslami ve dini konulardaki sorulara cevap ver. Diğer konulardaki sorulara nazikçe sadece dini konularda yardımcı olabileceğini söyle.' },
      { role: 'assistant', content: 'Selamün Aleyküm! Size dini konularda nasıl yardımcı olabilirim?' }
    ]);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !apiKey || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen-safety',
          messages: newMessages
        })
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleDisconnect();
          throw new Error('API anahtarınız geçersiz veya süresi dolmuş. Lütfen tekrar bağlanın.');
        }
        throw new Error('Bir hata oluştu. Lütfen tekrar deneyin.');
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message.content;

      setMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);
    } catch (error: any) {
      setMessages([...newMessages, { role: 'assistant', content: `Hata: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center relative">
        {onBack && (
          <button 
            onClick={onBack}
            className="absolute top-4 left-4 p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
          <Bot size={40} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Dini Yapay Zeka Asistanı</h2>
        <p className="text-neutral-400 mb-8 max-w-md">
          Dini konularda sorularınızı sorabileceğiniz, ayet ve hadisler ışığında bilgi alabileceğiniz yapay zeka asistanı ile sohbet etmek için Pollinations.ai hesabınızı bağlayın.
        </p>
        
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-2xl p-6 max-w-md w-full mb-8 text-left">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-500" />
            Nasıl Çalışır?
          </h3>
          <ul className="text-sm text-neutral-400 space-y-2 list-disc pl-5">
            <li>Bağlan butonuna tıkladığınızda güvenli bir sayfaya yönlendirileceksiniz.</li>
            <li>Orada bir API anahtarı oluşturup uygulamaya döneceksiniz.</li>
            <li>Kullanımlarınız sizin kotanızdan düşecektir.</li>
            <li>Asistan sadece dini konularda cevap vermek üzere ayarlanmıştır.</li>
          </ul>
        </div>

        <button
          onClick={handleConnect}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20"
        >
          <Key size={20} />
          Pollinations ile Bağlan
        </button>
      </div>
    );
  }

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
            <h2 className="text-white font-bold">Dini Asistan</h2>
            <p className="text-xs text-emerald-500">Çevrimiçi (qwen-safety)</p>
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
          <button
            onClick={handleDisconnect}
            className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Bağlantıyı Kes"
          >
            <AlertCircle size={18} />
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
            placeholder="Dini konularda bir soru sorun..."
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
        <p className="text-center text-[10px] text-neutral-500 mt-2">
          Yapay zeka hata yapabilir. Lütfen önemli dini konularda güvenilir kaynaklara da başvurun.
        </p>
      </div>
    </div>
  );
};
