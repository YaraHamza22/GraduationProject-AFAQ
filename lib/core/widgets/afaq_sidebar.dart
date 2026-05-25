import 'dart:ui';
import 'package:flutter/material.dart';

import '../theme/afaq_colors.dart';

enum AfaqRole { student, instructor, auditor }

class AfaqNavItem {
  const AfaqNavItem({
    required this.id,
    required this.label,
    required this.icon,
    required this.route,
  });

  final String id;
  final String label;
  final IconData icon;
  final String route;
}

double sidebarWidthForRole(AfaqRole role, double width) {
  switch (role) {
    case AfaqRole.student:
      if (width >= 1536) return 304;
      if (width >= 1024) return 272;
      return 88;
    case AfaqRole.auditor:
      if (width >= 1024) return 304;
      return 96;
    case AfaqRole.instructor:
      if (width >= 768) return 272;
      return 96;
  }
}

class AfaqSidebar extends StatelessWidget {
  const AfaqSidebar({
    super.key,
    required this.role,
    required this.items,
    required this.activeId,
    required this.width,
    required this.onSelect,
    this.onLogout,
  });

  final AfaqRole role;
  final List<AfaqNavItem> items;
  final String activeId;
  final double width;
  final ValueChanged<AfaqNavItem> onSelect;
  final VoidCallback? onLogout;

  bool get _expanded => width >= 220;
  bool get _isAuditor => role == AfaqRole.auditor;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;

    final primaryColor = _isAuditor
        ? (dark ? Colors.white : AfaqColors.slate950)
        : AfaqColors.primaryButton;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 0, 16),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: Container(
            width: width - 16, // Accounting for left padding offset
            decoration: BoxDecoration(
              color: dark ? const Color(0xB3020617) : const Color(0xCCFFFFFF),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(
                color: dark
                    ? Colors.white.withValues(alpha: .08)
                    : AfaqColors.slate200.withValues(alpha: .6),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: dark ? .35 : .05),
                  blurRadius: 24,
                  offset: const Offset(4, 8),
                ),
              ],
            ),
            child: SafeArea(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: _expanded ? 14 : 6),
                child: Column(
                  children: [
                    const SizedBox(height: 18),
                    _Brand(
                      expanded: _expanded,
                      auditor: _isAuditor,
                      dark: dark,
                    ),
                    const SizedBox(height: 28),
                    Expanded(
                      child: ListView.separated(
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final item = items[index];
                          return _SidebarButton(
                            item: item,
                            expanded: _expanded,
                            active: item.id == activeId,
                            activeColor: primaryColor,
                            dark: dark,
                            onTap: () => onSelect(item),
                          );
                        },
                      ),
                    ),
                    if (onLogout != null) ...[
                      const Divider(height: 24, indent: 8, endIndent: 8),
                      _SidebarLogoutButton(
                        expanded: _expanded,
                        onTap: onLogout!,
                        dark: dark,
                      ),
                    ],
                    const SizedBox(height: 14),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Brand extends StatelessWidget {
  const _Brand({
    required this.expanded,
    required this.auditor,
    required this.dark,
  });

  final bool expanded;
  final bool auditor;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final iconBg = auditor
        ? (dark ? Colors.white : AfaqColors.slate950)
        : AfaqColors.primaryButton;
    final iconColor = auditor
        ? (dark ? AfaqColors.slate950 : Colors.white)
        : Colors.white;

    // Responsive size to guarantee NO layout overflows on narrow sidebars
    final double size = expanded ? 48.0 : 40.0;

    return Row(
      mainAxisAlignment: expanded
          ? MainAxisAlignment.start
          : MainAxisAlignment.center,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(expanded ? 16 : 12),
            boxShadow: auditor
                ? null
                : [
                    BoxShadow(
                      color: AfaqColors.primaryButton.withValues(alpha: .35),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
          ),
          child: Icon(
            Icons.school_rounded,
            color: iconColor,
            size: expanded ? 24 : 20,
          ),
        ),
        if (expanded) ...[
          const SizedBox(width: 12),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: TextStyle(
                  color: dark ? Colors.white : AfaqColors.foregroundLight,
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                ),
                children: const [
                  TextSpan(text: 'A'),
                  TextSpan(
                    text: 'faq',
                    style: TextStyle(color: AfaqColors.primary),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _SidebarButton extends StatefulWidget {
  const _SidebarButton({
    required this.item,
    required this.expanded,
    required this.active,
    required this.activeColor,
    required this.dark,
    required this.onTap,
  });

  final AfaqNavItem item;
  final bool expanded;
  final bool active;
  final Color activeColor;
  final bool dark;
  final VoidCallback onTap;

  @override
  State<_SidebarButton> createState() => _SidebarButtonState();
}

class _SidebarButtonState extends State<_SidebarButton> {
  double _scale = 1.0;

  @override
  Widget build(BuildContext context) {
    final activeBg = widget.activeColor.withValues(alpha: .12);
    final idleColor = widget.dark
        ? Colors.white.withValues(alpha: .5)
        : AfaqColors.slate500;

    return GestureDetector(
      onTapDown: (_) => setState(() => _scale = 0.95),
      onTapUp: (_) {
        setState(() => _scale = 1.0);
        widget.onTap();
      },
      onTapCancel: () => setState(() => _scale = 1.0),
      child: AnimatedScale(
        scale: _scale,
        duration: const Duration(milliseconds: 100),
        curve: Curves.easeOut,
        child: Container(
          height: 52,
          padding: EdgeInsets.symmetric(horizontal: widget.expanded ? 14 : 0),
          decoration: BoxDecoration(
            color: widget.active ? activeBg : Colors.transparent,
            borderRadius: BorderRadius.circular(18),
            border: widget.active
                ? Border.all(
                    color: widget.activeColor.withValues(alpha: .25),
                    width: 1,
                  )
                : null,
          ),
          child: Row(
            mainAxisAlignment: widget.expanded
                ? MainAxisAlignment.start
                : MainAxisAlignment.center,
            children: [
              Icon(
                widget.item.icon,
                color: widget.active ? widget.activeColor : idleColor,
                size: 22,
              ),
              if (widget.expanded) ...[
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.item.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: widget.active ? widget.activeColor : idleColor,
                      fontWeight: widget.active
                          ? FontWeight.w800
                          : FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _SidebarLogoutButton extends StatefulWidget {
  const _SidebarLogoutButton({
    required this.expanded,
    required this.onTap,
    required this.dark,
  });

  final bool expanded;
  final VoidCallback onTap;
  final bool dark;

  @override
  State<_SidebarLogoutButton> createState() => _SidebarLogoutButtonState();
}

class _SidebarLogoutButtonState extends State<_SidebarLogoutButton> {
  double _scale = 1.0;

  @override
  Widget build(BuildContext context) {
    final color = AfaqColors.accent;

    return GestureDetector(
      onTapDown: (_) => setState(() => _scale = 0.94),
      onTapUp: (_) {
        setState(() => _scale = 1.0);
        widget.onTap();
      },
      onTapCancel: () => setState(() => _scale = 1.0),
      child: AnimatedScale(
        scale: _scale,
        duration: const Duration(milliseconds: 100),
        child: Container(
          height: 48,
          decoration: BoxDecoration(
            color: color.withValues(alpha: .1),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: color.withValues(alpha: .2)),
          ),
          child: Row(
            mainAxisAlignment: widget.expanded
                ? MainAxisAlignment.start
                : MainAxisAlignment.center,
            children: [
              if (widget.expanded) const SizedBox(width: 14),
              Icon(Icons.logout_rounded, color: color, size: 20),
              if (widget.expanded) ...[
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Logout',
                    style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
