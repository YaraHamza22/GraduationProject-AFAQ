import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class CertificateService {
  const CertificateService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<List<int>>> getCertificatePdf({
    required int courseId,
    int? studentId,
  }) {
    return _client.get<List<int>>(
      ApiEndpoints.courseCertificate(courseId),
      queryParameters: {
        if (studentId != null) 'student_id': studentId,
      },
      options: Options(responseType: ResponseType.bytes),
    );
  }
}
