import 'dart:io';

import 'package:flutter/material.dart';

class OfflineFileViewerPage extends StatefulWidget {
  const OfflineFileViewerPage({
    super.key,
    required this.filePath,
    required this.title,
    required this.isTextLike,
  });

  final String filePath;
  final String title;
  final bool isTextLike;

  @override
  State<OfflineFileViewerPage> createState() => _OfflineFileViewerPageState();
}

class _OfflineFileViewerPageState extends State<OfflineFileViewerPage> {
  bool _loading = true;
  String? _error;
  String? _textContent;

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
      if (widget.isTextLike) {
        final file = File(widget.filePath);
        _textContent = await file.readAsString();
      }
      if (!mounted) return;
      setState(() => _loading = false);
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
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            )
          : widget.isTextLike
          ? SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: SelectableText(
                _textContent ?? '',
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
            )
          : Center(
              child: InteractiveViewer(
                child: Image.file(File(widget.filePath)),
              ),
            ),
    );
  }
}
