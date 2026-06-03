import 'package:flutter/material.dart';
import 'generated_app.dart';

void main() {
  runApp(const GeneratedApp());
}

class GeneratedApp extends StatelessWidget {
  const GeneratedApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '{{APP_NAME}}',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: const GeneratedWidget(),
    );
  }
}
