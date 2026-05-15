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
      if (width >= 1536) return 288;
      if (width >= 1024) return 256;
      return 64;
    case AfaqRole.auditor:
      if (width >= 1024) return 288;
      return 80;
    case AfaqRole.instructor:
      if (width >= 768) return 256;
      return 80;
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
    final border = dark ? Colors.white.withOpacity(.05) : AfaqColors.borderLight;

    return Container(
      width: width,
      decoration: BoxDecoration(
        color: dark ? AfaqColors.backgroundDark : Colors.white,
        border: BorderDirectional(end: BorderSide(color: border)),
      ),
      child: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: _expanded ? 18 : 10),
          child: Column(
            children: [
              const SizedBox(height: 18),
              _Brand(expanded: _expanded, auditor: _isAuditor, dark: dark),
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
                      auditor: _isAuditor,
                      dark: dark,
                      onTap: () => onSelect(item),
                    );
                  },
                ),
              ),
              IconButton(
                tooltip: 'Logout',
                onPressed: onLogout,
                icon: const Icon(Icons.logout_rounded),
              ),
              const SizedBox(height: 14),
            ],
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

    return Row(
      mainAxisAlignment: expanded ? MainAxisAlignment.start : MainAxisAlignment.center,
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(16),
            boxShadow: auditor
                ? null
                : [
                    BoxShadow(
                      color: AfaqColors.primaryButton.withOpacity(.4),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
          ),
          child: Icon(Icons.school_rounded, color: iconColor),
        ),
        if (expanded) ...[
          const SizedBox(width: 12),
          RichText(
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
        ],
      ],
    );
  }
}

class _SidebarButton extends StatelessWidget {
  const _SidebarButton({
    required this.item,
    required this.expanded,
    required this.active,
    required this.auditor,
    required this.dark,
    required this.onTap,
  });

  final AfaqNavItem item;
  final bool expanded;
  final bool active;
  final bool auditor;
  final bool dark;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final activeBg = auditor
        ? (dark ? Colors.white : AfaqColors.slate950)
        : AfaqColors.primaryButton.withOpacity(.10);
    final activeColor = auditor
        ? (dark ? AfaqColors.slate950 : Colors.white)
        : AfaqColors.primary;
    final idleColor = dark ? Colors.white.withOpacity(.45) : AfaqColors.slate400;

    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        height: 52,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: active ? activeBg : Colors.transparent,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          mainAxisAlignment: expanded ? MainAxisAlignment.start : MainAxisAlignment.center,
          children: [
            Icon(item.icon, color: active ? activeColor : idleColor, size: 23),
            if (expanded) ...[
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  item.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: active ? activeColor : idleColor,
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
