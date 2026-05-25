import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/session/session_store.dart';
import '../../../core/widgets/afaq_sidebar.dart';
import '../../auth/pages/login_page.dart';
import '../../auditor/pages/auditor_area.dart';
import '../../instructor/pages/instructor_area.dart';
import '../../onboarding/presentation/widgets/learning_logo_animation.dart';
import '../../student/pages/student_area.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    Timer(const Duration(milliseconds: 2600), _openLogin);
  }

  void _openLogin() {
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 650),
        pageBuilder: (_, animation, __) {
          return FadeTransition(
            opacity: animation,
            child: _nextPage(),
          );
        },
      ),
    );
  }

  Widget _nextPage() {
    final session = SessionStore.instance;
    if (!session.isLoggedIn) return const LoginPage();

    return switch (session.role ?? AfaqRole.student) {
      AfaqRole.student => const StudentArea(),
      AfaqRole.instructor => const InstructorArea(),
      AfaqRole.auditor => const AuditorArea(),
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFF8FAFC),
              Color(0xFFEEF2FF),
              Color(0xFFFDF2F8),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const LearningLogoAnimation(),
                  const SizedBox(height: 34),
                  Text(
                    'Afaq',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.displayLarge?.copyWith(height: 1),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Learning starts with a clear path.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                    ),
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
