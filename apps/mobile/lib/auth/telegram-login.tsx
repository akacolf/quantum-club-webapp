import React, { useState, useCallback, useEffect } from "react";
import { View, Modal, ActivityIndicator, Pressable, Linking, StyleSheet, Alert } from "react-native";
import { Text } from "~/components/ui/text";
import { FontAwesome5 } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

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
 * Telegram Login for Mobile Apps
 * 
 * For standalone mobile apps (not Telegram Mini Apps), we use deep linking:
 * 1. Open Telegram with a start parameter containing a unique session token
 * 2. User confirms login in Telegram
 * 3. Bot sends auth data to our backend
 * 4. App polls backend or uses push notification to complete auth
 * 
 * Alternative: Use Telegram's OAuth-like flow for verified apps
 */
export function TelegramLoginWebView({
  botUsername,
  visible,
  onClose,
  onAuth,
}: TelegramLoginProps) {
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  // Generate a unique session token for this login attempt
  const generateSessionToken = useCallback(() => {
    const token = `mob_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    setSessionToken(token);
    return token;
  }, []);

  // Open Telegram with login deep link
  const handleOpenTelegram = useCallback(async () => {
    setLoading(true);
    const token = generateSessionToken();
    
    // The bot will receive this start parameter and can verify the user
    const telegramUrl = `tg://resolve?domain=${botUsername}&start=auth_${token}`;
    const webUrl = `https://t.me/${botUsername}?start=auth_${token}`;
    
    try {
      // Try to open Telegram app directly
      const canOpen = await Linking.canOpenURL(telegramUrl);
      
      if (canOpen) {
        await Linking.openURL(telegramUrl);
      } else {
        // Fall back to web browser
        await WebBrowser.openBrowserAsync(webUrl);
      }
      
      // Start polling for auth completion
      setPolling(true);
    } catch (error) {
      console.error("Failed to open Telegram:", error);
      Alert.alert("Error", "Could not open Telegram. Please make sure it's installed.");
    } finally {
      setLoading(false);
    }
  }, [botUsername, generateSessionToken]);

  // Poll backend for auth completion
  useEffect(() => {
    if (!polling || !sessionToken) return;

    let attempts = 0;
    const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes timeout
    
    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL || "https://quantumclub.app"}/api/auth/telegram/check`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionToken }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            clearInterval(pollInterval);
            setPolling(false);
            onAuth(data.user);
            onClose();
          }
        }
      } catch (error) {
        console.error("Auth poll error:", error);
      }

      if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        setPolling(false);
        Alert.alert(
          "Login Timeout",
          "The login session has expired. Please try again.",
          [{ text: "OK", onPress: onClose }]
        );
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [polling, sessionToken, onAuth, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Login with Telegram</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <FontAwesome5 name="times" size={24} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <FontAwesome5 name="telegram-plane" size={48} color="#0088cc" />
          </View>

          <Text style={styles.title}>Connect with Telegram</Text>
          <Text style={styles.subtitle}>
            Tap the button below to open Telegram and confirm your login.
            Your existing account will be linked automatically.
          </Text>

          {polling ? (
            <View style={styles.pollingContainer}>
              <ActivityIndicator size="large" color="#0088cc" />
              <Text style={styles.pollingText}>
                Waiting for confirmation in Telegram...
              </Text>
              <Pressable onPress={() => setPolling(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleOpenTelegram}
              style={styles.telegramButton}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FontAwesome5 name="telegram-plane" size={20} color="#fff" />
                  <Text style={styles.telegramButtonText}>Open Telegram</Text>
                </>
              )}
            </Pressable>
          )}

          <Text style={styles.helperText}>
            Make sure you have Telegram installed on this device.
            You'll be redirected to our bot to confirm the login.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: "center",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0,136,204,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  telegramButton: {
    height: 56,
    width: "100%",
    backgroundColor: "#0088cc",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  telegramButtonText: {
    fontSize: 16,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  helperText: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  pollingContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  pollingText: {
    fontSize: 16,
    fontFamily: "Onest_500Medium",
    color: "#9ca3af",
    marginTop: 16,
    marginBottom: 24,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: "Onest_600SemiBold",
    color: "#ef4444",
  },
});

export type { TelegramAuthData };
