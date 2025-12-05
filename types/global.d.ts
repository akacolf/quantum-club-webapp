declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: {
          user?: {
            is_premium:boolean,
            is_bot:boolean,
            id: number,
            username: string | null;
            first_name: string;
          }
          start_param?: string;
        };
        initDataUnsafe: {
          user?: {
            is_premium:boolean,
            is_bot:boolean,
            id: number,
            username: string | null;
            first_name: string;
          }
          start_param?: string;
        };
        ready: () => void;
        expand: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        requestFullscreen: () => void;
        openTelegramLink: (link:string|undefined) => void;
        navigator: () => void;
        disableVerticalSwipes: () => void;
        enableClosingConfirmation: () => void;
        disableClosingConfirmation: () => void;

        BackButton: {
          hide: () => void;
          show: () => void;
          onClick: (callback:()=>void) => void;
          offClick: (callback:()=>void) => () => void;
        };
        BiometricManager: {
          isInited: boolean;
          isBiometricAvailable: boolean;
          biometricType: string;
          isAccessRequested: boolean;
          isAccessGranted: boolean;
          isBiometricTokenSaved: boolean;
          deviceId: string;
          init: (callback?: () => void) => void;
          requestAccess: (params: { reason?: string }, callback?: (granted: boolean) => void) => void;
          authenticate: (params: { reason?: string }, callback?: (success: boolean, token?: string) => void) => void;
          updateBiometricToken: (token: string, callback?: (success: boolean) => void) => void;
          openSettings: () => void;
        };
        safeAreaInset: {
          top: number; 
          bottom: number;
          left: number;
          right: number;
        };
        contentSafeAreaInset?: {
          top: number;
          bottom: number;
          left: number;
          right: number;
        };
        onEvent: (eventType: string, callback: () => void) => void;
        offEvent: (eventType: string, callback: () => void) => void;
      };
    };
  }
};

export {};