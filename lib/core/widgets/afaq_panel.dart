import 'package:flutter/material.dart';

import '../theme/afaq_colors.dart';

class AfaqPanel extends StatelessWidget {
  const AfaqPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(24),
    this.radius = 32,
    this.dark,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final bool? dark;

  @override
  Widget build(BuildContext context) {
    final resolvedDark = dark ?? Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: resolvedDark ? const Color(0xFF11162A) : Colors.white,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: resolvedDark
              ? Colors.white.withValues(alpha: .10)
              : AfaqColors.slate300,
        ),
        boxShadow: resolvedDark
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: .28),
                  blurRadius: 26,
                  offset: const Offset(0, 14),
                ),
              ]
            : [
                BoxShadow(
                  color: AfaqColors.slate900.withValues(alpha: .05),
                  blurRadius: 24,
                  offset: const Offset(0, 12),
                ),
              ],
      ),
      child: child,
    );
  }
}
