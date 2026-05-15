import 'package:flutter/material.dart';

import '../../../core/constants/app_assets.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
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
            Flexible(flex: 8, child: loginCard),
          ]
        : <Widget>[
            _LoginHero(wide: wide),
            const SizedBox(height: 22),
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
                  padding: EdgeInsets.fromLTRB(
                    wide ? 36 : 18,
                    wide ? 36 : 14,
                    wide ? 36 : 18,
                    wide ? 36 : 22,
                  ),
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
    final width = MediaQuery.sizeOf(context).width;
    final compact = width < 430;

    return Container(
      padding: EdgeInsets.all(compact ? 20 : 28),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .92),
        borderRadius: BorderRadius.circular(compact ? 30 : 34),
        border: Border.all(color: Colors.white.withValues(alpha: .90)),
        boxShadow: [
          BoxShadow(
            color: AfaqColors.primaryButton.withValues(alpha: .08),
            blurRadius: 36,
            offset: const Offset(0, 18),
          ),
          BoxShadow(
            color: AfaqColors.slate950.withValues(alpha: .06),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Form(
        key: formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Container(
                  width: compact ? 46 : 52,
                  height: compact ? 46 : 52,
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AfaqColors.slate200),
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
                      Text(
                        'Login',
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              fontSize: compact ? 30 : 34,
                              height: 1,
                            ),
                      ),
                      const SizedBox(height: 3),
                      const Text(
                        'Secure access to your workspace',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: AfaqColors.slate500,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            SizedBox(height: compact ? 20 : 24),
            _RoleSelector(selected: role, onChanged: onRoleChanged),
            const SizedBox(height: 12),
            _RoleDescription(role: role),
            SizedBox(height: compact ? 18 : 22),
            const _FieldLabel('Email'),
            TextFormField(
              controller: emailController,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
              decoration: _inputDecoration('student@afaq.test', Icons.mail_outline),
              validator: (value) {
                final email = value?.trim() ?? '';
                if (email.isEmpty) return 'Email is required';
                if (!email.contains('@')) return 'Enter a valid email';
                return null;
              },
            ),
            const SizedBox(height: 14),
            const _FieldLabel('Password'),
            TextFormField(
              controller: passwordController,
              obscureText: hidePassword,
              autofillHints: const [AutofillHints.password],
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
              decoration: _inputDecoration(
                'Enter your password',
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
            const SizedBox(height: 8),
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
            const SizedBox(height: 14),
            SizedBox(
              height: 58,
              child: FilledButton.icon(
                onPressed: loading ? null : onSubmit,
                icon: loading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.login_rounded),
                label: Text(
                  loading ? 'Opening workspace...' : 'Enter workspace',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: AfaqColors.primaryButton,
                  disabledBackgroundColor: AfaqColors.primaryButton.withValues(alpha: .62),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint, IconData icon, {Widget? suffix}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(
        color: AfaqColors.slate400,
        fontWeight: FontWeight.w700,
      ),
      prefixIcon: Icon(icon),
      suffixIcon: suffix,
      filled: true,
      fillColor: const Color(0xFFF1F5F9),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: AfaqColors.slate200),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: AfaqColors.slate200),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: AfaqColors.primary, width: 1.4),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: Color(0xFFFDA4AF), width: 1.2),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: Color(0xFFFB7185), width: 1.4),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 7),
      child: Text(
        label,
        style: const TextStyle(
          color: AfaqColors.slate700,
          fontSize: 13,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _RoleDescription extends StatelessWidget {
  const _RoleDescription({required this.role});

  final AfaqRole role;

  @override
  Widget build(BuildContext context) {
    final content = switch (role) {
      AfaqRole.student => (
          Icons.auto_stories_outlined,
          'Student workspace',
          'Continue your courses, track progress, solve quizzes, join forums, and collect certificates.',
        ),
      AfaqRole.instructor => (
          Icons.co_present_outlined,
          'Instructor workspace',
          'Manage your courses, create lessons and quizzes, follow learners, host meetings, and answer chats.',
        ),
      AfaqRole.auditor => (
          Icons.fact_check_outlined,
          'Auditor workspace',
          'Review course quality, approve content, inspect quizzes, handle notifications, and submit decisions.',
        ),
    };

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 180),
      child: Container(
        key: ValueKey(role),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AfaqColors.primaryButton.withValues(alpha: .06),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AfaqColors.primaryButton.withValues(alpha: .12)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AfaqColors.slate200),
              ),
              child: Icon(content.$1, color: AfaqColors.primaryButton, size: 19),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    content.$2,
                    style: const TextStyle(
                      color: AfaqColors.slate900,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    content.$3,
                    style: const TextStyle(
                      color: AfaqColors.slate600,
                      fontSize: 12,
                      height: 1.35,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
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
        SizedBox(
          height: wide ? 292 : 150,
          child: OverflowBox(
            minHeight: 0,
            maxHeight: 292,
            child: Transform.scale(
              scale: wide ? .82 : .48,
              child: const SizedBox(
                width: 292,
                height: 292,
                child: LearningLogoAnimation(),
              ),
            ),
          ),
        ),
        SizedBox(height: wide ? 8 : 4),
        Text(
          'Afaq learning command center',
          textAlign: wide ? TextAlign.start : TextAlign.center,
          style: Theme.of(context).textTheme.displayLarge?.copyWith(
                fontSize: wide ? 52 : 34,
                height: 1,
              ),
        ),
        SizedBox(height: wide ? 18 : 14),
        Text(
          'A focused gateway for students, instructors, and auditors.',
          textAlign: wide ? TextAlign.start : TextAlign.center,
          style: TextStyle(
            color: AfaqColors.slate600,
            fontSize: wide ? 17 : 16,
            height: 1.45,
            fontWeight: FontWeight.w700,
          ),
        ),
        SizedBox(height: wide ? 18 : 16),
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
    const roles = [
      _RoleOption(AfaqRole.student, 'Student', Icons.school_outlined),
      _RoleOption(AfaqRole.instructor, 'Instructor', Icons.co_present_outlined),
      _RoleOption(AfaqRole.auditor, 'Auditor', Icons.fact_check_outlined),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final tiny = constraints.maxWidth < 340;

        return Container(
          padding: const EdgeInsets.all(5),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AfaqColors.slate200),
          ),
          child: Row(
            children: [
              for (final option in roles)
                Expanded(
                  child: _RoleButton(
                    option: option,
                    active: selected == option.role,
                    tiny: tiny,
                    onTap: () => onChanged(option.role),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _RoleOption {
  const _RoleOption(this.role, this.label, this.icon);

  final AfaqRole role;
  final String label;
  final IconData icon;
}

class _RoleButton extends StatelessWidget {
  const _RoleButton({
    required this.option,
    required this.active,
    required this.tiny,
    required this.onTap,
  });

  final _RoleOption option;
  final bool active;
  final bool tiny;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
      margin: const EdgeInsets.symmetric(horizontal: 2),
      decoration: BoxDecoration(
        color: active ? AfaqColors.primaryButton : Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        boxShadow: active
            ? [
                BoxShadow(
                  color: AfaqColors.primaryButton.withValues(alpha: .25),
                  blurRadius: 16,
                  offset: const Offset(0, 8),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: tiny ? 6 : 8, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  active ? Icons.check_rounded : option.icon,
                  size: tiny ? 17 : 18,
                  color: active ? Colors.white : AfaqColors.slate700,
                ),
                if (!tiny) const SizedBox(width: 6),
                if (!tiny)
                  Flexible(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        option.label,
                        maxLines: 1,
                        style: TextStyle(
                          color: active ? Colors.white : AfaqColors.slate900,
                          fontWeight: FontWeight.w900,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
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
