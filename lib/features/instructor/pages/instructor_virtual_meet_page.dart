import 'dart:convert';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../app/app.dart';
import '../../../core/websocket/realtime_client.dart';
import '../../../core/toast/afaq_toast.dart';
import '../data/instructor_virtual_meet_service.dart';
import 'instructor_oauth_connect_page.dart';
import 'instructor_page_shared.dart';

class InstructorVirtualMeetPage extends StatefulWidget {
  const InstructorVirtualMeetPage({super.key});

  @override
  State<InstructorVirtualMeetPage> createState() => _InstructorVirtualMeetPageState();
}

class _InstructorVirtualMeetPageState extends State<InstructorVirtualMeetPage> {
  final _service = const InstructorVirtualMeetService();
  final _studioKey = GlobalKey();
  final _realtime = RealtimeClient.instance;

  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _ok;

  List<_MeetCourse> _courses = const [];
  List<_MeetIntegration> _integrations = const [];
  List<_MeetSession> _sessions = const [];

  String _integrationProvider = 'google_meet';
  final _integrationAccountController = TextEditingController();
  final _integrationAccessTokenController = TextEditingController();
  final _integrationRefreshTokenController = TextEditingController();
  final _integrationExpiresAtController = TextEditingController();
  int? _selectedIntegrationId;

  String _oauthProvider = 'zoom';
  final _oauthCodeController = TextEditingController();
  String _oauthUrl = '';

  String _sessionMode = 'provider';
  String _sessionProvider = 'google_meet';
  int? _sessionCourseId;
  int? _sessionIntegrationId;
  final _sessionTitleController = TextEditingController();
  final _sessionDescriptionController = TextEditingController();
  final _sessionStartsAtController = TextEditingController();
  final _sessionEndsAtController = TextEditingController();
  final _sessionJoinUrlController = TextEditingController();
  final _sessionMetadataController = TextEditingController(text: '{}');
  String _sessionStatus = 'draft';
  int? _editingSessionId;

  int? _attendanceSessionId;
  Set<int> _selectedStudentIds = {};
  List<_MeetStudent> _attendanceStudents = const [];
  bool _loadingStudents = false;
  final _attendanceJoinedAtController = TextEditingController();
  final _attendanceLeftAtController = TextEditingController();
  final _attendanceDurationController = TextEditingController();
  StreamSubscription<RealtimeConnectionStatus>? _statusSubscription;
  RealtimeConnectionStatus _realtimeStatus = RealtimeConnectionStatus.disconnected;
  int? _activeStudioSessionId;
  String _studioProvider = 'google_meet';
  String _studioTitle = 'Ready to start a meeting';
  String _studioSubtitle = 'Pick an integration or session to start the instructor meeting studio.';
  String _studioJoinUrl = '';

  static const _providers = <String>['zoom', 'google_meet'];
  static const _statuses = <String>['draft', 'published', 'cancelled'];

  @override
  void initState() {
    super.initState();
    _statusSubscription = _realtime.statusChanges.listen((status) {
      if (!mounted) return;
      setState(() => _realtimeStatus = status);
    });
    _load();
  }

  @override
  void dispose() {
    _statusSubscription?.cancel();
    _integrationAccountController.dispose();
    _integrationAccessTokenController.dispose();
    _integrationRefreshTokenController.dispose();
    _integrationExpiresAtController.dispose();
    _oauthCodeController.dispose();
    _sessionTitleController.dispose();
    _sessionDescriptionController.dispose();
    _sessionStartsAtController.dispose();
    _sessionEndsAtController.dispose();
    _sessionJoinUrlController.dispose();
    _sessionMetadataController.dispose();
    _attendanceJoinedAtController.dispose();
    _attendanceLeftAtController.dispose();
    _attendanceDurationController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final courseResponse = await _service.getCourseChoices();
      var courses = unwrapInstructorList(courseResponse.data)
          .map(_MeetCourse.fromMap)
          .where((item) => item.id != 0)
          .toList(growable: false);
      if (courses.isEmpty) {
        final fallbackResponse = await _service.getCourseChoices(fallback: true);
        courses = unwrapInstructorList(fallbackResponse.data)
            .map(_MeetCourse.fromMap)
            .where((item) => item.id != 0)
            .toList(growable: false);
      }

      final results = await Future.wait([
        _service.getIntegrations(),
        _service.getSessions(),
      ]);

      if (!mounted) return;
      final integrations = unwrapInstructorList(results[0].data)
          .map(_MeetIntegration.fromMap)
          .where((item) => item.id != 0)
          .toList(growable: false);
      final sessions = unwrapInstructorList(results[1].data)
          .map(_MeetSession.fromMap)
          .where((item) => item.id != 0)
          .toList(growable: false)
        ..sort((a, b) => b.startsAt.compareTo(a.startsAt));

      setState(() {
        _courses = courses;
        _integrations = integrations;
        _sessions = sessions;
        _sessionCourseId ??= courses.isEmpty ? null : courses.first.id;
        _attendanceSessionId ??= sessions.isEmpty ? null : sessions.first.id;
        _loading = false;
      });
      _applyAttendanceSession(_attendanceSessionId);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _runBusy(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
      _ok = null;
    });
    try {
      await action();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  void _showToast(String message, AfaqToastType type) {
    if (!mounted) return;
    AfaqToast.show(context, message: message, type: type);
  }

  String? _toIsoOrNull(String value) {
    final text = value.trim();
    if (text.isEmpty) return null;
    final date = DateTime.tryParse(text);
    return date?.toIso8601String();
  }

  String _toLocalInput(String? iso) {
    if (iso == null || iso.trim().isEmpty) return '';
    final date = DateTime.tryParse(iso);
    if (date == null) return '';
    final local = date.toLocal();
    final month = local.month.toString().padLeft(2, '0');
    final day = local.day.toString().padLeft(2, '0');
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '${local.year}-$month-$day $hour:$minute';
  }

  _MeetSession? _sessionById(int? sessionId) {
    if (sessionId == null) return null;
    for (final session in _sessions) {
      if (session.id == sessionId) {
        return session;
      }
    }
    return null;
  }

  String _durationMinutesFromSession(_MeetSession session) {
    final startsAt = DateTime.tryParse(session.startsAt);
    final endsAt = DateTime.tryParse(session.endsAt);
    if (startsAt == null || endsAt == null) return '';
    final minutes = endsAt.difference(startsAt).inMinutes;
    return minutes > 0 ? '$minutes' : '';
  }

  Future<void> _applyAttendanceSession(int? sessionId) async {
    final session = _sessionById(sessionId);
    setState(() {
      _attendanceSessionId = sessionId;
      _selectedStudentIds = {};
      _attendanceStudents = const [];
      _attendanceJoinedAtController.text =
          session == null ? '' : _toLocalInput(session.startsAt);
      _attendanceLeftAtController.text =
          session == null ? '' : _toLocalInput(session.endsAt);
      _attendanceDurationController.text =
          session == null ? '' : _durationMinutesFromSession(session);
    });
    if (session == null || session.courseId == 0) return;
    setState(() => _loadingStudents = true);
    try {
      final response = await _service.getSessionStudents(session.id);
      if (!mounted) return;
      final raw = response.data;
      List<dynamic> list = const [];
      if (raw != null) {
        if (raw['data'] is List) {
          list = raw['data'] as List<dynamic>;
        } else if (raw['items'] is List) {
          list = raw['items'] as List<dynamic>;
        } else if (raw is List) {
          list = raw as List<dynamic>;
        }
      }
      final students = list
          .whereType<Map<String, dynamic>>()
          .map(_MeetStudent.fromMap)
          .where((s) => s.id != 0)
          .toList(growable: false);
      if (!mounted) return;
      setState(() => _attendanceStudents = students);
    } catch (_) {
      if (mounted) setState(() => _attendanceStudents = const []);
    } finally {
      if (mounted) setState(() => _loadingStudents = false);
    }
  }

  Future<void> _pickDateTime(TextEditingController controller) async {
    final now = DateTime.now();
    final initial = DateTime.tryParse(controller.text.trim().replaceFirst(' ', 'T')) ?? now;
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(now.year - 2),
      lastDate: DateTime(now.year + 10),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (time == null || !mounted) return;
    final merged = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    final month = merged.month.toString().padLeft(2, '0');
    final day = merged.day.toString().padLeft(2, '0');
    final hour = merged.hour.toString().padLeft(2, '0');
    final minute = merged.minute.toString().padLeft(2, '0');
    setState(() {
      controller.text = '${merged.year}-$month-$day $hour:$minute';
    });
  }

  Map<String, dynamic> _parseMetadata() {
    final raw = _sessionMetadataController.text.trim();
    if (raw.isEmpty) return <String, dynamic>{};
    final decoded = jsonDecode(raw);
    final map = instructorMap(decoded);
    if (map == null) {
      throw const FormatException('Metadata must be a valid JSON object.');
    }
    return map;
  }

  List<_MeetIntegration> get _providerIntegrations => _integrations
      .where((item) => item.provider == _sessionProvider)
      .toList(growable: false);

  Future<void> _createIntegration() async {
    await _runBusy(() async {
      final body = <String, dynamic>{
        'provider': _integrationProvider,
        'is_active': true,
      };
      final account = _integrationAccountController.text.trim();
      final accessToken = _integrationAccessTokenController.text.trim();
      final refreshToken = _integrationRefreshTokenController.text.trim();
      final expiresAt = _toIsoOrNull(_integrationExpiresAtController.text);
      if (account.isNotEmpty) body['external_account_id'] = account;
      if (accessToken.isNotEmpty) body['access_token'] = accessToken;
      if (refreshToken.isNotEmpty) body['refresh_token'] = refreshToken;
      if (expiresAt != null) body['expires_at'] = expiresAt;
      await _service.createIntegration(body: body);
      _resetIntegrationForm();
      await _load();
      if (!mounted) return;
      setState(() => _ok = 'Integration created.');
      _showToast('Integration created.', AfaqToastType.success);
    });
  }

  Future<void> _updateIntegration() async {
    final integrationId = _selectedIntegrationId;
    if (integrationId == null) {
      setState(() => _error = 'Select an integration card first.');
      return;
    }
    await _runBusy(() async {
      final body = <String, dynamic>{
        'provider': _integrationProvider,
        'is_active': true,
      };
      final account = _integrationAccountController.text.trim();
      final accessToken = _integrationAccessTokenController.text.trim();
      final refreshToken = _integrationRefreshTokenController.text.trim();
      final expiresAt = _toIsoOrNull(_integrationExpiresAtController.text);
      if (account.isNotEmpty) body['external_account_id'] = account;
      if (accessToken.isNotEmpty) body['access_token'] = accessToken;
      if (refreshToken.isNotEmpty) body['refresh_token'] = refreshToken;
      if (expiresAt != null) body['expires_at'] = expiresAt;
      await _service.updateIntegration(integrationId: integrationId, body: body);
      await _load();
      if (!mounted) return;
      setState(() => _ok = 'Integration updated.');
      _showToast('Integration updated.', AfaqToastType.success);
    });
  }

  Future<void> _revokeIntegration(int integrationId) async {
    await _runBusy(() async {
      await _service.deleteIntegration(integrationId);
      if (_selectedIntegrationId == integrationId) {
        _resetIntegrationForm();
      }
      await _load();
      if (!mounted) return;
      setState(() => _ok = 'Integration revoked.');
      _showToast('Integration revoked.', AfaqToastType.success);
    });
  }

  Future<void> _generateOauthUrl() async {
    await _runBusy(() async {
      final response = await _service.getOAuthUrl(_oauthProvider);
      final data = unwrapInstructorMap(response.data);
      final url = instructorString(data['authorize_url']);
      if (!mounted) return;
      setState(() {
        _oauthUrl = url;
        _ok = 'OAuth URL loaded.';
      });
      if (url.isNotEmpty) {
        await Clipboard.setData(ClipboardData(text: url));
      }
    });
  }

  Future<void> _startOauthFlow() async {
    await _runBusy(() async {
      final response = await _service.getOAuthUrl(_oauthProvider);
      final data = unwrapInstructorMap(response.data);
      final url = instructorString(data['authorize_url']);
      if (url.isEmpty) {
        throw Exception('OAuth URL is missing.');
      }
      if (!mounted) return;
      setState(() {
        _oauthUrl = url;
        _ok = 'OAuth URL loaded.';
      });

      final result = await Navigator.of(context).push<OAuthConnectResult>(
        MaterialPageRoute(
          builder: (_) => InstructorOAuthConnectPage(
            providerLabel: _prettyProvider(_oauthProvider),
            authorizeUrl: url,
          ),
        ),
      );

      if (!mounted || result == null) return;
      if ((result.error ?? '').trim().isNotEmpty) {
        throw Exception(result.error);
      }

      final code = (result.code ?? '').trim();
      if (code.isEmpty) return;

      _oauthCodeController.text = code;
      await _service.exchangeOAuthCode(provider: _oauthProvider, code: code);
      _oauthCodeController.clear();
      await _load();
      if (!mounted) return;
      setState(() => _ok = '${_prettyProvider(_oauthProvider)} connected.');
      _showToast('${_prettyProvider(_oauthProvider)} connected.', AfaqToastType.success);
    });
  }

  Future<void> _exchangeOauthCode() async {
    final code = _oauthCodeController.text.trim();
    if (code.isEmpty) {
      setState(() => _error = 'Authorization code is required.');
      return;
    }
    await _runBusy(() async {
      await _service.exchangeOAuthCode(provider: _oauthProvider, code: code);
      _oauthCodeController.clear();
      await _load();
      if (!mounted) return;
      setState(() => _ok = 'OAuth code exchanged.');
      _showToast('OAuth code exchanged.', AfaqToastType.success);
    });
  }

  Future<void> _createSession() async {
    await _runBusy(() async {
      final title = _sessionTitleController.text.trim();
      final startsAt = _toIsoOrNull(_sessionStartsAtController.text);
      if (title.isEmpty) {
        throw Exception('Title is required.');
      }
      if (startsAt == null) {
        throw Exception('Start time is required.');
      }
      final body = <String, dynamic>{
        'provider': _sessionProvider,
        'title': title,
        'starts_at': startsAt,
        'metadata': _parseMetadata(),
      };
      if (_sessionCourseId != null) body['course_id'] = _sessionCourseId;
      if (_sessionDescriptionController.text.trim().isNotEmpty) {
        body['description'] = _sessionDescriptionController.text.trim();
      }
      final endsAt = _toIsoOrNull(_sessionEndsAtController.text);
      if (endsAt != null) body['ends_at'] = endsAt;
      if (_sessionStatus.trim().isNotEmpty) body['status'] = _sessionStatus;
      if (_sessionMode == 'provider') {
        if (_sessionIntegrationId == null) {
          throw Exception('Select provider integration.');
        }
        body['integration_id'] = _sessionIntegrationId;
      } else {
        final joinUrl = _sessionJoinUrlController.text.trim();
        if (joinUrl.isEmpty) {
          throw Exception('Join URL is required in manual mode.');
        }
        body['join_url'] = joinUrl;
      }
      await _service.createSession(body: body);
      _resetSessionForm();
      await _load();
      if (!mounted) return;
      setState(() => _ok = 'Session created.');
      _showToast('Session created.', AfaqToastType.success);
    });
  }

  Future<void> _updateSession() async {
    final sessionId = _editingSessionId;
    if (sessionId == null) {
      setState(() => _error = 'Select a session card and click edit.');
      return;
    }
    await _runBusy(() async {
      final body = <String, dynamic>{
        'provider': _sessionProvider,
        'title': _sessionTitleController.text.trim(),
        'metadata': _parseMetadata(),
      };
      if (_sessionCourseId != null) body['course_id'] = _sessionCourseId;
      if (_sessionIntegrationId != null) body['integration_id'] = _sessionIntegrationId;
      final startsAt = _toIsoOrNull(_sessionStartsAtController.text);
      final endsAt = _toIsoOrNull(_sessionEndsAtController.text);
      if (startsAt != null) body['starts_at'] = startsAt;
      if (endsAt != null) body['ends_at'] = endsAt;
      if (_sessionDescriptionController.text.trim().isNotEmpty) {
        body['description'] = _sessionDescriptionController.text.trim();
      }
      if (_sessionMode == 'manual' && _sessionJoinUrlController.text.trim().isNotEmpty) {
        body['join_url'] = _sessionJoinUrlController.text.trim();
      }
      if (_sessionStatus.trim().isNotEmpty) body['status'] = _sessionStatus;
      await _service.updateSession(sessionId: sessionId, body: body);
      await _load();
      if (!mounted) return;
      setState(() => _ok = 'Session updated.');
      _showToast('Session updated.', AfaqToastType.success);
    });
  }

  Future<void> _deleteSession(int sessionId) async {
    await _runBusy(() async {
      await _service.deleteSession(sessionId);
      if (_editingSessionId == sessionId) {
        _resetSessionForm();
      }
      await _load();
      if (!mounted) return;
      setState(() => _ok = 'Session deleted.');
      _showToast('Session deleted.', AfaqToastType.success);
    });
  }

  Future<void> _publishSession(int sessionId) async {
    await _runBusy(() async {
      await _service.publishSession(sessionId);
      await _load();
      if (!mounted) return;
      setState(() => _ok = 'Session published.');
      _showToast('Session published.', AfaqToastType.success);
    });
  }

  Future<void> _cancelSession(int sessionId) async {
    await _runBusy(() async {
      await _service.cancelSession(sessionId);
      await _load();
      if (!mounted) return;
      setState(() => _ok = 'Session cancelled.');
      _showToast('Session cancelled.', AfaqToastType.success);
    });
  }

  Future<void> _saveAttendance() async {
    final sessionId = _attendanceSessionId;
    if (sessionId == null) {
      setState(() => _error = 'Choose a session for attendance.');
      return;
    }
    if (_selectedStudentIds.isEmpty) {
      setState(() => _error = 'Select at least one student for attendance.');
      return;
    }
    await _runBusy(() async {
      final joinedAt = _toIsoOrNull(_attendanceJoinedAtController.text);
      final leftAt = _toIsoOrNull(_attendanceLeftAtController.text);
      final duration = int.tryParse(_attendanceDurationController.text.trim());
      final baseBody = <String, dynamic>{};
      if (joinedAt != null) baseBody['joined_at'] = joinedAt;
      if (leftAt != null) baseBody['left_at'] = leftAt;
      if (duration != null) baseBody['duration_minutes'] = duration;
      final count = _selectedStudentIds.length;
      await Future.wait(
        _selectedStudentIds.map((studentId) => _service.saveAttendance(
          sessionId: sessionId,
          body: {...baseBody, 'user_id': studentId},
        )),
      );
      await _applyAttendanceSession(sessionId);
      if (!mounted) return;
      setState(() => _ok = 'Attendance stored for $count student${count > 1 ? 's' : ''}.');
      _showToast('Attendance stored for $count student${count > 1 ? 's' : ''}.', AfaqToastType.success);
    });
  }

  void _resetIntegrationForm() {
    setState(() {
      _selectedIntegrationId = null;
      _integrationProvider = 'google_meet';
      _integrationAccountController.clear();
      _integrationAccessTokenController.clear();
      _integrationRefreshTokenController.clear();
      _integrationExpiresAtController.clear();
    });
  }

  void _resetSessionForm() {
    setState(() {
      _editingSessionId = null;
      _sessionMode = 'provider';
      _sessionProvider = 'google_meet';
      _sessionCourseId = _courses.isEmpty ? null : _courses.first.id;
      _sessionIntegrationId = null;
      _sessionTitleController.clear();
      _sessionDescriptionController.clear();
      _sessionStartsAtController.clear();
      _sessionEndsAtController.clear();
      _sessionJoinUrlController.clear();
      _sessionStatus = 'draft';
      _sessionMetadataController.text = '{}';
    });
  }

  void _loadIntegrationIntoForm(_MeetIntegration integration) {
    setState(() {
      _selectedIntegrationId = integration.id;
      _integrationProvider = integration.provider;
      _integrationAccountController.text = integration.account;
      _integrationAccessTokenController.clear();
      _integrationRefreshTokenController.clear();
      _integrationExpiresAtController.text = _toLocalInput(integration.expiresAt);
    });
  }

  void _useIntegrationForSession(_MeetIntegration integration) {
    setState(() {
      _sessionMode = 'provider';
      _sessionProvider = integration.provider;
      _sessionIntegrationId = integration.id;
      _sessionJoinUrlController.clear();
      _activeStudioSessionId = null;
      _studioProvider = integration.provider;
      _studioTitle = '${_prettyProvider(integration.provider)} studio';
      _studioSubtitle = integration.account.isEmpty
          ? 'Integration #${integration.id} is selected. Finish the session details and create or publish a meeting.'
          : '${integration.account} is selected. Finish the session details and create or publish a meeting.';
      _studioJoinUrl = '';
    });
    _sessionTitleController.text =
        _sessionTitleController.text.trim().isEmpty ? 'Live class with ${_prettyProvider(integration.provider)}' : _sessionTitleController.text;
    _jumpToStudio();
  }

  void _editSession(_MeetSession session) {
    setState(() {
      _editingSessionId = session.id;
      _sessionMode = session.integrationId != 0 ? 'provider' : 'manual';
      _sessionProvider = session.provider;
      _sessionCourseId = session.courseId == 0 ? null : session.courseId;
      _sessionIntegrationId = session.integrationId == 0 ? null : session.integrationId;
      _sessionTitleController.text = session.title;
      _sessionDescriptionController.text = session.description;
      _sessionStartsAtController.text = _toLocalInput(session.startsAt);
      _sessionEndsAtController.text = _toLocalInput(session.endsAt);
      _sessionJoinUrlController.text = session.joinUrl;
      _sessionStatus = session.status;
      _sessionMetadataController.text = const JsonEncoder.withIndent('  ').convert(session.metadata);
    });
  }

  Future<void> _activateSessionStudio(_MeetSession session) async {
    setState(() {
      _activeStudioSessionId = session.id;
      _studioProvider = session.provider;
      _studioTitle = session.title;
      _studioSubtitle = session.description.isEmpty
          ? '${_prettyProvider(session.provider)} session is loaded. ${session.status.toUpperCase()} | ${session.startsAtLabel}'
          : session.description;
      _studioJoinUrl = session.joinUrl;
    });
    await _connectMeetingPresence(session.id);
    _jumpToStudio();
  }

  Future<void> _connectMeetingPresence(int sessionId) async {
    try {
      await _realtime.connect();
      _realtime.subscribe('virtual-meet.sessions.$sessionId');
      _realtime.subscribe('virtual-meet.presence');
    } catch (_) {
      // Keep the studio available even if realtime signaling is not reachable.
    }
  }

  void _jumpToStudio() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final context = _studioKey.currentContext;
      if (context != null) {
        Scrollable.ensureVisible(
          context,
          duration: const Duration(milliseconds: 380),
          curve: Curves.easeOutCubic,
          alignment: .05,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;

    return InstructorPageScaffold(
      title: instructorText('meet', lang),
      subtitle: instructorText('meet_subtitle', lang),
      onRefresh: _load,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null && _courses.isEmpty && _integrations.isEmpty && _sessions.isEmpty
              ? InstructorErrorPanel(message: _error!, onRetry: _load)
              : Container(
                  key: _studioKey,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [
                        Color(0xFFE6F0FF),
                        Color(0xFFF8FAFC),
                        Color(0xFFEEF2FF),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(32),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: .07),
                        blurRadius: 30,
                        offset: const Offset(0, 16),
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildStudioHeader(),
                      if (_ok != null || _error != null) ...[
                        const SizedBox(height: 16),
                        _buildNotice(),
                      ],
                      const SizedBox(height: 20),
                      LayoutBuilder(
                        builder: (context, constraints) {
                          final wide = constraints.maxWidth >= 1180;
                          final medium = constraints.maxWidth >= 820;
                          return Column(
                            children: [
                              _buildLiveStageCard(medium: medium),
                              const SizedBox(height: 16),
                              if (wide)
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(child: _buildIntegrationsCard()),
                                    const SizedBox(width: 16),
                                    Expanded(child: _buildOauthCard()),
                                  ],
                                )
                              else
                                Column(
                                  children: [
                                    _buildIntegrationsCard(),
                                    const SizedBox(height: 16),
                                    _buildOauthCard(),
                                  ],
                                ),
                              const SizedBox(height: 16),
                              _buildSessionsCard(medium: medium),
                              const SizedBox(height: 16),
                              _buildAttendanceCard(),
                            ],
                          );
                        },
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildStudioHeader() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .82),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white.withValues(alpha: .72)),
      ),
      padding: const EdgeInsets.all(20),
      child: Wrap(
        spacing: 16,
        runSpacing: 16,
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.end,
        children: [
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0EA5E9).withValues(alpha: .12),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.videocam_rounded, size: 14, color: Color(0xFF0369A1)),
                      SizedBox(width: 6),
                      Text(
                        'Instructor',
                        style: TextStyle(
                          color: Color(0xFF0369A1),
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.1,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Virtual Meet Studio',
                  style: Theme.of(context).textTheme.displaySmall?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF0F172A),
                      ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'No manual ID hunting. Connect integrations, complete OAuth, create sessions, and track attendance from one instructor workspace.',
                  style: TextStyle(
                    color: Color(0xFF475569),
                    fontWeight: FontWeight.w600,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
          FilledButton.icon(
            onPressed: _busy || _loading ? null : _load,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF0F172A),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            icon: _loading
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.refresh_rounded),
            label: const Text('Refresh'),
          ),
        ],
      ),
    );
  }

  Widget _buildLiveStageCard({required bool medium}) {
    _MeetSession? activeSession;
    if (_activeStudioSessionId != null) {
      for (final session in _sessions) {
        if (session.id == _activeStudioSessionId) {
          activeSession = session;
          break;
        }
      }
    }
    final statusLabel = switch (_realtimeStatus) {
      RealtimeConnectionStatus.connected => 'WebSocket live',
      RealtimeConnectionStatus.connecting => 'Connecting',
      RealtimeConnectionStatus.reconnecting => 'Reconnecting',
      RealtimeConnectionStatus.disconnected => 'Offline',
    };

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF09111F), Color(0xFF111B33), Color(0xFF0A0F1D)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .18),
            blurRadius: 28,
            offset: const Offset(0, 18),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 760),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _stagePill(_prettyProvider(_studioProvider), const Color(0xFF60A5FA)),
                        _stagePill(statusLabel, _realtimeStatus == RealtimeConnectionStatus.connected ? const Color(0xFF34D399) : const Color(0xFFF59E0B)),
                        _stagePill('HD Layout', const Color(0xFFA78BFA)),
                        _stagePill('Instructor Control', const Color(0xFF22D3EE)),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      _studioTitle,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _studioSubtitle,
                      style: const TextStyle(
                        color: Color(0xFFC8D1E8),
                        height: 1.45,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  FilledButton.icon(
                    onPressed: _activeStudioSessionId == null
                        ? null
                        : () {
                            final session = activeSession;
                            if (session != null) {
                              _editSession(session);
                              _jumpToStudio();
                            }
                          },
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      foregroundColor: Colors.white,
                    ),
                    icon: const Icon(Icons.video_settings_rounded),
                    label: const Text('Use Session'),
                  ),
                  OutlinedButton.icon(
                    onPressed: _studioJoinUrl.isEmpty
                        ? null
                        : () async {
                            await Clipboard.setData(ClipboardData(text: _studioJoinUrl));
                            _showToast('Join link copied.', AfaqToastType.success);
                          },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: BorderSide(color: Colors.white.withValues(alpha: .22)),
                    ),
                    icon: const Icon(Icons.copy_rounded),
                    label: const Text('Copy Join Link'),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 18),
          if (medium)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(flex: 3, child: _buildPrimaryStageTile(activeSession)),
                const SizedBox(width: 14),
                SizedBox(
                  width: 260,
                  child: Column(
                    children: [
                      _buildSideTile('Camera A', 'Instructor feed', Icons.person_rounded),
                      const SizedBox(height: 12),
                      _buildSideTile('Screen Share', 'Slides or whiteboard', Icons.present_to_all_rounded),
                      const SizedBox(height: 12),
                      _buildSideTile('Audience', 'Live participants', Icons.groups_2_rounded),
                    ],
                  ),
                ),
              ],
            )
          else
            Column(
              children: [
                _buildPrimaryStageTile(activeSession),
                const SizedBox(height: 12),
                _buildSideTile('Camera A', 'Instructor feed', Icons.person_rounded),
                const SizedBox(height: 12),
                _buildSideTile('Screen Share', 'Slides or whiteboard', Icons.present_to_all_rounded),
              ],
            ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _stageControl(Icons.mic_rounded, 'Mic'),
              _stageControl(Icons.videocam_rounded, 'Camera'),
              _stageControl(Icons.screen_share_rounded, 'Share'),
              _stageControl(Icons.graphic_eq_rounded, 'Signal'),
              _stageControl(Icons.high_quality_rounded, 'HD'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNotice() {
    final isError = _error != null;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isError ? const Color(0xFFFFEEF0) : const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isError ? const Color(0xFFFDA4AF) : const Color(0xFF86EFAC),
        ),
      ),
      child: Text(
        _error ?? _ok ?? '',
        style: TextStyle(
          color: isError ? const Color(0xFFB42318) : const Color(0xFF166534),
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }

  Widget _buildStudioCard({
    required String title,
    required String step,
    required Widget child,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .86),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white.withValues(alpha: .72)),
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
            Text(
            '$step) $title',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF0F172A),
                ),
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }

  Widget _buildField({
    required String hint,
    TextEditingController? controller,
    int maxLines = 1,
    Widget? suffixIcon,
    bool readOnly = false,
    VoidCallback? onTap,
    ValueChanged<String>? onChanged,
  }) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      readOnly: readOnly,
      onTap: onTap,
      onChanged: onChanged,
      decoration: InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: Colors.white.withValues(alpha: .82),
        suffixIcon: suffixIcon,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF0EA5E9), width: 1.3),
        ),
      ),
    );
  }

  Widget _buildDropdown<T>({
    required T? value,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?> onChanged,
  }) {
    return DropdownButtonFormField<T>(
      initialValue: value,
      items: items,
      onChanged: onChanged,
      decoration: InputDecoration(
        filled: true,
        fillColor: Colors.white.withValues(alpha: .82),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF0EA5E9), width: 1.3),
        ),
      ),
    );
  }

  Widget _buildIntegrationsCard() {
    return _buildStudioCard(
      title: 'Integrations',
      step: '1',
      child: Column(
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              SizedBox(
                width: 260,
                child: _buildDropdown<String>(
                  value: _integrationProvider,
                  items: _providers
                      .map((item) => DropdownMenuItem<String>(
                            value: item,
                            child: Text(item),
                          ))
                      .toList(growable: false),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => _integrationProvider = value);
                    }
                  },
                ),
              ),
              SizedBox(
                width: 320,
                child: _buildField(
                  hint: 'external account (optional)',
                  controller: _integrationAccountController,
                ),
              ),
              SizedBox(
                width: 320,
                child: _buildField(
                  hint: 'access token (optional)',
                  controller: _integrationAccessTokenController,
                ),
              ),
              SizedBox(
                width: 320,
                child: _buildField(
                  hint: 'refresh token (optional)',
                  controller: _integrationRefreshTokenController,
                ),
              ),
              SizedBox(
                width: 320,
                child: _buildField(
                  hint: 'expires at',
                  controller: _integrationExpiresAtController,
                  readOnly: true,
                  onTap: () => _pickDateTime(_integrationExpiresAtController),
                  suffixIcon: IconButton(
                    onPressed: () => _pickDateTime(_integrationExpiresAtController),
                    icon: const Icon(Icons.schedule_rounded),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton(
                onPressed: _busy ? null : _createIntegration,
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF0891B2)),
                child: const Text('Create'),
              ),
              FilledButton(
                onPressed: _busy || _selectedIntegrationId == null ? null : _updateIntegration,
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFFD97706)),
                child: const Text('Save Changes'),
              ),
              OutlinedButton(
                onPressed: _busy ? null : _resetIntegrationForm,
                child: const Text('Clear'),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (_integrations.isEmpty)
            _buildEmptyStrip('No integrations found.')
          else
            ..._integrations.map(
              (integration) => Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .75),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      alignment: WrapAlignment.spaceBetween,
                      children: [
                        Text(
                          '${integration.provider} #${integration.id}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            OutlinedButton(
                              onPressed: () => _loadIntegrationIntoForm(integration),
                              child: const Text('Edit'),
                            ),
                            FilledButton(
                              onPressed: () => _useIntegrationForSession(integration),
                              style: FilledButton.styleFrom(backgroundColor: const Color(0xFF4F46E5)),
                              child: const Text('Use In Session'),
                            ),
                            FilledButton.icon(
                              onPressed: _busy ? null : () => _revokeIntegration(integration.id),
                              style: FilledButton.styleFrom(backgroundColor: const Color(0xFFE11D48)),
                              icon: const Icon(Icons.delete_outline_rounded, size: 16),
                              label: const Text('Revoke'),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      integration.account.isEmpty ? 'No external account' : integration.account,
                      style: const TextStyle(color: Color(0xFF475569), fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOauthCard() {
    return _buildStudioCard(
      title: 'OAuth',
      step: '2',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 260,
            child: _buildDropdown<String>(
              value: _oauthProvider,
              items: _providers
                  .map((item) => DropdownMenuItem<String>(
                        value: item,
                        child: Text(item),
                      ))
                  .toList(growable: false),
              onChanged: (value) {
                if (value != null) {
                  setState(() => _oauthProvider = value);
                }
              },
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Use the guided connection flow first. The manual code field stays available as a fallback if the provider redirect does not complete inside the app.',
            style: TextStyle(
              color: Color(0xFF475569),
              height: 1.45,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          _buildField(
            hint: 'authorization code',
            controller: _oauthCodeController,
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton.icon(
                onPressed: _busy ? null : _startOauthFlow,
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
                icon: const Icon(Icons.verified_user_rounded, size: 18),
                label: const Text('Connect Now'),
              ),
              FilledButton(
                onPressed: _busy ? null : _generateOauthUrl,
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF4F46E5)),
                child: const Text('Get OAuth URL'),
              ),
              FilledButton(
                onPressed: _busy ? null : _exchangeOauthCode,
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF059669)),
                child: const Text('Exchange Code'),
              ),
            ],
          ),
          if (_oauthUrl.isNotEmpty) ...[
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                color: Colors.white.withValues(alpha: .75),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Authorize URL',
                    style: TextStyle(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _oauthUrl,
                    style: const TextStyle(color: Color(0xFF4338CA), fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: () async {
                      await Clipboard.setData(ClipboardData(text: _oauthUrl));
                      _showToast('OAuth URL copied.', AfaqToastType.success);
                    },
                    icon: const Icon(Icons.copy_rounded, size: 16),
                    label: const Text('Copy URL'),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSessionsCard({required bool medium}) {
    return _buildStudioCard(
      title: 'Sessions',
      step: '3',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              ChoiceChip(
                label: const Text('Provider'),
                selected: _sessionMode == 'provider',
                onSelected: (_) {
                  setState(() {
                    _sessionMode = 'provider';
                    _sessionJoinUrlController.clear();
                  });
                },
              ),
              ChoiceChip(
                label: const Text('Manual Link'),
                selected: _sessionMode == 'manual',
                onSelected: (_) {
                  setState(() {
                    _sessionMode = 'manual';
                    _sessionIntegrationId = null;
                  });
                },
              ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              SizedBox(
                width: medium ? 280 : double.infinity,
                child: _buildDropdown<int?>(
                  value: _sessionCourseId,
                  items: [
                    const DropdownMenuItem<int?>(value: null, child: Text('No course')),
                    ..._courses.map(
                      (item) => DropdownMenuItem<int?>(
                        value: item.id,
                        child: Text(item.title),
                      ),
                    ),
                  ],
                  onChanged: (value) => setState(() => _sessionCourseId = value),
                ),
              ),
              SizedBox(
                width: 220,
                child: _buildDropdown<String>(
                  value: _sessionProvider,
                  items: _providers
                      .map((item) => DropdownMenuItem<String>(
                            value: item,
                            child: Text(item),
                          ))
                      .toList(growable: false),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _sessionProvider = value;
                        _sessionIntegrationId = null;
                      });
                    }
                  },
                ),
              ),
              SizedBox(
                width: medium ? 280 : double.infinity,
                child: _sessionMode == 'provider'
                    ? _buildDropdown<int?>(
                        value: _sessionIntegrationId,
                        items: [
                          const DropdownMenuItem<int?>(value: null, child: Text('Integration')),
                          ..._providerIntegrations.map(
                            (item) => DropdownMenuItem<int?>(
                              value: item.id,
                              child: Text('#${item.id} ${item.provider}'),
                            ),
                          ),
                        ],
                        onChanged: (value) => setState(() => _sessionIntegrationId = value),
                      )
                    : _buildField(
                        hint: 'join url',
                        controller: _sessionJoinUrlController,
                      ),
              ),
              SizedBox(
                width: medium ? 280 : double.infinity,
                child: _buildField(
                  hint: 'title',
                  controller: _sessionTitleController,
                ),
              ),
              SizedBox(
                width: medium ? 240 : double.infinity,
                child: _buildField(
                  hint: 'starts at',
                  controller: _sessionStartsAtController,
                  readOnly: true,
                  onTap: () => _pickDateTime(_sessionStartsAtController),
                  suffixIcon: IconButton(
                    onPressed: () => _pickDateTime(_sessionStartsAtController),
                    icon: const Icon(Icons.schedule_rounded),
                  ),
                ),
              ),
              SizedBox(
                width: medium ? 240 : double.infinity,
                child: _buildField(
                  hint: 'ends at',
                  controller: _sessionEndsAtController,
                  readOnly: true,
                  onTap: () => _pickDateTime(_sessionEndsAtController),
                  suffixIcon: IconButton(
                    onPressed: () => _pickDateTime(_sessionEndsAtController),
                    icon: const Icon(Icons.schedule_rounded),
                  ),
                ),
              ),
              SizedBox(
                width: medium ? 320 : double.infinity,
                child: _buildField(
                  hint: 'description',
                  controller: _sessionDescriptionController,
                ),
              ),
              SizedBox(
                width: 220,
                child: _buildDropdown<String>(
                  value: _sessionStatus,
                  items: _statuses
                      .map((item) => DropdownMenuItem<String>(
                            value: item,
                            child: Text(item),
                          ))
                      .toList(growable: false),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => _sessionStatus = value);
                    }
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildField(
            hint: 'metadata json',
            controller: _sessionMetadataController,
            maxLines: 5,
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton(
                onPressed: _busy ? null : _createSession,
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFFC026D3)),
                child: const Text('Create Session'),
              ),
              FilledButton(
                onPressed: _busy || _editingSessionId == null ? null : _updateSession,
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFFD97706)),
                child: const Text('Save Session'),
              ),
              OutlinedButton(
                onPressed: _busy ? null : _resetSessionForm,
                child: const Text('Clear'),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (_sessions.isEmpty)
            _buildEmptyStrip('No sessions scheduled.')
          else
            ..._sessions.map(
              (session) => Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .75),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      alignment: WrapAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${session.title} #${session.id}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${session.provider} | ${session.status} | ${session.startsAtLabel}',
                              style: const TextStyle(color: Color(0xFF475569), fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            OutlinedButton(
                              onPressed: () => _editSession(session),
                              child: const Text('Edit'),
                            ),
                            FilledButton(
                              onPressed: _busy ? null : () => _activateSessionStudio(session),
                              style: FilledButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
                              child: const Text('Use'),
                            ),
                            FilledButton(
                              onPressed: _busy ? null : () => _publishSession(session.id),
                              style: FilledButton.styleFrom(backgroundColor: const Color(0xFF059669)),
                              child: const Text('Publish'),
                            ),
                            FilledButton(
                              onPressed: _busy ? null : () => _cancelSession(session.id),
                              style: FilledButton.styleFrom(backgroundColor: const Color(0xFFD97706)),
                              child: const Text('Cancel'),
                            ),
                            FilledButton(
                              onPressed: _busy ? null : () => _deleteSession(session.id),
                              style: FilledButton.styleFrom(backgroundColor: const Color(0xFFE11D48)),
                              child: const Text('Delete'),
                            ),
                            if (session.joinUrl.isNotEmpty)
                              OutlinedButton.icon(
                                onPressed: () async {
                                  await Clipboard.setData(ClipboardData(text: session.joinUrl));
                                  _showToast('Join URL copied.', AfaqToastType.success);
                                },
                                icon: const Icon(Icons.open_in_new_rounded, size: 16),
                                label: const Text('Copy Join URL'),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAttendanceCard() {
    final allSelected = _attendanceStudents.isNotEmpty &&
        _selectedStudentIds.length == _attendanceStudents.length;

    return _buildStudioCard(
      title: 'Attendance',
      step: '4',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 320,
            child: _buildDropdown<int?>(
              value: _attendanceSessionId,
              items: [
                const DropdownMenuItem<int?>(value: null, child: Text('Select session')),
                ..._sessions.map(
                  (item) => DropdownMenuItem<int?>(
                    value: item.id,
                    child: Text('#${item.id} ${item.title}'),
                  ),
                ),
              ],
              onChanged: (id) => _applyAttendanceSession(id),
            ),
          ),
          if (_attendanceSessionId != null) ...[
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: .75),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _loadingStudents
                              ? 'Loading students…'
                              : _attendanceStudents.isEmpty
                                  ? 'No enrolled students'
                                  : 'Students (${_selectedStudentIds.length}/${_attendanceStudents.length} selected)',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF64748B),
                          ),
                        ),
                        if (_attendanceStudents.isNotEmpty && !_loadingStudents)
                          TextButton(
                            onPressed: () => setState(() {
                              if (allSelected) {
                                _selectedStudentIds = {};
                              } else {
                                _selectedStudentIds = _attendanceStudents.map((s) => s.id).toSet();
                              }
                            }),
                            style: TextButton.styleFrom(
                              foregroundColor: const Color(0xFF059669),
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: Text(
                              allSelected ? 'Deselect all' : 'Select all',
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const Divider(height: 1, color: Color(0xFFE2E8F0)),
                  if (_loadingStudents)
                    const Padding(
                      padding: EdgeInsets.all(14),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (_attendanceStudents.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(14),
                      child: Text(
                        'No enrolled students found.',
                        style: TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
                      ),
                    )
                  else
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxHeight: 200),
                      child: SingleChildScrollView(
                        child: Column(
                          children: _attendanceStudents.map((s) {
                            final checked = _selectedStudentIds.contains(s.id);
                            return InkWell(
                              onTap: () => setState(() {
                                final next = Set<int>.from(_selectedStudentIds);
                                if (checked) next.remove(s.id); else next.add(s.id);
                                _selectedStudentIds = next;
                              }),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                child: Row(
                                  children: [
                                    Checkbox(
                                      value: checked,
                                      activeColor: const Color(0xFF059669),
                                      onChanged: (v) => setState(() {
                                        final next = Set<int>.from(_selectedStudentIds);
                                        if (v == true) next.add(s.id); else next.remove(s.id);
                                        _selectedStudentIds = next;
                                      }),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(s.name, style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                                          Text(s.email, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }).toList(growable: false),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              SizedBox(
                width: 240,
                child: _buildField(
                  hint: 'joined at',
                  controller: _attendanceJoinedAtController,
                  readOnly: true,
                  onTap: () => _pickDateTime(_attendanceJoinedAtController),
                  suffixIcon: IconButton(
                    onPressed: () => _pickDateTime(_attendanceJoinedAtController),
                    icon: const Icon(Icons.schedule_rounded),
                  ),
                ),
              ),
              SizedBox(
                width: 240,
                child: _buildField(
                  hint: 'left at',
                  controller: _attendanceLeftAtController,
                  readOnly: true,
                  onTap: () => _pickDateTime(_attendanceLeftAtController),
                  suffixIcon: IconButton(
                    onPressed: () => _pickDateTime(_attendanceLeftAtController),
                    icon: const Icon(Icons.schedule_rounded),
                  ),
                ),
              ),
              SizedBox(
                width: 180,
                child: _buildField(
                  hint: 'duration min',
                  controller: _attendanceDurationController,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          FilledButton(
            onPressed: _busy ? null : _saveAttendance,
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF059669)),
            child: const Text('Store Attendance'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyStrip(String label) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .6),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Text(
        label,
        textAlign: TextAlign.center,
        style: const TextStyle(
          color: Color(0xFF64748B),
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _buildPrimaryStageTile(_MeetSession? activeSession) {
    return SizedBox(
      height: 320,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          border: Border.all(color: Colors.white.withValues(alpha: .08)),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.radio_button_checked_rounded, color: Color(0xFF22C55E), size: 14),
                SizedBox(width: 8),
                Text(
                  'Live Preview',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: .08),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                activeSession == null ? 'Ready Room' : 'Session #${activeSession.id}',
                style: const TextStyle(
                  color: Color(0xFFD5E2FF),
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const Spacer(),
            Text(
              activeSession?.title ?? _studioTitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.w900,
                height: 1.05,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              activeSession == null
                  ? 'Select an integration or session to prepare the meeting room.'
                : '${activeSession.provider} • ${activeSession.status} • ${activeSession.startsAtLabel}',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xFFBFCAE1),
                fontWeight: FontWeight.w600,
                height: 1.35,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSideTile(String title, String subtitle, IconData icon) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .06),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .10),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: Colors.white),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text(subtitle, style: const TextStyle(color: Color(0xFFB6C1DB), fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _stagePill(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .16),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: .22)),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 12),
      ),
    );
  }

  Widget _stageControl(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .07),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 18),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }

  String _prettyProvider(String provider) {
    switch (provider) {
      case 'google_meet':
        return 'Google Meet';
      case 'zoom':
        return 'Zoom';
      default:
        return provider.replaceAll('_', ' ');
    }
  }

  static String _friendlyMeetDateTime(String raw) {
    final value = raw.trim();
    if (value.isEmpty) return 'No date';
    final parsed = DateTime.tryParse(value);
    if (parsed == null) return value;
    final local = parsed.toLocal();
    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final minute = local.minute.toString().padLeft(2, '0');
    final suffix = local.hour >= 12 ? 'PM' : 'AM';
    return '${months[local.month - 1]} ${local.day}, ${local.year} $hour:$minute $suffix';
  }
}

class _MeetCourse {
  const _MeetCourse({required this.id, required this.title});

  final int id;
  final String title;

  factory _MeetCourse.fromMap(Map<String, dynamic> map) {
    return _MeetCourse(
      id: instructorInt(map['id']),
      title: instructorLocalized(
        map['title_translations'],
        localeNotifier.value.languageCode,
        fallback: instructorString(map['title'], fallback: 'Course'),
      ),
    );
  }
}

class _MeetIntegration {
  const _MeetIntegration({
    required this.id,
    required this.provider,
    required this.account,
    required this.isActive,
    required this.expiresAt,
  });

  final int id;
  final String provider;
  final String account;
  final bool isActive;
  final String expiresAt;

  factory _MeetIntegration.fromMap(Map<String, dynamic> map) {
    return _MeetIntegration(
      id: instructorInt(map['id']),
      provider: instructorString(map['provider'], fallback: 'provider'),
      account: instructorString(map['external_account_id']),
      isActive: instructorInt(map['is_active'], fallback: 1) == 1,
      expiresAt: instructorString(map['expires_at']),
    );
  }
}

class _MeetSession {
  const _MeetSession({
    required this.id,
    required this.courseId,
    required this.integrationId,
    required this.provider,
    required this.title,
    required this.description,
    required this.startsAt,
    required this.endsAt,
    required this.status,
    required this.joinUrl,
    required this.metadata,
  });

  final int id;
  final int courseId;
  final int integrationId;
  final String provider;
  final String title;
  final String description;
  final String startsAt;
  final String endsAt;
  final String status;
  final String joinUrl;
  final Map<String, dynamic> metadata;

  String get startsAtLabel => startsAt.isEmpty ? 'No date' : _InstructorVirtualMeetPageState._friendlyMeetDateTime(startsAt);

  factory _MeetSession.fromMap(Map<String, dynamic> map) {
    return _MeetSession(
      id: instructorInt(map['id']),
      courseId: instructorInt(map['course_id']),
      integrationId: instructorInt(map['integration_id']),
      provider: instructorString(map['provider'], fallback: 'provider'),
      title: instructorString(map['title'], fallback: 'Session'),
      description: instructorString(map['description']),
      startsAt: instructorString(map['starts_at']),
      endsAt: instructorString(map['ends_at']),
      status: instructorString(map['status'], fallback: 'draft'),
      joinUrl: instructorString(map['join_url']),
      metadata: instructorMap(map['metadata']) ?? <String, dynamic>{},
    );
  }
}

class _MeetStudent {
  const _MeetStudent({required this.id, required this.name, required this.email});

  final int id;
  final String name;
  final String email;

  factory _MeetStudent.fromMap(Map<String, dynamic> map) {
    return _MeetStudent(
      id: instructorInt(map['id']),
      name: instructorString(map['name'], fallback: 'Student'),
      email: instructorString(map['email']),
    );
  }
}
