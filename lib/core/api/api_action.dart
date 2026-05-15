import 'package:flutter/widgets.dart';

import '../errors/app_exception.dart';
import '../toast/afaq_toast.dart';

class ApiAction {
  const ApiAction._();

  static Future<T?> run<T>(
    BuildContext context, {
    required Future<T> Function() request,
    String? successMessage,
    String fallbackErrorMessage = 'Something went wrong. Please try again.',
  }) async {
    try {
      final result = await request();
      if (context.mounted && successMessage != null) {
        AfaqToast.show(
          context,
          message: successMessage,
          type: AfaqToastType.success,
        );
      }
      return result;
    } on AppException catch (error) {
      if (context.mounted) {
        AfaqToast.show(
          context,
          message: error.message,
          type: AfaqToastType.error,
        );
      }
    } catch (_) {
      if (context.mounted) {
        AfaqToast.show(
          context,
          message: fallbackErrorMessage,
          type: AfaqToastType.error,
        );
      }
    }

    return null;
  }
}
