import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static SupabaseService? _instance;
  static SupabaseService get instance => _instance ??= SupabaseService._();

  SupabaseService._();

  static String? _supabaseUrl;
  static String? _supabaseAnonKey;

  // Initialize Supabase - call this in main()
  static Future<void> initialize() async {
    // Load environment variables from assets/env.json
    final envString = await rootBundle.loadString('assets/env.json');
    final Map<String, dynamic> env = json.decode(envString);
    _supabaseUrl = env['SUPABASE_URL'] as String?;
    _supabaseAnonKey = env['SUPABASE_ANON_KEY'] as String?;

    if (_supabaseUrl == null || _supabaseUrl!.isEmpty || _supabaseAnonKey == null || _supabaseAnonKey!.isEmpty) {
      throw Exception('SUPABASE_URL and SUPABASE_ANON_KEY must be defined in env.json');
    }

    await Supabase.initialize(url: _supabaseUrl!, anonKey: _supabaseAnonKey!);
  }

  // Get Supabase client
  SupabaseClient get client => Supabase.instance.client;
}
