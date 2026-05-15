import 'package:flutter/material.dart';

import '../widgets/learning_logo_animation.dart';

class LearningAnimationScreen extends StatelessWidget {
  const LearningAnimationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Container(
          width: double.infinity,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0xFFEFF8F6),
                Color(0xFFFFFBF0),
                Color(0xFFF8FAF9),
              ],
            ),
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final isWide = constraints.maxWidth >= 720;
              final contentWidth = isWide ? 560.0 : constraints.maxWidth;

              return Center(
                child: SizedBox(
                  width: contentWidth,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const LearningLogoAnimation(),
                        const SizedBox(height: 34),
                        Text(
                          'Learn beyond horizons',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.headlineMedium,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'A focused start for every lesson, path, and certificate.',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyLarge,
                        ),
                        const SizedBox(height: 34),
                        FilledButton.icon(
                          onPressed: () {},
                          icon: const Icon(Icons.menu_book_rounded),
                          label: const Text('Start learning'),
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(180, 52),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
