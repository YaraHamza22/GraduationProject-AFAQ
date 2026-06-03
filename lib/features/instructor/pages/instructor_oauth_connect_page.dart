import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class InstructorOAuthConnectPage extends StatefulWidget {
  const InstructorOAuthConnectPage({
    super.key,
    required this.providerLabel,
    required this.authorizeUrl,
  });

  final String providerLabel;
  final String authorizeUrl;

  @override
  State<InstructorOAuthConnectPage> createState() => _InstructorOAuthConnectPageState();
}

class _InstructorOAuthConnectPageState extends State<InstructorOAuthConnectPage> {
  late final WebViewController _controller;

  bool _loading = true;
  String? _redirectHint;

  @override
  void initState() {
    super.initState();
    _redirectHint = Uri.tryParse(widget.authorizeUrl)?.queryParameters['redirect_uri'];
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (!mounted) return;
            setState(() => _loading = true);
          },
          onPageFinished: (_) {
            if (!mounted) return;
            setState(() => _loading = false);
          },
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            if (uri == null) {
              return NavigationDecision.navigate;
            }

            final code = uri.queryParameters['code'];
            final error = uri.queryParameters['error'];

            if (code != null && code.trim().isNotEmpty) {
              Navigator.of(context).pop(OAuthConnectResult(code: code.trim()));
              return NavigationDecision.prevent;
            }

            if (error != null && error.trim().isNotEmpty) {
              Navigator.of(context).pop(
                OAuthConnectResult(
                  error: uri.queryParameters['error_description'] ?? error.trim(),
                ),
              );
              return NavigationDecision.prevent;
            }

            return NavigationDecision.navigate;
          },
          onWebResourceError: (_) {
            if (!mounted) return;
            setState(() => _loading = false);
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.authorizeUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF09111F),
      appBar: AppBar(
        backgroundColor: const Color(0xFF09111F),
        foregroundColor: Colors.white,
        title: Text('Connect ${widget.providerLabel}'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.white.withValues(alpha: .08)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Sign in to ${widget.providerLabel}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Complete the provider sign-in and access approval here. Afaq will capture the authorization code automatically.',
                      style: TextStyle(
                        color: Color(0xFFCBD5E1),
                        fontWeight: FontWeight.w600,
                        height: 1.45,
                      ),
                    ),
                    if (_redirectHint != null && _redirectHint!.trim().isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: .05),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Text(
                          'Redirect URI: $_redirectHint',
                          style: const TextStyle(
                            color: Color(0xFF93C5FD),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: Colors.white.withValues(alpha: .08)),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(28),
                    child: Stack(
                      children: [
                        Positioned.fill(child: WebViewWidget(controller: _controller)),
                        if (_loading)
                          Positioned.fill(
                            child: ColoredBox(
                              color: Colors.white.withValues(alpha: .70),
                              child: const Center(child: CircularProgressIndicator()),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class OAuthConnectResult {
  const OAuthConnectResult({
    this.code,
    this.error,
  });

  final String? code;
  final String? error;
}
