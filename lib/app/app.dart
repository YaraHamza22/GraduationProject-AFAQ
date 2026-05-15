import 'package:flutter/material.dart';

import '../core/theme/afaq_theme.dart';
import '../features/auth/pages/login_page.dart';

class AfaaqApp extends StatelessWidget {
  const AfaaqApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Afaq',
      debugShowCheckedModeBanner: false,
      theme: afaqLightTheme(),
      darkTheme: afaqDarkTheme(),
      home: const LoginPage(),
    );
  }
}
