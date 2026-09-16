import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
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
  Radio,
  Search,
} from 'lucide-react';

interface DirectMessagingScreenProps {
  onNavigate: (view: string) => void;
}

interface ContactItem {
  id: string;
  name: string;
  role: string;
  online: boolean;
}

export const DirectMessagingScreen: React.FC<DirectMessagingScreenProps> = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [contacts, setContacts] = useState<ContactItem[]>([
    { id: 'ops-supervisor', name: 'Area Operations Supervisor', role: 'HQ Supervisor', online: true },
    { id: 'central-depot', name: 'Central Depot Logistics', role: 'Fleet Logistics', online: true },
  ]);
  const [selectedContact, setSelectedContact] = useState<ContactItem>({
    id: 'ops-supervisor',
    name: 'Area Operations Supervisor',
    role: 'HQ Supervisor',
    online: true,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(storageService.getMessages());

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
            }));
          if (registered.length > 0) {
            setContacts([
              { id: 'ops-supervisor', name: 'Area Operations Supervisor', role: 'HQ Supervisor', online: true },
              { id: 'central-depot', name: 'Central Depot Logistics', role: 'Fleet Logistics', online: true },
              ...registered,
            ]);
          }
        }
      } catch {
        // Fallback to default channels
      }
    };

    fetchTeamContacts();
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    storageService.sendMessage({
      senderId: user?.id || 'staff-session',
      senderName: user?.name || 'Field Staff',
      receiverId: selectedContact.id,
      receiverName: selectedContact.name,
      content: inputText.trim(),
    });

    setMessages([...storageService.getMessages()]);
    setInputText('');
  };

  const filteredContacts = contacts.filter((c) =>
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
      {/* Header */}
      <div className="border-b border-[#243447] pb-3 mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-[#00C46A]" />
          <span>Field Dispatch Messaging</span>
        </h1>
        <p className="text-xs text-[#8899AA] mt-0.5">
          Real-time and offline chat with dispatch supervisors and regional fleet.
        </p>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 bg-[#122010] rounded-2xl border border-[#2A5038] overflow-hidden shadow-xl">
        {/* Contact List */}
        <div className="border-r border-[#243447] flex flex-col bg-[#0E1B11]">
          <div className="p-3 border-b border-[#243447]">
            <div className="text-xs font-bold text-white uppercase tracking-wider mb-2">Team Channels</div>
            <div className="flex items-center gap-2 bg-[#1A2E1C] px-3 py-1.5 rounded-xl border border-[#3A5068]">
              <Search className="w-3.5 h-3.5 text-[#8899AA]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff or depot..."
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
                    isSelected ? 'bg-[#1A2E1C]' : 'hover:bg-[#122010]'
                  }`}
                >
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-[#006B3C] text-white flex items-center justify-center font-bold text-xs">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    {c.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00C46A] rounded-full ring-2 ring-[#0E1B11]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{c.name}</div>
                    <div className="text-[11px] text-[#8899AA] truncate">{c.role}</div>
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
              <div className="w-8 h-8 rounded-full bg-[#006B3C] text-white flex items-center justify-center font-bold text-xs">
                {selectedContact.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">{selectedContact.name}</h3>
                <span className="text-[10px] text-[#00C46A] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#00C46A] rounded-full animate-pulse" />
                  <span>Channel Open &bull; {selectedContact.role}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {threadMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-[#8899AA]">
                <MessageSquare className="w-8 h-8 text-[#00C46A]/40 mb-2" />
                <div className="font-bold text-white mb-1">No Messages Yet</div>
                <p className="max-w-xs">Send a dispatch status report, report delivery delays, or request inventory replenishment.</p>
              </div>
            ) : (
              threadMessages.map((msg) => {
                const isMe = msg.senderId === user?.id || msg.senderId === 'staff-session' || msg.senderId === 'field-1';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                        isMe
                          ? 'bg-[#006B3C] text-white rounded-br-none'
                          : 'bg-[#1A2E1C] text-[#D0E8F0] border border-[#3A5068] rounded-bl-none'
                      }`}
                    >
                      {!isMe && (
                        <div className="text-[10px] font-bold text-[#00C46A] mb-0.5">
                          {msg.senderName}
                        </div>
                      )}
                      <p className="leading-relaxed">{msg.content}</p>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-[#8899AA]">
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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

          {/* Send Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-[#243447] bg-[#142616] flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${selectedContact.name}...`}
              className="flex-1 bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#8899AA] focus:outline-none focus:border-[#00C46A]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold transition-all disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
