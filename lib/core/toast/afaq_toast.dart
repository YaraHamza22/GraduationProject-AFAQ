import 'package:flutter/material.dart';

import '../theme/afaq_colors.dart';

enum AfaqToastType { success, error, warning, info }

class AfaqToast {
  const AfaqToast._();

  static void show(
    BuildContext context, {
    required String message,
    AfaqToastType type = AfaqToastType.info,
  }) {
    final palette = _palette(type);
    final messenger = ScaffoldMessenger.of(context);

    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          elevation: 0,
          backgroundColor: Colors.transparent,
          margin: const EdgeInsets.all(18),
          duration: const Duration(milliseconds: 2600),
          content: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: palette.background,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: palette.border),
              boxShadow: [
                BoxShadow(
                  color: AfaqColors.slate950.withValues(alpha: .10),
                  blurRadius: 28,
                  offset: const Offset(0, 14),
                ),
              ],
            ),
            child: Row(
              children: [
                Icon(palette.icon, color: palette.text),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    message,
                    style: TextStyle(
                      color: palette.text,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
  }

  static _ToastPalette _palette(AfaqToastType type) {
    return switch (type) {
      AfaqToastType.success => const _ToastPalette(
          background: Color(0xFFECFDF5),
          border: Color(0xFFA7F3D0),
          text: Color(0xFF047857),
          icon: Icons.check_circle_outline,
        ),
      AfaqToastType.error => const _ToastPalette(
          background: Color(0xFFFFF1F2),
          border: Color(0xFFFDA4AF),
          text: Color(0xFFBE123C),
          icon: Icons.error_outline,
        ),
      AfaqToastType.warning => const _ToastPalette(
          background: Color(0xFFFFFBEB),
          border: Color(0xFFFDE68A),
          text: Color(0xFFB45309),
          icon: Icons.warning_amber_rounded,
        ),
      AfaqToastType.info => const _ToastPalette(
          background: Color(0xFFEEF2FF),
          border: Color(0xFFC7D2FE),
          text: Color(0xFF4338CA),
          icon: Icons.info_outline,
        ),
    };
  }
}

class _ToastPalette {
  const _ToastPalette({
    required this.background,
    required this.border,
    required this.text,
    required this.icon,
  });

  final Color background;
  final Color border;
  final Color text;
  final IconData icon;
}
