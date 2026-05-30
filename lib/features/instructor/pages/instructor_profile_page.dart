import 'package:flutter/material.dart';

import '../../../app/app.dart';
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
                        final medium = constraints.maxWidth >= 920;
                        final wide = constraints.maxWidth >= 1260;

                        return Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [
                                Color(0xFFF8FBFF),
                                Color(0xFFEAF2FF),
                                Color(0xFFF6F8FF),
                              ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(36),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: .05),
                                blurRadius: 28,
                                offset: const Offset(0, 18),
                              ),
                            ],
                          ),
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildHeroCard(context, _profile!, wide: wide),
                              const SizedBox(height: 20),
                              if (medium)
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: _buildInsightsCard(
                                        title: 'Identity',
                                        icon: Icons.badge_outlined,
                                        children: [
                                          _InstructorProfileTile(
                                            label: 'Full Name',
                                            value: _profile!.name,
                                            icon: Icons.person_outline_rounded,
                                          ),
                                          _InstructorProfileTile(
                                            label: 'Email',
                                            value: _profile!.email,
                                            icon: Icons.alternate_email_rounded,
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: _buildInsightsCard(
                                        title: 'Personal',
                                        icon: Icons.auto_awesome_outlined,
                                        children: [
                                          _InstructorProfileTile(
                                            label: 'Gender',
                                            value: _profile!.genderLabel,
                                            icon: Icons.wc_rounded,
                                          ),
                                          _InstructorProfileTile(
                                            label: 'Birth Date',
                                            value: _profile!.dateOfBirthLabel,
                                            icon: Icons.cake_outlined,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                )
                              else
                                Column(
                                  children: [
                                    _buildInsightsCard(
                                      title: 'Identity',
                                      icon: Icons.badge_outlined,
                                      children: [
                                        _InstructorProfileTile(
                                          label: 'Full Name',
                                          value: _profile!.name,
                                          icon: Icons.person_outline_rounded,
                                        ),
                                        _InstructorProfileTile(
                                          label: 'Email',
                                          value: _profile!.email,
                                          icon: Icons.alternate_email_rounded,
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 16),
                                    _buildInsightsCard(
                                      title: 'Personal',
                                      icon: Icons.auto_awesome_outlined,
                                      children: [
                                        _InstructorProfileTile(
                                          label: 'Gender',
                                          value: _profile!.genderLabel,
                                          icon: Icons.wc_rounded,
                                        ),
                                        _InstructorProfileTile(
                                          label: 'Birth Date',
                                          value: _profile!.dateOfBirthLabel,
                                          icon: Icons.cake_outlined,
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              const SizedBox(height: 16),
                              _buildInsightsCard(
                                title: 'Contact & Location',
                                icon: Icons.place_outlined,
                                children: [
                                  if (wide)
                                    Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Expanded(
                                          child: _InstructorProfileTile(
                                            label: 'Phone',
                                            value: _profile!.phone,
                                            icon: Icons.phone_outlined,
                                          ),
                                        ),
                                        const SizedBox(width: 14),
                                        Expanded(
                                          flex: 2,
                                          child: _InstructorProfileTile(
                                            label: 'Address',
                                            value: _profile!.address,
                                            icon: Icons.home_work_outlined,
                                          ),
                                        ),
                                      ],
                                    )
                                  else ...[
                                    _InstructorProfileTile(
                                      label: 'Phone',
                                      value: _profile!.phone,
                                      icon: Icons.phone_outlined,
                                    ),
                                    const SizedBox(height: 14),
                                    _InstructorProfileTile(
                                      label: 'Address',
                                      value: _profile!.address,
                                      icon: Icons.home_work_outlined,
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
    );
  }

  Widget _buildHeroCard(
    BuildContext context,
    _InstructorProfileData profile, {
    required bool wide,
  }) {
    final stats = [
      ('Profile', 'Instructor'),
      ('Birth Date', profile.dateOfBirthLabel),
      ('Location', profile.address),
    ];

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFF0B1220),
            Color(0xFF18243A),
            Color(0xFF22314D),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .18),
            blurRadius: 30,
            offset: const Offset(0, 20),
          ),
        ],
      ),
      padding: const EdgeInsets.all(24),
      child: wide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(flex: 2, child: _buildHeroIdentity(context, profile)),
                const SizedBox(width: 18),
                Expanded(
                  child: Column(
                    children: stats
                        .map((item) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _buildHeroStat(item.$1, item.$2),
                            ))
                        .toList(growable: false),
                  ),
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeroIdentity(context, profile),
                const SizedBox(height: 18),
                ...stats.map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _buildHeroStat(item.$1, item.$2),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildHeroIdentity(BuildContext context, _InstructorProfileData profile) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 96,
          height: 96,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF6A5CFF), Color(0xFF3BC9FF)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(30),
          ),
          alignment: Alignment.center,
          child: Text(
            profile.initials,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: const Color(0xFF08111F),
                  fontWeight: FontWeight.w900,
                ),
          ),
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .10),
            borderRadius: BorderRadius.circular(999),
          ),
          child: const Text(
            'Instructor Identity',
            style: TextStyle(
              color: Color(0xFFB7C6E8),
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: .6,
            ),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          profile.name,
          style: Theme.of(context).textTheme.displaySmall?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w900,
              ),
        ),
        const SizedBox(height: 10),
        Text(
          profile.email,
          style: const TextStyle(
            color: Color(0xFFD4DEF5),
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildHeroStat(String label, String value) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF94A6C9),
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInsightsCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .88),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: const Color(0xFFD8E4F5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .03),
            blurRadius: 18,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFE9F0FF), Color(0xFFF1EEFF)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, color: const Color(0xFF3246D3)),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                    ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          ...children,
        ],
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

  String get dateOfBirthLabel => _readableDate(dateOfBirth);
  String get genderLabel {
    final normalized = gender.trim().toLowerCase();
    if (normalized.isEmpty || normalized == 'not provided') return 'Not provided';
    return '${normalized[0].toUpperCase()}${normalized.substring(1)}';
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
    this.icon,
  });

  final String label;
  final String value;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
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
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (icon != null) ...[
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: const Color(0xFFE9EEFF),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: const Color(0xFF4054E8), size: 20),
            ),
            const SizedBox(width: 14),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 20,
                    height: 1.3,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

String _readableDate(String raw) {
  final value = raw.trim();
  if (value.isEmpty || value.toLowerCase() == 'not provided') return 'Not provided';
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
