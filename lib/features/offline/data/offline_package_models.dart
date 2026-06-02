import 'dart:convert';

class OfflineDeltaSnapshot {
  const OfflineDeltaSnapshot({
    required this.hasUpdate,
    required this.courseId,
    required this.currentVersion,
    required this.latestVersion,
    this.package,
  });

  final bool hasUpdate;
  final int courseId;
  final String currentVersion;
  final String latestVersion;
  final OfflinePackageInfo? package;

  factory OfflineDeltaSnapshot.fromMap(Map<String, dynamic> map) {
    return OfflineDeltaSnapshot(
      hasUpdate: map['has_update'] == true,
      courseId: _readInt(map['course_id']),
      currentVersion: _readString(map['current_version']),
      latestVersion: _readString(map['latest_version']),
      package: map['package'] is Map<String, dynamic>
          ? OfflinePackageInfo.fromMap(map['package'] as Map<String, dynamic>)
          : null,
    );
  }
}

class OfflinePackageInfo {
  const OfflinePackageInfo({
    required this.id,
    required this.courseId,
    required this.version,
    required this.fileUrl,
    required this.manifest,
    required this.manifestChecksum,
    required this.updatedAt,
  });

  final int id;
  final int courseId;
  final String version;
  final String fileUrl;
  final Map<String, dynamic> manifest;
  final String manifestChecksum;
  final String updatedAt;

  factory OfflinePackageInfo.fromMap(Map<String, dynamic> map) {
    return OfflinePackageInfo(
      id: _readInt(map['id']),
      courseId: _readInt(map['course_id']),
      version: _readString(map['version']),
      fileUrl: _readString(map['file_url']),
      manifest: _readMap(map['manifest']),
      manifestChecksum: _readString(map['manifest_checksum']),
      updatedAt: _readString(map['updated_at']),
    );
  }
}

class OfflineDownloadAccess {
  const OfflineDownloadAccess({
    required this.packageId,
    required this.courseId,
    required this.version,
    required this.manifest,
    required this.fileUrl,
    required this.expiresAt,
  });

  final int packageId;
  final int courseId;
  final String version;
  final Map<String, dynamic> manifest;
  final String fileUrl;
  final String expiresAt;

  factory OfflineDownloadAccess.fromMap(Map<String, dynamic> map) {
    return OfflineDownloadAccess(
      packageId: _readInt(map['package_id']),
      courseId: _readInt(map['course_id']),
      version: _readString(map['version']),
      manifest: _readMap(map['manifest']),
      fileUrl: _readString(map['file_url']),
      expiresAt: _readString(map['expires_at']),
    );
  }
}

class OfflinePackageDownload {
  const OfflinePackageDownload({
    required this.localFilePath,
    required this.manifestPath,
    required this.deviceId,
    required this.version,
  });

  final String localFilePath;
  final String manifestPath;
  final String deviceId;
  final String version;
}

class OfflineSyncLogEntry {
  const OfflineSyncLogEntry({
    required this.action,
    required this.clientEventId,
    required this.deviceId,
    required this.occurredAt,
    this.offlinePackageId,
    this.payload = const <String, dynamic>{},
  });

  final String action;
  final String clientEventId;
  final String deviceId;
  final String occurredAt;
  final int? offlinePackageId;
  final Map<String, dynamic> payload;

  Map<String, dynamic> toMap() {
    return {
      'offline_package_id': offlinePackageId,
      'device_id': deviceId,
      'client_event_id': clientEventId,
      'action': action,
      'payload': payload,
      'occurred_at': occurredAt,
    };
  }
}

Map<String, dynamic> _readMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }
  if (value is String && value.trim().isNotEmpty) {
    final decoded = jsonDecode(value);
    if (decoded is Map<String, dynamic>) return decoded;
    if (decoded is Map) {
      return decoded.map((key, item) => MapEntry(key.toString(), item));
    }
  }
  return <String, dynamic>{};
}

String _readString(dynamic value, {String fallback = ''}) {
  if (value is String && value.trim().isNotEmpty) return value.trim();
  if (value is num) return value.toString();
  return fallback;
}

int _readInt(dynamic value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value) ?? fallback;
  return fallback;
}
