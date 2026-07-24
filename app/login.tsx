import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  Animated,
  StyleSheet,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  loginWithEmail,
  sendPhoneOTP,
  resendVerificationEmail,
  parseFirebaseError,
} from "../services/authService";
import { useLanguage } from "../contexts/LanguageContext";
import { auth } from "../constants/firebase";
import StudentFooter from "../components/student/StudentFooter";

const LOGO = require("../assets/images/splash-illustration.png");

const BIOMETRIC_CREDENTIALS_KEY = "thuto_bridge_biometric_credentials_v1";

type StoredBiometricCredentials = {
  email: string;
  password: string;
  uid: string;
};

function waitForFirebaseUser(timeoutMs = 5000): Promise<User | null> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe = () => {};
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const finish = (user: User | null) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    };

    unsubscribe = onAuthStateChanged(auth, (user) => finish(user));
    timeout = setTimeout(() => finish(auth.currentUser), timeoutMs);
  });
}

function getBiometricLabel(types: LocalAuthentication.AuthenticationType[]): {
  label: string;
  icon: "finger-print" | "scan-circle-outline" | "shield-checkmark-outline";
} {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION))
    return { label: "Face ID", icon: "scan-circle-outline" };
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT))
    return { label: "Fingerprint", icon: "finger-print" };
  return { label: "Biometrics", icon: "shield-checkmark-outline" };
}

export default function Login() {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";

  const colors = useMemo(
    () => ({
      background: scheme === "light" ? "#F8FCFD" : "#0A111A",
      surfaceAlt: scheme === "light" ? "#F4F8FA" : "#222B36",
      surfaceAlt2: scheme === "light" ? "#E8F4F8" : "#1E2A36",
      textPrimary: scheme === "light" ? "#0A111A" : "#EAF2F8",
      textSecondary: scheme === "light" ? "#4A6572" : "#A0B4C0",
      textMuted: scheme === "light" ? "#7A919E" : "#7A919E",
      primary: "#4A9FC6",
      error: "#D32F2F",
      warning: "#F59E0B",
      border:
        scheme === "light" ? "rgba(10,17,26,0.08)" : "rgba(234,242,248,0.12)",
      borderFocus: "#4A9FC6",
      divider:
        scheme === "light" ? "rgba(10,17,26,0.06)" : "rgba(234,242,248,0.08)",
      biometricBg: scheme === "light" ? "#EAF6F8" : "#1E2E3A",
    }),
    [scheme],
  );

  const sp = (n: number) => n * 4;
  const typo = {
    title: { fontSize: 30, lineHeight: 36, fontWeight: "900" as const },
    subtitle: { fontSize: 15, lineHeight: 21, fontWeight: "600" as const },
    body: { fontSize: 14, lineHeight: 20, fontWeight: "500" as const },
    label: { fontSize: 13, lineHeight: 18, fontWeight: "700" as const },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" as const },
  };
  const radii = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

  const uiMode = useMemo<"mobile" | "tablet" | "desktop">(() => {
    if (width <= 479) return "mobile";
    if (width <= 1023) return "tablet";
    return "desktop";
  }, [width]);

  const isMobile = uiMode === "mobile";
  const isDesktop = uiMode === "desktop";

  const [inputMode, setInputMode] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<
    LocalAuthentication.AuthenticationType[]
  >([]);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricLoginReady, setBiometricLoginReady] = useState(false);
  const [savedBiometricEmail, setSavedBiometricEmail] = useState<string | null>(
    null,
  );
  const [enableBiometricAfterLogin, setEnableBiometricAfterLogin] =
    useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(24)).current;
  const tabSlide = useRef(new Animated.Value(0)).current;

  const identifierInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        friction: 9,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.spring(translateAnim, {
        toValue: 0,
        friction: 9,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateAnim]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let mounted = true;

    (async () => {
      try {
        const [compatible, enrolled, types, storedCredentials] =
          await Promise.all([
            LocalAuthentication.hasHardwareAsync(),
            LocalAuthentication.isEnrolledAsync(),
            LocalAuthentication.supportedAuthenticationTypesAsync(),
            SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY),
          ]);

        if (!mounted) return;

        setBiometricAvailable(compatible);
        setBiometricEnrolled(enrolled);
        setBiometricTypes(types);

        if (storedCredentials) {
          try {
            const saved = JSON.parse(
              storedCredentials,
            ) as StoredBiometricCredentials;
            const valid = Boolean(saved.email && saved.password && saved.uid);
            setBiometricLoginReady(valid);
            setSavedBiometricEmail(valid ? saved.email : null);
            setEnableBiometricAfterLogin(valid);
          } catch {
            await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
            setBiometricLoginReady(false);
            setSavedBiometricEmail(null);
          }
        }
      } catch {
        if (mounted) {
          setBiometricAvailable(false);
          setBiometricEnrolled(false);
          setBiometricLoginReady(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const switchMode = useCallback(
    (mode: "email" | "phone") => {
      setInputMode(mode);
      setIdentifier("");
      setErrorMessage(null);
      setShowResend(false);
      Animated.spring(tabSlide, {
        toValue: mode === "email" ? 0 : 1,
        friction: 8,
        tension: 60,
        useNativeDriver: false,
      }).start();
    },
    [tabSlide],
  );

  const tabLeft = tabSlide.interpolate({
    inputRange: [0, 1],
    outputRange: ["2%", "51%"],
  });

  const validate = useCallback(() => {
    if (inputMode === "email") {
      if (!identifier.trim() || !/\S+@\S+\.\S+/.test(identifier))
        return t("Please enter a valid email address.");
      if (!password.trim() || password.length < 8)
        return t("Password must be at least 8 characters.");
    } else {
      if (identifier.replace(/\D/g, "").length < 7)
        return t("Please enter a valid phone number.");
    }
    return null;
  }, [inputMode, identifier, password, t]);

  const handleLogin = useCallback(async () => {
    const err = validate();
    if (err) {
      setErrorMessage(err);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setShowResend(false);

    try {
      if (inputMode === "email") {
        const email = identifier.trim().toLowerCase();

        await loginWithEmail(email, password);

        const firebaseUser = await waitForFirebaseUser();
        if (!firebaseUser) {
          throw new Error(
            "Firebase did not create a valid authenticated session.",
          );
        }

        if (firebaseUser.email && firebaseUser.email.toLowerCase() !== email) {
          throw new Error(
            "The Firebase account does not match the email used to sign in.",
          );
        }

        if (
          Platform.OS !== "web" &&
          biometricAvailable &&
          biometricEnrolled &&
          enableBiometricAfterLogin
        ) {
          const credentials: StoredBiometricCredentials = {
            email,
            password,
            uid: firebaseUser.uid,
          };

          await SecureStore.setItemAsync(
            BIOMETRIC_CREDENTIALS_KEY,
            JSON.stringify(credentials),
            {
              keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            },
          );

          setBiometricLoginReady(true);
          setSavedBiometricEmail(email);
        }

        router.replace("/student/dashboard");
      } else {
        await sendPhoneOTP(identifier.trim());
        router.push({
          pathname: "/verify-code",
          params: { phone: identifier.trim(), mode: "login" },
        });
      }
    } catch (e: any) {
      const msg = parseFirebaseError(e);
      setErrorMessage(msg);
      if (e?.code === "auth/email-not-verified") setShowResend(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validate,
    inputMode,
    identifier,
    password,
    biometricAvailable,
    biometricEnrolled,
    enableBiometricAfterLogin,
  ]);

  const handleIdentifierSubmit = useCallback(() => {
    if (inputMode === "email") {
      passwordInputRef.current?.focus();
    } else {
      void handleLogin();
    }
  }, [inputMode, handleLogin]);

  const handlePasswordSubmit = useCallback(() => {
    void handleLogin();
  }, [handleLogin]);

  const handleResend = useCallback(async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert(
        t("Required"),
        t("Please enter your email and password first."),
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await resendVerificationEmail(identifier.trim(), password);
      Alert.alert(
        t("Email Sent"),
        `${t("A new verification link has been sent to")} ${identifier.trim()}. ${t("Please check your inbox and spam folder.")}`,
      );
      setShowResend(false);
      setErrorMessage(null);
    } catch (e: any) {
      setErrorMessage(parseFirebaseError(e));
    } finally {
      setIsSubmitting(false);
    }
  }, [identifier, password, t]);

  const handleBiometric = useCallback(async () => {
    if (!biometricEnrolled) {
      Alert.alert(
        t("Not Set Up"),
        t(
          "Please set up Face ID or fingerprint in your device settings first.",
        ),
      );
      return;
    }

    if (!biometricLoginReady) {
      Alert.alert(
        t("Sign In Required"),
        t(
          "Sign in once with your email and password on this device to enable biometric sign-in.",
        ),
      );
      return;
    }

    setBiometricLoading(true);
    setErrorMessage(null);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:
          getBiometricLabel(biometricTypes).label === "Face ID"
            ? t("Use Face ID to sign in")
            : t("Place your finger to sign in"),
        fallbackLabel: t("Use device passcode"),
        cancelLabel: t("Cancel"),
        disableDeviceFallback: false,
      });

      if (!result.success) {
        if (
          result.error !== "user_cancel" &&
          result.error !== "system_cancel"
        ) {
          setErrorMessage(
            t("Biometric failed. Please sign in with your password."),
          );
        }
        return;
      }

      const storedValue = await SecureStore.getItemAsync(
        BIOMETRIC_CREDENTIALS_KEY,
      );

      if (!storedValue) {
        setBiometricLoginReady(false);
        setSavedBiometricEmail(null);
        setErrorMessage(
          t(
            "Biometric sign-in has expired. Please sign in with your password again.",
          ),
        );
        return;
      }

      let saved: StoredBiometricCredentials;

      try {
        saved = JSON.parse(storedValue) as StoredBiometricCredentials;
      } catch {
        await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
        setBiometricLoginReady(false);
        setSavedBiometricEmail(null);
        setErrorMessage(
          t(
            "Saved biometric sign-in data is invalid. Please sign in with your password again.",
          ),
        );
        return;
      }

      if (!saved.email || !saved.password || !saved.uid) {
        await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
        setBiometricLoginReady(false);
        setSavedBiometricEmail(null);
        setErrorMessage(
          t(
            "Biometric sign-in has expired. Please sign in with your password again.",
          ),
        );
        return;
      }

      await loginWithEmail(saved.email, saved.password);

      const firebaseUser = await waitForFirebaseUser();
      if (!firebaseUser) {
        throw new Error("Firebase did not restore the authenticated user.");
      }

      if (firebaseUser.uid !== saved.uid) {
        await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
        setBiometricLoginReady(false);
        setSavedBiometricEmail(null);
        throw new Error(
          "The saved biometric account no longer matches the Firebase user.",
        );
      }

      await firebaseUser.getIdToken(true);
      router.replace("/student/dashboard");
    } catch (e: any) {
      const code = e?.code as string | undefined;

      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-disabled" ||
        code === "auth/user-not-found"
      ) {
        await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
        setBiometricLoginReady(false);
        setSavedBiometricEmail(null);
        setErrorMessage(
          t(
            "Your saved login is no longer valid. Please sign in with your email and password again.",
          ),
        );
      } else {
        setErrorMessage(parseFirebaseError(e));
      }
    } finally {
      setBiometricLoading(false);
    }
  }, [biometricEnrolled, biometricLoginReady, biometricTypes, t]);

  const showBiometric =
    isMobile &&
    biometricAvailable &&
    biometricEnrolled &&
    Platform.OS !== "web";

  const bioLabel = getBiometricLabel(biometricTypes);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={s.fill} edges={["top"]}>
        <KeyboardAvoidingView
          style={s.fill}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={[
              s.scroll,
              { padding: sp(isDesktop ? 10 : 5) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                s.wrap,
                {
                  maxWidth: isDesktop ? 1240 : "100%",
                  opacity: fadeAnim,
                  transform: [{ translateY: translateAnim }],
                  flexDirection: isDesktop ? "row" : "column",
                  gap: sp(6),
                },
              ]}
            >
              {isDesktop && (
                <View style={[s.side, { flex: 1, maxWidth: 520 }]}>
                  <View style={s.logoRow}>
                    <Image source={LOGO} style={s.logo} resizeMode="contain" />
                    <Text style={[typo.title, { color: colors.textPrimary }]}>
                      THUTO BRIDGE
                    </Text>
                  </View>

                  <Text
                    style={[
                      typo.subtitle,
                      { color: colors.textSecondary, marginBottom: sp(5) },
                    ]}
                  >
                    {t(
                      "Empowering Botswana students with tailored academic guidance and pathways.",
                    )}
                  </Text>

                  <View style={{ gap: 10 }}>
                    {[
                      {
                        icon: "sparkles",
                        text: t("Intelligent course & university matching"),
                      },
                      {
                        icon: "shield-checkmark",
                        text: t("Secure, role-based access control"),
                      },
                      {
                        icon: "trending-up",
                        text: t("Real-time progress & results analytics"),
                      },
                      {
                        icon: "ribbon",
                        text: t("Scholarship & bursary discovery"),
                      },
                    ].map((feature, index) => (
                      <View
                        key={index}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: colors.surfaceAlt2,
                          borderRadius: radii.lg,
                          padding: sp(3),
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: radii.md,
                            backgroundColor: `${colors.primary}22`,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons
                            name={`${feature.icon}-outline` as any}
                            size={18}
                            color={colors.primary}
                          />
                        </View>

                        <Text
                          style={[
                            typo.body,
                            {
                              color: colors.textPrimary,
                              marginLeft: sp(3),
                              flex: 1,
                            },
                          ]}
                        >
                          {feature.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View
                style={[
                  s.form,
                  { flex: 1, maxWidth: isDesktop ? 480 : "100%" },
                ]}
              >
                {!isDesktop && (
                  <View style={{ alignItems: "center", marginBottom: sp(5) }}>
                    <Image
                      source={LOGO}
                      style={[s.logo, { width: 64, height: 64 }]}
                      resizeMode="contain"
                    />
                    <Text
                      style={[
                        typo.title,
                        { color: colors.textPrimary, marginTop: sp(2) },
                      ]}
                    >
                      THUTO BRIDGE
                    </Text>
                  </View>
                )}

                <Text
                  style={[
                    typo.title,
                    {
                      color: colors.textPrimary,
                      marginBottom: sp(1),
                      textAlign: isMobile ? "center" : "left",
                    },
                  ]}
                  accessibilityRole="header"
                >
                  {t("Sign In")}
                </Text>

                <Text
                  style={[
                    typo.subtitle,
                    {
                      color: colors.textSecondary,
                      marginBottom: sp(5),
                      textAlign: isMobile ? "center" : "left",
                    },
                  ]}
                >
                  {t("Access your personalised dashboard")}
                </Text>

                <View
                  style={[
                    s.tabWrap,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Animated.View
                    style={[
                      s.tabBar,
                      {
                        left: tabLeft,
                        width: "48%",
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />

                  {(["email", "phone"] as const).map((mode) => (
                    <Pressable
                      key={mode}
                      onPress={() => switchMode(mode)}
                      style={s.tab}
                      accessibilityRole="tab"
                      accessibilityLabel={
                        mode === "email" ? t("Email") : t("Phone")
                      }
                      accessibilityState={{ selected: inputMode === mode }}
                    >
                      <Ionicons
                        name={
                          mode === "email" ? "mail-outline" : "call-outline"
                        }
                        size={15}
                        color={
                          inputMode === mode ? "#fff" : colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          typo.label,
                          {
                            color:
                              inputMode === mode ? "#fff" : colors.textMuted,
                            marginLeft: sp(2),
                            fontSize: 13,
                          },
                        ]}
                      >
                        {mode === "email" ? t("Email") : t("Phone")}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View
                  style={[
                    s.input,
                    {
                      borderColor:
                        focusedField === "id"
                          ? colors.borderFocus
                          : colors.border,
                      backgroundColor: colors.surfaceAlt,
                      marginTop: sp(4),
                      borderWidth: focusedField === "id" ? 1.5 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      inputMode === "email" ? "mail-outline" : "call-outline"
                    }
                    size={20}
                    color={
                      focusedField === "id" ? colors.primary : colors.textMuted
                    }
                    style={{ marginRight: sp(2) }}
                  />

                  <TextInput
                    ref={identifierInputRef}
                    value={identifier}
                    onChangeText={(value) => {
                      setIdentifier(value);
                      setErrorMessage(null);
                      setShowResend(false);
                    }}
                    onFocus={() => setFocusedField("id")}
                    onBlur={() => setFocusedField(null)}
                    placeholder={
                      inputMode === "email"
                        ? t("Email address")
                        : "71 234 567  or  +267 71 234 567"
                    }
                    placeholderTextColor={colors.textMuted}
                    keyboardType={
                      inputMode === "email" ? "email-address" : "phone-pad"
                    }
                    accessibilityLabel={
                      inputMode === "email"
                        ? t("Email address")
                        : t("Phone number")
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType={inputMode === "email" ? "next" : "go"}
                    onSubmitEditing={handleIdentifierSubmit}
                    blurOnSubmit={inputMode !== "email"}
                    style={[typo.body, { flex: 1, color: colors.textPrimary }]}
                  />

                  {identifier.length > 0 && (
                    <Pressable
                      onPress={() => setIdentifier("")}
                      accessibilityRole="button"
                      accessibilityLabel={t("Clear")}
                      hitSlop={8}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  )}
                </View>

                {inputMode === "email" && (
                  <View
                    style={[
                      s.input,
                      {
                        borderColor:
                          focusedField === "pw"
                            ? colors.borderFocus
                            : colors.border,
                        backgroundColor: colors.surfaceAlt,
                        marginTop: sp(3),
                        borderWidth: focusedField === "pw" ? 1.5 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={
                        focusedField === "pw"
                          ? colors.primary
                          : colors.textMuted
                      }
                      style={{ marginRight: sp(2) }}
                    />

                    <TextInput
                      ref={passwordInputRef}
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        setErrorMessage(null);
                      }}
                      onFocus={() => setFocusedField("pw")}
                      onBlur={() => setFocusedField(null)}
                      placeholder={t("Password")}
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showPassword}
                      accessibilityLabel={t("Password")}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="go"
                      onSubmitEditing={handlePasswordSubmit}
                      style={[
                        typo.body,
                        { flex: 1, color: colors.textPrimary },
                      ]}
                    />

                    <Pressable
                      onPress={() => setShowPassword((current) => !current)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword ? t("Hide password") : t("Show password")
                      }
                      hitSlop={8}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  </View>
                )}

                {inputMode === "phone" && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: sp(2),
                      marginTop: sp(2),
                    }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={13}
                      color={colors.textMuted}
                    />
                    <Text
                      style={[
                        typo.caption,
                        { color: colors.textMuted, fontSize: 11, flex: 1 },
                      ]}
                    >
                      {t(
                        "You can enter just the number (71 234 567) — we'll add +267 automatically",
                      )}
                    </Text>
                  </View>
                )}

                {inputMode === "email" && (
                  <View
                    style={{
                      alignItems: "flex-end",
                      marginTop: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Pressable
                      onPress={() => router.push("/forgot-password")}
                      accessibilityRole="button"
                      accessibilityLabel={t("Forgot password?")}
                      hitSlop={12}
                    >
                      <Text
                        style={[
                          typo.caption,
                          {
                            color: colors.primary,
                            fontWeight: "700",
                            textDecorationLine: "underline",
                          },
                        ]}
                      >
                        {t("Forgot password?")}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {errorMessage && (
                  <View
                    style={[
                      s.errorBox,
                      {
                        backgroundColor: `${colors.error}10`,
                        borderColor: `${colors.error}22`,
                        marginTop: sp(3),
                      },
                    ]}
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color={colors.error}
                    />
                    <Text
                      style={[
                        typo.caption,
                        {
                          color: colors.error,
                          marginLeft: sp(2),
                          flex: 1,
                          lineHeight: 18,
                        },
                      ]}
                    >
                      {errorMessage}
                    </Text>
                  </View>
                )}

                {showResend && (
                  <Pressable
                    onPress={handleResend}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel={t("Resend verification email")}
                    style={[
                      s.resendBtn,
                      {
                        borderColor: colors.warning,
                        backgroundColor: `${colors.warning}10`,
                      },
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={16}
                      color={colors.warning}
                    />
                    <Text
                      style={[
                        typo.caption,
                        {
                          color: colors.warning,
                          fontWeight: "700",
                          marginLeft: sp(2),
                        },
                      ]}
                    >
                      {t("Resend verification email")}
                    </Text>
                  </Pressable>
                )}

                {showBiometric && inputMode === "email" && (
                  <View
                    style={{
                      marginTop: sp(3),
                      padding: sp(3.5),
                      borderRadius: radii.lg,
                      borderWidth: 1,
                      borderColor: enableBiometricAfterLogin
                        ? `${colors.primary}55`
                        : colors.border,
                      backgroundColor: colors.surfaceAlt,
                    }}
                  >
                    <Pressable
                      onPress={() =>
                        setEnableBiometricAfterLogin((current) => !current)
                      }
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: enableBiometricAfterLogin,
                      }}
                      accessibilityLabel={`${t("Enable")} ${bioLabel.label} ${t("on this device")}`}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: sp(3),
                        opacity: pressed ? 0.78 : 1,
                      })}
                    >
                      <View
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 8,
                          borderWidth: 1.5,
                          borderColor: enableBiometricAfterLogin
                            ? colors.primary
                            : colors.border,
                          backgroundColor: enableBiometricAfterLogin
                            ? colors.primary
                            : colors.surfaceAlt2,
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {enableBiometricAfterLogin && (
                          <Ionicons name="checkmark" size={18} color="#fff" />
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            typo.label,
                            { color: colors.textPrimary, lineHeight: 19 },
                          ]}
                        >
                          {biometricLoginReady
                            ? `${bioLabel.label} ${t("sign-in is enabled")}`
                            : `${t("Enable")} ${bioLabel.label} ${t("after this sign-in")}`}
                        </Text>
                        <Text
                          style={[
                            typo.caption,
                            {
                              color: colors.textMuted,
                              marginTop: 3,
                              lineHeight: 16,
                              fontSize: 11,
                            },
                          ]}
                        >
                          {t(
                            "Your encrypted sign-in details stay in this device's secure storage. Thuto Bridge never receives your fingerprint or facial data.",
                          )}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                )}

                <Pressable
                  onPress={handleLogin}
                  disabled={isSubmitting}
                  style={({ pressed }) => [
                    s.btn,
                    { backgroundColor: colors.primary, marginTop: sp(4) },
                    pressed && {
                      transform: [{ scale: 0.97 }],
                      opacity: 0.92,
                    },
                    isSubmitting && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    inputMode === "phone" ? t("Send OTP Code") : t("Sign In")
                  }
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      style={[typo.body, { color: "#fff", fontWeight: "700" }]}
                    >
                      {inputMode === "phone"
                        ? t("Send OTP Code")
                        : t("Sign In")}
                    </Text>
                  )}
                </Pressable>

                {showBiometric && (
                  <View style={{ marginTop: sp(4) }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: sp(3),
                        marginBottom: sp(4),
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          height: 1,
                          backgroundColor: colors.divider,
                        }}
                      />
                      <Text style={[typo.caption, { color: colors.textMuted }]}>
                        {t("or continue with")}
                      </Text>
                      <View
                        style={{
                          flex: 1,
                          height: 1,
                          backgroundColor: colors.divider,
                        }}
                      />
                    </View>

                    <Pressable
                      onPress={handleBiometric}
                      disabled={biometricLoading}
                      accessibilityRole="button"
                      accessibilityLabel={`${t("Sign in with")} ${bioLabel.label}`}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: sp(3),
                        paddingVertical: sp(4),
                        paddingHorizontal: sp(5),
                        borderRadius: radii.lg,
                        borderWidth: 1.5,
                        borderColor: `${colors.primary}55`,
                        backgroundColor: colors.biometricBg,
                        opacity: pressed || biometricLoading ? 0.8 : 1,
                        transform: pressed ? [{ scale: 0.97 }] : [],
                      })}
                    >
                      {biometricLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                        />
                      ) : (
                        <Ionicons
                          name={bioLabel.icon}
                          size={26}
                          color={colors.primary}
                        />
                      )}

                      <Text
                        style={[
                          typo.label,
                          { color: colors.primary, fontSize: 14 },
                        ]}
                      >
                        {biometricLoading
                          ? t("Signing in securely…")
                          : biometricLoginReady
                            ? `${t("Sign in with")} ${bioLabel.label}`
                            : `${t("Enable")} ${bioLabel.label}`}
                      </Text>
                    </Pressable>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: sp(2),
                        marginTop: sp(3),
                        padding: sp(3),
                        backgroundColor: `${colors.primary}0A`,
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: `${colors.primary}22`,
                      }}
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={14}
                        color={colors.primary}
                        style={{ marginTop: 1 }}
                      />
                      <Text
                        style={[
                          typo.caption,
                          {
                            color: colors.textSecondary,
                            flex: 1,
                            fontSize: 11,
                            lineHeight: 16,
                          },
                        ]}
                      >
                        {biometricLoginReady && savedBiometricEmail
                          ? `${t("Saved account")}: ${savedBiometricEmail}. ${bioLabel.label} ${t("unlocks the saved sign-in securely. No biometric data is sent to Thuto Bridge.")}`
                          : `${t("Sign in once with your email and password to enable")} ${bioLabel.label}. ${t("No biometric data is sent to Thuto Bridge.")}`}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={[s.footer, { marginTop: sp(5) }]}>
                  <Text style={[typo.caption, { color: colors.textMuted }]}>
                    {t("Don't have an account?")}
                  </Text>

                  <Pressable
                    onPress={() => router.push("/signup")}
                    accessibilityRole="button"
                    accessibilityLabel={t("Sign Up")}
                    hitSlop={8}
                  >
                    <Text
                      style={[
                        typo.caption,
                        {
                          color: colors.primary,
                          fontWeight: "700",
                          marginLeft: sp(1),
                        },
                      ]}
                    >
                      {t("Sign Up")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>

            <StudentFooter
              topSpacing={sp(isMobile ? 8 : 10)}
              maxWidth={1240}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  wrap: { width: "100%", alignSelf: "center" },
  side: { padding: 24, borderRadius: 20 },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  logo: { width: 48, height: 48 },
  form: { padding: 24, borderRadius: 20 },
  tabWrap: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    position: "relative",
    overflow: "hidden",
    height: 48,
  },
  tabBar: {
    position: "absolute",
    top: 3,
    bottom: 3,
    borderRadius: 999,
    zIndex: 0,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    borderRadius: 999,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 52,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  btn: {
    padding: 16,
    alignItems: "center",
    borderRadius: 12,
    minHeight: 52,
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});
