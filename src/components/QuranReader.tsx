import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, ChevronLeft, Search, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Ayah {
  number: number;
  text: string;
  audio: string;
  numberInSurah: number;
}

interface Surah {
  number: number;
  name: string;
  englishName: string;
  ayahs: Ayah[];
}

interface QuranReaderProps {
  onClose: () => void;
  playClick: () => void;
}

const AyahRow = React.memo(({ 
  ayah, 
  idx, 
  isActive, 
  onClick, 
  setRef 
}: { 
  ayah: Ayah; 
  idx: number; 
  isActive: boolean; 
  onClick: (idx: number) => void; 
  setRef: (idx: number, el: HTMLDivElement | null) => void; 
}) => {
  return (
    <div 
      ref={(el) => setRef(idx, el)}
      onClick={() => onClick(idx)}
      className={`relative p-8 rounded-3xl transition-all duration-500 cursor-pointer border ${
        isActive 
          ? 'bg-gradient-to-br from-sage-50 to-emerald-50/30 dark:from-neutral-800 dark:to-emerald-900/20 border-emerald-500/50 dark:border-emerald-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] scale-[1.02] z-10' 
          : 'bg-white dark:bg-neutral-900/50 border-sage-100 dark:border-neutral-800 hover:border-sage-300 dark:hover:border-neutral-700 hover:shadow-md'
      }`}
    >
      {/* Active Indicator Glow */}
      {isActive && (
        <div className="absolute inset-0 rounded-3xl ring-1 ring-emerald-500/20 dark:ring-emerald-400/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)] pointer-events-none"></div>
      )}
      
      <div className="relative flex justify-between items-start gap-6">
        <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
          isActive
            ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
            : 'bg-sage-100 dark:bg-neutral-800 text-sage-500 dark:text-neutral-500'
        }`}>
          {ayah.numberInSurah}
        </div>
        <p 
          className={`text-2xl md:text-3xl font-arabic text-right flex-1 transition-colors ${
            isActive
              ? 'text-emerald-950 dark:text-emerald-50'
              : 'text-sage-800 dark:text-neutral-300'
          }`} 
          style={{ lineHeight: '2.8', wordSpacing: '0.1em' }}
          dir="rtl"
        >
          {ayah.text}
        </p>
      </div>
    </div>
  );
});

const SURAH_NAMES_TR = [
  "Fâtiha", "Bakara", "Âl-i İmrân", "Nisâ", "Mâide", "En'âm", "A'râf", "Enfâl", "Tevbe", "Yûnus",
  "Hûd", "Yûsuf", "Ra'd", "İbrâhîm", "Hicr", "Nahl", "İsrâ", "Kehf", "Meryem", "Tâhâ",
  "Enbiyâ", "Hac", "Mü'minûn", "Nûr", "Furkân", "Şuarâ", "Neml", "Kasas", "Ankebût", "Rûm",
  "Lokmân", "Secde", "Ahzâb", "Sebe'", "Fâtır", "Yâsîn", "Sâffât", "Sâd", "Zümer", "Mü'min (Gâfir)",
  "Fussilet", "Şûrâ", "Zuhruf", "Duhân", "Câsiye", "Ahkâf", "Muhammed", "Fetih", "Hucurât", "Kâf",
  "Zâriyât", "Tûr", "Necm", "Kamer", "Rahmân", "Vâkıa", "Hadîd", "Mücâdele", "Haşr", "Mümtehine",
  "Saf", "Cuma", "Münâfikûn", "Teğâbün", "Talâk", "Tahrîm", "Mülk", "Kalem", "Hâkka", "Meâric",
  "Nûh", "Cin", "Müzzemmil", "Müddessir", "Kıyâme", "İnsân", "Mürselât", "Nebe'", "Nâziât", "Abese",
  "Tekvîr", "İnfitâr", "Mutaffifîn", "İnşikâk", "Bürûc", "Târık", "A'lâ", "Gâşiye", "Fecr", "Beled",
  "Şems", "Leyl", "Duhâ", "İnşirâh", "Tîn", "Alak", "Kadir", "Beyyine", "Zilzâl", "Âdiyât",
  "Kâria", "Tekâsür", "Asr", "Hümeze", "Fîl", "Kureyş", "Mâûn", "Kevser", "Kâfirûn", "Nasr",
  "Tebbet", "İhlâs", "Felak", "Nâs"
];

export const QuranReader: React.FC<QuranReaderProps> = ({ onClose, playClick }) => {
  const [surahs, setSurahs] = useState<{number: number, name: string}[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [surahData, setSurahData] = useState<Surah | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetAyah, setTargetAyah] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const ayahRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fullscreenScrollRef = useRef<HTMLDivElement>(null);

  const handleAyahClick = useCallback((idx: number) => {
    playClick();
    setCurrentAyahIndex(idx);
    setIsPlaying(true);
  }, [playClick]);

  const setAyahRef = useCallback((idx: number, el: HTMLDivElement | null) => {
    ayahRefs.current[idx] = el;
  }, []);

  // Initialize audio elements
  useEffect(() => {
    currentAudioRef.current = new Audio();
    nextAudioRef.current = new Audio();
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = '';
      }
      if (nextAudioRef.current) {
        nextAudioRef.current.pause();
        nextAudioRef.current.src = '';
      }
    };
  }, []);

  // Fetch Surah list
  useEffect(() => {
    fetch('https://api.alquran.cloud/v1/meta')
      .then(res => res.json())
      .then(data => {
        if (data.data && data.data.surahs) {
          setSurahs(data.data.surahs.references);
        }
      });
  }, []);

  // Fetch Surah data
  useEffect(() => {
    setLoading(true);
    setIsPlaying(false);
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    // Using Alafasy for crystal clear recitation
    fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah}/ar.alafasy`)
      .then(res => res.json())
      .then(data => {
        setSurahData(data.data);
        if (targetAyah !== null && data.data.ayahs) {
          const index = data.data.ayahs.findIndex((a: Ayah) => a.numberInSurah === targetAyah);
          setCurrentAyahIndex(index !== -1 ? index : 0);
          setTargetAyah(null);
        } else {
          setCurrentAyahIndex(0);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedSurah]);

  // Handle Audio Playback and Preloading (Double Buffering FIFO)
  useEffect(() => {
    if (!surahData || !surahData.ayahs || !surahData.ayahs[currentAyahIndex]) return;

    const currentAyah = surahData.ayahs[currentAyahIndex];
    const nextAyah = surahData.ayahs[currentAyahIndex + 1];

    let animationFrameId: number;

    const getSafeUrl = (url: string) => {
      try { return new URL(url, document.baseURI).href; } catch(e) { return url; }
    };

    const setupAudio = async () => {
      if (!currentAudioRef.current) return;

      const targetSrc = getSafeUrl(currentAyah.audio);
      const currentSrc = currentAudioRef.current.src;

      // If the current audio is not the one we want to play
      if (currentSrc !== targetSrc) {
        const nextSrc = nextAudioRef.current ? nextAudioRef.current.src : '';
        // Check if nextAudioRef has it preloaded
        if (nextAudioRef.current && nextSrc === targetSrc) {
          // Swap references for gapless playback
          const temp = currentAudioRef.current;
          currentAudioRef.current = nextAudioRef.current;
          nextAudioRef.current = temp;
        } else {
          currentAudioRef.current.src = currentAyah.audio;
          currentAudioRef.current.load();
        }
      }

      currentAudioRef.current.onended = () => {
        if (currentAyahIndex < surahData.ayahs.length - 1) {
          const nextAyahUrl = getSafeUrl(surahData.ayahs[currentAyahIndex + 1].audio);
          // Play next immediately for gapless transition
          if (nextAudioRef.current && nextAudioRef.current.src === nextAyahUrl) {
            const temp = currentAudioRef.current;
            currentAudioRef.current = nextAudioRef.current;
            nextAudioRef.current = temp;
            currentAudioRef.current.play().catch(console.error);
          }
          setCurrentAyahIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      };

      if (isPlaying) {
        // Only call play if paused to avoid interrupting
        if (currentAudioRef.current.paused) {
          try {
            await currentAudioRef.current.play();
          } catch (err) {
            console.error("Audio playback error:", err);
            setIsPlaying(false);
          }
        }
      } else {
        currentAudioRef.current.pause();
      }
    };

    setupAudio();

    // 60 FPS Auto-scroll lines during playback based on audio progress
    const updateScroll = () => {
      if (currentAudioRef.current && fullscreenScrollRef.current && isPlaying) {
        const { currentTime, duration } = currentAudioRef.current;
        if (duration > 0 && !isNaN(duration) && isFinite(duration)) {
          const progress = currentTime / duration;
          const container = fullscreenScrollRef.current;
          const scrollableHeight = container.scrollHeight - container.clientHeight;
          if (scrollableHeight > 0) {
            container.scrollTop = scrollableHeight * progress;
          }
        }
        animationFrameId = requestAnimationFrame(updateScroll);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateScroll);
    }

    // Preload next ayah in background thread
    if (nextAyah && nextAudioRef.current) {
      const nextTargetSrc = getSafeUrl(nextAyah.audio);
      if (nextAudioRef.current.src !== nextTargetSrc) {
        nextAudioRef.current.src = nextAyah.audio;
        nextAudioRef.current.preload = 'auto';
        nextAudioRef.current.load();
      }
    }

    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.onended = null;
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [currentAyahIndex, isPlaying, surahData]);

  // Auto-scroll
  useEffect(() => {
    if (ayahRefs.current[currentAyahIndex]) {
      setTimeout(() => {
        ayahRefs.current[currentAyahIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  }, [currentAyahIndex]);

  const togglePlay = () => {
    playClick();
    setIsPlaying(!isPlaying);
  };

  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/û/g, 'u')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    const query = searchQuery.trim().toLowerCase();
    const normalizedQuery = normalizeText(query);
    
    // Check for Surah:Ayah format (e.g., 2:255 or 2 255)
    const match = query.match(/^(\d+)[^\d]+(\d+)$/);
    if (match) {
      const surahNum = parseInt(match[1]);
      const ayahNum = parseInt(match[2]);
      if (surahNum >= 1 && surahNum <= 114) {
        setSelectedSurah(surahNum);
        setTargetAyah(ayahNum);
        setSearchQuery('');
      }
      return;
    }

    // Check if it's a number (Surah)
    if (/^\d+$/.test(query)) {
      const num = parseInt(query);
      if (num >= 1 && num <= 114) {
        setSelectedSurah(num);
        setSearchQuery('');
      }
      return;
    }
    
    // Search by name
    const foundSurah = surahs.find(s => {
      const trName = SURAH_NAMES_TR[s.number - 1] || '';
      return normalizeText(trName).includes(normalizedQuery) || s.name.includes(query);
    });
    
    if (foundSurah) {
      setSelectedSurah(foundSurah.number);
      setSearchQuery('');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-sage-50 dark:bg-black flex flex-col"
    >
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-sage-200 dark:border-neutral-800 px-4 py-3 flex flex-col gap-3 shadow-sm z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => { playClick(); onClose(); }} className="p-2 hover:bg-sage-100 dark:hover:bg-neutral-800 rounded-full">
            <ChevronLeft size={24} className="text-sage-800 dark:text-white" />
          </button>
          
          <select 
            value={selectedSurah}
            onChange={(e) => setSelectedSurah(Number(e.target.value))}
            className="bg-sage-100 dark:bg-neutral-800 text-sage-800 dark:text-white px-4 py-2 rounded-xl font-bold text-center appearance-none outline-none max-w-[200px] truncate"
          >
            {surahs.map(s => (
              <option key={s.number} value={s.number}>{s.number}. {SURAH_NAMES_TR[s.number - 1] || s.name}</option>
            ))}
          </select>

          <button onClick={() => { playClick(); setIsFullscreen(true); }} className="p-2 hover:bg-sage-100 dark:hover:bg-neutral-800 rounded-full">
            <Maximize size={24} className="text-sage-800 dark:text-white" />
          </button>
        </div>
        
        <form onSubmit={handleSearch} className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400 dark:text-neutral-500" />
          <input 
            type="text" 
            placeholder="Sure ara (örn: Yasin, 2:255, 36)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-sage-100 dark:bg-neutral-800 text-sage-800 dark:text-white pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-500"
          />
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 pb-40 scrollbar-hide">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-arabic text-sage-800 dark:text-white mb-4">{surahData?.name}</h1>
              <p className="text-sage-500 dark:text-neutral-400 tracking-widest uppercase text-sm font-semibold">{surahData ? SURAH_NAMES_TR[surahData.number - 1] : ''}</p>
            </div>
            
            {surahData?.ayahs.map((ayah, idx) => (
              <AyahRow
                key={ayah.number}
                ayah={ayah}
                idx={idx}
                isActive={idx === currentAyahIndex}
                onClick={handleAyahClick}
                setRef={setAyahRef}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Player Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-40">
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-sage-200/50 dark:border-neutral-800/50 p-4 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-sage-800 dark:text-white truncate">
              {surahData ? SURAH_NAMES_TR[surahData.number - 1] : ''}
            </p>
            <p className="text-xs text-sage-500 dark:text-neutral-400">
              Ayet {currentAyahIndex + 1} / {surahData?.ayahs.length || 0}
            </p>
          </div>
          
          <button 
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:bg-emerald-500 transition-colors shrink-0"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
          </button>
          
          <div className="flex-1 flex justify-end min-w-0">
            <div className="bg-sage-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg text-xs font-bold text-sage-600 dark:text-neutral-400 truncate">
              Kâri Modu
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Cinematic Mode */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black flex flex-col overflow-hidden"
          >
            {/* Atmospheric Background */}
            <div className="absolute inset-0 opacity-60">
              <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-emerald-900/30 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
              <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-teal-900/20 blur-[100px] animate-pulse" style={{ animationDuration: '12s' }} />
              <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] rounded-full bg-amber-900/10 blur-[80px] animate-pulse" style={{ animationDuration: '10s' }} />
            </div>

            {/* Top Bar */}
            <div className="relative z-10 flex justify-end p-6">
              <button 
                onClick={() => setIsFullscreen(false)}
                className="p-3 glass-panel hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all"
              >
                <Minimize size={20} />
              </button>
            </div>

            {/* Main Content Area - Scrollable with Fade Mask */}
            <div className="relative z-10 flex-1 flex flex-col items-center px-4 md:px-12 lg:px-24 overflow-hidden">
              <div 
                ref={fullscreenScrollRef}
                className="w-full h-full max-h-[75vh] flex flex-col items-center fade-mask overflow-y-auto scrollbar-hide py-32"
              >
                <motion.div 
                  key={currentAyahIndex}
                  initial={{ opacity: 0, filter: 'blur(15px)', y: 20 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  exit={{ opacity: 0, filter: 'blur(15px)', y: -20 }}
                  transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-5xl text-center px-4 my-auto"
                >
                  <p 
                    className="text-4xl md:text-5xl lg:text-[4.5rem] font-arabic text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/70 pb-16 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" 
                    style={{ lineHeight: '3.5', wordSpacing: '0.15em' }}
                    dir="rtl"
                  >
                    {surahData?.ayahs[currentAyahIndex]?.text}
                  </p>
                  
                  {/* Decorative End Marker */}
                  <div className="flex items-center justify-center gap-4 opacity-40 mt-8">
                    <div className="w-12 h-px bg-gradient-to-r from-transparent to-amber-200/50"></div>
                    <div className="w-3 h-3 rotate-45 border border-amber-200/50"></div>
                    <div className="w-12 h-px bg-gradient-to-l from-transparent to-amber-200/50"></div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="relative z-10 p-8 flex flex-col items-center gap-6 bg-gradient-to-t from-black via-black/80 to-transparent">
              <div className="flex flex-col items-center gap-2">
                <p className="text-white/90 text-lg md:text-xl font-serif tracking-widest">
                  {surahData ? SURAH_NAMES_TR[surahData.number - 1] : ''}
                </p>
                <div className="flex items-center gap-3 text-white/50 text-sm font-mono tracking-widest uppercase">
                  <span>Ayet {currentAyahIndex + 1}</span>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span>{surahData?.ayahs.length || 0}</span>
                </div>
              </div>

              <button 
                onClick={togglePlay}
                className="w-16 h-16 rounded-full glass-panel hover:bg-white/10 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
