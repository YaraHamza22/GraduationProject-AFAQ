import 'package:flutter/material.dart';

import '../../app/app.dart';
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

    final bool isMobile = width < 768;
    final double topInset = isMobile ? 118 : 104;
    final double bottomInset = isMobile ? 92 : 0;

    return ValueListenableBuilder<Locale>(
      valueListenable: localeNotifier,
      builder: (context, currentLocale, _) {
        final isArabic = currentLocale.languageCode == 'ar';

        return Directionality(
          textDirection: isArabic ? TextDirection.rtl : TextDirection.ltr,
          child: Scaffold(
            backgroundColor: background,
            body: isMobile
                ? Stack(
                    children: [
                      // Scrollable content page with top & bottom margins for floating bars
                      Positioned.fill(
                        child: Padding(
                          padding: EdgeInsets.only(
                            top: topInset,
                            bottom: bottomInset,
                          ),
                          child:
                              widget.pages[_activeId] ??
                              widget.pages.values.first,
                        ),
                      ),

                      // Floating top Glassmorphic Shared Header
                      Positioned(
                        left: 0,
                        right: 0,
                        top: 0,
                        child: AfaqHeader(role: widget.role),
                      ),

                      // Floating bottom Glassmorphic Navigation Dock
                      Positioned(
                        left: 0,
                        right: 0,
                        bottom: 0,
                          child: AfaqBottomDock(
                          role: widget.role,
                          items: widget.items,
                          activeId: _activeId,
                          onSelect: (item) =>
                              setState(() => _activeId = item.id),
                          onLogout: _handleLogout,
                        ),
                      ),
                    ],
                  )
                : Row(
                    children: [
                      // Floating Left Sidebar Dock (or Right Dock in Arabic RTL mode)
                      AfaqSidebar(
                        role: widget.role,
                        items: widget.items,
                        activeId: _activeId,
                        width: sidebarWidth,
                        onSelect: (item) => setState(() => _activeId = item.id),
                        onLogout: _handleLogout,
                      ),

                      // Wide Content Workspace
                      Expanded(
                        child: Stack(
                          children: [
                            // Scrollable content with top margin for floating header
                            Positioned.fill(
                              child: Padding(
                                padding: EdgeInsets.only(top: topInset),
                                child:
                                    widget.pages[_activeId] ??
                                    widget.pages.values.first,
                              ),
                            ),

                            // Floating top Shared Header
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
      },
    );
  }
}
