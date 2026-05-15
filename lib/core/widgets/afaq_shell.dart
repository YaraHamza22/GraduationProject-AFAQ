import 'package:flutter/material.dart';

import '../theme/afaq_colors.dart';
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

    return Scaffold(
      backgroundColor: background,
      body: Row(
        children: [
          AfaqSidebar(
            role: widget.role,
            items: widget.items,
            activeId: _activeId,
            width: sidebarWidth,
            onSelect: (item) => setState(() => _activeId = item.id),
            onLogout: () => Navigator.of(context).pop(),
          ),
          Expanded(child: widget.pages[_activeId] ?? widget.pages.values.first),
        ],
      ),
    );
  }
}
