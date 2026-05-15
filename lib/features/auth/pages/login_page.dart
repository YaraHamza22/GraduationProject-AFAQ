import 'package:flutter/material.dart';

import '../../../core/constants/app_assets.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../../../core/widgets/afaq_sidebar.dart';
import '../../auditor/pages/auditor_area.dart';
import '../../instructor/pages/instructor_area.dart';
import '../../student/pages/student_area.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  AfaqRole _role = AfaqRole.student;

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final wide = size.width >= 860;

    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFF8FAFC), Color(0xFFEEF2FF), Color(0xFFFDF2F8)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1100),
                child: Flex(
                  direction: wide ? Axis.horizontal : Axis.vertical,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      flex: wide ? 1 : 0,
                      child: _LoginHero(wide: wide),
                    ),
                    SizedBox(width: wide ? 40 : 0, height: wide ? 0 : 28),
                    Expanded(
                      flex: wide ? 1 : 0,
                      child: AfaqPanel(
                        radius: 34,
                        padding: const EdgeInsets.all(28),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Welcome back',
                              style: Theme.of(context).textTheme.headlineMedium,
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Choose your workspace and continue to Afaq.',
                              style: TextStyle(
                                color: AfaqColors.slate500,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 24),
                            _RoleSelector(
                              selected: _role,
                              onChanged: (role) => setState(() => _role = role),
                            ),
                            const SizedBox(height: 20),
                            TextField(
                              decoration: _inputDecoration('Email', Icons.mail_outline),
                            ),
                            const SizedBox(height: 14),
                            TextField(
                              obscureText: true,
                              decoration: _inputDecoration('Password', Icons.lock_outline),
                            ),
                            const SizedBox(height: 24),
                            FilledButton.icon(
                              onPressed: _enterWorkspace,
                              icon: const Icon(Icons.login_rounded),
                              label: const Text('Enter workspace'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon),
      filled: true,
      fillColor: AfaqColors.slate100,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AfaqColors.slate200),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AfaqColors.slate200),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AfaqColors.primary, width: 1.4),
      ),
    );
  }

  void _enterWorkspace() {
    final page = switch (_role) {
      AfaqRole.student => const StudentArea(),
      AfaqRole.instructor => const InstructorArea(),
      AfaqRole.auditor => const AuditorArea(),
    };

    Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
  }
}

class _LoginHero extends StatelessWidget {
  const _LoginHero({required this.wide});

  final bool wide;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: wide ? CrossAxisAlignment.start : CrossAxisAlignment.center,
      children: [
        Container(
          width: 104,
          height: 104,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: AfaqColors.primaryButton.withOpacity(.18),
                blurRadius: 34,
                offset: const Offset(0, 18),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Image.asset(AppAssets.afaaqLogo, fit: BoxFit.contain),
          ),
        ),
        const SizedBox(height: 28),
        Text(
          'Afaq learning command center',
          textAlign: wide ? TextAlign.start : TextAlign.center,
          style: Theme.of(context).textTheme.displayLarge?.copyWith(
                fontSize: wide ? 52 : 38,
                height: 1,
              ),
        ),
        const SizedBox(height: 18),
        Text(
          'Students, instructors, and auditors share one precise experience with role-specific dashboards.',
          textAlign: wide ? TextAlign.start : TextAlign.center,
          style: const TextStyle(
            color: AfaqColors.slate600,
            fontSize: 17,
            height: 1.45,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _RoleSelector extends StatelessWidget {
  const _RoleSelector({required this.selected, required this.onChanged});

  final AfaqRole selected;
  final ValueChanged<AfaqRole> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<AfaqRole>(
      segments: const [
        ButtonSegment(
          value: AfaqRole.student,
          icon: Icon(Icons.school_outlined),
          label: Text('Student'),
        ),
        ButtonSegment(
          value: AfaqRole.instructor,
          icon: Icon(Icons.co_present_outlined),
          label: Text('Instructor'),
        ),
        ButtonSegment(
          value: AfaqRole.auditor,
          icon: Icon(Icons.fact_check_outlined),
          label: Text('Auditor'),
        ),
      ],
      selected: {selected},
      onSelectionChanged: (roles) => onChanged(roles.first),
    );
  }
}
