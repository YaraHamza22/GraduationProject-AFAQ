import 'package:afaaqflutter/app/app.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Afaq app starts with the splash screen', (tester) async {
    await tester.pumpWidget(const AfaaqApp());

    expect(find.text('Afaq'), findsOneWidget);
    expect(find.text('Learning starts with a clear path.'), findsOneWidget);
  });
}
