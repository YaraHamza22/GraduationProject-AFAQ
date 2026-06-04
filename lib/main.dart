import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'app/app.dart';
import 'features/offline/data/offline_quiz_sync_service.dart';
import 'core/session/session_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  await SessionStore.instance.initialize();
  if (SessionStore.instance.isLoggedIn) {
    unawaited(const OfflineQuizSyncService().syncPendingActions());
  }
  runApp(const AfaaqApp());
}
