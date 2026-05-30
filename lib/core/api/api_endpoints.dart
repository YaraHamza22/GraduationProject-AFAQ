class ApiEndpoints {
  const ApiEndpoints._();

  static const login = '/auth/login';
  static const loginFallback = '/login';
  static const logout = '/auth/logout';
  static const profile = '/auth/profile';

  static const studentDashboard = '/student/dashboard';
  static const meWithQuizzes = '/me/with-quizzes';
  static const myLearning = '/my-learning';
  static const enrollments = '/enrollments';
  static const courses = '/courses';
  static const quizzes = '/quizzes';
  static const attempts = '/attempts';
  static const forumThreads = '/forum-threads';
  static const forumPosts = '/forum-posts';
  static const notifications = '/notifications';
  static const notificationsUnreadCount = '/notifications/unread-count';
  static const chatUnreadCount = '/chat-threads/unread-count';
  static const studentInstructors = '/student/instructors';
  static const instructors = '/instructors';
  static const users = '/users';
  static const superAdminCourses = '/super-admin/courses';
  static const superAdminInstructors = '/super-admin/instructors';
  static const superAdminUsers = '/super-admin/users';

  static const instructorDashboard = '/instructor/dashboard';
  static const myCourses = '/my-courses';
  static const externalIntegrations = '/external-integrations';
  static const virtualSessions = '/virtual-sessions';
  static const students = '/students';
  static const superAdminStudents = '/super-admin/students';

  static const courseCategories = '/course-categories';
  static const reviewCourses = '/courses?status=review&per_page=15';
  static const questions = '/questions';
  static const unreadNotifications = '/notifications?unread_only=true';

  static const chatThreads = '/chat-threads';
  static const chatMessages = '/chat-messages';

  static String myLearningUnits(String courseSlug) {
    return '/my-learning/$courseSlug/units';
  }

  static String myLearningLessons(String courseSlug, int unitId) {
    return '/my-learning/$courseSlug/units/$unitId/lessons';
  }

  static String enrollmentProgress(int enrollmentId) {
    return '/enrollments/$enrollmentId/progress';
  }

  static String quiz(int quizId) => '/quizzes/$quizId';

  static String courseQuizAvailability(int courseId) {
    return '/courses/$courseId/quiz-availability';
  }

  static String courseAssessmentProgress(int courseId) {
    return '/courses/$courseId/assessment-progress';
  }

  static String course(String courseKey) => '/courses/$courseKey';

  static String courseUnits(String courseKey) {
    return '/courses/$courseKey/units';
  }

  static String attempt(int attemptId) => '/attempts/$attemptId';
  static String startAttempt(int attemptId) => '/attempts/$attemptId/start';
  static String submitAttempt(int attemptId) => '/attempts/$attemptId/submit';
  static String attemptGrade(int attemptId) => '/attempts/$attemptId/grade';

  static String courseCertificate(int courseId) {
    return '/courses/$courseId/certificate';
  }

  static String forumThread(int threadId) => '/forum-threads/$threadId';
  static String forumThreadPosts(int threadId) {
    return '/forum-threads/$threadId/posts';
  }
  static String pinForumThread(int threadId) => '/forum-threads/$threadId/pin';
  static String lockForumThread(int threadId) => '/forum-threads/$threadId/lock';

  static String forumPost(int postId) => '/forum-posts/$postId';
  static String reactToForumPost(int postId) => '/forum-posts/$postId/react';
  static String reportForumPost(int postId) => '/forum-posts/$postId/report';

  static String chatThread(int threadId) => '/chat-threads/$threadId';
  static String studentInstructor(int instructorId) {
    return '/student/instructors/$instructorId';
  }

  static String instructorCourses(int instructorId) {
    return '/instructors/$instructorId/courses';
  }

  static String chatParticipants(int threadId) {
    return '/chat-threads/$threadId/participants';
  }

  static String chatParticipant(int threadId, int userId) {
    return '/chat-threads/$threadId/participants/$userId';
  }

  static String chatMessagesForThread(int threadId) {
    return '/chat-threads/$threadId/messages';
  }

  static String archiveChatThread(int threadId) {
    return '/chat-threads/$threadId/archive';
  }

  static String readChatMessage(int messageId) {
    return '/chat-messages/$messageId/read';
  }

  static String chatMessage(int messageId) => '/chat-messages/$messageId';

  static String readNotification(int notificationId) {
    return '/notifications/$notificationId/read';
  }

  static const readAllNotifications = '/notifications/read-all';

  static String myCourse(int courseId) => '/my-courses/$courseId';
  static String myCourseUnits(int courseId) => '/my-courses/$courseId/units';
  static String myCourseUnit(int courseId, int unitId) {
    return '/my-courses/$courseId/units/$unitId';
  }

  static String myCourseLessons(int courseId, int unitId) {
    return '/my-courses/$courseId/units/$unitId/lessons';
  }

  static String myCourseLessonsCount(int courseId, int unitId) {
    return '/my-courses/$courseId/units/$unitId/lessons/count';
  }

  static String myCourseLesson(int courseId, int unitId, int lessonId) {
    return '/my-courses/$courseId/units/$unitId/lessons/$lessonId';
  }

  static String gradingSheet(int attemptId) {
    return '/attempts/$attemptId/grading-sheet';
  }

  static String instructorGrade(int attemptId) {
    return '/attempts/$attemptId/instructor-grade';
  }

  static String externalIntegration(int integrationId) {
    return '/external-integrations/$integrationId';
  }

  static String oauthUrl(String provider) {
    return '/external-integrations/$provider/oauth-url';
  }

  static String exchangeOAuthCode(String provider) {
    return '/external-integrations/$provider/exchange-code';
  }

  static String virtualSession(int sessionId) {
    return '/virtual-sessions/$sessionId';
  }

  static String publishVirtualSession(int sessionId) {
    return '/virtual-sessions/$sessionId/publish';
  }

  static String cancelVirtualSession(int sessionId) {
    return '/virtual-sessions/$sessionId/cancel';
  }

  static String virtualSessionAttendance(int sessionId) {
    return '/virtual-sessions/$sessionId/attendance';
  }

  static String auditorContentReview(int courseId) {
    return '/auditor/courses/$courseId/content-reviews';
  }
}
