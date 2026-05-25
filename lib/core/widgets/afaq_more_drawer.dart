import 'dart:ui';
import 'package:flutter/material.dart';

import '../theme/afaq_colors.dart';
import 'afaq_sidebar.dart';

class AfaqMoreDrawer extends StatelessWidget {
  const AfaqMoreDrawer({
    super.key,
    required this.role,
    required this.items,
    required this.activeId,
    required this.onSelect,
    this.onLogout,
  });

  final AfaqRole role;
  final List<AfaqNavItem> items;
  final String activeId;
  final ValueChanged<AfaqNavItem> onSelect;
  final VoidCallback? onLogout;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final isAuditor = role == AfaqRole.auditor;

    final primaryColor = isAuditor
        ? (dark ? Colors.white : AfaqColors.slate950)
        : AfaqColors.primaryButton;

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(40)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          decoration: BoxDecoration(
            color: dark ? const Color(0xE6020617) : const Color(0xF2FFFFFF),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(40)),
            border: Border.all(
              color: dark
                  ? Colors.white.withValues(alpha: .08)
                  : AfaqColors.slate200.withValues(alpha: .5),
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Grab Handle
              Container(
                width: 48,
                height: 5,
                decoration: BoxDecoration(
                  color: dark ? Colors.white24 : Colors.black12,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              const SizedBox(height: 24),

              // Title
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'More Actions',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: dark ? Colors.white : AfaqColors.foregroundLight,
                    ),
                  ),
                  if (onLogout != null)
                    _MoreTileButton(
                      label: 'Sign Out',
                      icon: Icons.logout_rounded,
                      color: AfaqColors.accent,
                      onTap: () {
                        Navigator.of(context).pop();
                        onLogout!();
                      },
                    ),
                ],
              ),
              const SizedBox(height: 24),

              // Grid of items
              Flexible(
                child: GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: items.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    crossAxisSpacing: 14,
                    mainAxisSpacing: 14,
                    childAspectRatio: 1.05,
                  ),
                  itemBuilder: (context, index) {
                    final item = items[index];
                    final active = item.id == activeId;

                    return _MoreGridTile(
                      item: item,
                      active: active,
                      activeBgColor: primaryColor.withValues(alpha: .12),
                      activeColor: primaryColor,
                      dark: dark,
                      onTap: () {
                        Navigator.of(context).pop();
                        onSelect(item);
                      },
                    );
                  },
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class _MoreGridTile extends StatefulWidget {
  const _MoreGridTile({
    required this.item,
    required this.active,
    required this.activeBgColor,
    required this.activeColor,
    required this.dark,
    required this.onTap,
  });

  final AfaqNavItem item;
  final bool active;
  final Color activeBgColor;
  final Color activeColor;
  final bool dark;
  final VoidCallback onTap;

  @override
  State<_MoreGridTile> createState() => _MoreGridTileState();
}

class _MoreGridTileState extends State<_MoreGridTile> {
  double _scale = 1.0;

  @override
  Widget build(BuildContext context) {
    final idleColor = widget.dark
        ? Colors.white.withValues(alpha: .55)
        : AfaqColors.slate500;

    return GestureDetector(
      onTapDown: (_) => setState(() => _scale = 0.92),
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
          decoration: BoxDecoration(
            color: widget.active
                ? widget.activeBgColor
                : widget.dark
                ? Colors.white.withValues(alpha: .03)
                : AfaqColors.slate100.withValues(alpha: .8),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: widget.active
                  ? widget.activeColor.withValues(alpha: .3)
                  : widget.dark
                  ? Colors.white.withValues(alpha: .06)
                  : AfaqColors.slate200.withValues(alpha: .8),
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                widget.item.icon,
                color: widget.active ? widget.activeColor : idleColor,
                size: 26,
              ),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  widget.item.label,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: widget.active
                        ? FontWeight.w800
                        : FontWeight.w700,
                    color: widget.active ? widget.activeColor : idleColor,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MoreTileButton extends StatefulWidget {
  const _MoreTileButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  State<_MoreTileButton> createState() => _MoreTileButtonState();
}

class _MoreTileButtonState extends State<_MoreTileButton> {
  double _scale = 1.0;

  @override
  Widget build(BuildContext context) {
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
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: widget.color.withValues(alpha: .12),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: widget.color.withValues(alpha: .2)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(widget.icon, size: 16, color: widget.color),
              const SizedBox(width: 8),
              Text(
                widget.label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: widget.color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
