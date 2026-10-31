declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: {
            is_premium?: boolean;
            is_bot?: boolean;
            id: number;
            username?: string | null;
            first_name: string;
            last_name?: string;
            photo_url?: string;
            language_code?: string;
          };
          receiver?: {
            id: number;
            is_bot?: boolean;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
          chat?: {
            id: number;
            type: string;
            title: string;
            username?: string;
            photo_url?: string;
          };
          chat_type?: string;
          chat_instance?: string;
          start_param?: string;
          auth_date?: number;
          hash?: string;
        };
        version: string;
        platform: string;
        colorScheme: "light" | "dark";
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
          header_bg_color?: string;
          bottom_bar_bg_color?: string;
          accent_text_color?: string;
          section_bg_color?: string;
          section_header_text_color?: string;
          subtitle_text_color?: string;
          destructive_text_color?: string;
        };
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        bottomBarColor?: string;
        isClosingConfirmationEnabled: boolean;
        isVerticalSwipesEnabled?: boolean;
        isFullscreen?: boolean;
        isOrientationLocked?: boolean;

        safeAreaInset?: {
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

        isVersionAtLeast: (version: string) => boolean;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        setBottomBarColor?: (color: string) => void;
        enableClosingConfirmation: () => void;
        disableClosingConfirmation: () => void;
        enableVerticalSwipes?: () => void;
        disableVerticalSwipes?: () => void;
        requestFullscreen?: () => void;
        exitFullscreen?: () => void;
        lockOrientation?: () => void;
        unlockOrientation?: () => void;
        addToHomeScreen?: () => void;
        checkHomeScreenStatus?: (callback: (status: string) => void) => void;
        onEvent: (eventType: string, callback: (...args: unknown[]) => void) => void;
        offEvent: (eventType: string, callback: (...args: unknown[]) => void) => void;
        sendData: (data: string) => void;
        switchInlineQuery?: (query: string, choose_chat_types?: string[]) => void;
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        openInvoice?: (url: string, callback?: (status: string) => void) => void;
        shareToStory?: (media_url: string, params?: unknown) => void;
        shareMessage?: (msg_id: string, callback?: (success: boolean) => void) => void;
        showPopup: (params: unknown, callback?: (buttonId: string) => void) => void;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
        showScanQrPopup: (params?: { text?: string }, callback?: (result: string) => boolean | void) => void;
        closeScanQrPopup: () => void;
        readTextFromClipboard?: (callback: (text: string) => void) => void;
        requestWriteAccess?: (callback: (granted: boolean) => void) => void;
        requestContact?: (callback: (shared: boolean) => void) => void;
        ready: () => void;
        expand: () => void;
        close: () => void;

        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => () => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
          setParams: (params: unknown) => void;
        };
        HapticFeedback?: {
          impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
          notificationOccurred: (type: "error" | "success" | "warning") => void;
          selectionChanged: () => void;
        };
        BiometricManager?: {
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
      };
    };
  }
}

export { };
