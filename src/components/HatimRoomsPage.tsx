import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Share2, Copy, Check, X, Plus, ChevronLeft, Trash2, BookOpen, Info, HelpCircle, PartyPopper } from 'lucide-react';
import { doc, onSnapshot, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { LiquidGlassButton } from './LiquidGlassButton';
import confetti from 'canvas-confetti';

interface HatimRoomsPageProps {
  onBack: () => void;
  playClick: () => void;
  joinSessionId?: string | null;
}

interface JuzStatus {
  status: 'available' | 'taken' | 'completed';
  assignedTo: string | null;
  assignedName: string | null;
  currentPage?: number;
  totalPages?: number;
}

interface HatimSession {
  id: string;
  name: string;
  host: string;
  participants: string[];
  createdAt: string;
  juzs: {
    [key: number]: JuzStatus;
  };
}

const JUZ_DETAILS: Record<number, { pages: string, surahs: string }> = {
  1: { pages: '1-21', surahs: 'Fatiha, Bakara' },
  2: { pages: '22-41', surahs: 'Bakara' },
  3: { pages: '42-61', surahs: 'Bakara, Âl-i İmrân' },
  4: { pages: '62-81', surahs: 'Âl-i İmrân, Nisâ' },
  5: { pages: '82-101', surahs: 'Nisâ' },
  6: { pages: '102-121', surahs: 'Nisâ, Mâide' },
  7: { pages: '122-141', surahs: 'Mâide, En\'âm' },
  8: { pages: '142-161', surahs: 'En\'âm, A\'râf' },
  9: { pages: '162-181', surahs: 'A\'râf, Enfâl' },
  10: { pages: '182-201', surahs: 'Enfâl, Tevbe' },
  11: { pages: '202-221', surahs: 'Tevbe, Yûnus, Hûd' },
  12: { pages: '222-241', surahs: 'Hûd, Yûsuf' },
  13: { pages: '242-261', surahs: 'Yûsuf, Ra\'d, İbrâhîm' },
  14: { pages: '262-281', surahs: 'Hicr, Nahl' },
  15: { pages: '282-301', surahs: 'İsrâ, Kehf' },
  16: { pages: '302-321', surahs: 'Kehf, Meryem, Tâhâ' },
  17: { pages: '322-341', surahs: 'Enbiyâ, Hac' },
  18: { pages: '342-361', surahs: 'Mü\'minûn, Nûr, Furkân' },
  19: { pages: '362-381', surahs: 'Furkân, Şuarâ, Neml' },
  20: { pages: '382-401', surahs: 'Neml, Kasas, Ankebût' },
  21: { pages: '402-421', surahs: 'Ankebût, Rûm, Lokmân, Secde, Ahzâb' },
  22: { pages: '422-441', surahs: 'Ahzâb, Sebe\', Fâtır, Yâsîn' },
  23: { pages: '442-461', surahs: 'Yâsîn, Sâffât, Sâd, Zümer' },
  24: { pages: '462-481', surahs: 'Zümer, Mü\'min, Fussilet' },
  25: { pages: '482-501', surahs: 'Fussilet, Şûrâ, Zuhruf, Duhân, Câsiye' },
  26: { pages: '502-521', surahs: 'Ahkâf, Muhammed, Feth, Hucurât, Kâf, Zâriyât' },
  27: { pages: '522-541', surahs: 'Zâriyât, Tûr, Necm, Kamer, Rahmân, Vâkıa, Hadîd' },
  28: { pages: '542-561', surahs: 'Mücâdele, Haşr, Mümtehine, Saf, Cuma, Münâfikûn, Teğâbün, Talâk, Tahrîm' },
  29: { pages: '562-581', surahs: 'Mülk, Kalem, Hâkka, Meâric, Nûh, Cin, Müzzemmil, Müddessir, Kıyâme, İnsân, Mürselât' },
  30: { pages: '582-604', surahs: 'Nebe\', Nâziât, Abese, Tekvîr, İnfitâr, Mutaffifîn, İnşikâk, Burûc, Târık, A\'lâ, Gâşiye, Fecr, Beled, Şems, Leyl, Duhâ, İnşirâh, Tîn, Alak, Kadr, Beyyine, Zilzâl, Âdiyât, Kâria, Tekâsür, Asr, Hümeze, Fîl, Kureyş, Mâûn, Kevser, Kâfirûn, Nasr, Tebbet, İhlâs, Felak, Nâs' }
};

export const HatimRoomsPage: React.FC<HatimRoomsPageProps> = ({ onBack, playClick, joinSessionId }) => {
  const { user, profile } = useAuth();
  
  const [sessions, setSessions] = useState<HatimSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(joinSessionId || null);
  const [activeSession, setActiveSession] = useState<HatimSession | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalTab, setCreateModalTab] = useState<'create' | 'join'>('create');
  const [newSessionName, setNewSessionName] = useState('Ortak Hatim');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [showJuzDetails, setShowJuzDetails] = useState<number | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; title: string; message: string; type: 'alert' | 'confirm'; onConfirm?: () => void } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const prevCompletedCountRef = useRef(0);

  // Check for Hatim Completion
  useEffect(() => {
    if (!activeSession) return;
    
    const completedCount = Object.values(activeSession.juzs).filter(j => j.status === 'completed').length;
    
    // If completed count increased to 30, trigger celebration
    if (completedCount === 30 && prevCompletedCountRef.current < 30) {
      setShowCompletionModal(true);
      triggerConfetti();
    }
    
    prevCompletedCountRef.current = completedCount;
  }, [activeSession]);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  // Fetch Sessions
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'hatim_sessions'), where('participants', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSessions: HatimSession[] = [];
      snapshot.forEach(doc => {
        fetchedSessions.push({ id: doc.id, ...doc.data() } as HatimSession);
      });
      fetchedSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSessions(fetchedSessions);
    }, (error) => {
      console.error("Hatim sessions snapshot error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // Listen to Active Session
  useEffect(() => {
    if (!activeSessionId) {
      setActiveSession(null);
      return;
    }

    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'hatim_sessions', activeSessionId), (doc) => {
      if (doc.exists()) {
        setActiveSession({ id: doc.id, ...doc.data() } as HatimSession);
      } else {
        setActiveSession(null);
        setActiveSessionId(null);
      }
    }, (error) => {
      console.error("Active hatim session snapshot error:", error);
    });

    return () => unsubscribe();
  }, [activeSessionId, user]);

  const handleCreateSession = async () => {
    playClick();
    if (!newSessionName.trim() || !user) return;

    setIsCreating(true);
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const array = new Uint8Array(6);
      window.crypto.getRandomValues(array);
      let newSessionId = '';
      for (let i = 0; i < 6; i++) {
        newSessionId += chars[array[i] % chars.length];
      }

      const initialJuzs: { [key: number]: JuzStatus } = {};
      for (let i = 1; i <= 30; i++) {
        initialJuzs[i] = { status: 'available', assignedTo: null, assignedName: null, currentPage: 0, totalPages: 20 };
      }

      await setDoc(doc(db, 'hatim_sessions', newSessionId), {
        host: user.uid,
        name: newSessionName,
        participants: [user.uid],
        createdAt: new Date().toISOString(),
        juzs: initialJuzs
      });
      
      setActiveSessionId(newSessionId);
      setShowCreateModal(false);
      setNewSessionName('Ortak Hatim');
    } catch (error) {
      console.error("Error creating hatim session:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    playClick();
    if (!joinRoomCode.trim() || !user) return;

    setIsCreating(true);
    try {
      const roomCode = joinRoomCode.trim().toUpperCase();
      const roomRef = doc(db, 'hatim_sessions', roomCode);
      const roomSnap = await getDocs(query(collection(db, 'hatim_sessions'), where('__name__', '==', roomCode)));
      
      if (!roomSnap.empty) {
        const roomData = roomSnap.docs[0].data() as HatimSession;
        if (!roomData.participants.includes(user.uid)) {
          await updateDoc(roomRef, {
            participants: [...roomData.participants, user.uid]
          });
        }
        setActiveSessionId(roomCode);
        setShowCreateModal(false);
        setJoinRoomCode('');
      } else {
        setAlertConfig({
          show: true,
          title: 'Hata',
          message: 'Böyle bir oda bulunamadı. Lütfen kodu kontrol edin.',
          type: 'alert'
        });
      }
    } catch (error) {
      console.error("Error joining room:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    playClick();
    setAlertConfig({
      show: true,
      title: 'Odayı Sil',
      message: 'Bu hatim odasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      type: 'confirm',
      onConfirm: async () => {
        if (user) {
          await deleteDoc(doc(db, 'hatim_sessions', sessionId));
        }
        setAlertConfig(null);
      }
    });
  };

  const handleJuzAction = async (juzNumber: number, currentStatus: JuzStatus) => {
    playClick();
    if (!user || !activeSession || !profile) return;

    const username = profile.username || user.displayName || 'İsimsiz';

    if (currentStatus.status === 'available') {
      await updateDoc(doc(db, 'hatim_sessions', activeSession.id), {
        [`juzs.${juzNumber}`]: { 
          status: 'taken', 
          assignedTo: user.uid, 
          assignedName: username,
          currentPage: 0,
          totalPages: 20
        }
      });
    } else if (currentStatus.assignedTo === user.uid) {
      setSelectedJuz(juzNumber);
    } else if (activeSession.host === user.uid) {
       // Host can reset any juz
       setAlertConfig({
         show: true,
         title: 'Cüzü Sıfırla',
         message: 'Bu cüzü sıfırlamak istediğinize emin misiniz?',
         type: 'confirm',
         onConfirm: async () => {
           await updateDoc(doc(db, 'hatim_sessions', activeSession.id), {
             [`juzs.${juzNumber}`]: { status: 'available', assignedTo: null, assignedName: null, currentPage: 0, totalPages: 20 }
           });
           setAlertConfig(null);
         }
       });
    }
  };

  const handleAutoAssign = async () => {
    playClick();
    if (!user || !activeSession || activeSession.host !== user.uid) return;

    setIsCreating(true);
    try {
      const participantsQuery = query(collection(db, 'users'), where('uid', 'in', activeSession.participants));
      const participantsSnap = await getDocs(participantsQuery);
      const participantMap: Record<string, string> = {};
      participantsSnap.forEach(doc => {
        const data = doc.data();
        participantMap[data.uid] = data.username || data.displayName || 'İsimsiz';
      });

      const unassignedJuzs = Object.keys(activeSession.juzs)
        .map(Number)
        .filter(num => activeSession.juzs[num].status === 'available');

      if (unassignedJuzs.length === 0) {
        setAlertConfig({
           show: true,
           title: 'Bilgi',
           message: 'Boşta cüz bulunmuyor.',
           type: 'alert'
        });
        return;
      }

      const updates: Record<string, any> = {};
      let participantIndex = 0;

      unassignedJuzs.forEach(juzNum => {
        const pUid = activeSession.participants[participantIndex % activeSession.participants.length];
        const pName = participantMap[pUid] || 'İsimsiz';
        
        updates[`juzs.${juzNum}`] = {
          status: 'taken',
          assignedTo: pUid,
          assignedName: pName,
          currentPage: 0,
          totalPages: 20
        };
        
        participantIndex++;
      });

      await updateDoc(doc(db, 'hatim_sessions', activeSession.id), updates);
      setAlertConfig({
        show: true,
        title: 'Başarılı',
        message: 'Kalan cüzler katılımcılara otomatik olarak dağıtıldı.',
        type: 'alert'
      });
    } catch (error) {
      console.error("Auto assign error:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetAll = async () => {
    playClick();
    if (!user || !activeSession || activeSession.host !== user.uid) return;

    setAlertConfig({
      show: true,
      title: 'Tümünü Boşalt',
      message: 'Tüm cüzleri boşaltmak istediğinize emin misiniz? Bu işlem geri alınamaz.',
      type: 'confirm',
      onConfirm: async () => {
        setIsCreating(true);
        try {
          const updates: Record<string, any> = {};
          for (let i = 1; i <= 30; i++) {
            updates[`juzs.${i}`] = {
              status: 'available',
              assignedTo: null,
              assignedName: null,
              currentPage: 0,
              totalPages: 20
            };
          }
          await updateDoc(doc(db, 'hatim_sessions', activeSession.id), updates);
          setAlertConfig(null);
        } catch (error) {
          console.error("Reset all error:", error);
        } finally {
          setIsCreating(false);
        }
      }
    });
  };

  const copySessionId = () => {
    if (activeSession) {
      navigator.clipboard.writeText(activeSession.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderSessionList = () => {
    if (!user) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <BookOpen size={48} className="text-neutral-600 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Giriş Yapmanız Gerekiyor</h2>
          <p className="text-neutral-400">Hatim odalarına katılmak veya oluşturmak için giriş yapmalısınız.</p>
        </div>
      );
    }

    return (
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex-1 flex flex-col p-6 overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Hatim Odaları</h2>
          <LiquidGlassButton
            onClick={() => { playClick(); setShowCreateModal(true); }}
            className="p-3"
            intensity="light"
          >
            <Plus size={24} className="text-white" />
          </LiquidGlassButton>
        </div>

        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center text-neutral-500 mt-10">
              <p>Henüz bir hatim odanız yok.</p>
              <p className="text-sm mt-2">Yeni bir oda oluşturmak veya katılmak için + butonuna tıklayın.</p>
            </div>
          ) : (
            sessions.map(session => {
              const completedCount = Object.values(session.juzs).filter(j => j.status === 'completed').length;
              const progress = (completedCount / 30) * 100;
              
              return (
                <motion.div
                  key={session.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { playClick(); setActiveSessionId(session.id); }}
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 cursor-pointer relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className="flex-1 pr-4">
                      <h3 className="text-lg font-bold text-white">{session.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Users size={12} /> {session.participants.length}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} /> {completedCount}/30 Cüz
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      {session.host === user.uid && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                          className="p-2 bg-neutral-800/50 text-neutral-400 rounded-full hover:text-red-500 hover:bg-red-500/10 transition-colors z-20"
                          title="Odayı Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="w-full bg-black rounded-full h-1.5 mt-2 relative z-10">
                    <div 
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    );
  };

  const renderActiveSession = () => {
    if (!activeSession) return null;
    const completedCount = Object.values(activeSession.juzs).filter(j => j.status === 'completed').length;
    const progress = (completedCount / 30) * 100;

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto"
      >
        <div className="bg-neutral-800/80 backdrop-blur-md rounded-2xl p-4 w-full border border-neutral-700 shrink-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-neutral-400 text-xs font-bold uppercase tracking-wider">Oda Kodu</span>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-emerald-400" />
              <span className="text-emerald-400 text-xs font-bold">{activeSession.participants.length} Kişi</span>
            </div>
          </div>
          <div className="flex items-center justify-between bg-black/50 rounded-xl p-3 border border-neutral-700 mb-4">
            <span className="text-xl font-mono font-bold text-white tracking-widest">{activeSession.id}</span>
            <button onClick={copySessionId} className="text-neutral-400 hover:text-white transition-colors">
              {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
            </button>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setShowHowTo(!showHowTo)}
              className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
            >
              <HelpCircle size={14} />
              Nasıl Kullanılır?
            </button>
            {activeSession.host === user?.uid && (
              <>
                <button 
                  onClick={handleAutoAssign}
                  disabled={isCreating}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Users size={14} />
                  Dağıt
                </button>
                <button 
                  onClick={handleResetAll}
                  disabled={isCreating}
                  className="flex-1 py-2 bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Sıfırla
                </button>
              </>
            )}
          </div>
          
          <AnimatePresence>
            {showHowTo && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-3 bg-neutral-900 rounded-xl border border-neutral-700 text-xs text-neutral-400 space-y-2">
                  <p>• <strong>Cüz Almak:</strong> Boş bir cüze tıklayarak üzerinize alabilirsiniz.</p>
                  <p>• <strong>İlerleme Kaydetmek:</strong> Üzerinize aldığınız cüze tekrar tıklayarak okuduğunuz sayfaları kaydedebilirsiniz.</p>
                  <p>• <strong>Bilgi:</strong> Cüz kutusunun sağ üstündeki <Info size={10} className="inline" /> ikonuna tıklayarak cüzün hangi sayfalarda ve surelerde olduğunu görebilirsiniz.</p>
                  <p>• <strong>Otomatik Dağıtım:</strong> Oda kurucusu, boşta kalan cüzleri odadaki kişilere otomatik olarak dağıtabilir.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">{activeSession.name}</h2>
          <div className="w-full bg-neutral-800 rounded-full h-2 mb-2">
            <div 
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-neutral-400">{completedCount} / 30 Cüz Tamamlandı</p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {Array.from({ length: 30 }, (_, i) => i + 1).map(juzNum => {
            const status = activeSession.juzs[juzNum];
            let bgColor = 'bg-neutral-800';
            let textColor = 'text-neutral-400';
            let borderColor = 'border-neutral-700';
            
            if (status.status === 'taken') {
              bgColor = status.assignedTo === user?.uid ? 'bg-blue-900/40' : 'bg-neutral-700';
              textColor = status.assignedTo === user?.uid ? 'text-blue-400' : 'text-neutral-300';
              borderColor = status.assignedTo === user?.uid ? 'border-blue-500/50' : 'border-neutral-600';
            } else if (status.status === 'completed') {
              bgColor = 'bg-emerald-900/40';
              textColor = 'text-emerald-400';
              borderColor = 'border-emerald-500/50';
            }

            return (
              <div key={juzNum} className="relative">
                <button
                  onClick={() => handleJuzAction(juzNum, status)}
                  className={`w-full relative p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${bgColor} ${borderColor} hover:brightness-110`}
                >
                  <span className={`text-lg font-bold ${textColor}`}>{juzNum}</span>
                  <span className="text-[10px] truncate w-full text-center text-neutral-500">
                    {status.status === 'available' ? 'Boş' : status.assignedName?.split(' ')[0]}
                  </span>
                  {status.status === 'completed' && (
                    <Check size={12} className="absolute top-1 left-1 text-emerald-500" />
                  )}
                  {status.status === 'taken' && status.currentPage !== undefined && status.totalPages !== undefined && (
                    <div className="w-full h-1 bg-black/50 rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all" 
                        style={{ width: `${(status.currentPage / status.totalPages) * 100}%` }}
                      />
                    </div>
                  )}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowJuzDetails(juzNum); }}
                  className="absolute top-1 right-1 p-1 text-neutral-500 hover:text-white transition-colors"
                >
                  <Info size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full relative bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-900">
        <button 
          onClick={() => {
            playClick();
            if (activeSessionId) {
              setActiveSessionId(null);
            } else {
              onBack();
            }
          }}
          className="bg-neutral-900 text-white p-2 rounded-full hover:bg-neutral-800 transition-colors"
        >
          {activeSessionId ? <ChevronLeft size={24} /> : <X size={24} />}
        </button>
        <h1 className="text-xl font-bold text-white">Hatim Odaları</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {activeSessionId ? renderActiveSession() : renderSessionList()}
      </AnimatePresence>

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex bg-neutral-800 rounded-xl p-1 mb-6">
                <button
                  onClick={() => setCreateModalTab('create')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${createModalTab === 'create' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
                >
                  Yeni Oluştur
                </button>
                <button
                  onClick={() => setCreateModalTab('join')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${createModalTab === 'join' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
                >
                  Odaya Katıl
                </button>
              </div>
              
              {createModalTab === 'create' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Oda Adı</label>
                    <input
                      type="text"
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                      placeholder="Örn: Aile Hatmi"
                      className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                  <LiquidGlassButton
                    onClick={handleCreateSession}
                    className="w-full py-4 text-white font-bold"
                    intensity="heavy"
                  >
                    {isCreating ? 'Oluşturuluyor...' : 'Oluştur'}
                  </LiquidGlassButton>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Oda Kodu</label>
                    <input
                      type="text"
                      value={joinRoomCode}
                      onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                      placeholder="Örn: A1B2C3"
                      className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition-colors font-mono tracking-widest uppercase"
                    />
                  </div>
                  <LiquidGlassButton
                    onClick={handleJoinRoom}
                    className="w-full py-4 text-white font-bold"
                    intensity="heavy"
                  >
                    {isCreating ? 'Katılınıyor...' : 'Odaya Katıl'}
                  </LiquidGlassButton>
                </div>
              )}

              <button
                onClick={() => setShowCreateModal(false)}
                className="w-full mt-4 text-neutral-500 font-medium text-sm hover:text-white transition-colors py-2"
              >
                İptal
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert Modal */}
      <AnimatePresence>
        {alertConfig?.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">{alertConfig.title}</h3>
              <p className="text-neutral-400 mb-6">{alertConfig.message}</p>
              
              <div className="flex gap-3">
                {alertConfig.type === 'confirm' && (
                  <button
                    onClick={() => setAlertConfig(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  >
                    İptal
                  </button>
                )}
                <button
                  onClick={() => {
                    if (alertConfig.onConfirm) alertConfig.onConfirm();
                    else setAlertConfig(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold bg-white text-black hover:bg-neutral-200 transition-colors"
                >
                  Tamam
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Juz Details Modal */}
      <AnimatePresence>
        {showJuzDetails !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setShowJuzDetails(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
            >
              <button 
                onClick={() => setShowJuzDetails(null)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-700">
                  <span className="text-2xl font-bold text-white">{showJuzDetails}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{showJuzDetails}. Cüz</h3>
                <p className="text-neutral-400 text-sm">Detaylı Bilgiler</p>
              </div>
              
              <div className="space-y-4">
                {activeSession?.juzs[showJuzDetails]?.status !== 'available' && (
                  <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1 font-bold">Cüzü Alan Kişi</p>
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium">{activeSession?.juzs[showJuzDetails]?.assignedName || 'Bilinmiyor'}</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                        activeSession?.juzs[showJuzDetails]?.status === 'completed' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {activeSession?.juzs[showJuzDetails]?.status === 'completed' ? 'Tamamlandı' : 'Okunuyor'}
                      </span>
                    </div>
                    {activeSession?.juzs[showJuzDetails]?.status === 'taken' && activeSession?.juzs[showJuzDetails]?.currentPage !== undefined && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-neutral-400 mb-1">
                          <span>İlerleme</span>
                          <span>{activeSession.juzs[showJuzDetails].currentPage} / {activeSession.juzs[showJuzDetails].totalPages || 20} Sayfa</span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all" 
                            style={{ width: `${((activeSession.juzs[showJuzDetails].currentPage || 0) / (activeSession.juzs[showJuzDetails].totalPages || 20)) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1 font-bold">Sayfa Aralığı</p>
                  <p className="text-white font-medium">{JUZ_DETAILS[showJuzDetails]?.pages || 'Bilinmiyor'}</p>
                </div>
                <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1 font-bold">İçerdiği Sureler</p>
                  <p className="text-white font-medium leading-relaxed">{JUZ_DETAILS[showJuzDetails]?.surahs || 'Bilinmiyor'}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Juz Progress Modal */}
      <AnimatePresence>
        {selectedJuz !== null && activeSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setSelectedJuz(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedJuz(null)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-1">{selectedJuz}. Cüz İlerlemesi</h3>
                <p className="text-neutral-400 text-sm">Okuduğunuz sayfaları kaydedin</p>
              </div>
              
              <div className="flex flex-col items-center justify-center py-6">
                <div className="text-5xl font-bold text-white mb-2">
                  {activeSession.juzs[selectedJuz].currentPage || 0}
                  <span className="text-2xl text-neutral-500"> / {activeSession.juzs[selectedJuz].totalPages || 20}</span>
                </div>
                <p className="text-neutral-400 text-sm mb-8">Sayfa</p>
                
                <div className="flex items-center gap-6">
                  <button 
                    onClick={async () => {
                      playClick();
                      const current = activeSession.juzs[selectedJuz].currentPage || 0;
                      if (current > 0) {
                        await updateDoc(doc(db, 'hatim_sessions', activeSession.id), {
                          [`juzs.${selectedJuz}.currentPage`]: current - 1,
                          [`juzs.${selectedJuz}.status`]: 'taken'
                        });
                      }
                    }}
                    className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center text-white hover:bg-neutral-700 transition-colors"
                  >
                    <span className="text-2xl font-bold">-</span>
                  </button>
                  
                  <button 
                    onClick={async () => {
                      playClick();
                      const current = activeSession.juzs[selectedJuz].currentPage || 0;
                      const total = activeSession.juzs[selectedJuz].totalPages || 20;
                      if (current < total) {
                        const newCurrent = current + 1;
                        await updateDoc(doc(db, 'hatim_sessions', activeSession.id), {
                          [`juzs.${selectedJuz}.currentPage`]: newCurrent,
                          [`juzs.${selectedJuz}.status`]: newCurrent >= total ? 'completed' : 'taken'
                        });
                        if (newCurrent >= total) {
                          setSelectedJuz(null);
                        }
                      }
                    }}
                    className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/50"
                  >
                    <Plus size={32} />
                  </button>
                </div>
              </div>
              
              <button 
                onClick={async () => {
                  playClick();
                  await updateDoc(doc(db, 'hatim_sessions', activeSession.id), {
                    [`juzs.${selectedJuz}`]: { status: 'available', assignedTo: null, assignedName: null, currentPage: 0, totalPages: 20 }
                  });
                  setSelectedJuz(null);
                }}
                className="w-full py-3 mt-4 text-red-500 font-bold hover:bg-red-500/10 rounded-xl transition-colors"
              >
                Cüzü Bırak
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Hatim Completion Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            onClick={() => setShowCompletionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 border border-emerald-500/30 rounded-3xl p-8 w-full max-w-sm shadow-2xl relative text-center overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute top-0 left-0 w-full h-full bg-emerald-500/5 blur-3xl -z-10" />
              
              <div className="w-24 h-24 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 shadow-lg shadow-emerald-900/20">
                <PartyPopper size={48} className="text-emerald-400" />
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-2 font-serif">Elhamdülillah!</h2>
              <h3 className="text-xl font-medium text-emerald-400 mb-4">Hatim Tamamlandı</h3>
              
              <p className="text-neutral-300 mb-8 leading-relaxed">
                Bu hatim odasındaki tüm cüzler okundu. Allah (c.c) kabul etsin. Şimdi hatim duası yapabilirsiniz.
              </p>
              
              <button 
                onClick={() => {
                  playClick();
                  setShowCompletionModal(false);
                }}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 hover:scale-[1.02]"
              >
                Allah Kabul Etsin
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
