import 'package:flutter/material.dart';

import '../theme/afaq_colors.dart';

class AfaqPanel extends StatelessWidget {
  const AfaqPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(24),
    this.radius = 32,
    this.dark = false,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: dark ? Colors.white.withOpacity(.05) : Colors.white,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: dark ? Colors.white.withOpacity(.10) : AfaqColors.slate300,
        ),
        boxShadow: dark
            ? null
            : [
                BoxShadow(
                  color: AfaqColors.slate900.withOpacity(.05),
                  blurRadius: 24,
                  offset: const Offset(0, 12),
                ),
              ],
      ),
      child: child,
    );
  }
}
