import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';

// Registra el widget (funcionará en headless mode).
registerWidgetTaskHandler(widgetTaskHandler);

// Inicia Expo Router
import 'expo-router/entry-classic';
