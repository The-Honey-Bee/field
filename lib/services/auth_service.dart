import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import './supabase_service.dart';

/// Provides current user info and role-based helpers throughout the app.
class AuthService {
  static AuthService? _instance;
  static AuthService get instance => _instance ??= AuthService._();
  AuthService._();

  SupabaseClient get _client => SupabaseService.instance.client;

  /// Returns the currently signed-in user, or null.
  User? get currentUser => _client.auth.currentUser;

  /// Returns the role string from user metadata: 'field_staff' | 'supervisor' | 'manager'
  String get currentRole {
    final meta = currentUser?.userMetadata;
    return (meta?['role'] as String?) ?? 'field_staff';
  }

  /// Returns the current user's UUID string, or empty string.
  String get currentUserId => currentUser?.id ?? '';

  /// Returns the current user's display name.
  String get currentUserName {
    final meta = currentUser?.userMetadata;
    return (meta?['full_name'] as String?) ??
        currentUser?.email?.split('@').first ??
        'User';
  }

  /// True if the current user is a supervisor or manager (god's-eye view).
  bool get isManagerOrSupervisor {
    final role = currentRole;
    return role == 'manager' || role == 'supervisor';
  }

  /// True if the current user is a manager.
  bool get isManager => currentRole == 'manager';

  /// True if the current user is a supervisor.
  bool get isSupervisor => currentRole == 'supervisor';

  /// True if the current user is field staff.
  bool get isFieldStaff => currentRole == 'field_staff';

  /// Signs out the current user.
  Future<void> signOut() async {
    try {
      await _client.auth.signOut();
    } catch (e) {
      debugPrint('[AuthService] Sign out error: $e');
    }
  }

  /// Refreshes the session to get the latest metadata.
  Future<void> refreshSession() async {
    try {
      await _client.auth.refreshSession();
    } catch (e) {
      debugPrint('[AuthService] Refresh session error: $e');
    }
  }
}
