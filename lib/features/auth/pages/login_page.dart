import 'package:flutter/material.dart';

import '../../../core/constants/app_assets.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../../../core/widgets/afaq_sidebar.dart';
import '../../auditor/pages/auditor_area.dart';
import '../../instructor/pages/instructor_area.dart';
import '../../onboarding/presentation/widgets/learning_logo_animation.dart';
import '../../student/pages/student_area.dart';
import '../data/auth_service.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController(text: 'student@afaq.test');
  final _passwordController = TextEditingController(text: 'password');
  final _authService = const AuthService();

  AfaqRole _role = AfaqRole.student;
  bool _loading = false;
  bool _hidePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final wide = size.width >= 900;
    final loginCard = _LoginCard(
      formKey: _formKey,
      role: _role,
      emailController: _emailController,
      passwordController: _passwordController,
      loading: _loading,
      hidePassword: _hidePassword,
      onRoleChanged: (role) => setState(() => _role = role),
      onTogglePassword: () => setState(() => _hidePassword = !_hidePassword),
      onSubmit: _submit,
    );
    final content = wide
        ? <Widget>[
            Flexible(flex: 10, child: _LoginHero(wide: wide)),
            const SizedBox(width: 42),
            Flexible(flex: 9, child: loginCard),
          ]
        : <Widget>[
            _LoginHero(wide: wide),
            const SizedBox(height: 28),
            loginCard,
          ];

    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFFF8FAFC),
              Color(0xFFEEF2FF),
              Color(0xFFFFF7ED),
              Color(0xFFFDF2F8),
            ],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              const Positioned(
                top: -120,
                left: -120,
                child: _SoftGlow(color: Color(0xFF4F46E5), size: 320),
              ),
              const Positioned(
                right: -100,
                bottom: -130,
                child: _SoftGlow(color: Color(0xFFF43F5E), size: 360),
              ),
              Center(
                child: SingleChildScrollView(
                  padding: EdgeInsets.all(wide ? 36 : 20),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 1160),
                    child: Flex(
                      direction: wide ? Axis.horizontal : Axis.vertical,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: content,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      AfaqToast.show(
        context,
        message: 'Please complete the login details.',
        type: AfaqToastType.warning,
      );
      return;
    }

    setState(() => _loading = true);
    try {
      await _authService.login(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        role: _role,
      );
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: 'Welcome to the ${_role.name} workspace.',
        type: AfaqToastType.success,
      );
      await Future<void>.delayed(const Duration(milliseconds: 350));
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => _workspaceForRole(_role)),
      );
    } on AppException catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.message, type: AfaqToastType.error);
    } catch (_) {
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: 'Login failed. Please try again.',
        type: AfaqToastType.error,
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _workspaceForRole(AfaqRole role) {
    return switch (role) {
      AfaqRole.student => const StudentArea(),
      AfaqRole.instructor => const InstructorArea(),
      AfaqRole.auditor => const AuditorArea(),
    };
  }
}

class _LoginCard extends StatelessWidget {
  const _LoginCard({
    required this.formKey,
    required this.role,
    required this.emailController,
    required this.passwordController,
    required this.loading,
    required this.hidePassword,
    required this.onRoleChanged,
    required this.onTogglePassword,
    required this.onSubmit,
  });

  final GlobalKey<FormState> formKey;
  final AfaqRole role;
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final bool loading;
  final bool hidePassword;
  final ValueChanged<AfaqRole> onRoleChanged;
  final VoidCallback onTogglePassword;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      radius: 34,
      padding: const EdgeInsets.all(28),
      child: Form(
        key: formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AfaqColors.slate100,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.asset(AppAssets.afaaqLogo, fit: BoxFit.contain),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Login', style: Theme.of(context).textTheme.headlineMedium),
                      const SizedBox(height: 3),
                      const Text(
                        'Secure access to your workspace',
                        style: TextStyle(color: AfaqColors.slate500, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _RoleSelector(selected: role, onChanged: onRoleChanged),
            const SizedBox(height: 22),
            TextFormField(
              controller: emailController,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              decoration: _inputDecoration('Email', Icons.mail_outline),
              validator: (value) {
                final email = value?.trim() ?? '';
                if (email.isEmpty) return 'Email is required';
                if (!email.contains('@')) return 'Enter a valid email';
                return null;
              },
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: passwordController,
              obscureText: hidePassword,
              autofillHints: const [AutofillHints.password],
              decoration: _inputDecoration(
                'Password',
                Icons.lock_outline,
                suffix: IconButton(
                  onPressed: onTogglePassword,
                  icon: Icon(hidePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                ),
              ),
              validator: (value) {
                if ((value ?? '').length < 4) return 'Password is too short';
                return null;
              },
            ),
            const SizedBox(height: 12),
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton(
                onPressed: () => AfaqToast.show(
                  context,
                  message: 'Password recovery will connect to the API next.',
                  type: AfaqToastType.info,
                ),
                child: const Text('Forgot password?'),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: loading ? null : onSubmit,
              icon: loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.login_rounded),
              label: Text(loading ? 'Opening workspace...' : 'Enter workspace'),
            ),
          ],
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon, {Widget? suffix}) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon),
      suffixIcon: suffix,
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
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFFDA4AF), width: 1.2),
      ),
    );
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
        Transform.scale(
          scale: wide ? .82 : .72,
          child: const SizedBox(
            width: 292,
            height: 292,
            child: LearningLogoAnimation(),
          ),
        ),
        const SizedBox(height: 8),
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
          'A focused gateway for students, instructors, and auditors.',
          textAlign: wide ? TextAlign.start : TextAlign.center,
          style: const TextStyle(
            color: AfaqColors.slate600,
            fontSize: 17,
            height: 1.45,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 18),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          alignment: wide ? WrapAlignment.start : WrapAlignment.center,
          children: const [
            _HeroChip(icon: Icons.auto_stories_outlined, label: 'Courses'),
            _HeroChip(icon: Icons.quiz_outlined, label: 'Quizzes'),
            _HeroChip(icon: Icons.fact_check_outlined, label: 'Reviews'),
          ],
        ),
      ],
    );
  }
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .72),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 17, color: AfaqColors.primaryButton),
          const SizedBox(width: 7),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w900)),
        ],
      ),
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
      style: ButtonStyle(
        visualDensity: VisualDensity.compact,
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        ),
      ),
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

class _SoftGlow extends StatelessWidget {
  const _SoftGlow({required this.color, required this.size});

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color.withValues(alpha: .10),
          boxShadow: [
            BoxShadow(color: color.withValues(alpha: .12), blurRadius: 120, spreadRadius: 40),
          ],
        ),
      ),
    );
  }
}
