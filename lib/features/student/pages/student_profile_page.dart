import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
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
                        final summaryCard = AfaqPanel(
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
                        );
                        final detailsCard = AfaqPanel(
                          child: LayoutBuilder(
                            builder: (context, panelConstraints) {
                              final tileWidth = stacked
                                  ? panelConstraints.maxWidth
                                  : ((panelConstraints.maxWidth - 16) / 2).clamp(220.0, 420.0);
                              return Wrap(
                                spacing: 16,
                                runSpacing: 16,
                                children: [
                                  _ProfileTile(label: 'Phone', value: _profile!.phone, width: tileWidth),
                                  _ProfileTile(label: 'Gender', value: _profile!.gender, width: tileWidth),
                                  _ProfileTile(
                                    label: 'Date of Birth',
                                    value: _profile!.dateOfBirthLabel,
                                    width: tileWidth,
                                  ),
                                  _ProfileTile(
                                    label: 'Address',
                                    value: _profile!.address,
                                    width: panelConstraints.maxWidth,
                                  ),
                                ],
                              );
                            },
                          ),
                        );

                        return Flex(
                          direction: stacked ? Axis.vertical : Axis.horizontal,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (stacked)
                              summaryCard
                            else
                              Expanded(child: summaryCard),
                            SizedBox(width: stacked ? 0 : 16, height: stacked ? 16 : 0),
                            if (stacked)
                              detailsCard
                            else
                              Expanded(flex: 2, child: detailsCard),
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

  String get dateOfBirthLabel => _readableDate(dateOfBirth);

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
    required this.width,
  });

  final String label;
  final String value;
  final double width;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          gradient: const LinearGradient(
            colors: [
              Color(0xFFF9FBFF),
              Color(0xFFF4F7FF),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          border: Border.all(color: const Color(0xFFE4ECF8)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w800,
                color: AfaqColors.slate500,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(
                fontSize: 20,
                height: 1.3,
                fontWeight: FontWeight.w800,
                color: AfaqColors.slate900,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _readableDate(String raw) {
  final value = raw.trim();
  if (value.isEmpty || value.toLowerCase() == 'not provided') {
    return 'Not provided';
  }

  final parsed = DateTime.tryParse(value);
  if (parsed == null) return value;

  const months = <String>[
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return '${months[parsed.month - 1]} ${parsed.day}, ${parsed.year}';
}
