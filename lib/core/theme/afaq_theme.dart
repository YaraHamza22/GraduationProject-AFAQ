import 'package:flutter/material.dart';

import 'afaq_colors.dart';

ThemeData afaqLightTheme() {
  return ThemeData(
    brightness: Brightness.light,
    scaffoldBackgroundColor: AfaqColors.backgroundLight,
    fontFamily: 'GeistSans',
    colorScheme: const ColorScheme.light(
      primary: AfaqColors.primaryButton,
      secondary: AfaqColors.secondary,
      surface: Colors.white,
      onSurface: AfaqColors.foregroundLight,
      error: AfaqColors.rose500,
    ),
    textTheme: const TextTheme(
      displayLarge: TextStyle(
        fontSize: 56,
        fontWeight: FontWeight.w900,
        letterSpacing: 0,
      ),
      headlineLarge: TextStyle(
        fontSize: 40,
        fontWeight: FontWeight.w900,
        letterSpacing: 0,
      ),
      headlineMedium: TextStyle(
        fontSize: 32,
        fontWeight: FontWeight.w900,
        letterSpacing: 0,
      ),
      titleLarge: TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
      titleMedium: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
      bodyMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      labelSmall: TextStyle(
        fontSize: 10,
        fontWeight: FontWeight.w900,
        letterSpacing: 2.4,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AfaqColors.primaryButton,
        foregroundColor: Colors.white,
        minimumSize: const Size(120, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
  );
}

ThemeData afaqDarkTheme() {
  return afaqLightTheme().copyWith(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AfaqColors.backgroundDark,
    colorScheme: const ColorScheme.dark(
      primary: AfaqColors.primaryButton,
      secondary: AfaqColors.secondary,
      surface: Color(0x0DFFFFFF),
      onSurface: AfaqColors.foregroundDark,
      error: AfaqColors.rose500,
    ),
  );
}
