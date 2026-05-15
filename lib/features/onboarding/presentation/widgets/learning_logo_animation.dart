import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/constants/app_assets.dart';

class LearningLogoAnimation extends StatefulWidget {
  const LearningLogoAnimation({super.key});

  @override
  State<LearningLogoAnimation> createState() => _LearningLogoAnimationState();
}

class _LearningLogoAnimationState extends State<LearningLogoAnimation>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _intro;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3200),
    )..repeat();

    _intro = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0, .45, curve: Curves.easeOutBack),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'AFAAQ learning logo animation',
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          final wave = math.sin(_controller.value * math.pi * 2);
          final pageTurn = Curves.easeInOut.transform(
            (_controller.value * 1.35) % 1,
          );

          return Transform.translate(
            offset: Offset(0, wave * -8),
            child: Transform.scale(
              scale: .88 + (_intro.value * .12),
              child: SizedBox(
                width: 292,
                height: 292,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Positioned.fill(
                      child: CustomPaint(
                        painter: _LearningAuraPainter(progress: _controller.value),
                      ),
                    ),
                    Positioned(
                      bottom: 26,
                      child: CustomPaint(
                        size: const Size(256, 122),
                        painter: _OpenBookPainter(pageTurn: pageTurn),
                      ),
                    ),
                    Positioned(
                      top: 44,
                      child: Transform.rotate(
                        angle: wave * .035,
                        child: Container(
                          width: 142,
                          height: 142,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(34),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF155E63).withOpacity(.18),
                                blurRadius: 30,
                                offset: const Offset(0, 18),
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(24),
                            child: Image.asset(
                              AppAssets.afaaqLogo,
                              fit: BoxFit.contain,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 114,
                      left: 72,
                      child: _Sparkle(
                        size: 12,
                        opacity: .55 + (wave.abs() * .35),
                      ),
                    ),
                    Positioned(
                      top: 70,
                      right: 58,
                      child: _Sparkle(
                        size: 18,
                        opacity: .45 + ((1 - wave.abs()) * .35),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _Sparkle extends StatelessWidget {
  const _Sparkle({required this.size, required this.opacity});

  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: opacity.clamp(0, 1),
      child: Icon(
        Icons.auto_awesome_rounded,
        color: const Color(0xFFF2B84B),
        size: size,
      ),
    );
  }
}

class _LearningAuraPainter extends CustomPainter {
  const _LearningAuraPainter({required this.progress});

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final pulse = math.sin(progress * math.pi * 2) * .5 + .5;
    final ringPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..color = const Color(0xFF155E63).withOpacity(.08 + pulse * .08);

    canvas.drawCircle(center, 112 + pulse * 10, ringPaint);
    canvas.drawCircle(
      center,
      84 + pulse * 7,
      ringPaint..color = const Color(0xFFF2B84B).withOpacity(.10),
    );
  }

  @override
  bool shouldRepaint(covariant _LearningAuraPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

class _OpenBookPainter extends CustomPainter {
  const _OpenBookPainter({required this.pageTurn});

  final double pageTurn;

  @override
  void paint(Canvas canvas, Size size) {
    final spineX = size.width / 2;
    final topY = 14.0;
    final bottomY = size.height - 16;
    final pageLift = math.sin(pageTurn * math.pi) * 20;

    final shadowPaint = Paint()
      ..color = const Color(0xFF17212B).withOpacity(.12)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 14);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(spineX, size.height - 8),
        width: size.width * .86,
        height: 26,
      ),
      shadowPaint,
    );

    final leftPage = Path()
      ..moveTo(spineX, topY + 8)
      ..cubicTo(spineX - 38, topY - 8, 36, topY, 18, topY + 26)
      ..lineTo(18, bottomY - 5)
      ..cubicTo(50, bottomY - 18, 94, bottomY - 8, spineX, bottomY)
      ..close();

    final rightPage = Path()
      ..moveTo(spineX, topY + 8)
      ..cubicTo(spineX + 38, topY - 8, size.width - 36, topY, size.width - 18, topY + 26)
      ..lineTo(size.width - 18, bottomY - 5)
      ..cubicTo(size.width - 50, bottomY - 18, size.width - 94, bottomY - 8, spineX, bottomY)
      ..close();

    final pagePaint = Paint()..color = Colors.white;
    final edgePaint = Paint()
      ..color = const Color(0xFFE6DCC3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    canvas.drawPath(leftPage, pagePaint);
    canvas.drawPath(rightPage, pagePaint);
    canvas.drawPath(leftPage, edgePaint);
    canvas.drawPath(rightPage, edgePaint);

    final turningPage = Path()
      ..moveTo(spineX + 4, topY + 12)
      ..cubicTo(
        spineX + 38 + pageLift,
        topY - 2,
        size.width - 52 + pageLift,
        topY + 18,
        size.width - 34,
        topY + 36,
      )
      ..lineTo(size.width - 42, bottomY - 12)
      ..cubicTo(
        size.width - 76 + pageLift,
        bottomY - 25,
        spineX + 36,
        bottomY - 10,
        spineX + 4,
        bottomY - 2,
      )
      ..close();

    canvas.drawPath(
      turningPage,
      Paint()..color = const Color(0xFFFFF8E7).withOpacity(.88),
    );
    canvas.drawPath(turningPage, edgePaint);

    final linePaint = Paint()
      ..color = const Color(0xFF155E63).withOpacity(.22)
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;

    for (var i = 0; i < 4; i++) {
      final y = topY + 36 + (i * 14);
      canvas.drawLine(Offset(42, y), Offset(spineX - 22, y + 4), linePaint);
      canvas.drawLine(Offset(spineX + 24, y + 4), Offset(size.width - 44, y), linePaint);
    }

    final spinePaint = Paint()
      ..color = const Color(0xFFF2B84B)
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(spineX, topY + 10), Offset(spineX, bottomY - 2), spinePaint);
  }

  @override
  bool shouldRepaint(covariant _OpenBookPainter oldDelegate) {
    return oldDelegate.pageTurn != pageTurn;
  }
}
