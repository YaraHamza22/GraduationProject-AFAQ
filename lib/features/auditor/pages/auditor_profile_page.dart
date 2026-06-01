import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/auditor_profile_service.dart';
import 'auditor_page_shared.dart';

class AuditorProfilePage extends StatefulWidget {
  const AuditorProfilePage({super.key});

  @override
  State<AuditorProfilePage> createState() => _AuditorProfilePageState();
}

class _AuditorProfilePageState extends State<AuditorProfilePage> {
  final _service = const AuditorProfileService();

  bool _loading = true;
  String? _error;
  _AuditorProfile? _profile;

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
        _profile = _AuditorProfile.fromMap(response.data ?? <String, dynamic>{});
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
    final profile = _profile;
    final lang = localeNotifier.value.languageCode;
    return AuditorPageScaffold(
      title: auditorText('profile', lang),
      subtitle: auditorText('profile_subtitle', lang),
      onRefresh: _load,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? AuditorErrorPanel(message: _error!, onRetry: _load)
              : profile == null
                  ? AuditorEmptyPanel(
                      message: auditorText('empty', lang),
                      icon: Icons.person_outline,
                    )
                  : LayoutBuilder(
                      builder: (context, constraints) {
                        final stacked = constraints.maxWidth < 900;
                        if (stacked) {
                          return Column(
                            children: [
                              _ProfileHero(profile: profile),
                              const SizedBox(height: 16),
                              _ProfileDetails(profile: profile),
                            ],
                          );
                        }
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(child: _ProfileHero(profile: profile)),
                            const SizedBox(width: 16),
                            Expanded(flex: 2, child: _ProfileDetails(profile: profile)),
                          ],
                        );
                      },
                    ),
    );
  }
}

class _AuditorProfile {
  const _AuditorProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.gender,
    required this.address,
    required this.dateOfBirth,
  });

  final int id;
  final String name;
  final String email;
  final String phone;
  final String gender;
  final String address;
  final String dateOfBirth;

  factory _AuditorProfile.fromMap(Map<String, dynamic> payload) {
    final root = unwrapAuditorMap(payload);
    final user = auditorMap(root['user']) ?? root;

    return _AuditorProfile(
      id: auditorInt(user['id']),
      name: auditorString(user['name'], fallback: auditorText('auditor', localeNotifier.value.languageCode)),
      email: auditorString(user['email'], fallback: auditorText('no_email', localeNotifier.value.languageCode)),
      phone: auditorString(user['phone'], fallback: auditorText('not_provided', localeNotifier.value.languageCode)),
      gender: auditorStatus(user['gender']),
      address: auditorString(
        user['address'],
        fallback: auditorText('not_provided', localeNotifier.value.languageCode),
      ),
      dateOfBirth: auditorFormatDate(user['date_of_birth']).isNotEmpty
          ? auditorFormatDate(user['date_of_birth'])
          : auditorText('not_provided', localeNotifier.value.languageCode),
    );
  }
}

class _ProfileHero extends StatelessWidget {
  const _ProfileHero({required this.profile});

  final _AuditorProfile profile;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final lang = localeNotifier.value.languageCode;
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF1D4ED8), Color(0xFF0F766E)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(28),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 34,
                  backgroundColor: Colors.white.withValues(alpha: .16),
                  child: Text(
                    profile.name.isNotEmpty ? profile.name.substring(0, 1).toUpperCase() : 'A',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        profile.name,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        profile.email,
                        style: const TextStyle(
                          color: Color(0xFFD7E4FF),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              AuditorStatusChip(
                label: auditorText('auditor_role', lang),
                tone: AuditorStatusTone.good,
              ),
              AuditorStatusChip(
                label: profile.gender.isEmpty ? auditorText('not_provided', lang) : profile.gender,
                tone: AuditorStatusTone.info,
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            auditorText('access', lang),
            style: TextStyle(
              color: isDark ? AfaqColors.slate300 : AfaqColors.slate500,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileDetails extends StatelessWidget {
  const _ProfileDetails({required this.profile});

  final _AuditorProfile profile;

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final items = [
      (auditorText('user_id', lang), profile.id.toString()),
      (auditorText('phone', lang), profile.phone),
      (
        auditorText('gender', lang),
        profile.gender.isEmpty ? auditorText('not_provided', lang) : profile.gender,
      ),
      (auditorText('address', lang), profile.address),
      (auditorText('birth_date', lang), profile.dateOfBirth),
      (auditorText('access', lang), auditorText('auditor_role', lang)),
    ];

    return AfaqPanel(
      child: Wrap(
        spacing: 16,
        runSpacing: 16,
        children: [
          for (final item in items)
            SizedBox(
              width: 260,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: .05)
                      : Colors.black.withValues(alpha: .03),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.$1,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      item.$2,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
