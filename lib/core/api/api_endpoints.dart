class ApiEndpoints {
  const ApiEndpoints._();

  static const login = '/auth/login';
  static const logout = '/auth/logout';
  static const profile = '/auth/profile';

  static const studentDashboard = '/student/dashboard';
  static const myLearning = '/my-learning';
  static const enrollments = '/enrollments';
  static const courses = '/courses';
  static const quizzes = '/quizzes';

  static const instructorDashboard = '/instructor/dashboard';
  static const myCourses = '/my-courses';

  static const courseCategories = '/course-categories';
  static const reviewCourses = '/courses?status=review&per_page=15';
  static const questions = '/questions';
  static const unreadNotifications = '/notifications?unread_only=true';

  static const chatThreads = '/chat-threads';
}
