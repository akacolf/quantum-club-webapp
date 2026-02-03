import React, { useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { useRouter } from "expo-router";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { signIn, signUp } from "~/lib/auth/client";
import { TelegramLoginWebView, TelegramAuthData } from "~/lib/auth/telegram-login";
import Svg, { Path } from "react-native-svg";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";

// QNTM Logo
function QntmLogo() {
  return (
    <Svg width={100} height={100} viewBox="0 0 32 32">
      <Path
        fill="#fff"
        d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667"
      />
    </Svg>
  );
}

// Test credentials for development
const TEST_EMAIL = "test@quantumclub.space";
const TEST_PASSWORD = "testdev123";

type AuthMode = "login" | "register";

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showTelegramLogin, setShowTelegramLogin] = useState(false);

  // Quick dev login with test credentials
  const handleDevLogin = async () => {
    setEmail(TEST_EMAIL);
    setPassword(TEST_PASSWORD);
    setLoading(true);
    setError(null);
    try {
      // First try to sign in
      const result = await signIn.email({ email: TEST_EMAIL, password: TEST_PASSWORD });
      if (result.error) {
        // If user doesn't exist, create them
        if (result.error.code === "auth/user-not-found" || result.error.code === "auth/invalid-credential") {
          const signUpResult = await signUp.email({ 
            email: TEST_EMAIL, 
            password: TEST_PASSWORD,
            name: "Test User"
          });
          if (signUpResult.error) {
            setError(signUpResult.error.message || "Failed to create test account");
            setLoading(false);
            return;
          }
        } else {
          setError(result.error.message || "Login failed");
          setLoading(false);
          return;
        }
      }
      router.replace("/(tabs)/home");
    } catch (err: any) {
      setError(err.message || "Dev login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    setError(null);
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const result = await signIn.email({ email, password });
        if (result.error) {
          setError(result.error.message || "Login failed");
          setLoading(false);
          return;
        }
      } else {
        const result = await signUp.email({ 
          email, 
          password,
          name: username || email.split("@")[0],
        });
        if (result.error) {
          setError(result.error.message || "Registration failed");
          setLoading(false);
          return;
        }
      }
      // Success - navigate to home
      router.replace("/(tabs)/home");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramAuth = async (data: TelegramAuthData) => {
    setLoading(true);
    setError(null);
    try {
      // Send Telegram auth data to backend for verification
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || "https://quantumclub.app"}/api/auth/telegram/mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Telegram authentication failed");
      }

      const result = await response.json();
      if (result.success) {
        router.replace("/(tabs)/home");
      } else {
        setError(result.message || "Telegram login failed");
      }
    } catch (err: any) {
      setError(err.message || "Telegram authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const openTerms = () => {
    router.push("/legal/terms");
  };

  const openPrivacy = () => {
    router.push("/legal/privacy");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Title with animations */}
          <Animated.View 
            entering={FadeIn.duration(600).delay(100)}
            style={styles.header}
          >
            <Animated.View entering={FadeInDown.duration(500).delay(200)}>
              <QntmLogo />
            </Animated.View>
            <Animated.Text 
              entering={FadeInUp.duration(400).delay(300)}
              style={styles.title}
            >
              Quantum Club
            </Animated.Text>
            <Animated.Text 
              entering={FadeInUp.duration(400).delay(400)}
              style={styles.subtitle}
            >
              {mode === "login" 
                ? "Welcome back! Sign in to continue" 
                : "Create your account to get started"}
            </Animated.Text>
          </Animated.View>

          {/* Error Message */}
          {error && (
            <Animated.View 
              entering={FadeIn.duration(300)}
              style={styles.errorContainer}
            >
              <Ionicons name="alert-circle" size={18} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}

          {/* Auth Form with staggered animations */}
          <Animated.View 
            entering={FadeInUp.duration(500).delay(500)}
            style={styles.form}
          >
            {mode === "register" && (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#6b7280"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#6b7280"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#6b7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#6b7280" 
                />
              </Pressable>
            </View>

            {mode === "register" && (
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#6b7280"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Submit Button */}
            <Pressable
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleEmailAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === "login" ? "Sign In" : "Create Account"}
                </Text>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Telegram Login Button */}
            <Pressable
              style={styles.telegramButton}
              onPress={() => setShowTelegramLogin(true)}
              disabled={loading}
            >
              <FontAwesome5 name="telegram-plane" size={20} color="#fff" />
              <Text style={styles.telegramButtonText}>Continue with Telegram</Text>
            </Pressable>

            {/* Dev Login Button - for testing */}
            {__DEV__ && (
              <Pressable
                style={styles.devButton}
                onPress={handleDevLogin}
                disabled={loading}
              >
                <Ionicons name="bug-outline" size={20} color="#fff" />
                <Text style={styles.devButtonText}>Dev Login (Test Account)</Text>
              </Pressable>
            )}

            {/* Switch Mode */}
            <View style={styles.switchMode}>
              <Text style={styles.switchModeText}>
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
              </Text>
              <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")}>
                <Text style={styles.switchModeLink}>
                  {mode === "login" ? "Sign Up" : "Sign In"}
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* Terms with fade in */}
          <Animated.View 
            entering={FadeIn.duration(400).delay(800)}
            style={styles.termsContainer}
          >
            <Text style={styles.terms}>By continuing, you agree to our </Text>
            <Pressable onPress={openTerms}>
              <Text style={styles.termsLink}>Terms of Service</Text>
            </Pressable>
            <Text style={styles.terms}> and </Text>
            <Pressable onPress={openPrivacy}>
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Telegram Login Modal */}
      <TelegramLoginWebView
        botUsername="QuantumClubBot"
        visible={showTelegramLogin}
        onClose={() => setShowTelegramLogin(false)}
        onAuth={handleTelegramAuth}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
    marginTop: 8,
    textAlign: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#ef4444",
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Onest_400Regular",
    color: "#fff",
  },
  eyeButton: {
    padding: 4,
  },
  submitButton: {
    height: 56,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#222",
  },
  dividerText: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    paddingHorizontal: 16,
  },
  telegramButton: {
    height: 56,
    backgroundColor: "#0088cc",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  telegramButtonText: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  devButton: {
    height: 56,
    backgroundColor: "#4a4a4a",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#666",
    borderStyle: "dashed",
  },
  devButtonText: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  switchMode: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  switchModeText: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  switchModeLink: {
    fontSize: 14,
    fontFamily: "Onest_600SemiBold",
    color: "#fb923c",
  },
  termsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 32,
  },
  terms: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    lineHeight: 18,
  },
  termsLink: {
    fontSize: 12,
    fontFamily: "Onest_500Medium",
    color: "#9ca3af",
    textDecorationLine: "underline",
    lineHeight: 18,
  },
});
