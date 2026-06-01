import 'dart:ui';
import 'package:flutter/material.dart';

import '../theme/afaq_colors.dart';
import 'afaq_more_drawer.dart';
import 'afaq_sidebar.dart';

class AfaqBottomDock extends StatelessWidget {
  const AfaqBottomDock({
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
    final isRtl = Directionality.of(context) == TextDirection.rtl;

    final primaryColor = isAuditor
        ? (dark ? Colors.white : AfaqColors.slate950)
        : AfaqColors.primaryButton;

    // Define display items for bottom dock (max 5 for phone screen UX)
    final bool useMore = items.length > 4 || onLogout != null;
    final List<AfaqNavItem> displayItems = useMore
        ? items.sublist(0, items.length < 4 ? items.length : 4)
        : items;
    final List<AfaqNavItem> overflowItems = useMore && items.length > 4 ? items.sublist(4) : [];

    // Check if the currently active item is in the overflow drawer
    final bool activeIsOverflow =
        useMore && overflowItems.any((item) => item.id == activeId);

    // Calculate which index is highlighted in the bottom dock list
    int activeIndex = -1;
    if (activeIsOverflow) {
      activeIndex = displayItems.length; // The last slot is the "More" button
    } else {
      activeIndex = displayItems.indexWhere((item) => item.id == activeId);
    }
    if (isRtl && activeIndex >= 0) {
      activeIndex = totalVisualSlots(useMore, displayItems.length) - 1 - activeIndex;
    }

    final double dockHeight = 72.0;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
            child: Container(
              height: dockHeight,
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
                    color: Colors.black.withValues(alpha: dark ? .3 : .06),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final int totalSlots = useMore ? displayItems.length + 1 : displayItems.length;
                  if (totalSlots == 0) return const SizedBox.shrink();

                  final double slotWidth = constraints.maxWidth / totalSlots;

                  return Stack(
                    children: [
                      // Sliding Active Indicator Pill
                      if (activeIndex >= 0 && activeIndex < totalSlots)
                        AnimatedAlign(
                          duration: const Duration(milliseconds: 250),
                          curve: Curves.easeInOutCubic,
                          alignment: Alignment(
                            -1.0 + (activeIndex * (2.0 / (totalSlots - 1))),
                            0.0,
                          ),
                          child: Container(
                            width: slotWidth - 12,
                            height: dockHeight - 16,
                            margin: const EdgeInsets.symmetric(horizontal: 6),
                            decoration: BoxDecoration(
                              color: primaryColor.withValues(alpha: .12),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: primaryColor.withValues(alpha: .22),
                                width: 1.2,
                              ),
                            ),
                          ),
                        ),

                      // Row of Interactive Icons
                      Row(
                        children: [
                          // Primary navigation items
                          ...List.generate(displayItems.length, (index) {
                            final item = displayItems[index];
                            final active =
                                !activeIsOverflow && item.id == activeId;

                            return Expanded(
                              child: _BottomDockTile(
                                item: item,
                                active: active,
                                activeColor: primaryColor,
                                dark: dark,
                                onTap: () => onSelect(item),
                              ),
                            );
                          }),

                          // "More" navigation action tile if needed
                          if (useMore)
                            Expanded(
                              child: _BottomDockTile(
                                item: const AfaqNavItem(
                                  id: 'more',
                                  label: 'More',
                                  icon: Icons.grid_view_rounded,
                                  route: '',
                                ),
                                active: activeIsOverflow,
                                activeColor: primaryColor,
                                dark: dark,
                                onTap: () {
                                  // Open modern glassmorphic action sheet drawer
                                  showModalBottomSheet(
                                    context: context,
                                    backgroundColor: Colors.transparent,
                                    barrierColor: Colors.black.withValues(
                                      alpha: .45,
                                    ),
                                    elevation: 0,
                                    isScrollControlled: true,
                                    builder: (context) => AfaqMoreDrawer(
                                      role: role,
                                      items: overflowItems,
                                      activeId: activeId,
                                      onSelect: onSelect,
                                      onLogout: onLogout,
                                    ),
                                  );
                                },
                              ),
                            ),
                        ],
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  int totalVisualSlots(bool useMore, int displayCount) => useMore ? displayCount + 1 : displayCount;
}

class _BottomDockTile extends StatefulWidget {
  const _BottomDockTile({
    required this.item,
    required this.active,
    required this.activeColor,
    required this.dark,
    required this.onTap,
  });

  final AfaqNavItem item;
  final bool active;
  final Color activeColor;
  final bool dark;
  final VoidCallback onTap;

  @override
  State<_BottomDockTile> createState() => _BottomDockTileState();
}

class _BottomDockTileState extends State<_BottomDockTile> {
  double _scale = 1.0;

  @override
  Widget build(BuildContext context) {
    final idleColor = widget.dark
        ? Colors.white.withValues(alpha: .5)
        : AfaqColors.slate400;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: (_) => setState(() => _scale = 0.88),
      onTapUp: (_) {
        setState(() => _scale = 1.0);
        widget.onTap();
      },
      onTapCancel: () => setState(() => _scale = 1.0),
      child: AnimatedScale(
        scale: _scale,
        duration: const Duration(milliseconds: 100),
        curve: Curves.easeOut,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              widget.item.icon,
              color: widget.active ? widget.activeColor : idleColor,
              size: 24,
            ),
            const SizedBox(height: 5),
            Text(
              widget.item.label
                  .split(' ')
                  .last, // Use last word for tiny screens
              maxLines: 1,
              style: TextStyle(
                fontSize: 10,
                fontWeight: widget.active ? FontWeight.w800 : FontWeight.w600,
                color: widget.active ? widget.activeColor : idleColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
