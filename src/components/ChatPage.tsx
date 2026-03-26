import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Send, Bot, User, Loader2, Trash2, ArrowLeft } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatPageProps {
  onBack?: () => void;
  onNavigate?: (view: string) => void;
  appData?: any;
}

export const ChatPage: React.FC<ChatPageProps> = ({ onBack, onNavigate, appData }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Selamün Aleyküm! Size dini konularda nasıl yardımcı olabilirim? Ayrıca uygulama verilerinize hakimim, dilerseniz istatistiklerinizi sorabilir veya sizi ilgili sayfalara yönlendirmemi isteyebilirsiniz.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const apiKey = import.meta.env.VITE_POLLINATIONS_API_KEY;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClearChat = () => {
    setMessages([
      { role: 'assistant', content: 'Selamün Aleyküm! Size dini konularda nasıl yardımcı olabilirim? Ayrıca uygulama verilerinize hakimim, dilerseniz istatistiklerinizi sorabilir veya sizi ilgili sayfalara yönlendirmemi isteyebilirsiniz.' }
    ]);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hata: API anahtarı bulunamadı. Lütfen .env dosyasına VITE_POLLINATIONS_API_KEY ekleyin.' }]);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    const systemPrompt = `Sen HatimPro uygulamasının akıllı asistanısın. Hem dini konularda (İslami sorular, ayet, hadis) yardımcı olursun, hem de kullanıcının uygulama içi verilerini analiz edip ona rehberlik edersin. Dini olmayan genel sohbetlere nazikçe kapalı olduğunu belirt.
    
    Kullanıcının güncel uygulama verileri (Zikirler, görevler, istatistikler vb.) JSON formatında aşağıdadır. Bu verileri kullanarak kullanıcının durumuna özel cevaplar verebilirsin:
    ${JSON.stringify(appData || {})}
    
    Kullanıcı bir sayfaya gitmek isterse (örneğin "zikir sayfasına gitmek istiyorum", "ayarları aç", "profilimi göster", "görevlerime bakayım"), cevabının sonuna şu formatta bir etiket ekle: <navigate>SAYFA_ADI</navigate>
    Geçerli SAYFA_ADI değerleri şunlardır: home, tasks, history, settings, zikir, hatim-rooms, profile, leaderboard, stats.
    Örnek: "Sizi zikir sayfasına yönlendiriyorum. <navigate>zikir</navigate>"`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...newMessages
    ];

    try {
      const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gemini-fast',
          messages: apiMessages
        })
      });

      if (!response.ok) {
        throw new Error('Bir hata oluştu. Lütfen tekrar deneyin.');
      }

      const data = await response.json();
      let assistantMessage = data.choices[0].message.content;

      // Check for navigation action
      const navigateRegex = /<navigate>(.*?)<\/navigate>/;
      const match = assistantMessage.match(navigateRegex);
      if (match) {
        const targetPage = match[1].trim();
        if (onNavigate) {
          // Delay navigation slightly so user can see the message
          setTimeout(() => onNavigate(targetPage), 1500);
        }
        // Remove the tag from the displayed message
        assistantMessage = assistantMessage.replace(navigateRegex, '').trim();
      }

      setMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);
    } catch (error: any) {
      setMessages([...newMessages, { role: 'assistant', content: `Hata: ${error.message}` }]);
    } finally {
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
            <h2 className="text-white font-bold">Dini Asistan</h2>
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
        {messages.map((msg, index) => (
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
        <p className="text-center text-[10px] text-neutral-500 mt-2">
          Yapay zeka hata yapabilir. Lütfen önemli dini konularda güvenilir kaynaklara da başvurun.
        </p>
      </div>
    </div>
  );
};
