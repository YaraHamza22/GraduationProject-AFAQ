import 'package:flutter/material.dart';

import '../core/theme/afaq_theme.dart';
import '../features/splash/pages/splash_page.dart';

// Global reactive states for theme and language management
final ValueNotifier<ThemeMode> themeNotifier = ValueNotifier(ThemeMode.light);
final ValueNotifier<Locale> localeNotifier = ValueNotifier(const Locale('en'));

class AfaaqApp extends StatelessWidget {
  const AfaaqApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: themeNotifier,
      builder: (context, currentThemeMode, _) {
        return ValueListenableBuilder<Locale>(
          valueListenable: localeNotifier,
          builder: (context, currentLocale, _) {
            return MaterialApp(
              title: 'Afaq',
              debugShowCheckedModeBanner: false,
              theme: afaqLightTheme(),
              darkTheme: afaqDarkTheme(),
              themeMode: currentThemeMode,
              locale: currentLocale,
              home: const SplashPage(),
            );
          },
        );
      },
    );
  }
}
