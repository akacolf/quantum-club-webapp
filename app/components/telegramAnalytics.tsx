import telegramAnalytics from "@telegram-apps/analytics";

export default function TelegramAnalytics() {
  
      //sdk auth
      telegramAnalytics.init({
        token: "eyJhcHBfbmFtZSI6InF1YW50dW1fY2x1YiIsImFwcF91cmwiOiJodHRwczovL3QubWUvUXVhbnR1bUNsdWJCb3QiLCJhcHBfZG9tYWluIjoiaHR0cHM6Ly93d3cucXVhbnR1bWNsdWIuc3BhY2UvIn0=!wCjJY3ya2Il4HWQI21u7rOBSQpz/oFIrPNqdY986AS0=",
        appName: "quantum_club",
        env: "PROD",
      })
      //api read
      telegramAnalytics.init({
        token: "eyJhcHBfbmFtZSI6InF1YW50dW1fY2x1YiIsImFwcF91cmwiOiJodHRwczovL3QubWUvUXVhbnR1bUNsdWJCb3QiLCJhcHBfZG9tYWluIjoiaHR0cHM6Ly93d3cucXVhbnR1bWNsdWIuc3BhY2UvIn0=!FgwCNe2iIgQQQecDuoDLVWNKsUu61sTpwqpfIK+BtfM=",
        appName: "quantum_club",
        env: "PROD",
      })
      return null;
    };
