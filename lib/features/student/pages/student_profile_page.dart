import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/student_profile_service.dart';
import 'student_page_shared.dart';

class StudentProfilePage extends StatefulWidget {
  const StudentProfilePage({super.key});

  @override
  State<StudentProfilePage> createState() => _StudentProfilePageState();
}

class _StudentProfilePageState extends State<StudentProfilePage> {
  final _service = const StudentProfileService();

  bool _loading = true;
  String? _error;
  _ProfileData? _profile;

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
        _profile = _ProfileData.fromMap(response.data ?? <String, dynamic>{});
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

    return StudentPageScaffold(
      title: studentText('profile', lang),
      subtitle: studentText('profile_subtitle', lang),
      onRefresh: _load,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? StudentErrorPanel(message: _error!, onRetry: _load)
              : _profile == null
                  ? StudentEmptyPanel(
                      message: studentText('empty', lang),
                      icon: Icons.account_circle_outlined,
                    )
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
                                    _ProfileTile(label: 'Phone', value: _profile!.phone),
                                    _ProfileTile(label: 'Gender', value: _profile!.gender),
                                    _ProfileTile(label: 'Date of Birth', value: _profile!.dateOfBirth),
                                    _ProfileTile(label: 'Address', value: _profile!.address, wide: true),
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

class _ProfileData {
  const _ProfileData({
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
    return value.isEmpty ? 'ST' : value;
  }

  factory _ProfileData.fromMap(Map<String, dynamic> payload) {
    final root = unwrapDataMap(payload);
    final user = asMap(root['user']) ?? root;
    final profile = asMap(root['profile']) ?? root;

    return _ProfileData(
      name: readString(user['name'] ?? profile['name'], fallback: 'Student Account'),
      email: readString(user['email'] ?? profile['email'], fallback: 'Not provided'),
      phone: readString(profile['phone'], fallback: 'Not provided'),
      gender: readString(profile['gender'], fallback: 'Not provided'),
      dateOfBirth: readString(profile['date_of_birth'], fallback: 'Not provided'),
      address: readString(profile['address'], fallback: 'Not provided'),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  const _ProfileTile({
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
