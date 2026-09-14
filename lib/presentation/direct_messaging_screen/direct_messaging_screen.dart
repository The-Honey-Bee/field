import 'dart:async';
import 'dart:convert';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../theme/app_theme.dart';
import '../../services/supabase_service.dart';

// ─── Message Model ────────────────────────────────────────────────────────────

class ChatMessage {
  final String id;
  final String senderId;
  final String senderName;
  final String receiverId;
  final String receiverName;
  final String content;
  final DateTime createdAt;
  bool isRead;
  String syncStatus; // 'sent', 'pending', 'failed'

  ChatMessage({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.receiverId,
    required this.receiverName,
    required this.content,
    required this.createdAt,
    this.isRead = false,
    this.syncStatus = 'sent',
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'senderId': senderId,
    'senderName': senderName,
    'receiverId': receiverId,
    'receiverName': receiverName,
    'content': content,
    'createdAt': createdAt.toIso8601String(),
    'isRead': isRead,
    'syncStatus': syncStatus,
  };

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
    id: json['id'] as String,
    senderId: json['senderId'] as String? ?? json['sender_id'] as String? ?? '',
    senderName:
        json['senderName'] as String? ?? json['sender_name'] as String? ?? '',
    receiverId:
        json['receiverId'] as String? ?? json['receiver_id'] as String? ?? '',
    receiverName:
        json['receiverName'] as String? ??
        json['receiver_name'] as String? ??
        '',
    content: json['content'] as String? ?? '',
    createdAt:
        DateTime.tryParse(
          json['createdAt'] as String? ?? json['created_at'] as String? ?? '',
        ) ??
        DateTime.now(),
    isRead: json['isRead'] as bool? ?? json['is_read'] as bool? ?? false,
    syncStatus:
        json['syncStatus'] as String? ??
        json['sync_status'] as String? ??
        'sent',
  );

  Map<String, dynamic> toSupabaseMap() => {
    'id': id,
    'sender_id': senderId,
    'sender_name': senderName,
    'receiver_id': receiverId,
    'receiver_name': receiverName,
    'content': content,
    'is_read': isRead,
    'sync_status': 'sent',
  };
}

// ─── Direct Messaging Screen ──────────────────────────────────────────────────

class DirectMessagingScreen extends StatefulWidget {
  const DirectMessagingScreen({super.key});

  @override
  State<DirectMessagingScreen> createState() => _DirectMessagingScreenState();
}

class _DirectMessagingScreenState extends State<DirectMessagingScreen> {
  static const _cacheKey = 'zamzam_messages_cache';

  // Current user — loaded from auth/preferences in production
  final String _currentUserId = '';
  final String _currentUserName = '';

  // Contacts — loaded from Supabase in production
  final List<Map<String, String>> _contacts = [];

  Map<String, String>? _selectedContact;
  List<ChatMessage> _messages = [];
  List<ChatMessage> _pendingMessages = [];
  bool _isOnline = true;
  bool _isLoading = false;
  bool _isSending = false;
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  StreamSubscription? _connectivitySub;
  RealtimeChannel? _realtimeChannel;

  @override
  void initState() {
    super.initState();
    _loadCachedMessages();
    _startConnectivityMonitor();
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    _connectivitySub?.cancel();
    _realtimeChannel?.unsubscribe();
    super.dispose();
  }

  void _startConnectivityMonitor() {
    Connectivity().checkConnectivity().then((results) {
      final online = results.any((r) => r != ConnectivityResult.none);
      if (mounted) setState(() => _isOnline = online);
      if (online) _syncPendingMessages();
    });

    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final online = results.any((r) => r != ConnectivityResult.none);
      final wasOffline = !_isOnline;
      if (mounted) setState(() => _isOnline = online);
      if (wasOffline && online) _syncPendingMessages();
    });
  }

  Future<void> _loadCachedMessages() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_cacheKey);
      if (raw != null) {
        final list = jsonDecode(raw) as List;
        _messages = list
            .map(
              (e) => ChatMessage.fromJson(Map<String, dynamic>.from(e as Map)),
            )
            .toList();
        _pendingMessages = _messages
            .where((m) => m.syncStatus == 'pending')
            .toList();
        if (mounted) setState(() {});
      }
    } catch (e) {
      debugPrint('[Messaging] Cache load error: $e');
    }
  }

  Future<void> _saveMessagesToCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _cacheKey,
        jsonEncode(_messages.map((m) => m.toJson()).toList()),
      );
    } catch (e) {
      debugPrint('[Messaging] Cache save error: $e');
    }
  }

  Future<void> _loadMessagesForContact(Map<String, String> contact) async {
    setState(() {
      _selectedContact = contact;
      _isLoading = true;
    });

    // Subscribe to real-time updates
    _realtimeChannel?.unsubscribe();
    if (_isOnline) {
      try {
        final client = SupabaseService.instance.client;
        _realtimeChannel = client
            .channel('messages_${contact['id']}')
            .onPostgresChanges(
              event: PostgresChangeEvent.insert,
              schema: 'public',
              table: 'messages',
              callback: (payload) {
                final newMsg = ChatMessage.fromJson(
                  Map<String, dynamic>.from(payload.newRecord),
                );
                if ((newMsg.senderId == contact['id'] &&
                        newMsg.receiverId == _currentUserId) ||
                    (newMsg.senderId == _currentUserId &&
                        newMsg.receiverId == contact['id']!)) {
                  if (!_messages.any((m) => m.id == newMsg.id)) {
                    setState(() => _messages.add(newMsg));
                    _saveMessagesToCache();
                    _scrollToBottom();
                  }
                }
              },
            )
            .subscribe();

        // Load history from Supabase
        final res = await client
            .from('messages')
            .select()
            .or(
              'and(sender_id.eq.$_currentUserId,receiver_id.eq.${contact['id']}),and(sender_id.eq.${contact['id']},receiver_id.eq.$_currentUserId)',
            )
            .order('created_at', ascending: true)
            .limit(100);

        final remoteMessages = (res as List)
            .map(
              (e) => ChatMessage.fromJson(Map<String, dynamic>.from(e as Map)),
            )
            .toList();

        // Merge with local pending
        final pending = _messages
            .where(
              (m) =>
                  m.syncStatus == 'pending' &&
                  ((m.senderId == _currentUserId &&
                          m.receiverId == contact['id']) ||
                      (m.senderId == contact['id'] &&
                          m.receiverId == _currentUserId)),
            )
            .toList();

        setState(() {
          _messages = [...remoteMessages, ...pending];
          _isLoading = false;
        });
        await _saveMessagesToCache();
        _scrollToBottom();
      } catch (e) {
        debugPrint('[Messaging] Load error: $e');
        setState(() => _isLoading = false);
      }
    } else {
      // Offline: show cached messages for this contact
      final cached = _messages
          .where(
            (m) =>
                (m.senderId == _currentUserId &&
                    m.receiverId == contact['id']) ||
                (m.senderId == contact['id'] && m.receiverId == _currentUserId),
          )
          .toList();
      setState(() {
        _messages = cached;
        _isLoading = false;
      });
    }
  }

  Future<void> _sendMessage() async {
    final text = _inputController.text.trim();
    if (text.isEmpty || _selectedContact == null) return;

    final contact = _selectedContact!;
    final msg = ChatMessage(
      id: 'msg_${DateTime.now().millisecondsSinceEpoch}',
      senderId: _currentUserId,
      senderName: _currentUserName,
      receiverId: contact['id']!,
      receiverName: contact['name']!,
      content: text,
      createdAt: DateTime.now(),
      syncStatus: _isOnline ? 'sent' : 'pending',
    );

    _inputController.clear();
    setState(() {
      _messages.add(msg);
      _isSending = true;
    });
    await _saveMessagesToCache();
    _scrollToBottom();

    if (_isOnline) {
      try {
        final client = SupabaseService.instance.client;
        await client.from('messages').insert(msg.toSupabaseMap());
        msg.syncStatus = 'sent';
      } catch (e) {
        debugPrint('[Messaging] Send error: $e');
        msg.syncStatus = 'failed';
      }
    } else {
      _pendingMessages.add(msg);
    }

    if (mounted) setState(() => _isSending = false);
    await _saveMessagesToCache();
  }

  Future<void> _syncPendingMessages() async {
    if (_pendingMessages.isEmpty) return;
    try {
      final client = SupabaseService.instance.client;
      for (final msg in List.from(_pendingMessages)) {
        try {
          await client.from('messages').insert(msg.toSupabaseMap());
          msg.syncStatus = 'sent';
          _pendingMessages.remove(msg);
        } catch (e) {
          msg.syncStatus = 'failed';
        }
      }
      if (mounted) setState(() {});
      await _saveMessagesToCache();
    } catch (e) {
      debugPrint('[Messaging] Sync error: $e');
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  List<ChatMessage> get _currentConversation {
    if (_selectedContact == null) return [];
    return _messages
        .where(
          (m) =>
              (m.senderId == _currentUserId &&
                  m.receiverId == _selectedContact!['id']) ||
              (m.senderId == _selectedContact!['id'] &&
                  m.receiverId == _currentUserId),
        )
        .toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  int _pendingCountFor(String contactId) {
    return _messages
        .where(
          (m) =>
              m.syncStatus == 'pending' &&
              ((m.senderId == _currentUserId && m.receiverId == contactId) ||
                  (m.senderId == contactId && m.receiverId == _currentUserId)),
        )
        .length;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(72),
        child: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
            child: Container(
              decoration: BoxDecoration(
                color: AppTheme.backgroundDark.withAlpha(191),
                border: const Border(
                  bottom: BorderSide(color: Color(0xFF243447), width: 0.5),
                ),
              ),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  child: Row(
                    children: [
                      if (_selectedContact != null)
                        GestureDetector(
                          onTap: () => setState(() => _selectedContact = null),
                          child: Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: AppTheme.surfaceVariantDark.withAlpha(153),
                              borderRadius: BorderRadius.circular(9),
                            ),
                            child: const Icon(
                              Icons.arrow_back_ios_new,
                              color: Color(0xFFB0C4D8),
                              size: 16,
                            ),
                          ),
                        )
                      else
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: AppTheme.accent.withAlpha(30),
                            borderRadius: BorderRadius.circular(9),
                          ),
                          child: const Icon(
                            Icons.chat_bubble_outline,
                            color: AppTheme.accent,
                            size: 18,
                          ),
                        ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _selectedContact != null
                                  ? _selectedContact!['name']!
                                  : 'Messages',
                              style: GoogleFonts.ibmPlexSans(
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (_selectedContact != null)
                              Row(
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: BoxDecoration(
                                      color: _isOnline
                                          ? AppTheme.success
                                          : const Color(0xFF8899AA),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    _isOnline ? 'Online' : 'Offline',
                                    style: GoogleFonts.ibmPlexSans(
                                      fontSize: 11,
                                      color: _isOnline
                                          ? AppTheme.success
                                          : const Color(0xFF8899AA),
                                    ),
                                  ),
                                ],
                              )
                            else
                              Text(
                                _isOnline ? 'Connected' : 'Offline mode',
                                style: GoogleFonts.ibmPlexSans(
                                  fontSize: 11,
                                  color: _isOnline
                                      ? AppTheme.success
                                      : AppTheme.warning,
                                ),
                              ),
                          ],
                        ),
                      ),
                      if (_pendingMessages.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.warning.withAlpha(30),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: AppTheme.warning.withAlpha(80),
                              width: 1,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.schedule_send,
                                color: AppTheme.warning,
                                size: 12,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '${_pendingMessages.length}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.warning,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      body: _selectedContact == null ? _buildContactList() : _buildChatView(),
    );
  }

  Widget _buildContactList() {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: SizedBox(height: MediaQuery.of(context).padding.top + 72),
        ),
        if (!_isOnline)
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppTheme.warning.withAlpha(20),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: AppTheme.warning.withAlpha(60),
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.wifi_off, color: AppTheme.warning, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Offline — messages will sync when connected',
                      style: GoogleFonts.ibmPlexSans(
                        fontSize: 12,
                        color: AppTheme.warning,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Row(
              children: [
                Text(
                  'Contacts',
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF8899AA),
                    letterSpacing: 0.5,
                  ),
                ),
                const Spacer(),
                // Add Chat button
                GestureDetector(
                  onTap: () {
                    _showAddChatDialog();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.accent.withAlpha(30),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AppTheme.accent.withAlpha(80),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.add, color: AppTheme.accent, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          'Add Chat',
                          style: GoogleFonts.ibmPlexSans(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.accent,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        SliverList(
          delegate: SliverChildBuilderDelegate((context, i) {
            final contact = _contacts[i];
            final pending = _pendingCountFor(contact['id']!);
            return GestureDetector(
              onTap: () => _loadMessagesForContact(contact),
              child: Container(
                margin: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceDark,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: const Color(0xFF3A5068),
                    width: 0.5,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppTheme.primaryLight, AppTheme.accent],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          contact['initials']!,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        contact['name']!,
                        style: GoogleFonts.ibmPlexSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    if (pending > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.warning.withAlpha(30),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '$pending pending',
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppTheme.warning,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    const SizedBox(width: 8),
                    const Icon(
                      Icons.chevron_right,
                      color: Color(0xFF8899AA),
                      size: 18,
                    ),
                  ],
                ),
              ),
            );
          }, childCount: _contacts.length),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 100)),
      ],
    );
  }

  void _showAddChatDialog() {
    final nameController = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
          ),
          child: Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppTheme.surfaceDark,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF3A5068), width: 0.5),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AppTheme.accent.withAlpha(30),
                        borderRadius: BorderRadius.circular(9),
                      ),
                      child: const Icon(
                        Icons.chat_bubble_outline,
                        color: AppTheme.accent,
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'New Chat',
                      style: GoogleFonts.ibmPlexSans(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const Spacer(),
                    GestureDetector(
                      onTap: () => Navigator.of(ctx).pop(),
                      child: const Icon(
                        Icons.close,
                        color: Color(0xFF8899AA),
                        size: 20,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  'Contact Name',
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF8899AA),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: nameController,
                  autofocus: true,
                  style: const TextStyle(color: Colors.white, fontSize: 15),
                  decoration: InputDecoration(
                    hintText: 'Enter name or employee ID',
                    hintStyle: const TextStyle(
                      color: Color(0xFF8899AA),
                      fontSize: 14,
                    ),
                    filled: true,
                    fillColor: AppTheme.surfaceVariantDark,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(
                        color: Color(0xFF3A5068),
                        width: 1,
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(
                        color: Color(0xFF3A5068),
                        width: 1,
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(
                        color: AppTheme.accent,
                        width: 1.5,
                      ),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () {
                      final name = nameController.text.trim();
                      if (name.isNotEmpty) {
                        final initials = name
                            .split(' ')
                            .take(2)
                            .map((w) => w.isNotEmpty ? w[0].toUpperCase() : '')
                            .join();
                        setState(() {
                          _contacts.add({
                            'id':
                                'contact_${DateTime.now().millisecondsSinceEpoch}',
                            'name': name,
                            'initials': initials.isNotEmpty
                                ? initials
                                : name[0].toUpperCase(),
                          });
                        });
                        Navigator.of(ctx).pop();
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accent,
                      foregroundColor: AppTheme.backgroundDark,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: Text(
                      'Start Chat',
                      style: GoogleFonts.ibmPlexSans(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildChatView() {
    final conversation = _currentConversation;

    return Column(
      children: [
        SizedBox(height: MediaQuery.of(context).padding.top + 72),
        Expanded(
          child: _isLoading
              ? const Center(
                  child: CircularProgressIndicator(color: AppTheme.accent),
                )
              : conversation.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: AppTheme.surfaceVariantDark,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(
                          Icons.chat_bubble_outline,
                          color: Color(0xFF8899AA),
                          size: 24,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'No messages yet',
                        style: GoogleFonts.ibmPlexSans(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        'Send the first message',
                        style: GoogleFonts.ibmPlexSans(
                          fontSize: 13,
                          color: const Color(0xFF8899AA),
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  itemCount: conversation.length,
                  itemBuilder: (context, i) {
                    final msg = conversation[i];
                    final isMe = msg.senderId == _currentUserId;
                    return _MessageBubble(message: msg, isMe: isMe);
                  },
                ),
        ),
        _buildInputBar(),
      ],
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        10,
        16,
        MediaQuery.of(context).padding.bottom + 10,
      ),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark,
        border: const Border(
          top: BorderSide(color: Color(0xFF243447), width: 0.5),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: AppTheme.surfaceVariantDark,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFF3A5068), width: 1),
              ),
              child: TextField(
                controller: _inputController,
                style: GoogleFonts.ibmPlexSans(
                  fontSize: 14,
                  color: Colors.white,
                ),
                decoration: InputDecoration(
                  hintText: _isOnline
                      ? 'Type a message…'
                      : 'Type a message (will send when online)',
                  hintStyle: GoogleFonts.ibmPlexSans(
                    fontSize: 13,
                    color: const Color(0xFF8899AA),
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                ),
                maxLines: null,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendMessage(),
              ),
            ),
          ),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: _isSending ? null : _sendMessage,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _isSending
                    ? AppTheme.accent.withAlpha(100)
                    : AppTheme.accent,
                borderRadius: BorderRadius.circular(22),
              ),
              child: _isSending
                  ? const Center(
                      child: SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      ),
                    )
                  : const Icon(Icons.send, color: Colors.white, size: 18),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isMe;

  const _MessageBubble({required this.message, required this.isMe});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: isMe
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryLight, AppTheme.accent],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(
                  message.senderName.isNotEmpty
                      ? message.senderName[0].toUpperCase()
                      : '?',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.72,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isMe
                    ? AppTheme.accent.withAlpha(40)
                    : AppTheme.surfaceVariantDark,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isMe ? 16 : 4),
                  bottomRight: Radius.circular(isMe ? 4 : 16),
                ),
                border: Border.all(
                  color: isMe
                      ? AppTheme.accent.withAlpha(60)
                      : const Color(0xFF3A5068),
                  width: 0.5,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    message.content,
                    style: GoogleFonts.ibmPlexSans(
                      fontSize: 14,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${message.createdAt.hour.toString().padLeft(2, '0')}:${message.createdAt.minute.toString().padLeft(2, '0')}',
                        style: GoogleFonts.ibmPlexSans(
                          fontSize: 10,
                          color: const Color(0xFF8899AA),
                        ),
                      ),
                      if (isMe) ...[
                        const SizedBox(width: 4),
                        Icon(
                          message.syncStatus == 'pending'
                              ? Icons.schedule
                              : message.syncStatus == 'failed'
                              ? Icons.error_outline
                              : Icons.done_all,
                          size: 12,
                          color: message.syncStatus == 'pending'
                              ? AppTheme.warning
                              : message.syncStatus == 'failed'
                              ? AppTheme.error
                              : AppTheme.success,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (isMe) const SizedBox(width: 4),
        ],
      ),
    );
  }
}
