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

  List<OfflineManifestFile> get files => OfflineManifestFile.listFromManifest(manifest);

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

  List<OfflineManifestFile> get files => OfflineManifestFile.listFromManifest(manifest);

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
    required this.extractedDirectoryPath,
    required this.deviceId,
    required this.version,
  });

  final String localFilePath;
  final String manifestPath;
  final String extractedDirectoryPath;
  final String deviceId;
  final String version;
}

class OfflineInstalledPackage {
  const OfflineInstalledPackage({
    required this.version,
    required this.packagePath,
    required this.manifestPath,
    required this.extractedDirectoryPath,
    required this.manifest,
  });

  final String version;
  final String packagePath;
  final String manifestPath;
  final String extractedDirectoryPath;
  final Map<String, dynamic> manifest;

  List<OfflineManifestFile> get files => OfflineManifestFile.listFromManifest(manifest);
  OfflineCourseOutline get outline => OfflineCourseOutline.fromManifest(manifest);
}

class OfflineManifestFile {
  const OfflineManifestFile({
    required this.path,
    required this.checksum,
    required this.label,
  });

  final String path;
  final String checksum;
  final String label;

  List<String> get pathSegments => path
      .replaceAll('\\', '/')
      .split('/')
      .where((segment) => segment.trim().isNotEmpty)
      .toList(growable: false);

  String get directoryLabel {
    final segments = pathSegments;
    if (segments.length <= 1) return 'Course files';
    return _titleize(segments[segments.length - 2]);
  }

  String get fileName {
    final normalized = path.replaceAll('\\', '/');
    final segments = normalized.split('/');
    return segments.isEmpty ? path : segments.last;
  }

  String get extension {
    final name = fileName;
    final dotIndex = name.lastIndexOf('.');
    if (dotIndex < 0 || dotIndex == name.length - 1) {
      return '';
    }
    return name.substring(dotIndex + 1).toLowerCase();
  }

  bool get isImage => const {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'}.contains(extension);
  bool get isTextLike => const {'txt', 'json', 'md', 'html', 'htm', 'csv', 'xml'}.contains(extension);

  static List<OfflineManifestFile> listFromManifest(Map<String, dynamic> manifest) {
    final rawFiles = manifest['files'];
    if (rawFiles is! List) return const [];

    return rawFiles
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .map(
          (item) => OfflineManifestFile(
            path: _readString(item['path']),
            checksum: _readString(item['checksum']),
            label: _readString(
              item['label'] ?? item['title'] ?? item['name'],
              fallback: _readString(item['path'], fallback: 'Offline file'),
            ),
          ),
        )
        .where((item) => item.path.isNotEmpty)
        .toList(growable: false);
  }
}

class OfflineCourseOutline {
  const OfflineCourseOutline({
    required this.units,
    required this.totalFiles,
  });

  final List<OfflineCourseUnit> units;
  final int totalFiles;

  bool get isEmpty => units.isEmpty;
  int get totalLessons => units.fold<int>(0, (sum, unit) => sum + unit.lessons.length);

  factory OfflineCourseOutline.fromManifest(Map<String, dynamic> manifest) {
    final files = OfflineManifestFile.listFromManifest(manifest);
    if (files.isEmpty) {
      return const OfflineCourseOutline(units: <OfflineCourseUnit>[], totalFiles: 0);
    }

    final explicitUnits = _parseExplicitUnits(manifest, files);
    if (explicitUnits.isNotEmpty) {
      return OfflineCourseOutline(units: explicitUnits, totalFiles: files.length);
    }

    return _inferOutlineFromFiles(files);
  }

  static List<OfflineCourseUnit> _parseExplicitUnits(
    Map<String, dynamic> manifest,
    List<OfflineManifestFile> files,
  ) {
    final rawUnits = manifest['units'];
    if (rawUnits is! List) return const <OfflineCourseUnit>[];

    final fileByPath = <String, OfflineManifestFile>{
      for (final file in files) file.path.replaceAll('\\', '/'): file,
    };
    final units = <OfflineCourseUnit>[];

    for (var unitIndex = 0; unitIndex < rawUnits.length; unitIndex++) {
      final rawUnit = rawUnits[unitIndex];
      if (rawUnit is! Map) continue;
      final unitMap = Map<String, dynamic>.from(rawUnit);
      final unitTitle = _readString(
        unitMap['title'] ?? unitMap['name'],
        fallback: 'Unit ${unitIndex + 1}',
      );
      final lessons = <OfflineCourseLesson>[];
      final rawLessons = unitMap['lessons'];
      if (rawLessons is List) {
        for (var lessonIndex = 0; lessonIndex < rawLessons.length; lessonIndex++) {
          final rawLesson = rawLessons[lessonIndex];
          if (rawLesson is! Map) continue;
          final lessonMap = Map<String, dynamic>.from(rawLesson);
          final lessonFiles = <OfflineManifestFile>[];
          final rawLessonFiles = lessonMap['files'];
          if (rawLessonFiles is List) {
            for (final rawLessonFile in rawLessonFiles) {
              if (rawLessonFile is String) {
                final file = fileByPath[rawLessonFile.replaceAll('\\', '/')];
                if (file != null) lessonFiles.add(file);
              } else if (rawLessonFile is Map) {
                final filePath = _readString(rawLessonFile['path']);
                final file = fileByPath[filePath.replaceAll('\\', '/')];
                if (file != null) lessonFiles.add(file);
              }
            }
          }
          lessons.add(
            OfflineCourseLesson(
              id: 'unit-$unitIndex-lesson-$lessonIndex',
              title: _readString(
                lessonMap['title'] ?? lessonMap['name'],
                fallback: 'Lesson ${lessonIndex + 1}',
              ),
              subtitle: _readString(lessonMap['description'] ?? lessonMap['summary']),
              files: lessonFiles,
            ),
          );
        }
      }

      if (lessons.isEmpty) {
        final looseFiles = files
            .where((file) => file.pathSegments.isNotEmpty && _titleize(file.pathSegments.first) == unitTitle)
            .toList(growable: false);
        if (looseFiles.isNotEmpty) {
          lessons.add(
            OfflineCourseLesson(
              id: 'unit-$unitIndex-overview',
              title: '$unitTitle Overview',
              subtitle: 'Grouped from the package files.',
              files: looseFiles,
            ),
          );
        }
      }

      units.add(
        OfflineCourseUnit(
          id: 'unit-$unitIndex',
          title: unitTitle,
          lessons: lessons,
        ),
      );
    }

    return units.where((unit) => unit.lessons.isNotEmpty).toList(growable: false);
  }

  static OfflineCourseOutline _inferOutlineFromFiles(List<OfflineManifestFile> files) {
    final unitMap = <String, Map<String, List<OfflineManifestFile>>>{};

    for (final file in files) {
      final segments = file.pathSegments;
      final unitKey = segments.isNotEmpty ? segments.first : 'course-files';
      final lessonKey = segments.length >= 2 ? '${segments.first}/${segments[1]}' : '$unitKey/overview';
      final unitLessons = unitMap.putIfAbsent(unitKey, () => <String, List<OfflineManifestFile>>{});
      unitLessons.putIfAbsent(lessonKey, () => <OfflineManifestFile>[]).add(file);
    }

    final units = <OfflineCourseUnit>[];
    final sortedUnitKeys = unitMap.keys.toList()..sort();
    for (var unitIndex = 0; unitIndex < sortedUnitKeys.length; unitIndex++) {
      final unitKey = sortedUnitKeys[unitIndex];
      final lessonGroups = unitMap[unitKey]!;
      final sortedLessonKeys = lessonGroups.keys.toList()..sort();
      final lessons = <OfflineCourseLesson>[];
      for (var lessonIndex = 0; lessonIndex < sortedLessonKeys.length; lessonIndex++) {
        final lessonKey = sortedLessonKeys[lessonIndex];
        final lessonFiles = lessonGroups[lessonKey]!..sort((a, b) => a.path.compareTo(b.path));
        final segments = lessonKey.split('/');
        final lessonTitle = segments.length > 1
            ? _titleize(segments.last)
            : _titleize(unitKey);
        lessons.add(
          OfflineCourseLesson(
            id: 'unit-$unitIndex-lesson-$lessonIndex',
            title: lessonTitle,
            subtitle: '${lessonFiles.length} offline file${lessonFiles.length == 1 ? '' : 's'}',
            files: List<OfflineManifestFile>.unmodifiable(lessonFiles),
          ),
        );
      }

      units.add(
        OfflineCourseUnit(
          id: 'unit-$unitIndex',
          title: _titleize(unitKey),
          lessons: lessons,
        ),
      );
    }

    return OfflineCourseOutline(
      units: List<OfflineCourseUnit>.unmodifiable(units),
      totalFiles: files.length,
    );
  }
}

class OfflineCourseUnit {
  const OfflineCourseUnit({
    required this.id,
    required this.title,
    required this.lessons,
  });

  final String id;
  final String title;
  final List<OfflineCourseLesson> lessons;
}

class OfflineCourseLesson {
  const OfflineCourseLesson({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.files,
  });

  final String id;
  final String title;
  final String subtitle;
  final List<OfflineManifestFile> files;
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

String _titleize(String value) {
  final normalized = value
      .replaceAll('\\', ' ')
      .replaceAll('/', ' ')
      .replaceAll('-', ' ')
      .replaceAll('_', ' ')
      .trim();
  if (normalized.isEmpty) return 'Untitled';
  return normalized
      .split(RegExp(r'\s+'))
      .where((part) => part.isNotEmpty)
      .map((part) {
        if (part.length == 1) return part.toUpperCase();
        return '${part[0].toUpperCase()}${part.substring(1)}';
      })
      .join(' ');
}
