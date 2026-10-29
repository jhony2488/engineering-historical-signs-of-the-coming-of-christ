import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sinaishistoricos.dashboard",
  appName: "Sinais Históricos",
  webDir: ".next",
  server: {
    // Em desenvolvimento, usa o Next.js dev server
    // Em produção, use a URL estática ou configure Android para usar arquivos locais
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    cleartext: true,
  },
  android: {
    buildOptions: {
      signingType: "apksigner",
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#0a0c10",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      spinnerColor: "#e2b857",
    },
  },
};

export default config;
