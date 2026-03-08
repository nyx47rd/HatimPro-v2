import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Share2, Copy, Check, X, Plus, ChevronLeft, Trash2, BookOpen } from 'lucide-react';
import { doc, onSnapshot, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { LiquidGlassButton } from './LiquidGlassButton';

interface HatimRoomsPageProps {
  onBack: () => void;
  playClick: () => void;
  joinSessionId?: string | null;
}

interface JuzStatus {
  status: 'available' | 'taken' | 'completed';
  assignedTo: string | null;
  assignedName: string | null;
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
  
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; title: string; message: string; type: 'alert' | 'confirm'; onConfirm?: () => void } | null>(null);
  const [copied, setCopied] = useState(false);

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
        initialJuzs[i] = { status: 'available', assignedTo: null, assignedName: null };
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

    const displayName = profile.displayName || user.displayName || 'İsimsiz';
    let newStatus: JuzStatus = { ...currentStatus };

    if (currentStatus.status === 'available') {
      newStatus = { status: 'taken', assignedTo: user.uid, assignedName: displayName };
    } else if (currentStatus.status === 'taken' && currentStatus.assignedTo === user.uid) {
      newStatus = { status: 'completed', assignedTo: user.uid, assignedName: displayName };
    } else if (currentStatus.status === 'completed' && currentStatus.assignedTo === user.uid) {
      newStatus = { status: 'available', assignedTo: null, assignedName: null };
    } else if (activeSession.host === user.uid) {
       // Host can reset any juz
       setAlertConfig({
         show: true,
         title: 'Cüzü Sıfırla',
         message: 'Bu cüzü sıfırlamak istediğinize emin misiniz?',
         type: 'confirm',
         onConfirm: async () => {
           await updateDoc(doc(db, 'hatim_sessions', activeSession.id), {
             [`juzs.${juzNumber}`]: { status: 'available', assignedTo: null, assignedName: null }
           });
           setAlertConfig(null);
         }
       });
       return;
    } else {
      return; // Not allowed
    }

    await updateDoc(doc(db, 'hatim_sessions', activeSession.id), {
      [`juzs.${juzNumber}`]: newStatus
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
          <div className="flex items-center justify-between bg-black/50 rounded-xl p-3 border border-neutral-700">
            <span className="text-xl font-mono font-bold text-white tracking-widest">{activeSession.id}</span>
            <button onClick={copySessionId} className="text-neutral-400 hover:text-white transition-colors">
              {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
            </button>
          </div>
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
              <button
                key={juzNum}
                onClick={() => handleJuzAction(juzNum, status)}
                className={`relative p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${bgColor} ${borderColor} hover:brightness-110`}
              >
                <span className={`text-lg font-bold ${textColor}`}>{juzNum}</span>
                <span className="text-[10px] truncate w-full text-center text-neutral-500">
                  {status.status === 'available' ? 'Boş' : status.assignedName?.split(' ')[0]}
                </span>
                {status.status === 'completed' && (
                  <Check size={12} className="absolute top-1 right-1 text-emerald-500" />
                )}
              </button>
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
    </div>
  );
};
