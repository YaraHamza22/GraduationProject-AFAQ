"use client";

export type LandingLanguage = "en" | "ar";

type LandingContent = {
  navbar: {
    navItems: Array<{ label: string; href: string }>;
    login: string;
    navigation: string;
    mobileTitle: string;
    mobileDescription: string;
    searchCourses: string;
    languageLabel: string;
  };
  hero: {
    badge: string;
    titlePrefix: string;
    titleHighlight: string;
    titleSuffix: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    stats: Array<{ label: string; value: string }>;
  };
  about: {
    badge: string;
    title: string;
    titleHighlight: string;
    description: string;
    stats: Array<{ label: string; value: string }>;
    cta: string;
    imageKicker: string;
    imageTitle: string;
    methodKicker: string;
    methodTitle: string;
    methodDescription: string;
    visionKicker: string;
    visionTitle: string;
    visionDescription: string;
  };
  courses: {
    badge: string;
    title: string;
    titleHighlight: string;
    browseAll: string;
    items: Array<{
      title: string;
      instructor: string;
      duration: string;
      rating: number;
      students: string;
      image: string;
      avatar: string;
      color: string;
    }>;
  };
  features: {
    badge: string;
    title: string;
    titleHighlight: string;
    description: string;
    items: Array<{
      title: string;
      description: string;
      color: string;
      bg: string;
    }>;
  };
  testimonials: {
    badge: string;
    title: string;
    titleHighlight: string;
    items: Array<{
      name: string;
      role: string;
      text: string;
      avatar: string;
    }>;
  };
  faq: {
    title: string;
    titleHighlight: string;
    subtitle: string;
    items: Array<{ question: string; answer: string }>;
  };
  footer: {
    description: string;
    platformTitle: string;
    platformLinks: string[];
    companyTitle: string;
    companyLinks: string[];
    contactTitle: string;
    contactItems: string[];
    apply: string;
    copyright: string;
    instructorPortal: string;
    adminPortal: string;
    privacy: string;
    terms: string;
    cookies: string;
  };
};

export const landingContent: Record<LandingLanguage, LandingContent> = {
  en: {
    navbar: {
      navItems: [
        { label: "Home", href: "#home" },
        { label: "Courses", href: "#courses" },
        { label: "Programs", href: "#programs" },
        { label: "About", href: "#about" },
      ],
      login: "Login",
      navigation: "Navigation",
      mobileTitle: "Explore Faster",
      mobileDescription: "Jump through the landing page with a mobile-first menu built for quick scanning.",
      searchCourses: "Search Courses",
      languageLabel: "Switch language",
    },
    hero: {
      badge: "The Future of Digital Education",
      titlePrefix: "Afaq:",
      titleHighlight: "Horizon",
      titleSuffix: "Of Learning.",
      subtitle:
        "A beautifully engineered platform that transforms passive studying into an interactive, immersive, and highly personalized journey.",
      primaryCta: "Start Exploring",
      secondaryCta: "Watch Demo",
      stats: [
        { label: "Active Students", value: "50k+" },
        { label: "User Rating", value: "4.9/5" },
        { label: "Live Programs", value: "120+" },
      ],
    },
    about: {
      badge: "About Afaq",
      title: "Built Like a",
      titleHighlight: "Future-Ready Studio.",
      description:
        "Afaq blends immersive simulation, mentorship, and product-level learning design. Every course is engineered to help students move from theory to confident execution in real-world environments.",
      stats: [
        { label: "Graduated Students", value: "15,000+" },
        { label: "Course Modules", value: "1,200+" },
        { label: "Expert Mentors", value: "250+" },
        { label: "Innovation Awards", value: "12" },
      ],
      cta: "Explore Our Story",
      imageKicker: "Creative Operations",
      imageTitle: "Designing high-impact learning systems",
      methodKicker: "Method",
      methodTitle: "Research x Experience",
      methodDescription: "Every module is tested with practical scenarios before release.",
      visionKicker: "Vision",
      visionTitle: "Learning that ships outcomes.",
      visionDescription: "We build confidence, speed, and depth for modern digital careers.",
    },
    courses: {
      badge: "Explore Knowledge",
      title: "Find Your Path in the",
      titleHighlight: "Afaq",
      browseAll: "Browse All Courses",
      items: [
        {
          title: "Advanced 3D Architecture",
          instructor: "Eng. Sarah Ahmed",
          avatar: "https://i.pravatar.cc/150?u=sarah",
          duration: "12 Weeks",
          rating: 4.9,
          students: "1.2k",
          image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=800",
          color: "from-blue-500 to-cyan-400",
        },
        {
          title: "AI & Neural Networks",
          instructor: "Dr. Ryan Khalid",
          avatar: "https://i.pravatar.cc/150?u=ryan",
          duration: "10 Weeks",
          rating: 4.8,
          students: "850",
          image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800",
          color: "from-purple-500 to-pink-500",
        },
        {
          title: "Digital Business Vision",
          instructor: "Layla Mansour",
          avatar: "https://i.pravatar.cc/150?u=layla",
          duration: "8 Weeks",
          rating: 4.7,
          students: "2.1k",
          image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800",
          color: "from-amber-400 to-orange-500",
        },
      ],
    },
    features: {
      badge: "The Afaq Edge",
      title: "Core Pillars of",
      titleHighlight: "Excellence",
      description:
        "We don't just teach. We transform. Discover the features that make our platform the horizon of modern education.",
      items: [
        {
          title: "Immersive 3D Learning",
          description:
            "Step inside your curriculum with state-of-the-art volumetric simulations and interactive 3D environments.",
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          title: "Expert Mentorship",
          description:
            "Connect with world-class industry leaders who provide personalized guidance and real-world insights.",
          color: "text-indigo-600",
          bg: "bg-indigo-50",
        },
        {
          title: "Global Certification",
          description:
            "Earn industrial-grade certificates recognized by top companies and academic institutions worldwide.",
          color: "text-purple-600",
          bg: "bg-purple-50",
        },
        {
          title: "High-Performance Edge",
          description:
            "Our platform is optimized for speed and reliability, ensuring a seamless experience on any device.",
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
        {
          title: "AI-Powered Insights",
          description:
            "Get personalized learning paths and detailed progress analytics powered by advanced AI models.",
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          title: "Modular Architecture",
          description:
            "Learn at your own pace with bite-sized, stackable modules designed for modern professional busy schedules.",
          color: "text-rose-600",
          bg: "bg-rose-50",
        },
      ],
    },
    testimonials: {
      badge: "Voices of Success",
      title: "Community",
      titleHighlight: "Endorsements",
      items: [
        {
          name: "Alex Johnson",
          role: "Senior Developer",
          text: "Afaq has completely changed my approach to distributed systems. The 3D simulations are truly a game-changer in understanding complex architectures.",
          avatar: "https://i.pravatar.cc/150?u=alex",
        },
        {
          name: "Maria Garcia",
          role: "Digital Artist",
          text: "The quality of the instructors is unmatched. Every module on the platform feels like a deep dive into the absolute peak of industrial design.",
          avatar: "https://i.pravatar.cc/150?u=maria",
        },
        {
          name: "Omar Zayed",
          role: "Project Manager",
          text: "I was looking for a platform that could keep up with modern tech trends, and Afaq delivered exactly that. The certification opened new doors for my career.",
          avatar: "https://i.pravatar.cc/150?u=omar",
        },
        {
          name: "Sophia Chen",
          role: "Product Designer",
          text: "The attention to detail and user experience on this platform is a masterclass in modern digital services. Truly worth every minute invested.",
          avatar: "https://i.pravatar.cc/150?u=sophia",
        },
      ],
    },
    faq: {
      title: "Curiosity",
      titleHighlight: "Clarified",
      subtitle: "Finding answers to your most frequent explorations.",
      items: [
        {
          question: "Do I need any previous technical experience?",
          answer:
            "Our courses range from beginner to expert. Each program details the necessary prerequisites, ensuring you start exactly where your current knowledge ends.",
        },
        {
          question: "How long is each certification valid?",
          answer:
            "Afaq certifications are globally recognized and have no expiration date. However, we recommend retaking updated modules every 2 years to stay current with technology shifts.",
        },
        {
          question: "Can I access the 3D simulations on mobile?",
          answer:
            "Yes! Our engine is optimized for high-performance mobile browsers and tablets, allowing you to learn in the knowledge universe from anywhere.",
        },
        {
          question: "Is there mentorship support available?",
          answer:
            "Absolutely. Depending on your course level, you get 1-on-1 sessions, group workshops, and 24/7 technical support from our lead industrial mentors.",
        },
      ],
    },
    footer: {
      description:
        "Redefining the horizon of knowledge through immersive digital experiences and world-class certification.",
      platformTitle: "The Platform",
      platformLinks: ["Explore Courses", "Immersive 3D", "Certifications", "Success Stories", "Industrial Partners"],
      companyTitle: "Company",
      companyLinks: ["About Afaq", "Mission & Vision", "Our Mentors", "Careers", "Press Kit"],
      contactTitle: "Connect With Us",
      contactItems: ["Syria, Damascus", "+963 999 999 999", "hello@afaq.edu"],
      apply: "Apply for Admission",
      copyright: "All Rights Reserved. Built for the future of learning.",
      instructorPortal: "Instructor Portal",
      adminPortal: "Admin Portal",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      cookies: "Cookie Policy",
    },
  },
  ar: {
    navbar: {
      navItems: [
        { label: "الرئيسية", href: "#home" },
        { label: "الدورات", href: "#courses" },
        { label: "البرامج", href: "#programs" },
        { label: "من نحن", href: "#about" },
      ],
      login: "تسجيل الدخول",
      navigation: "التنقل",
      mobileTitle: "استكشف بسرعة",
      mobileDescription: "تنقل في صفحة الهبوط بسهولة عبر قائمة مهيأة للهاتف وتساعدك على الوصول السريع لكل قسم.",
      searchCourses: "ابحث عن الدورات",
      languageLabel: "تبديل اللغة",
    },
    hero: {
      badge: "مستقبل التعليم الرقمي",
      titlePrefix: "آفاق:",
      titleHighlight: "أفق",
      titleSuffix: "التعلّم.",
      subtitle:
        "منصة مصممة بعناية لتحول الدراسة التقليدية إلى رحلة تفاعلية غامرة وشخصية تناسب كل متعلم.",
      primaryCta: "ابدأ الاستكشاف",
      secondaryCta: "شاهد العرض",
      stats: [
        { label: "طالب نشط", value: "+50 ألف" },
        { label: "تقييم المستخدمين", value: "4.9/5" },
        { label: "برنامج مباشر", value: "+120" },
      ],
    },
    about: {
      badge: "عن آفاق",
      title: "منصة مبنية",
      titleHighlight: "لعصر المستقبل.",
      description:
        "تمزج آفاق بين المحاكاة الغامرة والإرشاد والتصميم التعليمي المتقن. كل دورة مصممة لتأخذ الطالب من الفهم النظري إلى التطبيق الواثق في الواقع العملي.",
      stats: [
        { label: "طالب متخرج", value: "+15 ألف" },
        { label: "وحدة تعليمية", value: "+1,200" },
        { label: "مرشد خبير", value: "+250" },
        { label: "جائزة ابتكار", value: "12" },
      ],
      cta: "اكتشف قصتنا",
      imageKicker: "عمليات إبداعية",
      imageTitle: "نصمم أنظمة تعلم عالية الأثر",
      methodKicker: "المنهج",
      methodTitle: "البحث × الخبرة",
      methodDescription: "يتم اختبار كل وحدة عبر سيناريوهات عملية قبل إطلاقها.",
      visionKicker: "الرؤية",
      visionTitle: "تعلّم يصنع نتائج حقيقية.",
      visionDescription: "نبني الثقة والسرعة والعمق لمهن العصر الرقمي.",
    },
    courses: {
      badge: "استكشف المعرفة",
      title: "اعثر على مسارك داخل",
      titleHighlight: "منظومة آفاق",
      browseAll: "تصفح جميع الدورات",
      items: [
        {
          title: "العمارة ثلاثية الأبعاد المتقدمة",
          instructor: "م. سارة أحمد",
          avatar: "https://i.pravatar.cc/150?u=sarah",
          duration: "12 أسبوعًا",
          rating: 4.9,
          students: "1.2k",
          image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=800",
          color: "from-blue-500 to-cyan-400",
        },
        {
          title: "الذكاء الاصطناعي والشبكات العصبية",
          instructor: "د. ريان خالد",
          avatar: "https://i.pravatar.cc/150?u=ryan",
          duration: "10 أسابيع",
          rating: 4.8,
          students: "850",
          image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800",
          color: "from-purple-500 to-pink-500",
        },
        {
          title: "رؤية الأعمال الرقمية",
          instructor: "ليلى منصور",
          avatar: "https://i.pravatar.cc/150?u=layla",
          duration: "8 أسابيع",
          rating: 4.7,
          students: "2.1k",
          image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800",
          color: "from-amber-400 to-orange-500",
        },
      ],
    },
    features: {
      badge: "ميزة آفاق",
      title: "ركائز",
      titleHighlight: "التميّز",
      description:
        "نحن لا نعلّم فقط، بل نحدث تحولًا حقيقيًا. اكتشف الميزات التي تجعل منصتنا أفق التعليم الحديث.",
      items: [
        {
          title: "تعلم غامر ثلاثي الأبعاد",
          description: "ادخل إلى المنهج عبر محاكاة حجمية متقدمة وبيئات ثلاثية الأبعاد تفاعلية.",
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          title: "إرشاد من خبراء",
          description: "تواصل مع قادة صناعة عالميين يقدمون توجيهًا شخصيًا ورؤى عملية من الواقع.",
          color: "text-indigo-600",
          bg: "bg-indigo-50",
        },
        {
          title: "شهادات معترف بها عالميًا",
          description: "احصل على شهادات احترافية موثوقة لدى الشركات والمؤسسات الأكاديمية حول العالم.",
          color: "text-purple-600",
          bg: "bg-purple-50",
        },
        {
          title: "أداء عالٍ واستقرار",
          description: "منصتنا محسنة للسرعة والاعتمادية لتمنحك تجربة سلسة على أي جهاز.",
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
        {
          title: "تحليلات مدعومة بالذكاء الاصطناعي",
          description: "احصل على مسارات تعلم مخصصة وتحليلات دقيقة لتقدمك الدراسي.",
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          title: "هيكلية تعليمية مرنة",
          description: "تعلم وفق وتيرتك عبر وحدات قصيرة قابلة للتجميع تناسب الجداول المهنية المزدحمة.",
          color: "text-rose-600",
          bg: "bg-rose-50",
        },
      ],
    },
    testimonials: {
      badge: "أصوات النجاح",
      title: "تجارب",
      titleHighlight: "مجتمعنا",
      items: [
        {
          name: "أليكس جونسون",
          role: "مطوّر أول",
          text: "غيّرت آفاق بالكامل طريقتي في فهم الأنظمة الموزعة. المحاكاة ثلاثية الأبعاد كانت فارقًا حقيقيًا في استيعاب البنى المعقدة.",
          avatar: "https://i.pravatar.cc/150?u=alex",
        },
        {
          name: "ماريا غارسيا",
          role: "فنانة رقمية",
          text: "جودة المدرّبين استثنائية. كل وحدة على المنصة تبدو كأنها رحلة عميقة داخل قمة التصميم الصناعي.",
          avatar: "https://i.pravatar.cc/150?u=maria",
        },
        {
          name: "عمر زايد",
          role: "مدير مشاريع",
          text: "كنت أبحث عن منصة تواكب اتجاهات التقنية الحديثة، وآفاق قدمت ذلك تمامًا. الشهادة فتحت لي أبوابًا جديدة في مسيرتي.",
          avatar: "https://i.pravatar.cc/150?u=omar",
        },
        {
          name: "صوفيا تشين",
          role: "مصممة منتجات",
          text: "الاهتمام بالتفاصيل وتجربة المستخدم في هذه المنصة درس حقيقي في الخدمات الرقمية الحديثة. كل دقيقة فيها كانت تستحق.",
          avatar: "https://i.pravatar.cc/150?u=sophia",
        },
      ],
    },
    faq: {
      title: "إجابات",
      titleHighlight: "واضحة",
      subtitle: "كل ما تحتاج معرفته قبل أن تبدأ رحلتك التعليمية معنا.",
      items: [
        {
          question: "هل أحتاج إلى خبرة تقنية سابقة؟",
          answer: "لدينا دورات من المستوى المبتدئ حتى الاحترافي، وكل برنامج يوضح المتطلبات اللازمة لتبدأ من النقطة المناسبة لك.",
        },
        {
          question: "ما مدة صلاحية الشهادات؟",
          answer: "شهادات آفاق معترف بها ولا تمتلك تاريخ انتهاء، لكننا ننصح بتحديث الوحدات كل عامين لمواكبة تغيرات التقنية.",
        },
        {
          question: "هل يمكنني استخدام المحاكاة ثلاثية الأبعاد على الهاتف؟",
          answer: "نعم، محركنا مهيأ للهواتف والأجهزة اللوحية عالية الأداء لتتمكن من التعلم من أي مكان.",
        },
        {
          question: "هل يتوفر دعم وإرشاد؟",
          answer: "بالتأكيد، حسب مستوى الدورة ستحصل على جلسات فردية وورش جماعية ودعم تقني مستمر من خبرائنا.",
        },
      ],
    },
    footer: {
      description: "نعيد تعريف أفق المعرفة من خلال تجارب رقمية غامرة وشهادات تعليمية بمعايير عالمية.",
      platformTitle: "المنصة",
      platformLinks: ["استكشاف الدورات", "تجارب ثلاثية الأبعاد", "الشهادات", "قصص النجاح", "شركاء الصناعة"],
      companyTitle: "الشركة",
      companyLinks: ["عن آفاق", "الرسالة والرؤية", "المرشدون", "الوظائف", "الملف الإعلامي"],
      contactTitle: "تواصل معنا",
      contactItems: ["سوريا، دمشق", "+963 999 999 999", "hello@afaq.edu"],
      apply: "قدّم للانضمام",
      copyright: "جميع الحقوق محفوظة. بُنيت لمستقبل التعلّم.",
      instructorPortal: "بوابة المدرب",
      adminPortal: "بوابة الإدارة",
      privacy: "سياسة الخصوصية",
      terms: "شروط الخدمة",
      cookies: "سياسة ملفات الارتباط",
    },
  },
};
