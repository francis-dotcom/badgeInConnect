import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TextInput, Pressable, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";

export default function LoginScreenDesign() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    const success = await login(email, password);
    if (success) {
      router.replace("/(tabs)/home");
    } else {
      Alert.alert("Login Failed", "Invalid credentials or server error");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topSpacer} />

        <View style={styles.brandSection}>
          <View style={styles.logoCircle}>
            <Feather name="shield" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>BadgeShield</Text>
          <Text style={styles.appTagline}>Security workforce management</Text>
        </View>

        <View style={styles.formSpacer} />

        <View style={styles.formSection}>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputRow}>
              <Feather name="mail" size={20} color="#9C9B99" />
              <TextInput
                style={styles.inputText}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#9C9B99"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Feather name="lock" size={20} color="#9C9B99" />
              <TextInput
                style={styles.inputText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Enter your password"
                placeholderTextColor="#9C9B99"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#9C9B99" />
              </Pressable>
            </View>
          </View>

          <View style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </View>

          <Pressable 
            style={({ pressed }) => [
              styles.loginButton, 
              pressed && { opacity: 0.9 },
              isLoading && { opacity: 0.7 }
            ]} 
            onPress={handleLogin}
            disabled={isLoading}
          > 
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="log-in" size={20} color="#FFFFFF" />
                <Text style={styles.loginText}>Sign In</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />

        <View style={styles.signupRow}>
          <Text style={styles.signupLabel}>Don&apos;t have an account?</Text>
          <Text style={styles.signupLink}>Sign Up</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const shadow = Platform.select({
  ios: {
    shadowColor: "#1A1918",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F4F1" },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 16 },

  topSpacer: { height: 60 },
  formSpacer: { height: 40 },
  bottomSpacer: { flex: 1 },

  brandSection: { alignItems: "center", gap: 12 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#3D8A5A",
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1918",
    letterSpacing: -0.5,
    fontFamily: "Outfit_700Bold",
  },
  appTagline: {
    fontSize: 14,
    color: "#6D6C6A",
    fontFamily: "Outfit_400Regular",
  },

  formSection: { gap: 16 },
  fieldBlock: { gap: 6 },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1A1918",
    fontFamily: "Outfit_500Medium",
  },
  inputRow: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E4E1",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...(shadow || {}),
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: "#1A1918",
    fontFamily: "Outfit_500Medium",
  },

  forgotRow: { alignItems: "flex-end" },
  forgotText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#3D8A5A",
    fontFamily: "Outfit_500Medium",
  },

  loginButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#3D8A5A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loginText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Outfit_600SemiBold",
  },

  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    paddingBottom: 40,
  },
  signupLabel: {
    fontSize: 14,
    color: "#6D6C6A",
    fontFamily: "Outfit_400Regular",
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3D8A5A",
    fontFamily: "Outfit_600SemiBold",
  },
});
