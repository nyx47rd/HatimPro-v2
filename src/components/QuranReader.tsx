import React, { useState, useEffect, useRef } from 'react';
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

    const playCurrent = async () => {
      if (!currentAudioRef.current) return;

      // If the current audio is not the one we want to play
      if (currentAudioRef.current.src !== currentAyah.audio) {
        // Check if nextAudioRef has it preloaded
        if (nextAudioRef.current && nextAudioRef.current.src === currentAyah.audio) {
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
          setCurrentAyahIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      };

      if (isPlaying) {
        try {
          await currentAudioRef.current.play();
        } catch (err) {
          console.error("Audio playback error:", err);
          setIsPlaying(false);
        }
      } else {
        currentAudioRef.current.pause();
      }
    };

    playCurrent();

    // Preload next ayah in background thread
    if (nextAyah && nextAudioRef.current) {
      if (nextAudioRef.current.src !== nextAyah.audio) {
        nextAudioRef.current.src = nextAyah.audio;
        nextAudioRef.current.preload = 'auto';
        nextAudioRef.current.load();
      }
    }

    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.onended = null;
      }
    };
  }, [currentAyahIndex, isPlaying, surahData]);

  // Auto-scroll
  useEffect(() => {
    if (ayahRefs.current[currentAyahIndex]) {
      ayahRefs.current[currentAyahIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentAyahIndex, isPlaying]);

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
      <div className="flex-1 overflow-y-auto p-6 pb-32">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-arabic text-sage-800 dark:text-white mb-2">{surahData?.name}</h1>
              <p className="text-sage-500 dark:text-neutral-400">{surahData ? SURAH_NAMES_TR[surahData.number - 1] : ''}</p>
            </div>
            
            {surahData?.ayahs.map((ayah, idx) => (
              <div 
                key={ayah.number}
                ref={el => { ayahRefs.current[idx] = el; }}
                onClick={() => {
                  playClick();
                  setCurrentAyahIndex(idx);
                  setIsPlaying(true);
                }}
                className={`p-6 rounded-2xl transition-all cursor-pointer border-2 ${
                  idx === currentAyahIndex 
                    ? 'bg-sage-100 dark:bg-neutral-800 border-sage-500 dark:border-white shadow-md' 
                    : 'bg-white dark:bg-neutral-900 border-transparent hover:border-sage-200 dark:hover:border-neutral-700'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-sage-200 dark:bg-neutral-800 flex items-center justify-center text-xs font-bold text-sage-600 dark:text-neutral-400">
                    {ayah.numberInSurah}
                  </div>
                  <p 
                    className="text-2xl font-arabic text-right text-sage-800 dark:text-white flex-1" 
                    style={{ lineHeight: '2.8', wordSpacing: '0.1em' }}
                    dir="rtl"
                  >
                    {ayah.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Player Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-sage-200 dark:border-neutral-800 p-4 pb-8">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
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
              <div className="w-full h-full max-h-[75vh] flex flex-col items-center fade-mask overflow-y-auto scrollbar-hide py-16">
                <motion.div 
                  key={currentAyahIndex}
                  initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.95 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                  exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.05 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-5xl text-center px-4 my-auto"
                >
                  <p 
                    className="text-4xl md:text-5xl lg:text-6xl font-arabic text-white text-glow pb-8" 
                    style={{ lineHeight: '3.5', wordSpacing: '0.15em' }}
                    dir="rtl"
                  >
                    {surahData?.ayahs[currentAyahIndex]?.text}
                  </p>
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
