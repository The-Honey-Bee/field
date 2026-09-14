import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import './activity_log_service.dart';
import './supabase_service.dart';

class DocumentModel {
  final String id;
  final String userId;
  final String userName;
  final String fileName;
  final String filePath;
  final int fileSize;
  final String mimeType;
  final String documentType;
  final String description;
  final String scanText;
  final String publicUrl;
  final DateTime createdAt;

  DocumentModel({
    required this.id,
    required this.userId,
    required this.userName,
    required this.fileName,
    required this.filePath,
    required this.fileSize,
    required this.mimeType,
    required this.documentType,
    required this.description,
    required this.scanText,
    required this.publicUrl,
    required this.createdAt,
  });

  factory DocumentModel.fromJson(Map<String, dynamic> json) {
    return DocumentModel(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? '',
      userName: json['user_name'] ?? '',
      fileName: json['file_name'] ?? '',
      filePath: json['file_path'] ?? '',
      fileSize: json['file_size'] ?? 0,
      mimeType: json['mime_type'] ?? '',
      documentType: json['document_type'] ?? 'general',
      description: json['description'] ?? '',
      scanText: json['scan_text'] ?? '',
      publicUrl: json['public_url'] ?? '',
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }
}

class DocumentScanService {
  static DocumentScanService? _instance;
  static DocumentScanService get instance =>
      _instance ??= DocumentScanService._();
  DocumentScanService._();

  final _picker = ImagePicker();
  SupabaseClient get _client => SupabaseService.instance.client;
  static const String _bucket = 'documents';

  /// Pick image from camera (for scanning documents/receipts/notes)
  Future<XFile?> scanDocument() async {
    try {
      return await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
        preferredCameraDevice: CameraDevice.rear,
      );
    } catch (_) {
      return null;
    }
  }

  /// Pick image from gallery
  Future<XFile?> pickFromGallery() async {
    try {
      return await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );
    } catch (_) {
      return null;
    }
  }

  /// Upload a document/image to Supabase storage and save metadata
  Future<DocumentModel?> uploadDocument({
    required XFile file,
    required String userId,
    required String userName,
    required String userRole,
    String documentType = 'general',
    String description = '',
  }) async {
    try {
      final bytes = await file.readAsBytes();
      final ext = file.name.split('.').last.toLowerCase();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final storagePath = '$userId/${documentType}_$timestamp.$ext';
      final mimeType = _mimeFromExt(ext);

      // Upload to Supabase storage
      await _client.storage
          .from(_bucket)
          .uploadBinary(
            storagePath,
            bytes,
            fileOptions: FileOptions(contentType: mimeType, upsert: false),
          );

      // Generate signed URL (private bucket)
      final signedUrl = await _client.storage
          .from(_bucket)
          .createSignedUrl(storagePath, 3600);

      // Save metadata to documents table
      final response = await _client
          .from('documents')
          .insert({
            'user_id': userId,
            'user_name': userName,
            'file_name': file.name,
            'file_path': storagePath,
            'file_size': bytes.length,
            'mime_type': mimeType,
            'document_type': documentType,
            'description': description,
            'bucket_name': _bucket,
            'public_url': signedUrl,
          })
          .select()
          .single();

      // Log the upload
      await ActivityLogService.instance.log(
        userId: userId,
        userName: userName,
        userRole: userRole,
        action: 'document_uploaded',
        entityType: 'document',
        entityId: response['id'] ?? '',
        description: 'Uploaded $documentType document: ${file.name}',
      );

      return DocumentModel.fromJson(response);
    } catch (e) {
      return null;
    }
  }

  /// Fetch documents for the current user
  Future<List<DocumentModel>> fetchMyDocuments(String userId) async {
    try {
      final response = await _client
          .from('documents')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(50);
      return (response as List).map((e) => DocumentModel.fromJson(e)).toList();
    } catch (_) {
      return [];
    }
  }

  /// Refresh signed URL for a document
  Future<String?> refreshSignedUrl(String filePath) async {
    try {
      return await _client.storage
          .from(_bucket)
          .createSignedUrl(filePath, 3600);
    } catch (_) {
      return null;
    }
  }

  String _mimeFromExt(String ext) {
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      case 'pdf':
        return 'application/pdf';
      case 'heic':
        return 'image/heic';
      case 'heif':
        return 'image/heif';
      default:
        return 'image/jpeg';
    }
  }
}
