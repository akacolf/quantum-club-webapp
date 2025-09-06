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
        safeAreaInset: {
          top: number; 
          bottom: number;
          left: number;
          right: number;
        };
      };
    };
  }
};

export {};