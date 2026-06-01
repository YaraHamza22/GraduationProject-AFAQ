import 'package:dio/dio.dart';

import '../../../app/app.dart';

Options auditorLocaleOptions({String? locale}) {
  final effectiveLocale = locale != null && locale.trim().isNotEmpty
      ? locale
      : localeNotifier.value.languageCode;
  return Options(
    headers: {
      'Accept-Language': effectiveLocale,
      'X-Locale': effectiveLocale,
    },
  );
}
