import 'package:dio/dio.dart';

Options instructorLocaleOptions({String locale = 'en'}) {
  return Options(
    headers: {
      'Accept-Language': locale,
      'X-Locale': locale,
    },
  );
}
