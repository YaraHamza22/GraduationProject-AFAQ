import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../errors/app_exception.dart';
import '../session/session_store.dart';

class ApiClient {
  ApiClient({Dio? dio, SessionStore? sessionStore})
      : _sessionStore = sessionStore ?? SessionStore.instance,
        _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: dotenv.env['FLUTTER_PUBLIC_API_URL'] ?? 'http://127.0.0.1:8000/api/v1',
                connectTimeout: const Duration(seconds: 20),
                receiveTimeout: const Duration(seconds: 20),
                headers: const {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
              ),
            ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = _sessionStore.token;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) {
          handler.reject(error);
        },
      ),
    );
  }

  static final instance = ApiClient();

  final Dio _dio;
  final SessionStore _sessionStore;

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    return _guard(() => _dio.get<T>(path, queryParameters: queryParameters));
  }

  Future<Response<T>> post<T>(String path, {Object? data}) async {
    return _guard(() => _dio.post<T>(path, data: data));
  }

  Future<Response<T>> put<T>(String path, {Object? data}) async {
    return _guard(() => _dio.put<T>(path, data: data));
  }

  Future<Response<T>> delete<T>(String path) async {
    return _guard(() => _dio.delete<T>(path));
  }

  Future<Response<T>> _guard<T>(Future<Response<T>> Function() request) async {
    try {
      return await request();
    } on DioException catch (error) {
      throw _mapDioException(error);
    } catch (_) {
      throw const AppException('Something went wrong. Please try again.');
    }
  }

  AppException _mapDioException(DioException error) {
    final statusCode = error.response?.statusCode;
    final data = error.response?.data;
    final serverMessage = data is Map<String, dynamic> ? data['message'] : null;

    if (serverMessage is String && serverMessage.trim().isNotEmpty) {
      return AppException(serverMessage, statusCode: statusCode);
    }

    return switch (error.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.receiveTimeout ||
      DioExceptionType.sendTimeout =>
        const AppException('The server took too long to respond.'),
      DioExceptionType.badResponse => AppException(
          statusCode == 401
              ? 'Your session has expired. Please login again.'
              : 'Request failed. Please check the details and try again.',
          statusCode: statusCode,
        ),
      DioExceptionType.connectionError => const AppException(
          'No connection. Check your internet and try again.',
        ),
      _ => const AppException('Something went wrong. Please try again.'),
    };
  }
}
