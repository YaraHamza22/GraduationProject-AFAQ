import 'package:flutter/material.dart';

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
    return AuditorPageScaffold(
      title: 'Auditor Profile',
      subtitle: 'Profile and account identity from the shared auth profile API.',
      onRefresh: _load,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? AuditorErrorPanel(message: _error!, onRetry: _load)
              : profile == null
                  ? const AuditorEmptyPanel(message: 'No profile data found.', icon: Icons.person_outline)
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
      name: auditorString(user['name'], fallback: 'Auditor'),
      email: auditorString(user['email'], fallback: 'No email'),
      phone: auditorString(user['phone'], fallback: 'Not provided'),
      gender: auditorStatus(user['gender']),
      address: auditorString(user['address'], fallback: 'Not provided'),
      dateOfBirth: auditorString(user['date_of_birth'], fallback: 'Not provided'),
    );
  }
}

class _ProfileHero extends StatelessWidget {
  const _ProfileHero({required this.profile});

  final _AuditorProfile profile;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 36,
            child: Text(
              profile.name.isNotEmpty ? profile.name.substring(0, 1).toUpperCase() : 'A',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            profile.name,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Text(profile.email),
          const SizedBox(height: 16),
          const AuditorStatusChip(label: 'Auditor', tone: AuditorStatusTone.good),
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
    final items = [
      ('User ID', profile.id.toString()),
      ('Phone', profile.phone),
      ('Gender', profile.gender),
      ('Address', profile.address),
      ('Birth Date', profile.dateOfBirth),
      ('Access', 'Content auditor'),
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
                  color: Colors.black.withValues(alpha: .03),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.$1,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    Text(item.$2),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
