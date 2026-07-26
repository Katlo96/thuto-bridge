// app/verify-code.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, Animated, StyleSheet,
  useWindowDimensions, Platform, KeyboardAvoidingView, ScrollView,
  ActivityIndicator, useColorScheme, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { completePhonePasswordSignup, resendPhoneSignupOTP, getStoredVerificationId, parseFirebaseError } from '../services/authService';
import { useLanguage } from '../contexts/LanguageContext';
import StudentFooter from '../components/student/StudentFooter';

const sp = (n: number) => n * 4;
const typo = {
  title:    { fontSize: 28, lineHeight: 34, fontWeight: '800' as const },
  subtitle: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const },
  body:     { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  label:    { fontSize: 13, lineHeight: 18, fontWeight: '700' as const },
  caption:  { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
};
const radii = { md: 12, lg: 16, xl: 20 };
const DIGITS = 6;

export default function VerifyCode() {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const scheme    = useColorScheme() || 'light';
  const params    = useLocalSearchParams<{ phone: string; fullName: string; mode: string }>();

  const colors = useMemo(() => ({
    background:    scheme === 'light' ? '#F8FCFD' : '#0A111A',
    surfaceAlt:    scheme === 'light' ? '#F4F8FA' : '#222B36',
    textPrimary:   scheme === 'light' ? '#0A111A' : '#EAF2F8',
    textSecondary: scheme === 'light' ? '#4A6572' : '#A0B4C0',
    textMuted:     scheme === 'light' ? '#7A919E' : '#7A919E',
    primary:       '#4A9FC6',
    error:         '#D32F2F',
    border:        scheme === 'light' ? 'rgba(10,17,26,0.08)' : 'rgba(234,242,248,0.12)',
  }), [scheme]);

  const isMobile  = width <= 479;
  const phone     = params.phone    ?? '';
  const mode      = params.mode     ?? 'signup';
  const fullName  = params.fullName ?? '';

  const [code,         setCode]         = useState<string[]>(Array(DIGITS).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending,  setIsResending]  = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [countdown,    setCountdown]    = useState(60);
  const [canResend,    setCanResend]    = useState(false);

  const inputRefs     = useRef<Array<TextInput | null>>([]);
  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(fadeAnim,      { toValue: 1, friction: 9, tension: 50, useNativeDriver: true }),
      Animated.spring(translateAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
    ]).start();
    // Focus first input
    setTimeout(() => inputRefs.current[0]?.focus(), 400);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/, '').slice(-1);
    const next  = [...code];
    next[index] = digit;
    setCode(next);
    setError(null);
    if (digit && index < DIGITS - 1) inputRefs.current[index + 1]?.focus();
    // Auto-submit when all 6 digits filled
    if (next.every((d) => d !== '') && digit) handleVerify(next.join(''));
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleVerify = useCallback(async (codeStr?: string) => {
    const otpCode = codeStr ?? code.join('');
    if (otpCode.length !== DIGITS) { setError(`${t('Please enter the full')} ${DIGITS}-${t('digit code.')}`); return; }

    // Make sure the password-based phone signup still has an OTP session.
    if (!getStoredVerificationId()) {
      setError(t('Session expired. Please go back and request a new code.'));
      return;
    }

    setIsSubmitting(true); setError(null);
    try {
      await completePhonePasswordSignup(otpCode, fullName);
      router.replace('/student/dashboard');
    } catch (e: any) {
      setError(parseFirebaseError(e));
      setCode(Array(DIGITS).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setIsSubmitting(false);
    }
  }, [code, fullName, mode, t]);

  const handleResend = useCallback(async () => {
    if (!phone) return;
    setIsResending(true); setError(null);
    setCode(Array(DIGITS).fill(''));
    try {
      await resendPhoneSignupOTP(phone);
      setCountdown(60);
      setCanResend(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      Alert.alert(
        t('Code Sent'),
        `${t('A new verification code has been sent to')} ${phone}.`,
      );
    } catch (e: any) {
      setError(parseFirebaseError(e));
    } finally {
      setIsResending(false);
    }
  }, [phone, t]);

  const maskedPhone = phone.length > 6
    ? `${phone.slice(0, 4)}****${phone.slice(-3)}`
    : phone;

  const allFilled = code.every((d) => d !== '');

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={[s.scroll, { padding: sp(isMobile ? 5 : 8) }]} keyboardShouldPersistTaps="handled">
            <Animated.View style={[s.wrap, { maxWidth: 460, opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}>

              {/* Back button */}
              <Pressable
onPress={() => router.back()}
accessibilityRole="button"
accessibilityLabel={t('Go Back')}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: sp(2), marginBottom: sp(6), opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="arrow-back" size={20} color={colors.primary} />
                <Text style={[typo.caption, { color: colors.primary, fontWeight: '700' }]}>{t('Go Back')}</Text>
              </Pressable>

              {/* Icon */}
              <View style={{ alignItems: 'center', marginBottom: sp(6) }}>
                <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: `${colors.primary}18`, borderWidth: 2, borderColor: `${colors.primary}33`, alignItems: 'center', justifyContent: 'center', marginBottom: sp(4) }}>
                  <Ionicons name="phone-portrait-outline" size={34} color={colors.primary} />
                </View>
                <Text style={[typo.title, { color: colors.textPrimary, textAlign: 'center' }]}>{t('Enter Verification Code')}</Text>
                <Text style={[typo.subtitle, { color: colors.textSecondary, textAlign: 'center', marginTop: sp(2), maxWidth: 320, lineHeight: 22 }]}>
                  We sent a {DIGITS}-digit code to{'\n'}
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>{maskedPhone}</Text>
                </Text>
              </View>

              {/* OTP boxes */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: sp(3), marginBottom: sp(5) }}>
                {code.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => { inputRefs.current[i] = r; }}
                    value={digit}
                    onChangeText={(v) => handleDigitChange(i, v)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                    keyboardType="number-pad"
                    maxLength={1}
                    style={[
                      s.otpBox,
                      { width: isMobile ? 46 : 54, height: isMobile ? 56 : 64 },
                      digit
                        ? { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }
                        : { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                    ]}
                    placeholder="·"
                    placeholderTextColor={colors.textMuted}
                    selectionColor={colors.primary}
                    accessibilityLabel={`${t('Digit')} ${i + 1}`}
                  />
                ))}
              </View>

              {/* Error */}
              {error && (
                <View style={[s.errorBox, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}22`, marginBottom: sp(4) }]}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
                  <Text style={[typo.caption, { color: colors.error, marginLeft: sp(2), flex: 1, lineHeight: 18 }]}>{error}</Text>
                </View>
              )}

              {/* Verify button */}
              <Pressable
                onPress={() => handleVerify()}
                disabled={isSubmitting || !allFilled}
                style={({ pressed }) => [
                  s.btn,
                  { backgroundColor: allFilled ? colors.primary : `${colors.primary}55` },
                  pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                  isSubmitting && { opacity: 0.7 },
                ]}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp(2) }}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={[typo.body, { color: '#fff', fontWeight: '700' }]}>{t('Verify & Continue')}</Text>
                  </View>
                )}
              </Pressable>

              {/* Resend */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: sp(5), gap: sp(1) }}>
                <Text style={[typo.caption, { color: colors.textMuted }]}>{t("Didn't receive it?")}</Text>
                {canResend ? (
                  <Pressable
onPress={handleResend}
disabled={isResending}
accessibilityRole="button"
accessibilityLabel={t('Resend Code')}
hitSlop={8}
>
                    <Text style={[typo.caption, { color: colors.primary, fontWeight: '700' }]}>
                      {isResending ? t('Sending…') : t('Resend Code')}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={[typo.caption, { color: colors.textMuted }]}>{t('Resend in')} {countdown}s</Text>
                )}
              </View>

              {/* Info note */}
              <View style={{ marginTop: sp(5), padding: sp(3), backgroundColor: `${colors.primary}0A`, borderRadius: radii.lg, borderWidth: 1, borderColor: `${colors.primary}18`, flexDirection: 'row', alignItems: 'flex-start', gap: sp(2) }}>
                <Ionicons name="information-circle-outline" size={14} color={colors.primary} style={{ marginTop: 1 }} />
                <Text style={[typo.caption, { color: colors.textSecondary, flex: 1, fontSize: 11, lineHeight: 16 }]}>
                  Standard SMS rates may apply. The code expires in 10 minutes. Make sure your phone number includes the country code (+267 for Botswana).
                </Text>
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
  fill:      { flex: 1 },
  container: { flex: 1 },
  scroll:    { flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  wrap:      { width: '100%', alignSelf: 'center' },
  otpBox:    { borderWidth: 1.5, borderRadius: radii.md, textAlign: 'center', fontSize: 22, fontWeight: '800', color: '#4A9FC6' },
  errorBox:  { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: radii.md, borderWidth: 1 },
  btn:       { padding: 16, alignItems: 'center', borderRadius: radii.md, minHeight: 52, justifyContent: 'center' },
});