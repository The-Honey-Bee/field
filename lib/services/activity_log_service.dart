import 'package:supabase_flutter/supabase_flutter.dart';

import './supabase_service.dart';

/// Service for logging user actions to the activity_log table
class ActivityLogService {
  static ActivityLogService? _instance;
  static ActivityLogService get instance =>
      _instance ??= ActivityLogService._();
  ActivityLogService._();

  SupabaseClient get _client => SupabaseService.instance.client;

  Future<void> log({
    required String userId,
    required String userName,
    required String userRole,
    required String action,
    required String description,
    String entityType = '',
    String entityId = '',
    String status = 'success',
    Map<String, dynamic>? metadata,
  }) async {
    try {
      await _client.from('activity_log').insert({
        'user_id': userId,
        'user_name': userName,
        'user_role': userRole,
        'action': action,
        'entity_type': entityType,
        'entity_id': entityId,
        'description': description,
        'status': status,
        'metadata': metadata ?? {},
      });
    } catch (e) {
      // Silent fail — logging should never break the app
    }
  }
}
