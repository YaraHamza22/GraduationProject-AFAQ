import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/instructor_profile_service.dart';
import 'instructor_page_shared.dart';

class InstructorProfilePage extends StatefulWidget {
  const InstructorProfilePage({super.key});

  @override
  State<InstructorProfilePage> createState() => _InstructorProfilePageState();
}

class _InstructorProfilePageState extends State<InstructorProfilePage> {
  final _service = const InstructorProfileService();

  bool _loading = true;
  String? _error;
  _InstructorProfileData? _profile;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _service.getProfile();
      if (!mounted) return;
      setState(() {
        _profile = _InstructorProfileData.fromMap(response.data ?? <String, dynamic>{});
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;

    return InstructorPageScaffold(
      title: instructorText('profile', lang),
      subtitle: instructorText('profile_subtitle', lang),
      onRefresh: _load,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? InstructorErrorPanel(message: _error!, onRetry: _load)
              : _profile == null
                  ? InstructorEmptyPanel(message: instructorText('empty', lang), icon: Icons.account_circle_outlined)
                  : LayoutBuilder(
                      builder: (context, constraints) {
                        final stacked = constraints.maxWidth < 980;
                        return Flex(
                          direction: stacked ? Axis.vertical : Axis.horizontal,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: AfaqPanel(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    CircleAvatar(
                                      radius: 34,
                                      child: Text(
                                        _profile!.initials,
                                        style: Theme.of(context).textTheme.titleLarge,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      _profile!.name,
                                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(_profile!.email),
                                  ],
                                ),
                              ),
                            ),
                            SizedBox(width: stacked ? 0 : 16, height: stacked ? 16 : 0),
                            Expanded(
                              flex: 2,
                              child: AfaqPanel(
                                child: Wrap(
                                  spacing: 16,
                                  runSpacing: 16,
                                  children: [
                                    _InstructorProfileTile(label: 'Phone', value: _profile!.phone),
                                    _InstructorProfileTile(label: 'Gender', value: _profile!.gender),
                                    _InstructorProfileTile(label: 'Date of Birth', value: _profile!.dateOfBirth),
                                    _InstructorProfileTile(label: 'Address', value: _profile!.address, wide: true),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
    );
  }
}

class _InstructorProfileData {
  const _InstructorProfileData({
    required this.name,
    required this.email,
    required this.phone,
    required this.gender,
    required this.dateOfBirth,
    required this.address,
  });

  final String name;
  final String email;
  final String phone;
  final String gender;
  final String dateOfBirth;
  final String address;

  String get initials {
    final parts = name.split(RegExp(r'[\s@._-]+')).where((item) => item.isNotEmpty).take(2);
    final value = parts.map((item) => item[0].toUpperCase()).join();
    return value.isEmpty ? 'IN' : value;
  }

  factory _InstructorProfileData.fromMap(Map<String, dynamic> payload) {
    final root = unwrapInstructorMap(payload);
    final user = instructorMap(root['user']) ?? root;
    final profile = instructorMap(root['profile']) ?? root;

    return _InstructorProfileData(
      name: instructorString(user['name'] ?? profile['name'], fallback: 'Instructor Account'),
      email: instructorString(user['email'] ?? profile['email'], fallback: 'Not provided'),
      phone: instructorString(profile['phone'], fallback: 'Not provided'),
      gender: instructorString(profile['gender'], fallback: 'Not provided'),
      dateOfBirth: instructorString(profile['date_of_birth'], fallback: 'Not provided'),
      address: instructorString(profile['address'], fallback: 'Not provided'),
    );
  }
}

class _InstructorProfileTile extends StatelessWidget {
  const _InstructorProfileTile({
    required this.label,
    required this.value,
    this.wide = false,
  });

  final String label;
  final String value;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: wide ? double.infinity : 260,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          color: Colors.black.withValues(alpha: .03),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(value),
          ],
        ),
      ),
    );
  }
}
