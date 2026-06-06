import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../features/auth/data/auth_service.dart';
import '../../features/auth/pages/login_page.dart';
import '../theme/afaq_colors.dart';
import 'afaq_bottom_dock.dart';
import 'afaq_header.dart';
import 'afaq_sidebar.dart';

class AfaqShell extends StatefulWidget {
  const AfaqShell({
    super.key,
    required this.role,
    required this.items,
    required this.pages,
    required this.initialId,
  });

  final AfaqRole role;
  final List<AfaqNavItem> items;
  final Map<String, Widget> pages;
  final String initialId;

  @override
  State<AfaqShell> createState() => _AfaqShellState();
}

class _AfaqShellState extends State<AfaqShell> {
  late String _activeId = widget.initialId;
  final AuthService _authService = const AuthService();
  bool _loggingOut = false;

  Future<void> _handleLogout() async {
    if (_loggingOut) return;

    setState(() => _loggingOut = true);

    try {
      await _authService.logout();
    } catch (_) {
      // Even if the API logout fails, return the user to login locally.
    }

    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (route) => false,
    );
  }

  Future<void> _handleAppExit() async {
    final locale = Localizations.localeOf(context).languageCode;
    final shouldExit = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text(locale == 'ar' ? 'Ù…ØºØ§Ø¯Ø±Ø© Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ØŸ' : 'Leave the app?'),
        content: Text(
          locale == 'ar'
              ? 'Ù‡Ù„ ØªØ±ÙŠØ¯ Ø¥ØºÙ„Ø§Ù‚ ØªØ·Ø¨ÙŠÙ‚ Afaq Ø§Ù„Ø¢Ù†ØŸ'
              : 'Do you want to close Afaq now?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(locale == 'ar' ? 'Ø¥Ù„ØºØ§Ø¡' : 'Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(locale == 'ar' ? 'Ø¥ØºÙ„Ø§Ù‚' : 'Exit'),
          ),
        ],
      ),
    );

    if (shouldExit == true) {
      await SystemNavigator.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final sidebarWidth = sidebarWidthForRole(widget.role, width);
    final dark = Theme.of(context).brightness == Brightness.dark;
    final isAuditor = widget.role == AfaqRole.auditor;

    final background = dark
        ? AfaqColors.backgroundDark
        : isAuditor
            ? AfaqColors.auditorBackgroundLight
            : AfaqColors.backgroundLight;

    final isMobile = width < 768;
    final topInset = isMobile ? 118.0 : 104.0;
    final bottomInset = isMobile ? 92.0 : 0.0;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        await _handleAppExit();
      },
      child: Scaffold(
        backgroundColor: background,
        body: isMobile
            ? Stack(
                children: [
                  Positioned.fill(
                    child: Padding(
                      padding: EdgeInsets.only(
                        top: topInset,
                        bottom: bottomInset,
                      ),
                      child: widget.pages[_activeId] ?? widget.pages.values.first,
                    ),
                  ),
                  Positioned(
                    left: 0,
                    right: 0,
                    top: 0,
                    child: AfaqHeader(role: widget.role),
                  ),
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: AfaqBottomDock(
                      role: widget.role,
                      items: widget.items,
                      activeId: _activeId,
                      onSelect: (item) => setState(() => _activeId = item.id),
                      onLogout: _handleLogout,
                    ),
                  ),
                ],
              )
            : Row(
                children: [
                  AfaqSidebar(
                    role: widget.role,
                    items: widget.items,
                    activeId: _activeId,
                    width: sidebarWidth,
                    onSelect: (item) => setState(() => _activeId = item.id),
                    onLogout: _handleLogout,
                  ),
                  Expanded(
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: Padding(
                            padding: EdgeInsets.only(top: topInset),
                            child: widget.pages[_activeId] ?? widget.pages.values.first,
                          ),
                        ),
                        Positioned(
                          left: 0,
                          right: 0,
                          top: 0,
                          child: AfaqHeader(role: widget.role),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
