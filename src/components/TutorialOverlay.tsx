import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Check, BookOpen, Users, Trophy, RotateCcw, ListTodo, Home } from 'lucide-react';

interface TutorialOverlayProps {
  onClose: () => void;
}

const TUTORIAL_STEPS = [
  {
    title: "HatimPro'ya Hoş Geldiniz!",
    icon: <Home size={48} className="text-emerald-500" />,
    content: (
      <div className="space-y-4 text-left text-sm text-neutral-300">
        <p>HatimPro, bireysel ve toplu ibadetlerinizi düzenli bir şekilde takip etmenizi sağlayan kapsamlı bir platformdur.</p>
        <p>Bu rehberde uygulamanın temel özelliklerini ve nasıl kullanacağınızı öğreneceksiniz.</p>
        <div className="bg-neutral-800/50 p-3 rounded-xl border border-neutral-700 mt-4">
          <p className="text-xs text-neutral-400">💡 <strong>İpucu:</strong> Bu eğitime daha sonra sağ üst köşedeki soru işareti (?) ikonuna tıklayarak tekrar ulaşabilirsiniz.</p>
        </div>
      </div>
    )
  },
  {
    title: "Günlük Görevler",
    icon: <ListTodo size={48} className="text-blue-500" />,
    content: (
      <div className="space-y-4 text-left text-sm text-neutral-300">
        <p><strong>Görevler</strong> sekmesinden kendinize günlük, haftalık veya aylık okuma hedefleri belirleyebilirsiniz.</p>
        <ul className="list-disc pl-5 space-y-2 text-neutral-400">
          <li>Yeni bir görev eklemek için sağ üstteki <strong className="text-white">+</strong> butonunu kullanın.</li>
          <li>Görevlerinizi tamamladıkça XP (deneyim puanı) kazanırsınız.</li>
          <li>Ana sayfadaki <strong>"Hızlı Kayıt"</strong> butonu ile günlük okuduğunuz sayfa sayısını anında sisteme girebilirsiniz.</li>
        </ul>
      </div>
    )
  },
  {
    title: "Hatim Odaları",
    icon: <BookOpen size={48} className="text-purple-500" />,
    content: (
      <div className="space-y-4 text-left text-sm text-neutral-300">
        <p>Arkadaşlarınızla veya ailenizle ortak hatimler düzenleyin.</p>
        <ul className="list-disc pl-5 space-y-2 text-neutral-400">
          <li><strong>Oda Oluşturma:</strong> Yeni bir oda kurun ve kodunu sevdiklerinizle paylaşın.</li>
          <li><strong>Cüz Alma:</strong> Boş bir cüze tıklayarak üzerinize alın.</li>
          <li><strong>İlerleme Kaydetme:</strong> Aldığınız cüze tekrar tıklayarak okuduğunuz sayfa sayısını (örn: 5/20) kaydedin.</li>
          <li><strong>Otomatik Dağıtım:</strong> Oda kurucusu, boşta kalan cüzleri odadaki kişilere otomatik olarak dağıtabilir.</li>
        </ul>
      </div>
    )
  },
  {
    title: "Zikir Odaları",
    icon: <RotateCcw size={48} className="text-amber-500" />,
    content: (
      <div className="space-y-4 text-left text-sm text-neutral-300">
        <p>Ortak zikir hedefleri belirleyin ve hep birlikte ulaşın.</p>
        <ul className="list-disc pl-5 space-y-2 text-neutral-400">
          <li>Bir zikir odası oluşturun ve hedef sayıyı (örn: 10.000) belirleyin.</li>
          <li>Arkadaşlarınızı uygulamadan doğrudan odaya davet edin.</li>
          <li>Ekrana dokunarak zikir çekin. Herkesin çektiği zikirler anlık olarak senkronize edilir ve toplam sayıya eklenir.</li>
        </ul>
      </div>
    )
  },
  {
    title: "Profil ve Sıralama",
    icon: <Trophy size={48} className="text-yellow-500" />,
    content: (
      <div className="space-y-4 text-left text-sm text-neutral-300">
        <p>Okumalarınızla XP kazanın, serinizi koruyun ve liderlik tablosunda yerinizi alın.</p>
        <ul className="list-disc pl-5 space-y-2 text-neutral-400">
          <li><strong>XP Sistemi:</strong> Okuduğunuz her sayfa ve tamamladığınız her görev size puan kazandırır.</li>
          <li><strong>Seri (Streak):</strong> Her gün uygulamaya girip okuma yaparak serinizi büyütün.</li>
          <li><strong>Sıralama:</strong> Haftalık ve tüm zamanlar liderlik tablosunda arkadaşlarınızla tatlı bir rekabete girin.</li>
          <li><strong>Arkadaşlar:</strong> Profil sekmesinden diğer kullanıcıları arayıp takip edebilirsiniz.</li>
        </ul>
      </div>
    )
  }
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors z-20"
        >
          <X size={20} />
        </button>

        <div className="flex-1 overflow-y-auto pr-2 mt-4">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-neutral-800 rounded-full flex items-center justify-center shadow-inner border border-neutral-700">
              {TUTORIAL_STEPS[currentStep].icon}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-6 text-center">{TUTORIAL_STEPS[currentStep].title}</h2>
          
          {TUTORIAL_STEPS[currentStep].content}
        </div>

        <div className="mt-8 pt-4 border-t border-neutral-800 shrink-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-1.5">
              {TUTORIAL_STEPS.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-emerald-500' : 'w-2 bg-neutral-700'}`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-neutral-500">{currentStep + 1} / {TUTORIAL_STEPS.length}</span>
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <button 
                onClick={handlePrev}
                className="px-4 py-3 rounded-xl bg-neutral-800 text-white hover:bg-neutral-700 transition-colors flex items-center justify-center"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <button 
              onClick={handleNext}
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
            >
              {currentStep === TUTORIAL_STEPS.length - 1 ? (
                <>Uygulamaya Başla <Check size={18} /></>
              ) : (
                <>Sonraki Adım <ChevronRight size={18} /></>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
