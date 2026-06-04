import 'package:flutter/material.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../onboarding/presentation/widgets/learning_logo_animation.dart';
import '../../student/pages/student_area.dart';
import '../data/auth_service.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  final _authService = const AuthService();

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _passwordConfirmationController = TextEditingController();
  final _phoneController = TextEditingController(text: '+966');
  final _dateOfBirthController = TextEditingController();
  final _addressController = TextEditingController();
  final _countryController = TextEditingController(text: 'SA');
  final _bioController = TextEditingController();
  final _specializationController = TextEditingController();
  final _joinedAtController = TextEditingController();

  bool _loading = false;
  bool _hidePassword = true;
  bool _hidePasswordConfirmation = true;
  String _gender = 'male';
  String _educationLevel = 'bachelor';

  static const _educationLevels = <String>[
    'highschool',
    'associate',
    'bachelor',
    'collage',
    'master',
    'doctorate',
    'other',
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _passwordConfirmationController.dispose();
    _phoneController.dispose();
    _dateOfBirthController.dispose();
    _addressController.dispose();
    _countryController.dispose();
    _bioController.dispose();
    _specializationController.dispose();
    _joinedAtController.dispose();
    super.dispose();
  }

  Future<void> _pickDate(TextEditingController controller) async {
    final now = DateTime.now();
    final parsed = DateTime.tryParse(controller.text.trim());
    final selected = await showDatePicker(
      context: context,
      initialDate: parsed ?? DateTime(now.year - 18, now.month, now.day),
      firstDate: DateTime(1950),
      lastDate: DateTime(now.year + 5),
    );
    if (selected == null || !mounted) return;
    final month = selected.month.toString().padLeft(2, '0');
    final day = selected.day.toString().padLeft(2, '0');
    controller.text = '${selected.year}-$month-$day';
    setState(() {});
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      AfaqToast.show(
        context,
        message: 'Please complete the registration details.',
        type: AfaqToastType.warning,
      );
      return;
    }

    setState(() => _loading = true);
    try {
      await _authService.register(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        password: _passwordController.text,
        passwordConfirmation: _passwordConfirmationController.text,
        phone: _phoneController.text.trim(),
        dateOfBirth: _dateOfBirthController.text.trim(),
        gender: _gender,
        educationLevel: _educationLevel,
        country: _countryController.text.trim(),
        address: _nullIfBlank(_addressController.text),
        bio: _nullIfBlank(_bioController.text),
        specialization: _nullIfBlank(_specializationController.text),
        joinedAt: _nullIfBlank(_joinedAtController.text),
      );
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: 'Account created successfully.',
        type: AfaqToastType.success,
      );
      await Future<void>.delayed(const Duration(milliseconds: 300));
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const StudentArea()),
        (_) => false,
      );
    } on AppException catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.message, type: AfaqToastType.error);
    } catch (_) {
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: 'Registration failed. Please try again.',
        type: AfaqToastType.error,
      );
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  String? _nullIfBlank(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 980;
    final card = Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .94),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white),
        boxShadow: [
          BoxShadow(
            color: AfaqColors.primaryButton.withValues(alpha: .08),
            blurRadius: 32,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!wide) const _RegisterHero(compact: true),
            const _RegisterTitle(),
            const SizedBox(height: 18),
            _buildTextField(
              controller: _nameController,
              label: 'Full Name',
              hint: 'Student Name',
              validator: (value) =>
                  (value?.trim().isEmpty ?? true) ? 'Name is required' : null,
            ),
            _buildTextField(
              controller: _emailController,
              label: 'Email',
              hint: 'student@example.com',
              keyboardType: TextInputType.emailAddress,
              validator: (value) {
                final email = value?.trim() ?? '';
                if (email.isEmpty) return 'Email is required';
                if (!email.contains('@')) return 'Enter a valid email';
                return null;
              },
            ),
            _buildResponsiveRow(
              wide: wide,
              children: [
                _FieldBlock(
                  child: _buildTextField(
                    controller: _phoneController,
                    label: 'Phone',
                    hint: '+966501234567',
                    keyboardType: TextInputType.phone,
                    validator: (value) =>
                        (value?.trim().isEmpty ?? true) ? 'Phone is required' : null,
                  ),
                ),
                _FieldBlock(
                  child: _buildDateField(
                    controller: _dateOfBirthController,
                    label: 'Date Of Birth',
                    hint: '2000-01-15',
                    validator: (value) => (value?.trim().isEmpty ?? true)
                        ? 'Date of birth is required'
                        : null,
                  ),
                ),
              ],
            ),
            _buildResponsiveRow(
              wide: wide,
              children: [
                _FieldBlock(
                  child: _buildDropdownField<String>(
                    label: 'Gender',
                    value: _gender,
                    items: const [
                      DropdownMenuItem(value: 'male', child: Text('Male')),
                      DropdownMenuItem(value: 'female', child: Text('Female')),
                    ],
                    onChanged: (value) {
                      if (value != null) setState(() => _gender = value);
                    },
                  ),
                ),
                _FieldBlock(
                  child: _buildDropdownField<String>(
                    label: 'Education Level',
                    value: _educationLevel,
                    items: _educationLevels
                        .map(
                          (item) => DropdownMenuItem(
                            value: item,
                            child: Text(_prettyEducation(item)),
                          ),
                        )
                        .toList(growable: false),
                    onChanged: (value) {
                      if (value != null) setState(() => _educationLevel = value);
                    },
                  ),
                ),
              ],
            ),
            _buildResponsiveRow(
              wide: wide,
              children: [
                _FieldBlock(
                  child: _buildTextField(
                    controller: _countryController,
                    label: 'Country',
                    hint: 'SA',
                    validator: (value) =>
                        (value?.trim().isEmpty ?? true) ? 'Country is required' : null,
                  ),
                ),
                _FieldBlock(
                  child: _buildTextField(
                    controller: _addressController,
                    label: 'Address',
                    hint: 'Riyadh',
                  ),
                ),
              ],
            ),
            _buildResponsiveRow(
              wide: wide,
              children: [
                _FieldBlock(
                  child: _buildTextField(
                    controller: _specializationController,
                    label: 'Specialization',
                    hint: 'Computer Science',
                  ),
                ),
                _FieldBlock(
                  child: _buildDateField(
                    controller: _joinedAtController,
                    label: 'Joined At',
                    hint: '2026-01-01',
                  ),
                ),
              ],
            ),
            _buildTextField(
              controller: _bioController,
              label: 'Bio',
              hint: 'Short bio',
              maxLines: 3,
            ),
            _buildTextField(
              controller: _passwordController,
              label: 'Password',
              hint: 'Str0ng!Pass',
              obscureText: _hidePassword,
              suffixIcon: IconButton(
                onPressed: () => setState(() => _hidePassword = !_hidePassword),
                icon: Icon(
                  _hidePassword
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                ),
              ),
              validator: (value) {
                final password = value ?? '';
                if (password.isEmpty) return 'Password is required';
                if (password.length < 8) return 'Password must be at least 8 characters';
                return null;
              },
            ),
            _buildTextField(
              controller: _passwordConfirmationController,
              label: 'Confirm Password',
              hint: 'Str0ng!Pass',
              obscureText: _hidePasswordConfirmation,
              suffixIcon: IconButton(
                onPressed: () => setState(
                  () => _hidePasswordConfirmation = !_hidePasswordConfirmation,
                ),
                icon: Icon(
                  _hidePasswordConfirmation
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                ),
              ),
              validator: (value) {
                if ((value ?? '').isEmpty) return 'Please confirm your password';
                if (value != _passwordController.text) return 'Passwords do not match';
                return null;
              },
            ),
            const SizedBox(height: 18),
            SizedBox(
              height: 56,
              child: FilledButton.icon(
                onPressed: _loading ? null : _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: AfaqColors.primaryButton,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                ),
                icon: _loading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.person_add_alt_1_rounded),
                label: Text(_loading ? 'Creating account...' : 'Create Account'),
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: _loading ? null : () => Navigator.of(context).pop(),
              child: const Text('Already have an account? Login'),
            ),
          ],
        ),
      ),
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Register')),
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
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1160),
                child: wide
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Expanded(child: _RegisterHero()),
                          const SizedBox(width: 28),
                          Expanded(child: card),
                        ],
                      )
                    : card,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    String? Function(String?)? validator,
    TextInputType? keyboardType,
    bool obscureText = false,
    Widget? suffixIcon,
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _FieldLabel(label),
          TextFormField(
            controller: controller,
            validator: validator,
            keyboardType: keyboardType,
            obscureText: obscureText,
            maxLines: maxLines,
            decoration: _inputDecoration(hint, suffixIcon: suffixIcon),
          ),
        ],
      ),
    );
  }

  Widget _buildDateField({
    required TextEditingController controller,
    required String label,
    required String hint,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _FieldLabel(label),
          TextFormField(
            controller: controller,
            validator: validator,
            readOnly: true,
            onTap: () => _pickDate(controller),
            decoration: _inputDecoration(
              hint,
              suffixIcon: IconButton(
                onPressed: () => _pickDate(controller),
                icon: const Icon(Icons.calendar_month_outlined),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDropdown<T>({
    required T value,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?> onChanged,
  }) {
    return DropdownButtonFormField<T>(
      initialValue: value,
      items: items,
      onChanged: onChanged,
      decoration: _inputDecoration('Select'),
    );
  }

  Widget _buildDropdownField<T>({
    required String label,
    required T value,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _FieldLabel(label),
          _buildDropdown<T>(
            value: value,
            items: items,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildResponsiveRow({
    required bool wide,
    required List<Widget> children,
  }) {
    if (!wide) {
      return Column(children: children);
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var index = 0; index < children.length; index++) ...[
          Expanded(child: children[index]),
          if (index != children.length - 1) const SizedBox(width: 14),
        ],
      ],
    );
  }

  InputDecoration _inputDecoration(String hint, {Widget? suffixIcon}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: AfaqColors.slate400, fontWeight: FontWeight.w700),
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: const Color(0xFFF1F5F9),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: AfaqColors.slate200),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: AfaqColors.slate200),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: AfaqColors.primary, width: 1.4),
      ),
    );
  }

  String _prettyEducation(String value) {
    switch (value) {
      case 'highschool':
        return 'High School';
      case 'associate':
        return 'Associate';
      case 'bachelor':
        return 'Bachelor';
      case 'collage':
        return 'College';
      case 'master':
        return 'Master';
      case 'doctorate':
        return 'Doctorate';
      default:
        return 'Other';
    }
  }
}

class _RegisterHero extends StatelessWidget {
  const _RegisterHero({this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: compact ? CrossAxisAlignment.center : CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: compact ? 120 : 250,
          child: Transform.scale(
            scale: compact ? .42 : .75,
            child: const SizedBox(width: 292, height: 292, child: LearningLogoAnimation()),
          ),
        ),
        Text(
          'Create your student account',
          textAlign: compact ? TextAlign.center : TextAlign.start,
          style: Theme.of(context).textTheme.headlineLarge?.copyWith(fontWeight: FontWeight.w900),
        ),
      ],
    );
  }
}

class _RegisterTitle extends StatelessWidget {
  const _RegisterTitle();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Register',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900),
        ),
      ],
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

class _FieldBlock extends StatelessWidget {
  const _FieldBlock({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return child;
  }
}
