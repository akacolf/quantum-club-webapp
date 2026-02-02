import React, { useState, useCallback } from "react";
import { View, Modal, ActivityIndicator, TouchableOpacity } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { Text } from "~/components/ui/text";
import { X } from "lucide-react-native";

interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginProps {
  botUsername: string;
  visible: boolean;
  onClose: () => void;
  onAuth: (data: TelegramAuthData) => void;
}

/**
 * Telegram Login Widget implemented via WebView
 * Uses Telegram's official login widget: https://core.telegram.org/widgets/login
 */
export function TelegramLoginWebView({
  botUsername,
  visible,
  onClose,
  onAuth,
}: TelegramLoginProps) {
  const [loading, setLoading] = useState(true);

  // HTML page that loads Telegram Login Widget
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body {
          margin: 0;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #0A0B1E;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .title {
          color: #fff;
          font-size: 18px;
          margin-bottom: 20px;
          text-align: center;
        }
        .subtitle {
          color: #9CA3AF;
          font-size: 14px;
          margin-bottom: 30px;
          text-align: center;
        }
        .widget-container {
          display: flex;
          justify-content: center;
        }
      </style>
    </head>
    <body>
      <div class="title">Connect with Telegram</div>
      <div class="subtitle">Login with your existing Telegram account</div>
      <div class="widget-container">
        <script 
          async 
          src="https://telegram.org/js/telegram-widget.js?22" 
          data-telegram-login="${botUsername}"
          data-size="large"
          data-radius="10"
          data-onauth="onTelegramAuth(user)"
          data-request-access="write"
        ></script>
      </div>
      <script>
        function onTelegramAuth(user) {
          window.ReactNativeWebView.postMessage(JSON.stringify(user));
        }
      </script>
    </body>
    </html>
  `;

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data: TelegramAuthData = JSON.parse(event.nativeEvent.data);
        onAuth(data);
        onClose();
      } catch (error) {
        console.error("Failed to parse Telegram auth data:", error);
      }
    },
    [onAuth, onClose]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-[#0A0B1E]">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
          <Text className="text-white font-bold text-lg">Telegram Login</Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* WebView with Telegram Widget */}
        <View className="flex-1">
          {loading && (
            <View className="absolute inset-0 items-center justify-center bg-[#0A0B1E] z-10">
              <ActivityIndicator size="large" color="#6366F1" />
              <Text className="text-gray-400 mt-4">Loading Telegram...</Text>
            </View>
          )}
          <WebView
            source={{ html }}
            onLoadEnd={() => setLoading(false)}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            originWhitelist={["*"]}
            style={{ backgroundColor: "#0A0B1E" }}
          />
        </View>
      </View>
    </Modal>
  );
}

export type { TelegramAuthData };
