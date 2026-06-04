import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/toast/afaq_toast.dart';
import 'afaq_live_meeting_page.dart';
import '../data/virtual_meet_join_service.dart';

enum VirtualMeetJoinRole { student, auditor }

class RoleVirtualMeetJoinPage extends StatefulWidget {
  const RoleVirtualMeetJoinPage({
    super.key,
    required this.role,
  });

  final VirtualMeetJoinRole role;

  @override
  State<RoleVirtualMeetJoinPage> createState() => _RoleVirtualMeetJoinPageState();
}

class _RoleVirtualMeetJoinPageState extends State<RoleVirtualMeetJoinPage> {
  final _service = const VirtualMeetJoinService();
  final _joinUrlController = TextEditingController();
  final _roomIdController = TextEditingController(text: 'afaaq-live');

  bool _loading = true;
  bool _launching = false;
  String? _error;
  String? _message;
  List<_JoinSession> _sessions = const [];

  bool get _isArabic => Directionality.of(context) == TextDirection.rtl;

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }

  @override
  void dispose() {
    _joinUrlController.dispose();
    _roomIdController.dispose();
    super.dispose();
  }

  Future<void> _loadSessions() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _service.getSessions();
      final payload = response.data ?? const <String, dynamic>{};
      final sessions = _unwrapList(payload)
          .map(_JoinSession.fromMap)
          .where((item) => item.id != 0 && item.status.toLowerCase() == 'published')
          .toList(growable: false)
        ..sort((a, b) => a.startsAt.compareTo(b.startsAt));

      if (!mounted) return;
      setState(() {
        _sessions = sessions;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _sessions = const [];
        _error = error.toString();
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> _unwrapList(Map<String, dynamic> data) {
    final rootData = data['data'];
    if (rootData is List) {
      return rootData.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList(growable: false);
    }
    if (rootData is Map<String, dynamic> && rootData['data'] is List) {
      return (rootData['data'] as List)
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList(growable: false);
    }
    return const [];
  }

  void _showToast(String message, AfaqToastType type) {
    if (!mounted) return;
    AfaqToast.show(context, message: message, type: type);
  }

  Uri? _tryParseUrl(String input) {
    final value = input.trim();
    if (value.isEmpty) return null;
    final normalized = value.startsWith(RegExp(r'https?://', caseSensitive: false))
        ? value
        : 'https://$value';
    return Uri.tryParse(normalized);
  }

  bool _isZoom(Uri uri) => uri.host.toLowerCase().contains('zoom.us');

  bool _isGoogleMeet(Uri uri) => uri.host.toLowerCase().contains('meet.google.com');

  bool _isAfaqLink(Uri uri) {
    final host = uri.host.toLowerCase();
    final path = uri.path.toLowerCase();
    return (host == 'afaaq.com' || host == 'www.afaaq.com' || host == 'localhost') &&
        path.startsWith('/live');
  }

  String _providerFromUri(Uri uri) {
    if (_isZoom(uri)) return 'Zoom';
    if (_isGoogleMeet(uri)) return 'Google Meet';
    if (_isAfaqLink(uri)) return 'Afaq Live';
    return 'Meeting';
  }

  String _extractRoomId(Uri uri) {
    final fromQuery =
        uri.queryParameters['room'] ??
        uri.queryParameters['roomId'] ??
        uri.queryParameters['session'] ??
        uri.queryParameters['sessionId'];
    if (fromQuery != null && fromQuery.trim().isNotEmpty) {
      return fromQuery.trim();
    }

    final segments = uri.pathSegments.where((item) => item.trim().isNotEmpty).toList(growable: false);
    final liveIndex = segments.indexWhere((item) => item.toLowerCase() == 'live');
    if (liveIndex >= 0 && liveIndex + 1 < segments.length) {
      return segments[liveIndex + 1].trim();
    }
    return 'afaaq-live';
  }

  String _afaqShareLink(String roomId) {
    final safeRoomId = roomId.trim().isEmpty ? 'afaaq-live' : roomId.trim();
    return 'https://afaaq.com/live?room=${Uri.encodeComponent(safeRoomId)}';
  }

  Future<void> _copyToClipboard(String value, String label) async {
    await Clipboard.setData(ClipboardData(text: value));
    if (!mounted) return;
    setState(() {
      _message = '$label copied.';
      _error = null;
    });
    _showToast('$label copied.', AfaqToastType.success);
  }

  Future<void> _launchExternalMeeting({
    required Uri uri,
    required String provider,
    required String label,
  }) async {
    if (_launching) return;
    final shouldContinue = await _showExternalNavigationDialog(
      provider: provider,
      href: uri.toString(),
      label: label,
    );
    if (shouldContinue != true) return;

    setState(() => _launching = true);
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!mounted) return;
      if (!launched) {
        throw Exception('Could not open $provider.');
      }
      setState(() {
        _message = '$provider opened outside Afaq.';
        _error = null;
      });
      _showToast('$provider opened.', AfaqToastType.success);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
      _showToast(error.toString(), AfaqToastType.error);
    } finally {
      if (mounted) {
        setState(() => _launching = false);
      }
    }
  }

  Future<void> _openAfaqMeeting({
    required String roomId,
    required String meetingUrl,
    required String title,
  }) async {
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AfaqLiveMeetingPage(
          roomId: roomId,
          meetingUrl: meetingUrl,
          title: title,
          isArabic: _isArabic,
        ),
      ),
    );
  }

  Future<bool?> _showExternalNavigationDialog({
    required String provider,
    required String href,
    required String label,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (context) {
        final theme = Theme.of(context);
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: Text(_isArabic ? 'Ã™ÂÃ˜ÂªÃ˜Â­ $providerÃ˜Å¸' : 'Open $provider?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _isArabic
                    ? 'Ã˜Â£Ã™â€ Ã˜Âª Ã˜Â¹Ã™â€žÃ™â€° Ã™Ë†Ã˜Â´Ã™Æ’ Ã™â€¦Ã˜ÂºÃ˜Â§Ã˜Â¯Ã˜Â±Ã˜Â© Ã˜ÂªÃ˜Â·Ã˜Â¨Ã™Å Ã™â€š Afaq Ã™Ë†Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â© Ã˜Â¥Ã™â€žÃ™â€° $provider Ã™â€¦Ã™â€  Ã˜Â£Ã˜Â¬Ã™â€ž "$label".'
                    : 'You are about to leave Afaq and continue to $provider for "$label".',
              ),
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: .55),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  href,
                  style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(_isArabic ? 'Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡' : 'Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: Text(_isArabic ? 'Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â© Ã˜Â¥Ã™â€žÃ™â€° $provider' : 'Continue to $provider'),
            ),
          ],
        );
      },
    );
  }

  void _joinTypedUrl() {
    final uri = _tryParseUrl(_joinUrlController.text);
    if (uri == null || uri.host.trim().isEmpty) {
      setState(() {
        _error = _isArabic ? 'Ã˜Â£Ã˜Â¯Ã˜Â®Ã™â€ž Ã˜Â±Ã˜Â§Ã˜Â¨Ã˜Â· Ã˜Â§Ã˜Â¬Ã˜ÂªÃ™â€¦Ã˜Â§Ã˜Â¹ Ã˜ÂµÃ˜Â§Ã™â€žÃ˜Â­Ã™â€¹Ã˜Â§.' : 'Please enter a valid join URL.';
        _message = null;
      });
      return;
    }

    if (_isAfaqLink(uri)) {
      final roomId = _extractRoomId(uri);
      final meetingUrl = _afaqShareLink(roomId);
      setState(() {
        _roomIdController.text = roomId;
        _joinUrlController.text = meetingUrl;
        _message = _isArabic ? 'Ã˜ÂªÃ™â€¦ Ã˜ÂªÃ˜Â¬Ã™â€¡Ã™Å Ã˜Â² Ã˜ÂºÃ˜Â±Ã™ÂÃ˜Â© Afaq: $roomId' : 'Afaq room is ready: $roomId';
        _error = null;
      });
      _openAfaqMeeting(
        roomId: roomId,
        meetingUrl: meetingUrl,
        title: _isArabic ? 'Ã˜ÂºÃ˜Â±Ã™ÂÃ˜Â© Afaq Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â±Ã˜Â©' : 'Afaq Live Room',
      );
      return;
    }

    if (_isZoom(uri) || _isGoogleMeet(uri)) {
      _launchExternalMeeting(
        uri: uri,
        provider: _providerFromUri(uri),
        label: _isArabic ? 'Ã˜Â±Ã˜Â§Ã˜Â¨Ã˜Â· Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â¬Ã˜ÂªÃ™â€¦Ã˜Â§Ã˜Â¹' : 'Meeting link',
      );
      return;
    }

    setState(() {
      _error = _isArabic
          ? 'Ã˜Â§Ã™â€žÃ˜Â±Ã™Ë†Ã˜Â§Ã˜Â¨Ã˜Â· Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¯Ã˜Â¹Ã™Ë†Ã™â€¦Ã˜Â© Ã™â€¡Ã™â€ Ã˜Â§ Ã™â€¡Ã™Å  Zoom Ã™Ë† Google Meet Ã™Ë† Afaq Live Ã™ÂÃ™â€šÃ˜Â·.'
          : 'Only Zoom, Google Meet, or Afaq live links are supported here.';
      _message = null;
    });
  }

  String get _roleLabel {
    if (widget.role == VirtualMeetJoinRole.auditor) {
      return _isArabic ? 'Ã˜Â¯Ã˜Â®Ã™Ë†Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹ Ã™â€žÃ™â€žÃ˜Â§Ã˜Â¬Ã˜ÂªÃ™â€¦Ã˜Â§Ã˜Â¹Ã˜Â§Ã˜Âª' : 'Auditor Live Access';
    }
    return _isArabic ? 'Ã˜Â¯Ã˜Â®Ã™Ë†Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â·Ã˜Â§Ã™â€žÃ˜Â¨ Ã™â€žÃ™â€žÃ˜Â§Ã˜Â¬Ã˜ÂªÃ™â€¦Ã˜Â§Ã˜Â¹Ã˜Â§Ã˜Âª' : 'Student Live Access';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final width = MediaQuery.sizeOf(context).width;
    final isWide = width >= 1080;
    final isTablet = width >= 700 && width < 1080;
    final horizontalPadding = width >= 1800
        ? 32.0
        : width >= 1200
        ? 28.0
        : width >= 700
        ? 24.0
        : 16.0;
    final maxContentWidth = width >= 2400 ? 1760.0 : width >= 1600 ? 1480.0 : 1240.0;
    final joinWidth = isWide ? 560.0 : isTablet ? 500.0 : double.infinity;
    final afaqWidth = isWide ? 460.0 : isTablet ? 500.0 : double.infinity;

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(horizontalPadding, 20, horizontalPadding, 120),
      child: Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: math.min(width, maxContentWidth)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHero(theme),
              const SizedBox(height: 24),
              Wrap(
                spacing: 20,
                runSpacing: 20,
                children: [
                  SizedBox(width: joinWidth, child: _buildJoinCard()),
                  SizedBox(width: afaqWidth, child: _buildAfaqCard()),
                ],
              ),
              const SizedBox(height: 24),
              _buildSessionCard(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHero(ThemeData theme) {
    final width = MediaQuery.sizeOf(context).width;
    final titleSize = width < 380
        ? 30.0
        : width < 700
        ? 36.0
        : width < 1400
        ? 44.0
        : 50.0;

    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(width < 700 ? 18 : 24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [Color(0xFFE0F2FE), Color(0xFFEEF2FF), Color(0xFFF8FAFC)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: Colors.white.withValues(alpha: .8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFF0EA5E9).withValues(alpha: .10),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              _roleLabel,
              style: const TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _isArabic ? 'Ã˜Â§Ã™â€žÃ˜Â§Ã™â€ Ã˜Â¶Ã™â€¦Ã˜Â§Ã™â€¦ Ã˜Â¥Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ˜Â¬Ã™â€žÃ˜Â³Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â±Ã˜Â©' : 'Join Live Sessions',
            style: theme.textTheme.headlineMedium?.copyWith(
              fontSize: titleSize,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            _isArabic
                ? 'Ã˜Â£Ã™â€žÃ˜ÂµÃ™â€š Ã˜Â±Ã˜Â§Ã˜Â¨Ã˜Â· Zoom Ã˜Â£Ã™Ë† Google Meet Ã˜Â£Ã™Ë† Afaq Live. Ã˜Â±Ã™Ë†Ã˜Â§Ã˜Â¨Ã˜Â· Afaq Ã˜ÂªÃ™ÂÃ˜ÂªÃ˜Â­ Ã˜Â§Ã™â€žÃ˜Â¢Ã™â€  Ã˜Â¯Ã˜Â§Ã˜Â®Ã™â€ž Ã˜ÂªÃ˜Â¬Ã˜Â±Ã˜Â¨Ã˜Â© Ã˜Â§Ã˜Â¬Ã˜ÂªÃ™â€¦Ã˜Â§Ã˜Â¹ Ã™Æ’Ã˜Â§Ã™â€¦Ã™â€žÃ˜Â© Ã˜Â¯Ã˜Â§Ã˜Â®Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â·Ã˜Â¨Ã™Å Ã™â€š.'
                : 'Paste a Zoom, Google Meet, or Afaq Live URL. Afaq links now open in a full in-app meeting experience.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: const Color(0xFF475569),
              fontWeight: FontWeight.w600,
              height: 1.4,
            ),
          ),
          if (_message != null) ...[
            const SizedBox(height: 16),
            _buildBanner(_message!, const Color(0xFF065F46), const Color(0xFFECFDF5)),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            _buildBanner(_error!, const Color(0xFF9F1239), const Color(0xFFFFF1F2)),
          ],
        ],
      ),
    );
  }

  Widget _buildJoinCard() {
    return _buildCard(
      title: _isArabic ? 'Ã˜Â§Ã™â€žÃ˜Â§Ã™â€ Ã˜Â¶Ã™â€¦Ã˜Â§Ã™â€¦ Ã˜Â¹Ã˜Â¨Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â§Ã˜Â¨Ã˜Â·' : 'Join From URL',
      subtitle: _isArabic
          ? 'Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ™â€šÃ˜Â³Ã™â€¦ Ã™â€žÃ˜Â±Ã™Ë†Ã˜Â§Ã˜Â¨Ã˜Â· Zoom Ã™Ë† Google Meet Ã™Ë†Ã˜Â±Ã™Ë†Ã˜Â§Ã˜Â¨Ã˜Â· Afaq Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â´Ã˜ÂªÃ˜Â±Ã™Æ’Ã˜Â©.'
          : 'Use this for shared Zoom, Google Meet, or Afaq room links.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildField(
            controller: _joinUrlController,
            hint: _isArabic
                ? 'Ã˜Â£Ã™â€žÃ˜ÂµÃ™â€š Ã˜Â±Ã˜Â§Ã˜Â¨Ã˜Â· Zoom Ã˜Â£Ã™Ë† Google Meet Ã˜Â£Ã™Ë† https://afaaq.com/live'
                : 'Paste Zoom, Google Meet, or https://afaaq.com/live link',
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton.icon(
                onPressed: _launching ? null : _joinTypedUrl,
                icon: const Icon(Icons.open_in_new_rounded),
                label: Text(_isArabic ? 'Ã™ÂÃ˜ÂªÃ˜Â­ Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â§Ã˜Â¨Ã˜Â·' : 'Join URL'),
              ),
              OutlinedButton.icon(
                onPressed: () => _copyToClipboard(
                  _joinUrlController.text.trim().isEmpty
                      ? _afaqShareLink(_roomIdController.text)
                      : _joinUrlController.text.trim(),
                  _isArabic ? 'Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â§Ã˜Â¨Ã˜Â·' : 'Join URL',
                ),
                icon: const Icon(Icons.copy_rounded),
                label: Text(_isArabic ? 'Ã™â€ Ã˜Â³Ã˜Â®' : 'Copy'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAfaqCard() {
    final width = MediaQuery.sizeOf(context).width;
    final roomId = _roomIdController.text.trim().isEmpty ? 'afaaq-live' : _roomIdController.text.trim();
    final shareLink = _afaqShareLink(roomId);
    final prepareButton = FilledButton.icon(
      onPressed: () {
        setState(() {
          _joinUrlController.text = shareLink;
          _message = _isArabic ? 'Ã˜ÂªÃ™â€¦ Ã˜ÂªÃ˜Â¬Ã™â€¡Ã™Å Ã˜Â² Ã˜Â±Ã˜Â§Ã˜Â¨Ã˜Â· Ã˜ÂºÃ˜Â±Ã™ÂÃ˜Â© Afaq.' : 'Afaq room link is ready.';
          _error = null;
        });
      },
      style: FilledButton.styleFrom(backgroundColor: const Color(0xFF0891B2)),
      icon: const Icon(Icons.video_camera_front_rounded),
      label: Text(_isArabic ? 'Ã˜ÂªÃ˜Â¬Ã™â€¡Ã™Å Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â§Ã˜Â¨Ã˜Â·' : 'Prepare Link'),
    );
    final openButton = FilledButton.icon(
      onPressed: () => _openAfaqMeeting(
        roomId: roomId,
        meetingUrl: shareLink,
        title: _isArabic ? 'Ã˜ÂºÃ˜Â±Ã™ÂÃ˜Â© Afaq Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â±Ã˜Â©' : 'Afaq Live Room',
      ),
      style: FilledButton.styleFrom(backgroundColor: const Color(0xFF4F46E5)),
      icon: const Icon(Icons.slideshow_rounded),
      label: Text(_isArabic ? 'Ã™ÂÃ˜ÂªÃ˜Â­ Ã˜Â§Ã™â€žÃ˜ÂºÃ˜Â±Ã™ÂÃ˜Â©' : 'Open Room'),
    );
    final copyButton = OutlinedButton.icon(
      onPressed: () => _copyToClipboard(shareLink, _isArabic ? 'Ã˜Â±Ã˜Â§Ã˜Â¨Ã˜Â· Afaq' : 'Afaq live link'),
      icon: const Icon(Icons.copy_rounded),
      label: Text(_isArabic ? 'Ã™â€ Ã˜Â³Ã˜Â® Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â§Ã˜Â¨Ã˜Â·' : 'Copy Link'),
    );

    return _buildCard(
      title: _isArabic ? 'Ã˜ÂºÃ˜Â±Ã™ÂÃ˜Â© Afaq Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â±Ã˜Â©' : 'Afaq Live Room',
      subtitle: _isArabic
          ? 'Ã™Å Ã™â€¦Ã™Æ’Ã™â€ Ã™Æ’ Ã™â€ Ã˜Â³Ã˜Â® Ã˜Â±Ã˜Â§Ã˜Â¨Ã˜Â· Afaq Ã˜Â£Ã™Ë† Ã˜ÂªÃ˜Â¬Ã™â€¡Ã™Å Ã˜Â² Ã˜ÂºÃ˜Â±Ã™ÂÃ˜Â© Ã˜Â³Ã˜Â±Ã™Å Ã˜Â¹Ã˜Â© Ã™â€žÃ™â€žÃ™â€¦Ã˜Â´Ã˜Â§Ã˜Â±Ã™Æ’Ã˜Â©.'
          : 'Generate or copy an Afaq room link without leaving the app.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildField(
            controller: _roomIdController,
            hint: _isArabic ? 'Ã™â€¦Ã˜Â¹Ã˜Â±Ã™â€˜Ã™Â Ã˜Â§Ã™â€žÃ˜ÂºÃ˜Â±Ã™ÂÃ˜Â©' : 'Room ID',
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFECFEFF),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _isArabic ? 'Ã˜Â±Ã˜Â§Ã˜Â¨Ã˜Â· Afaq Ã˜Â§Ã™â€žÃ™â€ Ã˜Â§Ã˜ÂªÃ˜Â¬' : 'Generated Afaq Link',
                  style: const TextStyle(
                    color: Color(0xFF0F766E),
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  shareLink,
                  style: const TextStyle(
                    color: Color(0xFF155E75),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          if (width < 430)
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                prepareButton,
                const SizedBox(height: 10),
                openButton,
                const SizedBox(height: 10),
                copyButton,
              ],
            )
          else
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [prepareButton, openButton, copyButton],
            ),
        ],
      ),
    );
  }

  Widget _buildSessionCard() {
    return _buildCard(
      title: _isArabic ? 'Ã˜Â§Ã™â€žÃ˜Â¬Ã™â€žÃ˜Â³Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã™â€ Ã˜Â´Ã™Ë†Ã˜Â±Ã˜Â©' : 'Published Sessions',
      subtitle: _isArabic
          ? 'Ã˜Â§Ã™â€ Ã˜Â¶Ã™â€¦ Ã™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â±Ã˜Â© Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â¬Ã™â€žÃ˜Â³Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â­Ã˜Â©. Ã˜Â¬Ã™â€žÃ˜Â³Ã˜Â§Ã˜Âª Afaq Ã˜ÂªÃ™ÂÃ˜ÂªÃ˜Â­ Ã˜Â¯Ã˜Â§Ã˜Â®Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â·Ã˜Â¨Ã™Å Ã™â€šÃ˜Å’ Ã˜Â£Ã™â€¦Ã˜Â§ Zoom Ã™Ë† Google Meet Ã™ÂÃ™Å Ã˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã™â€  Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â£Ã™Æ’Ã™Å Ã˜Â¯ Ã˜Â£Ã™Ë†Ã™â€žÃ™â€¹Ã˜Â§.'
          : 'Join directly from available sessions. Afaq sessions open inside the app, while Zoom and Google Meet ask for confirmation first.',
      trailing: IconButton(
        onPressed: _loading ? null : _loadSessions,
        icon: _loading
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.refresh_rounded),
      ),
      child: _loading
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator()),
            )
          : _sessions.isEmpty
          ? _buildEmptyStrip(_isArabic ? 'Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â¬Ã™â€žÃ˜Â³Ã˜Â§Ã˜Âª Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â­Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¢Ã™â€ .' : 'No sessions available right now.')
          : Column(
              children: _sessions.map(_buildSessionTile).toList(growable: false),
            ),
    );
  }

  Widget _buildSessionTile(_JoinSession session) {
    final sessionUri = _tryParseUrl(session.joinUrl);
    final provider = sessionUri == null ? _providerLabel(session.provider) : _providerFromUri(sessionUri);
    final isAfaqSession = sessionUri != null && _isAfaqLink(sessionUri);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .78),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            alignment: WrapAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    session.title,
                    style: const TextStyle(
                      color: Color(0xFF0F172A),
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${_providerLabel(session.provider)} Ã¢â‚¬Â¢ ${session.startsAtLabel}',
                    style: const TextStyle(
                      color: Color(0xFF475569),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (sessionUri != null)
                    FilledButton.icon(
                      onPressed: _launching
                          ? null
                          : () {
                              if (isAfaqSession) {
                                _openAfaqMeeting(
                                  roomId: _extractRoomId(sessionUri),
                                  meetingUrl: sessionUri.toString(),
                                  title: session.title,
                                );
                                return;
                              }
                              _launchExternalMeeting(
                                uri: sessionUri,
                                provider: provider,
                                label: session.title,
                              );
                            },
                      style: FilledButton.styleFrom(backgroundColor: const Color(0xFF4F46E5)),
                      icon: Icon(
                        isAfaqSession ? Icons.video_camera_front_rounded : Icons.open_in_new_rounded,
                        size: 16,
                      ),
                      label: Text(_isArabic ? 'Ã˜Â§Ã™â€ Ã˜Â¶Ã™â€¦' : isAfaqSession ? 'Open Room' : 'Join'),
                    ),
                  OutlinedButton.icon(
                    onPressed: session.joinUrl.trim().isEmpty
                        ? null
                        : () => _copyToClipboard(
                              session.joinUrl,
                              _isArabic ? 'Ã˜Â±Ã˜Â§Ã˜Â¨Ã˜Â· Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â¬Ã˜ÂªÃ™â€¦Ã˜Â§Ã˜Â¹' : '$provider link',
                            ),
                    icon: const Icon(Icons.copy_rounded, size: 16),
                    label: Text(_isArabic ? 'Ã™â€ Ã˜Â³Ã˜Â® Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â§Ã˜Â¨Ã˜Â·' : 'Copy Link'),
                  ),
                ],
              ),
            ],
          ),
          if (session.joinUrl.trim().isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                session.joinUrl,
                style: const TextStyle(
                  color: Color(0xFF475569),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCard({
    required String title,
    required String subtitle,
    required Widget child,
    Widget? trailing,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .84),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white.withValues(alpha: .85)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Color(0xFF0F172A),
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w600,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
              if (trailing != null) trailing,
            ],
          ),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String hint,
    ValueChanged<String>? onChanged,
  }) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      decoration: InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 1.4),
        ),
      ),
    );
  }

  Widget _buildBanner(String text, Color color, Color background) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _buildEmptyStrip(String label) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
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

  String _providerLabel(String provider) {
    switch (provider) {
      case 'zoom':
        return 'Zoom';
      case 'google_meet':
        return 'Google Meet';
      default:
        return provider.replaceAll('_', ' ');
    }
  }
}

class _JoinSession {
  const _JoinSession({
    required this.id,
    required this.provider,
    required this.title,
    required this.startsAt,
    required this.status,
    required this.joinUrl,
  });

  final int id;
  final String provider;
  final String title;
  final String startsAt;
  final String status;
  final String joinUrl;

  String get startsAtLabel {
    final value = startsAt.trim();
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

  factory _JoinSession.fromMap(Map<String, dynamic> map) {
    return _JoinSession(
      id: _toInt(map['id']),
      provider: _toString(map['provider'], fallback: 'provider'),
      title: _toString(map['title'], fallback: 'Session'),
      startsAt: _toString(map['starts_at']),
      status: _toString(map['status'], fallback: 'draft'),
      joinUrl: _toString(map['join_url']),
    );
  }

  static int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }

  static String _toString(dynamic value, {String fallback = ''}) {
    if (value is String) return value.trim().isEmpty ? fallback : value.trim();
    return fallback;
  }
}
