import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class AfaqLiveMeetingPage extends StatefulWidget {
  const AfaqLiveMeetingPage({
    super.key,
    required this.roomId,
    required this.meetingUrl,
    required this.title,
    required this.isArabic,
  });

  final String roomId;
  final String meetingUrl;
  final String title;
  final bool isArabic;

  @override
  State<AfaqLiveMeetingPage> createState() => _AfaqLiveMeetingPageState();
}

class _AfaqLiveMeetingPageState extends State<AfaqLiveMeetingPage> {
  late final WebViewController _controller;

  bool _pageLoading = true;
  bool _cameraEnabled = true;
  bool _micEnabled = true;
  bool _captionsEnabled = false;
  bool _handRaised = false;
  int _selectedTab = 0;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (!mounted) return;
            setState(() => _pageLoading = true);
          },
          onPageFinished: (_) {
            if (!mounted) return;
            setState(() => _pageLoading = false);
          },
          onWebResourceError: (_) {
            if (!mounted) return;
            setState(() => _pageLoading = false);
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.meetingUrl));
  }

  String get _roomLabel => widget.isArabic ? 'الغرفة' : 'Room';

  String get _readyTitle => widget.isArabic ? 'غرفة Afaq جاهزة' : 'Afaq room is ready';

  String get _leaveTitle => widget.isArabic ? 'مغادرة غرفة Afaq؟' : 'Leave Afaq Live?';

  String get _leaveBody => widget.isArabic
      ? 'يمكنك العودة إلى الصفحة السابقة في أي وقت، وسيتم إغلاق شاشة الاجتماع الحالية.'
      : 'You can return to the previous page anytime, and this meeting screen will close.';

  Future<void> _confirmLeave() async {
    final shouldLeave = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
          backgroundColor: const Color(0xFF0F172A),
          title: Text(
            _leaveTitle,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900),
          ),
          content: Text(
            _leaveBody,
            style: const TextStyle(
              color: Color(0xFFCBD5E1),
              fontWeight: FontWeight.w600,
              height: 1.45,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(widget.isArabic ? 'إلغاء' : 'Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                foregroundColor: Colors.white,
              ),
              child: Text(widget.isArabic ? 'مغادرة' : 'Leave'),
            ),
          ],
        );
      },
    );

    if (shouldLeave == true && mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final isUltraWide = size.width >= 1800;
    final isDesktop = size.width >= 1280;
    final isTablet = size.width >= 760 && size.width < 1280;
    final isMobile = size.width < 760;
    final isCompactMobile = size.width < 390;
    final horizontalPadding = isUltraWide
        ? 30.0
        : isDesktop
        ? 28.0
        : isTablet
        ? 20.0
        : isCompactMobile
        ? 10.0
        : 14.0;
    final bottomSpacing = isMobile ? 14.0 : 18.0;
    final maxContentWidth = isUltraWide ? 1880.0 : 1560.0;

    return Directionality(
      textDirection: widget.isArabic ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: const Color(0xFF07111F),
        body: SafeArea(
          child: Stack(
            children: [
              const Positioned.fill(child: _AmbientMeetingBackground()),
              Padding(
                padding: EdgeInsets.fromLTRB(horizontalPadding, 14, horizontalPadding, bottomSpacing),
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: maxContentWidth),
                    child: Column(
                      children: [
                        _buildTopBar(
                          isDesktop: isDesktop,
                          isTablet: isTablet,
                          isMobile: isMobile,
                        ),
                        SizedBox(height: isMobile ? 12 : 18),
                        Expanded(
                          child: isDesktop
                              ? Row(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    Expanded(flex: isUltraWide ? 10 : 9, child: _buildMeetingStage(isMobile: false)),
                                    const SizedBox(width: 18),
                                    SizedBox(
                                      width: isUltraWide ? 400 : 360,
                                      child: _buildSidePanel(compact: false),
                                    ),
                                  ],
                                )
                              : Column(
                                  children: [
                                    Expanded(
                                      flex: isTablet ? 7 : 9,
                                      child: _buildMeetingStage(isMobile: isMobile),
                                    ),
                                    SizedBox(height: isMobile ? 12 : 16),
                                    if (isTablet)
                                      SizedBox(
                                        height: 270,
                                        child: _buildSidePanel(compact: true),
                                      )
                                    else
                                      _buildMobileSummaryBar(),
                                  ],
                                ),
                        ),
                        SizedBox(height: isMobile ? 12 : 16),
                        _buildBottomControls(isMobile: isMobile),
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

  Widget _buildTopBar({
    required bool isDesktop,
    required bool isTablet,
    required bool isMobile,
  }) {
    final titleBlock = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: Colors.white,
            fontSize: isMobile ? 20 : 24,
            fontWeight: FontWeight.w900,
            letterSpacing: -.4,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          '$_roomLabel: ${widget.roomId}',
          style: const TextStyle(
            color: Color(0xFF94A3B8),
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );

    final actions = Wrap(
      alignment: WrapAlignment.end,
      spacing: 10,
      runSpacing: 10,
      children: [
        if (!isMobile)
          _heroInfoTile(
            icon: Icons.shield_outlined,
            label: widget.isArabic ? 'مشفر وآمن' : 'Encrypted and secure',
          ),
        if (isDesktop)
          _heroInfoTile(
            icon: Icons.high_quality_rounded,
            label: widget.isArabic ? 'تجربة بجودة عالية' : 'High-quality experience',
          ),
        _topPill('HD'),
        _topPill(widget.isArabic ? 'آمن' : 'Secure'),
        if (isMobile)
          _topTextButton(
            icon: Icons.people_alt_outlined,
            label: widget.isArabic ? 'المشاركون' : 'People',
            onTap: _openMobilePanel,
          ),
      ],
    );

    return Container(
      padding: EdgeInsets.all(isMobile ? 12 : 16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .15),
            blurRadius: 30,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: isMobile
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _topIconButton(
                      icon: Icons.arrow_back_rounded,
                      onTap: _confirmLeave,
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: titleBlock),
                  ],
                ),
                const SizedBox(height: 12),
                actions,
              ],
            )
          : Row(
              children: [
                _topIconButton(
                  icon: Icons.arrow_back_rounded,
                  onTap: _confirmLeave,
                ),
                const SizedBox(width: 14),
                Expanded(
                  flex: isDesktop ? 5 : 4,
                  child: titleBlock,
                ),
                const SizedBox(width: 14),
                Expanded(
                  flex: isDesktop ? 6 : 5,
                  child: actions,
                ),
              ],
            ),
    );
  }

  Widget _buildMeetingStage({required bool isMobile}) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(isMobile ? 28 : 34),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF020617).withValues(alpha: .30),
            blurRadius: 40,
            offset: const Offset(0, 24),
          ),
        ],
        gradient: const LinearGradient(
          colors: [Color(0xFF0A1221), Color(0xFF08101D)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(isMobile ? 28 : 34),
        child: Stack(
          children: [
            Positioned.fill(child: WebViewWidget(controller: _controller)),
            Positioned.fill(
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.black.withValues(alpha: .26),
                        Colors.transparent,
                        Colors.black.withValues(alpha: .24),
                      ],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              top: 18,
              left: 18,
              right: 18,
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                runSpacing: 10,
                spacing: 10,
                children: [
                  _glassPill(
                    icon: Icons.fiber_manual_record_rounded,
                    label: widget.isArabic ? 'مباشر الآن' : 'Live now',
                    color: const Color(0xFF22C55E),
                  ),
                  _glassPill(
                    icon: Icons.lock_outline_rounded,
                    label: widget.isArabic ? 'غرفة خاصة' : 'Private room',
                    color: const Color(0xFF7DD3FC),
                  ),
                ],
              ),
            ),
            Positioned(
              left: 18,
              right: 18,
              bottom: isMobile ? 16 : 20,
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                runSpacing: 12,
                spacing: 12,
                crossAxisAlignment: WrapCrossAlignment.end,
                children: [
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: _stageHeadlineCard(),
                  ),
                  _localPreviewTile(isMobile: isMobile),
                ],
              ),
            ),
            if (_pageLoading) _loadingOverlay(),
          ],
        ),
      ),
    );
  }

  Widget _stageHeadlineCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A).withValues(alpha: .64),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .18),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w900,
              height: 1.05,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            widget.isArabic
                ? 'مساحة حديثة، نظيفة، وسريعة للتركيز على الاجتماع بدون تشتيت.'
                : 'A clean, focused live space built to keep attention on the meeting.',
            style: const TextStyle(
              color: Color(0xFFB8C4D9),
              fontWeight: FontWeight.w600,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }

  Widget _localPreviewTile({required bool isMobile}) {
    return Container(
      width: isMobile ? 118 : 160,
      height: isMobile ? 148 : 194,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        border: Border.all(color: Colors.white.withValues(alpha: .10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const CircleAvatar(
                radius: 12,
                backgroundColor: Color(0xFF2563EB),
                child: Text(
                  'Y',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  widget.isArabic ? 'أنت' : 'You',
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const Spacer(),
          Center(
            child: Icon(
              _cameraEnabled ? Icons.videocam_rounded : Icons.videocam_off_rounded,
              color: Colors.white.withValues(alpha: .90),
              size: 34,
            ),
          ),
          const Spacer(),
          Row(
            children: [
              _miniStatusDot(
                color: _micEnabled ? const Color(0xFF22C55E) : const Color(0xFFEF4444),
              ),
              const SizedBox(width: 6),
              Text(
                _cameraEnabled
                    ? (widget.isArabic ? 'جاهز للبث' : 'Ready on camera')
                    : (widget.isArabic ? 'الكاميرا متوقفة' : 'Camera off'),
                style: const TextStyle(
                  color: Color(0xFFCBD5E1),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _loadingOverlay() {
    return Positioned.fill(
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: const Color(0xFF020617).withValues(alpha: .60),
        ),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 320),
            padding: const EdgeInsets.all(26),
            decoration: BoxDecoration(
              color: const Color(0xFF111C30).withValues(alpha: .96),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: Colors.white.withValues(alpha: .08)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(
                  width: 40,
                  height: 40,
                  child: CircularProgressIndicator(
                    strokeWidth: 3,
                    valueColor: AlwaysStoppedAnimation(Color(0xFF60A5FA)),
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  widget.isArabic ? 'جاري تجهيز غرفة البث' : 'Preparing your live room',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  widget.isArabic
                      ? 'يتم الآن تحميل تجربة الاجتماع داخل التطبيق بأفضل تنسيق للشاشة.'
                      : 'Loading the in-app meeting experience with a screen-optimized layout.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontWeight: FontWeight.w600,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSidePanel({required bool compact}) {
    final tabs = [
      widget.isArabic ? 'الأشخاص' : 'People',
      widget.isArabic ? 'المحادثة' : 'Chat',
      widget.isArabic ? 'المعلومات' : 'Info',
    ];

    return Container(
      padding: EdgeInsets.all(compact ? 16 : 18),
      decoration: BoxDecoration(
        color: const Color(0xFF0D1728).withValues(alpha: .92),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.isArabic ? 'جلسة Afaq Live' : 'Afaq Live Session',
            style: TextStyle(
              color: Colors.white,
              fontSize: compact ? 18 : 20,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            widget.isArabic
                ? 'لوحة جانبية سريعة للأشخاص، الدردشة، وملخص الجلسة.'
                : 'A fast side panel for people, chat, and session details.',
            style: const TextStyle(
              color: Color(0xFF94A3B8),
              fontWeight: FontWeight.w600,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: List.generate(
              tabs.length,
              (index) => GestureDetector(
                onTap: () => setState(() => _selectedTab = index),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                  decoration: BoxDecoration(
                    color: _selectedTab == index
                        ? const Color(0xFF2563EB).withValues(alpha: .24)
                        : Colors.white.withValues(alpha: .04),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: _selectedTab == index
                          ? const Color(0xFF60A5FA)
                          : Colors.white.withValues(alpha: .08),
                    ),
                  ),
                  child: Text(
                    tabs[index],
                    style: TextStyle(
                      color: _selectedTab == index ? Colors.white : const Color(0xFF94A3B8),
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: IndexedStack(
              index: _selectedTab,
              children: [
                _peopleTab(),
                _chatTab(),
                _infoTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _peopleTab() {
    final people = [
      _participant(
        widget.isArabic ? 'أنت' : 'You',
        widget.isArabic ? 'التحكمات جاهزة' : 'Host controls ready',
        const Color(0xFF60A5FA),
      ),
      _participant('Maha Almutairi', widget.isArabic ? 'تتحدث الآن' : 'Speaking', const Color(0xFF34D399)),
      _participant('Omar Nasser', widget.isArabic ? 'يستمع' : 'Listening', const Color(0xFFFBBF24)),
      _participant('Sara Adel', widget.isArabic ? 'من جهاز لوحي' : 'Joined from tablet', const Color(0xFFF472B6)),
    ];

    return ListView(
      children: [
        _summaryCard(
          icon: Icons.groups_rounded,
          title: widget.isArabic ? 'الموجودون الآن' : 'In the room now',
          value: '4',
          accent: const Color(0xFF22C55E),
        ),
        const SizedBox(height: 12),
        _summaryCard(
          icon: Icons.wifi_tethering_rounded,
          title: widget.isArabic ? 'استقرار الجلسة' : 'Session stability',
          value: widget.isArabic ? 'ممتازة' : 'Excellent',
          accent: const Color(0xFF38BDF8),
        ),
        const SizedBox(height: 14),
        ...people,
      ],
    );
  }

  Widget _chatTab() {
    return ListView(
      children: [
        _messageBubble(
          author: widget.isArabic ? 'المشرف' : 'Moderator',
          body: widget.isArabic
              ? 'أهلًا بالجميع، سنبدأ خلال لحظات.'
              : 'Welcome everyone, we will begin in a moment.',
          mine: false,
        ),
        _messageBubble(
          author: widget.isArabic ? 'أنت' : 'You',
          body: widget.isArabic ? 'الصوت واضح، شكرًا.' : 'Audio is clear, thank you.',
          mine: true,
        ),
        _messageBubble(
          author: 'Maha',
          body: widget.isArabic
              ? 'هل يمكن مشاركة رابط المواد بعد الجلسة؟'
              : 'Can we share the materials link after the session?',
          mine: false,
        ),
      ],
    );
  }

  Widget _infoTab() {
    return ListView(
      children: [
        _summaryCard(
          icon: Icons.security_rounded,
          title: widget.isArabic ? 'أمان الجلسة' : 'Session security',
          value: widget.isArabic ? 'مشفرة' : 'Encrypted',
          accent: const Color(0xFF60A5FA),
        ),
        const SizedBox(height: 12),
        _summaryCard(
          icon: Icons.hd_rounded,
          title: widget.isArabic ? 'جودة الفيديو' : 'Video quality',
          value: '1080p',
          accent: const Color(0xFFA78BFA),
        ),
        const SizedBox(height: 12),
        _summaryCard(
          icon: Icons.link_rounded,
          title: widget.isArabic ? 'معرف الغرفة' : 'Room ID',
          value: widget.roomId,
          accent: const Color(0xFFF59E0B),
        ),
      ],
    );
  }

  Widget _buildMobileSummaryBar() {
    return InkWell(
      onTap: _openMobilePanel,
      borderRadius: BorderRadius.circular(24),
      child: Ink(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A).withValues(alpha: .85),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.white.withValues(alpha: .08)),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: const Color(0xFF1D4ED8).withValues(alpha: .22),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.dashboard_customize_rounded, color: Color(0xFF93C5FD)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _readyTitle,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.isArabic
                        ? 'افتح لوحة المشاركين والدردشة من هنا.'
                        : 'Open the people and chat panel from here.',
                    style: const TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF94A3B8), size: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomControls({required bool isMobile}) {
    final controls = [
      _controlButton(
        icon: _micEnabled ? Icons.mic_rounded : Icons.mic_off_rounded,
        label: widget.isArabic ? 'الميك' : 'Mic',
        enabled: _micEnabled,
        onTap: () => setState(() => _micEnabled = !_micEnabled),
      ),
      _controlButton(
        icon: _cameraEnabled ? Icons.videocam_rounded : Icons.videocam_off_rounded,
        label: widget.isArabic ? 'الكاميرا' : 'Camera',
        enabled: _cameraEnabled,
        onTap: () => setState(() => _cameraEnabled = !_cameraEnabled),
      ),
      _controlButton(
        icon: _captionsEnabled ? Icons.closed_caption_rounded : Icons.closed_caption_off_rounded,
        label: widget.isArabic ? 'الترجمة' : 'Captions',
        enabled: _captionsEnabled,
        onTap: () => setState(() => _captionsEnabled = !_captionsEnabled),
      ),
      _controlButton(
        icon: Icons.pan_tool_alt_rounded,
        label: widget.isArabic ? 'رفع اليد' : 'Raise hand',
        enabled: _handRaised,
        onTap: () => setState(() => _handRaised = !_handRaised),
      ),
      _controlButton(
        icon: Icons.refresh_rounded,
        label: widget.isArabic ? 'تحديث' : 'Refresh',
        enabled: true,
        onTap: () => _controller.reload(),
      ),
      _hangUpButton(),
    ];

    return Container(
      width: double.infinity,
      padding: EdgeInsets.symmetric(horizontal: isMobile ? 10 : 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF08111C).withValues(alpha: .92),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .34),
            blurRadius: 30,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            for (var i = 0; i < controls.length; i++) ...[
              controls[i],
              if (i != controls.length - 1) const SizedBox(width: 10),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _openMobilePanel() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return FractionallySizedBox(
          heightFactor: .84,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
            child: _buildSidePanel(compact: false),
          ),
        );
      },
    );
  }

  Widget _topIconButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Ink(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .08),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: Colors.white.withValues(alpha: .08)),
          ),
          child: Icon(icon, color: Colors.white),
        ),
      ),
    );
  }

  Widget _heroInfoTile({
    required IconData icon,
    required String label,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .05),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: .06)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: const Color(0xFF93C5FD), size: 18),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }

  Widget _topPill(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .06),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
      ),
    );
  }

  Widget _topTextButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .06),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: Colors.white.withValues(alpha: .08)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _glassPill({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A).withValues(alpha: .46),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }

  Widget _miniStatusDot({required Color color}) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }

  Widget _controlButton({
    required IconData icon,
    required String label,
    required bool enabled,
    required VoidCallback onTap,
  }) {
    final background = enabled
        ? Colors.white.withValues(alpha: .08)
        : const Color(0xFF7F1D1D).withValues(alpha: .78);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: Colors.white.withValues(alpha: .08)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _hangUpButton() {
    return FilledButton.icon(
      onPressed: _confirmLeave,
      style: FilledButton.styleFrom(
        backgroundColor: const Color(0xFFEF4444),
        foregroundColor: Colors.white,
        minimumSize: const Size(132, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      ),
      icon: const Icon(Icons.call_end_rounded),
      label: Text(widget.isArabic ? 'إنهاء' : 'Leave'),
    );
  }

  Widget _participant(String name, String status, Color color) {
    final initials = name.trim().isEmpty ? '?' : name.trim().characters.first.toUpperCase();
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .04),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: color.withValues(alpha: .22),
            child: Text(
              initials,
              style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 20),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  status,
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
          const Icon(Icons.more_horiz_rounded, color: Color(0xFF94A3B8)),
        ],
      ),
    );
  }

  Widget _summaryCard({
    required IconData icon,
    required String title,
    required String value,
    required Color accent,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [accent.withValues(alpha: .18), Colors.white.withValues(alpha: .04)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: accent.withValues(alpha: .32)),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: .18),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: accent),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(color: Color(0xFFCBD5E1), fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _messageBubble({
    required String author,
    required String body,
    required bool mine,
  }) {
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        constraints: const BoxConstraints(maxWidth: 280),
        decoration: BoxDecoration(
          color: mine ? const Color(0xFF1D4ED8) : Colors.white.withValues(alpha: .06),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: Colors.white.withValues(alpha: .08)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              author,
              style: TextStyle(
                color: mine ? Colors.white : const Color(0xFF93C5FD),
                fontWeight: FontWeight.w900,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              body,
              style: const TextStyle(color: Colors.white, height: 1.45, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

class _AmbientMeetingBackground extends StatelessWidget {
  const _AmbientMeetingBackground();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF07111F), Color(0xFF0B1730), Color(0xFF07111F)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: -110,
            left: -80,
            child: _glowBlob(
              size: 260,
              colors: const [Color(0xFF1D4ED8), Color(0x001D4ED8)],
            ),
          ),
          Positioned(
            top: 140,
            right: -70,
            child: _glowBlob(
              size: 220,
              colors: const [Color(0xFF0EA5E9), Color(0x000EA5E9)],
            ),
          ),
          Positioned(
            bottom: -130,
            left: 80,
            child: _glowBlob(
              size: 280,
              colors: const [Color(0xFF7C3AED), Color(0x007C3AED)],
            ),
          ),
        ],
      ),
    );
  }

  Widget _glowBlob({
    required double size,
    required List<Color> colors,
  }) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: colors),
        ),
      ),
    );
  }
}
