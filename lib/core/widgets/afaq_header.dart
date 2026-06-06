import 'dart:ui';

import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../theme/afaq_colors.dart';
import 'afaq_sidebar.dart';

class AfaqHeader extends StatelessWidget {
  const AfaqHeader({super.key, required this.role});

  final AfaqRole role;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';

    return SafeArea(
      bottom: false,
      minimum: const EdgeInsets.only(top: 8),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
            child: Container(
              height: 64,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: dark ? const Color(0xB3020617) : const Color(0xCCFFFFFF),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: dark
                      ? Colors.white.withValues(alpha: .08)
                      : AfaqColors.slate200.withValues(alpha: .6),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: dark ? .25 : .04),
                    blurRadius: 18,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.local_library_rounded,
                        color: role == AfaqRole.auditor
                            ? (dark ? Colors.white : AfaqColors.slate950)
                            : AfaqColors.primary,
                        size: 22,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        isArabic ? 'Ø¨ÙˆØ§Ø¨Ø© Ø¢ÙØ§Ù‚ Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©' : 'Afaq Portal',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: dark ? Colors.white : AfaqColors.foregroundLight,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      _LanguageToggle(isArabic: isArabic, dark: dark),
                      const SizedBox(width: 12),
                      _ThemeToggle(dark: dark),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LanguageToggle extends StatelessWidget {
  const _LanguageToggle({required this.isArabic, required this.dark});

  final bool isArabic;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    const capsuleWidth = 84.0;
    const capsuleHeight = 36.0;

    return Material(
      color: Colors.transparent,
      child: Container(
        width: capsuleWidth,
        height: capsuleHeight,
        decoration: BoxDecoration(
          color: dark ? Colors.white.withValues(alpha: .04) : AfaqColors.slate100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: dark
                ? Colors.white.withValues(alpha: .06)
                : AfaqColors.slate200.withValues(alpha: .6),
          ),
        ),
        child: Stack(
          children: [
            AnimatedAlign(
              duration: const Duration(milliseconds: 140),
              curve: Curves.easeOutCubic,
              alignment: isArabic ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                width: capsuleWidth / 2 - 2,
                height: capsuleHeight - 4,
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  color: dark ? Colors.white.withValues(alpha: .08) : Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: dark ? .15 : .05),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
              ),
            ),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(10),
                    onTap: isArabic ? () => setAppLocale(const Locale('en')) : null,
                    child: Center(
                      child: Text(
                        'EN',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: isArabic
                              ? (dark ? Colors.white38 : AfaqColors.slate400)
                              : (dark ? Colors.white : AfaqColors.slate900),
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(10),
                    onTap: !isArabic ? () => setAppLocale(const Locale('ar')) : null,
                    child: Center(
                      child: Text(
                        'AR',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: isArabic
                              ? (dark ? Colors.white : AfaqColors.slate900)
                              : (dark ? Colors.white38 : AfaqColors.slate400),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ThemeToggle extends StatefulWidget {
  const _ThemeToggle({required this.dark});

  final bool dark;

  @override
  State<_ThemeToggle> createState() => _ThemeToggleState();
}

class _ThemeToggleState extends State<_ThemeToggle> {
  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          setAppThemeMode(
            widget.dark ? ThemeMode.light : ThemeMode.dark,
          );
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: widget.dark ? Colors.white.withValues(alpha: .04) : AfaqColors.slate100,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: widget.dark
                  ? Colors.white.withValues(alpha: .06)
                  : AfaqColors.slate200.withValues(alpha: .6),
            ),
          ),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 120),
            transitionBuilder: (child, animation) => RotationTransition(
              turns: Tween<double>(begin: .88, end: 1).animate(animation),
              child: FadeTransition(opacity: animation, child: child),
            ),
            child: Icon(
              widget.dark ? Icons.light_mode_rounded : Icons.dark_mode_outlined,
              key: ValueKey(widget.dark),
              size: 18,
              color: widget.dark ? Colors.amber[400] : AfaqColors.slate700,
            ),
          ),
        ),
      ),
    );
  }
}
