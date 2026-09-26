import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storage';
import { supabase } from '../lib/supabase';
import { ChatMessage } from '../types';
import {
  MessageSquare,
  Send,
  User,
  Check,
  CheckCheck,
  Clock,
  Search,
  Mic,
  Volume2,
  PhoneCall,
  ShieldCheck,
  Truck,
  Sparkles,
} from 'lucide-react';
import { VoiceMessageRecorder, VoiceMessagePayload } from '../components/VoiceMessageRecorder';
import { VoiceMessagePlayer } from '../components/VoiceMessagePlayer';

interface DirectMessagingScreenProps {
  onNavigate: (view: string) => void;
}

interface ContactItem {
  id: string;
  name: string;
  role: string;
  online: boolean;
  avatarText?: string;
  location?: string;
}

export const DirectMessagingScreen: React.FC<DirectMessagingScreenProps> = () => {
  const { user } = useAuth();
  const { isSwahili } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactItem[]>([
    {
      id: 'ops-supervisor',
      name: isSwahili ? 'Msimamizi Mkuu wa Operesheni' : 'Area Operations Supervisor (HQ)',
      role: 'HQ Dispatch & Shift Supervisor',
      online: true,
      avatarText: 'HQ',
      location: 'Nyakato Bottling Plant, Mwanza',
    },
    {
      id: 'central-depot',
      name: isSwahili ? 'Gereji & Usafirishaji Nyakato' : 'Central Depot Fleet Logistics',
      role: 'Fleet Maintenance & Inventory',
      online: true,
      avatarText: 'CD',
      location: 'Nyakato Industrial Area',
    },
    {
      id: 'drv-001',
      name: 'Salim Bakari (Truck T 412 DZZ)',
      role: 'Field Route Driver - Buzuruga',
      online: true,
      avatarText: 'SB',
      location: 'Buzuruga Commercial Plaza',
    },
    {
      id: 'drv-002',
      name: 'Juma Ramadhani (Truck T 834 EZZ)',
      role: 'Field Route Driver - Capripoint',
      online: true,
      avatarText: 'JR',
      location: 'Tilapia Hotel Waterfront',
    },
  ]);

  const [selectedContact, setSelectedContact] = useState<ContactItem>({
    id: 'ops-supervisor',
    name: isSwahili ? 'Msimamizi Mkuu wa Operesheni' : 'Area Operations Supervisor (HQ)',
    role: 'HQ Dispatch & Shift Supervisor',
    online: true,
    avatarText: 'HQ',
    location: 'Nyakato Bottling Plant, Mwanza',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize messages and contacts
  useEffect(() => {
    const existing = storageService.getMessages();
    const needsSeed = existing.length === 0 || !existing.some((m) => m.audioUrl);
    if (needsSeed) {
      // Seed realistic Mwanza dispatch verbal updates for both field staff and supervisor
      const initialVerbalNote: ChatMessage = {
        id: 'msg-seed-1',
        senderId: 'drv-001',
        senderName: 'Salim Bakari (Truck T 412 DZZ)',
        receiverId: 'ops-supervisor',
        receiverName: isSwahili ? 'Msimamizi Mkuu' : 'Area Operations Supervisor',
        content: isSwahili
          ? 'Nimefika Buzuruga Commercial Plaza salama, chupa 26 za 18.9L zimeshushwa na chupa tupu 20 zimekusanywa.'
          : 'Arrived at Buzuruga Commercial Plaza, offloaded 26x 18.9L bottles and inspected 20 empty returns.',
        messageType: 'voice',
        audioDuration: 4,
        voiceCategory: 'arrival',
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        isRead: true,
        syncStatus: 'sent',
      };

      const initialSupervisorReply: ChatMessage = {
        id: 'msg-seed-2',
        senderId: 'ops-supervisor',
        senderName: 'Noah Philemon (Supervisor)',
        receiverId: 'drv-001',
        receiverName: 'Salim Bakari',
        content: isSwahili
          ? 'Pokea Salim, kazi nzuri. Baada ya Buzuruga rudi mara moja Nyakato kupakia chupa 40 za mchana.'
          : 'Acknowledged Salim, excellent work. Proceed directly to Nyakato plant after Buzuruga to reload 40x 18.9L bottles for the afternoon shift.',
        messageType: 'voice',
        audioDuration: 5,
        voiceCategory: 'refill',
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        isRead: true,
        syncStatus: 'sent',
      };

      try {
        localStorage.setItem('zamzam_messages', JSON.stringify([initialVerbalNote, initialSupervisorReply]));
      } catch {
        // ignore
      }
      setMessages([initialVerbalNote, initialSupervisorReply]);
    } else {
      setMessages(existing);
    }

    // Fetch team profiles from Supabase to dynamically populate contacts
    const fetchTeamContacts = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (!error && data && data.length > 0) {
          const registered = data
            .filter((p: any) => p.id !== user?.id)
            .map((p: any) => ({
              id: p.id,
              name: p.name || p.email || 'Team Staff',
              role: p.role === 'supervisor' ? 'Supervisor Operations' : 'Field Staff',
              online: true,
              avatarText: (p.name || p.email || 'TS').slice(0, 2).toUpperCase(),
              location: 'Mwanza Regional Corridor',
            }));
          if (registered.length > 0) {
            setContacts((prev) => {
              const ids = new Set(prev.map((c) => c.id));
              const newOnes = registered.filter((r: any) => !ids.has(r.id));
              return [...prev, ...newOnes];
            });
          }
        }
      } catch {
        // Fallback to default channels
      }
    };

    fetchTeamContacts();
  }, [user?.id, isSwahili]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedContact.id]);

  // Send regular text message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    storageService.sendMessage({
      senderId: user?.id || 'staff-session',
      senderName: user?.name || 'Field Staff',
      receiverId: selectedContact.id,
      receiverName: selectedContact.name,
      content: inputText.trim(),
      messageType: 'text',
    });

    setMessages([...storageService.getMessages()]);
    setInputText('');
  };

  // Send voice note recorded from component
  const handleSendVoiceMessage = (payload: VoiceMessagePayload) => {
    storageService.sendMessage({
      senderId: user?.id || 'staff-session',
      senderName: user?.name || 'Field Staff',
      receiverId: selectedContact.id,
      receiverName: selectedContact.name,
      content: payload.content,
      messageType: 'voice',
      audioUrl: payload.audioUrl,
      audioDuration: payload.audioDuration,
      voiceCategory: payload.voiceCategory,
    });

    setMessages([...storageService.getMessages()]);
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const threadMessages = messages.filter(
    (m) =>
      (m.senderId === user?.id && m.receiverId === selectedContact.id) ||
      (m.senderId === selectedContact.id && m.receiverId === user?.id) ||
      m.receiverId === selectedContact.id ||
      m.senderId === selectedContact.id
  );

  return (
    <div className="max-w-5xl mx-auto pb-24 md:pb-12 h-[calc(100vh-140px)] flex flex-col">
      {/* Header with Walkie-Talkie Badge */}
      <div className="border-b border-[#243447] pb-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#00C46A]" />
            <span>{isSwahili ? 'Mawasiliano ya Uwanjani & Sauti' : 'Field Dispatch & Voice Messaging'}</span>
          </h1>
          <p className="text-xs text-[#8899AA] mt-0.5">
            {isSwahili
              ? 'Tuma taarifa za sauti na ujumbe wa maandishi kwa wasimamizi na madereva wa Mwanza.'
              : 'Verbal field updates, walkie-talkie audio notes, and instant chat with dispatch supervisors.'}
          </p>
        </div>

        {/* Live Channel Status Pill */}
        <div className="flex items-center gap-2 bg-[#122010] border border-[#2A5038] px-3 py-1.5 rounded-full self-start sm:self-auto shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#00C46A] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#00C46A]">
            {isSwahili ? 'Mwanza Corridor: Mtandaoni' : 'Mwanza Corridor: Live Comms'}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 bg-[#122010] rounded-2xl border border-[#2A5038] overflow-hidden shadow-xl">
        {/* Contact List */}
        <div className="border-r border-[#243447] flex flex-col bg-[#0E1B11]">
          <div className="p-3 border-b border-[#243447]">
            <div className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{isSwahili ? 'Vituo vya Mawasiliano' : 'Dispatch Channels'}</span>
              <span className="text-[10px] text-[#00C46A] font-mono">{contacts.length} active</span>
            </div>
            <div className="flex items-center gap-2 bg-[#1A2E1C] px-3 py-1.5 rounded-xl border border-[#3A5068]">
              <Search className="w-3.5 h-3.5 text-[#8899AA]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isSwahili ? 'Tafuta dereva au msimamizi...' : 'Search staff or depot...'}
                className="w-full bg-transparent text-xs text-white placeholder-[#8899AA] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#243447]/50">
            {filteredContacts.map((c) => {
              const isSelected = c.id === selectedContact.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedContact(c)}
                  className={`w-full p-3 flex items-center gap-3 text-left transition-colors ${
                    isSelected ? 'bg-[#1A2E1C] border-l-4 border-l-[#00C46A]' : 'hover:bg-[#122010]'
                  }`}
                >
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-[#006B3C] text-white flex items-center justify-center font-bold text-xs shadow">
                      {c.avatarText || c.name.slice(0, 2).toUpperCase()}
                    </div>
                    {c.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00C46A] rounded-full ring-2 ring-[#0E1B11]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate flex items-center justify-between">
                      <span className="truncate">{c.name}</span>
                    </div>
                    <div className="text-[11px] text-[#8899AA] truncate">{c.role}</div>
                    {c.location && (
                      <div className="text-[10px] text-[#00C46A]/80 truncate mt-0.5">
                        📍 {c.location}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Thread */}
        <div className="md:col-span-2 flex flex-col bg-[#122010]">
          {/* Active Contact Header */}
          <div className="p-3.5 border-b border-[#243447] flex items-center justify-between bg-[#142616]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#006B3C] text-white flex items-center justify-center font-bold text-xs shadow">
                {selectedContact.avatarText || selectedContact.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{selectedContact.name}</span>
                  <span className="w-1.5 h-1.5 bg-[#00C46A] rounded-full" />
                </h3>
                <span className="text-[10px] text-[#00C46A] flex items-center gap-1">
                  <span>{selectedContact.role} &bull; {selectedContact.location || 'Mwanza Plant'}</span>
                </span>
              </div>
            </div>

            {/* Walkie Talkie Mode Info Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#0A1A0F] rounded-lg border border-[#2A5038] text-[10px] text-[#D0E8F0]">
              <Mic className="w-3 h-3 text-[#00C46A]" />
              <span>{isSwahili ? 'Ujumbe wa Sauti Upo Tayari' : 'Voice Notes Enabled'}</span>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {threadMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-[#8899AA]">
                <div className="w-12 h-12 rounded-full bg-[#1A2E1C] border border-[#2A5038] flex items-center justify-center mb-3">
                  <Mic className="w-6 h-6 text-[#00C46A]" />
                </div>
                <div className="font-bold text-white mb-1">
                  {isSwahili ? 'Hakuna Ujumbe Bado' : 'No Messages in this Channel'}
                </div>
                <p className="max-w-xs text-[11px] leading-relaxed">
                  {isSwahili
                    ? 'Tumia kitufe cha maikrofoni kurekodi taarifa ya sauti ya haraka au andika ujumbe hapa chini.'
                    : 'Use the microphone button below to send a quick verbal update, or type a text message.'}
                </p>
              </div>
            ) : (
              threadMessages.map((msg) => {
                const isMe =
                  msg.senderId === user?.id ||
                  msg.senderId === 'staff-session' ||
                  msg.senderId === 'field-1';
                const isVoice = msg.messageType === 'voice' || Boolean(msg.audioUrl);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-md ${
                        isMe
                          ? 'bg-[#006B3C] text-white rounded-br-none'
                          : 'bg-[#1A2E1C] text-[#D0E8F0] border border-[#3A5068] rounded-bl-none'
                      }`}
                    >
                      {!isMe && (
                        <div className="text-[10px] font-bold text-[#00C46A] mb-1 flex items-center justify-between gap-2">
                          <span>{msg.senderName}</span>
                          {isVoice && (
                            <span className="flex items-center gap-1 text-[9px] text-[#A0B0C0] font-normal">
                              <Volume2 className="w-3 h-3 text-[#00C46A]" />
                              <span>{isSwahili ? 'Ujumbe wa Sauti' : 'Voice Memo'}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Render Voice Message Player or Text */}
                      {isVoice && msg.audioUrl ? (
                        <VoiceMessagePlayer
                          id={msg.id}
                          audioUrl={msg.audioUrl}
                          duration={msg.audioDuration}
                          category={msg.voiceCategory}
                          caption={msg.content}
                          isMe={isMe}
                          activeAudioId={activeAudioId}
                          onPlayStart={(id) => setActiveAudioId(id)}
                        />
                      ) : (
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}

                      <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[9px] text-[#A0B0C0]">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMe && (
                          <span>
                            {msg.syncStatus === 'sent' ? (
                              <CheckCheck className="w-3 h-3 text-[#00C46A]" />
                            ) : (
                              <Clock className="w-3 h-3 text-[#F59E0B]" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice & Text Input Section */}
          <div className="p-3 border-t border-[#243447] bg-[#142616] flex flex-col gap-2">
            {/* Primary Input Bar */}
            <div className="flex items-center gap-2">
              <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isSwahili
                      ? `Andika au rekodi sauti kwa ${selectedContact.name}...`
                      : `Message ${selectedContact.name} or record audio...`
                  }
                  className="flex-1 bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#8899AA] focus:outline-none focus:border-[#00C46A]"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 rounded-xl bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold transition-all disabled:opacity-40 shadow-sm"
                  title={isSwahili ? 'Tuma maandishi' : 'Send text'}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Dedicated Voice Recording Component */}
              <div className="shrink-0">
                <VoiceMessageRecorder
                  onSendVoiceMessage={handleSendVoiceMessage}
                  receiverName={selectedContact.name}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
