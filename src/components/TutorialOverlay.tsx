import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface TutorialOverlayProps {
  onClose: () => void;
}

const TUTORIAL_STEPS = [
  {
    title: "HatimPro'ya Hoş Geldiniz!",
    content: "HatimPro, Kur'an-ı Kerim okumalarınızı, hatimlerinizi ve zikirlerinizi takip edebileceğiniz modern bir uygulamadır.",
    image: "👋"
  },
  {
    title: "Görevler ve İlerleme",
    content: "Ana sayfada günlük okumalarınızı kaydedebilir, 'Görevler' sekmesinden yeni hatim hedefleri belirleyebilirsiniz.",
    image: "📖"
  },
  {
    title: "Hatim Odaları",
    content: "Arkadaşlarınızla veya ailenizle ortak hatimler düzenleyin. Cüzleri paylaşın, sayfa sayfa ilerlemenizi takip edin ve otomatik dağıtım özelliğini kullanın.",
    image: "🕌"
  },
  {
    title: "Zikir Odaları",
    content: "Ortak zikir hedefleri belirleyin. Herkesin çektiği zikirler anlık olarak senkronize edilir ve hedefe birlikte ulaşılır.",
    image: "📿"
  },
  {
    title: "Profil ve Liderlik",
    content: "Okumalarınızla XP kazanın, serinizi koruyun ve liderlik tablosunda diğer kullanıcılarla tatlı bir rekabete girin.",
    image: "🏆"
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
        className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6 mt-4">
          <div className="text-6xl mb-4">{TUTORIAL_STEPS[currentStep].image}</div>
          <h2 className="text-2xl font-bold text-white mb-2">{TUTORIAL_STEPS[currentStep].title}</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            {TUTORIAL_STEPS[currentStep].content}
          </p>
        </div>

        <div className="flex items-center justify-between mt-8">
          <div className="flex gap-1.5">
            {TUTORIAL_STEPS.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-emerald-500' : 'w-1.5 bg-neutral-700'}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button 
                onClick={handlePrev}
                className="p-3 rounded-xl bg-neutral-800 text-white hover:bg-neutral-700 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <button 
              onClick={handleNext}
              className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors flex items-center gap-2"
            >
              {currentStep === TUTORIAL_STEPS.length - 1 ? (
                <>Başla <Check size={18} /></>
              ) : (
                <>İleri <ChevronRight size={18} /></>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
