import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alfarajia.platform',
  appName: 'منصة ثانوية الفراجية للبنين',
  webDir: 'www',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
