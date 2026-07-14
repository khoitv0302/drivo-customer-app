// Phải là import đầu tiên trong toàn bộ app — thiết lập native gesture handler trước khi bất
// kỳ code nào khác chạy (yêu cầu bắt buộc của react-native-gesture-handler).
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
