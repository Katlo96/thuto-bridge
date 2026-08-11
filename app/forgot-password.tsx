// app/forgot-password.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Image, TextInput, Pressable, Animated, StyleSheet,
  useWindowDimensions, Platform, KeyboardAvoidingView, ScrollView,
  ActivityIndicator, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  forgotPassword,
  parseFirebaseError,
  sendPasswordResetOTP,
  resendPasswordResetOTP,
  verifyPasswordResetOTP,
  completePasswordReset,
  clearStoredPasswordResetVerification,
  logOut,
} from '../services/authService';
import { useLanguage } from '../contexts/LanguageContext';
import StudentFooter from '../components/student/StudentFooter';

const LOGO = require('../assets/images/splash-illustration.png');
const sp = (n: number) => n * 4;
const typo = {
  hero:     { fontSize: 38, lineHeight: 44, fontWeight: '900' as const },
  title:    { fontSize: 30, lineHeight: 36, fontWeight: '800' as const },
  subtitle: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const },
  body:     { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  label:    { fontSize: 13, lineHeight: 18, fontWeight: '700' as const },
  caption:  { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
};
const radii = { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 };

type Method = 'email' | 'phone';
type PhoneStep = 'phone' | 'otp' | 'password';

const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPassword() {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const scheme = useColorScheme() || 'light';

  const colors = useMemo(() => ({
    background:    scheme === 'light' ? '#F8FCFD' : '#0A111A',
    surfaceAlt:    scheme === 'light' ? '#F4F8FA' : '#222B36',
    surfaceAlt2:   scheme === 'light' ? '#E8F4F8' : '#1E2A36',
    textPrimary:   scheme === 'light' ? '#0A111A' : '#EAF2F8',
    textSecondary: scheme === 'light' ? '#4A6572' : '#A0B4C0',
    textMuted:     scheme === 'light' ? '#7A919E' : '#7A919E',
    primary:       '#4A9FC6',
    error:         '#D32F2F',
    success:       '#388E3C',
    border:        scheme === 'light' ? 'rgba(10,17,26,0.08)' : 'rgba(234,242,248,0.12)',
    borderFocus:   '#4A9FC6',
  }), [scheme]);

  const uiMode = useMemo(() => { if (width <= 479) return 'mobile'; if (width <= 1023) return 'tablet'; return 'desktop'; }, [width]);
  const isMobile = uiMode === 'mobile'; const isDesktop = uiMode === 'desktop';

  // ── Method selection ──────────────────────────────────────────────────
  const [method, setMethod] = useState<Method>('email');

  // ── Email flow state ──────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // ── Phone flow state ──────────────────────────────────────────────────
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone');
  const [phone, setPhone] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [verifiedPhoneDisplay, setVerifiedPhoneDisplay] = useState('');
  const [otp, setOtp] = useState('');
  const [otpFocused, setOtpFocused] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [phoneResetDone, setPhoneResetDone] = useState(false);

  const confirmPasswordRef = useRef<TextInput>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(fadeAnim,      { toValue: 1, friction: 9, tension: 50, useNativeDriver: true }),
      Animated.spring(translateAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  // Resend-code cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  // Safety net: if the screen unmounts mid phone-reset flow, don't leave a
  // dangling verification session or a silently-authenticated device behind.
  useEffect(() => {
    return () => {
      if (method !== 'phone' || phoneResetDone) return;
      if (phoneStep === 'password') {
        logOut().catch(() => undefined);
      } else {
        clearStoredPasswordResetVerification();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetPhoneFlowState = () => {
    setPhoneStep('phone');
    setPhone('');
    setVerifiedPhoneDisplay('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPhoneError(null);
    setPhoneResetDone(false);
    setResendCooldown(0);
  };

  const handleSwitchMethod = (next: Method) => {
    if (next === method) return;
    if (method === 'phone' && !phoneResetDone) {
      if (phoneStep === 'password') {
        logOut().catch(() => undefined);
      } else {
        clearStoredPasswordResetVerification();
      }
      resetPhoneFlowState();
    }
    setError(null);
    setSent(false);
    setMethod(next);
  };

  // ── Email handlers ────────────────────────────────────────────────────
  const handleSendEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed) { setError(t('Email is required.')); return; }
    if (!/\S+@\S+\.\S+/.test(trimmed)) { setError(t('Please enter a valid email address.')); return; }

    setIsSubmitting(true); setError(null);
    try {
      await forgotPassword(trimmed);
      setSent(true);
    } catch (e: any) {
      // Firebase returns auth/user-not-found — we intentionally show a generic
      // success message anyway to prevent email enumeration attacks.
      if (e?.code === 'auth/user-not-found') {
        setSent(true);
      } else {
        setError(parseFirebaseError(e));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Phone handlers ────────────────────────────────────────────────────
  const handleSendPhoneOtp = async () => {
    const trimmed = phone.trim();
    if (!trimmed) { setPhoneError(t('Phone number is required.')); return; }

    setPhoneSubmitting(true); setPhoneError(null);
    try {
      const { phone: normalised } = await sendPasswordResetOTP(trimmed);
      setVerifiedPhoneDisplay(normalised);
      setPhoneStep('otp');
      setOtp('');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setPhoneError(parseFirebaseError(e));
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || phoneSubmitting) return;
    setPhoneSubmitting(true); setPhoneError(null);
    try {
      await resendPasswordResetOTP(phone.trim());
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setPhoneError(parseFirebaseError(e));
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    const trimmed = otp.trim();
    if (!trimmed || trimmed.length < 6) { setPhoneError(t('Enter the 6-digit code sent to your phone.')); return; }

    setPhoneSubmitting(true); setPhoneError(null);
    try {
      await verifyPasswordResetOTP(trimmed);
      setPhoneStep('password');
    } catch (e) {
      setPhoneError(parseFirebaseError(e));
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const handleChangeNumber = () => {
    clearStoredPasswordResetVerification();
    setPhoneStep('phone');
    setOtp('');
    setPhoneError(null);
    setResendCooldown(0);
  };

  const handleSetNewPassword = async () => {
    if (newPassword.length < 8) { setPhoneError(t('Password must be at least 8 characters.')); return; }
    if (newPassword !== confirmPassword) { setPhoneError(t('Passwords do not match.')); return; }

    setPhoneSubmitting(true); setPhoneError(null);
    try {
      await completePasswordReset(newPassword);
      setPhoneResetDone(true);
    } catch (e) {
      setPhoneError(parseFirebaseError(e));
    } finally {
      setPhoneSubmitting(false);
    }
  };

  // ── Shared bits ───────────────────────────────────────────────────────
  const MethodTabs = (
    <View style={[s.tabs, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Pressable
        onPress={() => handleSwitchMethod('email')}
        accessibilityRole="button"
        accessibilityLabel={t('Email')}
        style={[s.tabBtn, method === 'email' && { backgroundColor: colors.primary }]}>
        <Ionicons name="mail-outline" size={16} color={method === 'email' ? '#fff' : colors.textSecondary} />
        <Text style={[typo.caption, { color: method === 'email' ? '#fff' : colors.textSecondary, fontWeight: '700' }]}>{t('Email')}</Text>
      </Pressable>
      <Pressable
        onPress={() => handleSwitchMethod('phone')}
        accessibilityRole="button"
        accessibilityLabel={t('Phone Number')}
        style={[s.tabBtn, method === 'phone' && { backgroundColor: colors.primary }]}>
        <Ionicons name="call-outline" size={16} color={method === 'phone' ? '#fff' : colors.textSecondary} />
        <Text style={[typo.caption, { color: method === 'phone' ? '#fff' : colors.textSecondary, fontWeight: '700' }]}>{t('Phone Number')}</Text>
      </Pressable>
    </View>
  );

  const recaptchaContainer = Platform.OS === 'web'
    ? <View nativeID="recaptcha-container" style={s.recaptchaContainer} />
    : null;

  // ── Success: email ───────────────────────────────────────────────────
  if (method === 'email' && sent) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        {recaptchaContainer}
        <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={[s.scroll, { padding: sp(isMobile ? 5 : 10) }]}>
            <Animated.View style={[s.wrap, { maxWidth: 480, opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}>
              <View style={{ alignItems: 'center', marginBottom: sp(6) }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: `${colors.success}18`, borderWidth: 2, borderColor: `${colors.success}44`, alignItems: 'center', justifyContent: 'center', marginBottom: sp(4) }}>
                  <Ionicons name="mail-open-outline" size={36} color={colors.success} />
                </View>
                <Text style={[typo.title, { color: colors.textPrimary, textAlign: 'center' }]}>{t('Check Your Inbox')}</Text>
                <Text style={[typo.subtitle, { color: colors.textSecondary, textAlign: 'center', marginTop: sp(2), maxWidth: 360, lineHeight: 22 }]}>
                  If an account exists for <Text style={{ fontWeight: '700', color: colors.primary }}>{email.trim()}</Text>, a password reset link has been sent. Check your inbox and spam folder.
                </Text>
              </View>

              <View style={{ padding: sp(4), backgroundColor: `${colors.primary}0F`, borderRadius: radii.lg, borderWidth: 1, borderColor: `${colors.primary}22`, marginBottom: sp(6), gap: sp(3) }}>
                {[
                  t('The link expires after 1 hour.'),
                  t('Click the link in the email to set a new password.'),
                  t("If you don't see it, check your spam or junk folder."),
                ].map((tip, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: sp(2) }}>
                    <Ionicons name="checkmark-circle-outline" size={15} color={colors.primary} style={{ marginTop: 1 }} />
                    <Text style={[typo.caption, { color: colors.textSecondary, flex: 1, lineHeight: 18 }]}>{tip}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => { setSent(false); setEmail(''); }}
                accessibilityRole="button"
                accessibilityLabel={t('Send Another Link')}
                style={({ pressed }) => [s.btn, { backgroundColor: colors.primary }, pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] }]}>
                <Text style={[typo.body, { color: '#fff', fontWeight: '700' }]}>{t('Send Another Link')}</Text>
              </Pressable>

              <Pressable
                onPress={() => router.replace('/login')}
                accessibilityRole="button"
                accessibilityLabel={t('Back to Sign In')}
                style={({ pressed }) => ({ marginTop: sp(4), opacity: pressed ? 0.7 : 1 })}>
                <Text style={[typo.caption, { color: colors.primary, textAlign: 'center', fontWeight: '700' }]}>{t('Back to Sign In')}</Text>
              </Pressable>
            </Animated.View>

            <StudentFooter topSpacing={sp(isMobile ? 8 : 10)} maxWidth={1240} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Success: phone ───────────────────────────────────────────────────
  if (method === 'phone' && phoneResetDone) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        {recaptchaContainer}
        <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={[s.scroll, { padding: sp(isMobile ? 5 : 10) }]}>
            <Animated.View style={[s.wrap, { maxWidth: 480, opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}>
              <View style={{ alignItems: 'center', marginBottom: sp(6) }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: `${colors.success}18`, borderWidth: 2, borderColor: `${colors.success}44`, alignItems: 'center', justifyContent: 'center', marginBottom: sp(4) }}>
                  <Ionicons name="shield-checkmark-outline" size={36} color={colors.success} />
                </View>
                <Text style={[typo.title, { color: colors.textPrimary, textAlign: 'center' }]}>{t('Password Reset')}</Text>
                <Text style={[typo.subtitle, { color: colors.textSecondary, textAlign: 'center', marginTop: sp(2), maxWidth: 360, lineHeight: 22 }]}>
                  {t('Your password has been updated successfully. You can now sign in with your new password.')}
                </Text>
              </View>

              <View style={{ padding: sp(4), backgroundColor: `${colors.primary}0F`, borderRadius: radii.lg, borderWidth: 1, borderColor: `${colors.primary}22`, marginBottom: sp(6), gap: sp(3) }}>
                {[
                  t('Your phone number stays linked to your account.'),
                  t('Use your new password the next time you sign in.'),
                  t("If this wasn't you, contact support immediately."),
                ].map((tip, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: sp(2) }}>
                    <Ionicons name="checkmark-circle-outline" size={15} color={colors.primary} style={{ marginTop: 1 }} />
                    <Text style={[typo.caption, { color: colors.textSecondary, flex: 1, lineHeight: 18 }]}>{tip}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => router.replace('/login')}
                accessibilityRole="button"
                accessibilityLabel={t('Continue to Sign In')}
                style={({ pressed }) => [s.btn, { backgroundColor: colors.primary }, pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] }]}>
                <Text style={[typo.body, { color: '#fff', fontWeight: '700' }]}>{t('Continue to Sign In')}</Text>
              </Pressable>
            </Animated.View>

            <StudentFooter topSpacing={sp(isMobile ? 8 : 10)} maxWidth={1240} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────
  const desktopSteps = method === 'email'
    ? [
        { num: '1', title: t('Enter your email'), desc: t("We'll send a reset link to your inbox") },
        { num: '2', title: t('Click the link in the email'), desc: t("Opens Firebase's secure reset page") },
        { num: '3', title: t('Set your new password'), desc: t('Choose a strong new password and done') },
      ]
    : [
        { num: '1', title: t('Enter your phone number'), desc: t("We'll text you a 6-digit code") },
        { num: '2', title: t('Enter the verification code'), desc: t('Confirms the number belongs to you') },
        { num: '3', title: t('Set your new password'), desc: t('Choose a strong new password and done') },
      ];

  const activeStepIndex = method === 'email' ? 0 : (phoneStep === 'phone' ? 0 : phoneStep === 'otp' ? 1 : 2);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {recaptchaContainer}
      <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={[s.scroll, { padding: sp(isMobile ? 5 : 8) }]} keyboardShouldPersistTaps="handled">
            <Animated.View style={[s.wrap, { maxWidth: isDesktop ? 1240 : '100%', flexDirection: isDesktop ? 'row' : 'column', gap: sp(8), opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}>

              {/* Desktop sidebar */}
              {isDesktop && (
                <View style={s.side}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp(3), marginBottom: 16 }}>
                    <Image source={LOGO} style={{ width: 48, height: 48 }} resizeMode="contain" />
                    <Text style={[typo.hero, { color: colors.textPrimary }]}>THUTO BRIDGE</Text>
                  </View>
                  <Text style={[typo.subtitle, { color: colors.textSecondary, marginTop: sp(4), marginBottom: sp(6) }]}>
                    {t('Reset your password securely in just one step.')}
                  </Text>
                  <View style={{ gap: sp(4) }}>
                    {desktopSteps.map((step, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: sp(4) }}>
                        <View style={{
                          width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          backgroundColor: i === activeStepIndex ? colors.primary : `${colors.primary}18`,
                        }}>
                          <Text style={{ color: i === activeStepIndex ? '#fff' : colors.primary, fontWeight: '700', fontSize: 14 }}>{step.num}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[typo.body, { fontWeight: '700', color: colors.textPrimary }]}>{step.title}</Text>
                          <Text style={[typo.caption, { color: colors.textMuted, marginTop: 2 }]}>{step.desc}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Form */}
              <View style={[s.form, { maxWidth: isDesktop ? 480 : '100%', flex: 1 }]}>
                {!isDesktop && (
                  <View style={{ alignItems: 'center', marginBottom: sp(5) }}>
                    <Image source={LOGO} style={{ width: 64, height: 64 }} resizeMode="contain" />
                    <Text style={[typo.title, { color: colors.textPrimary, marginTop: sp(2) }]}>THUTO BRIDGE</Text>
                  </View>
                )}

                {MethodTabs}

                {method === 'email' ? (
                  <>
                    <Text style={[typo.title, { color: colors.textPrimary, marginBottom: sp(2), marginTop: sp(5), textAlign: isMobile ? 'center' : 'left' }]} accessibilityRole="header">
                      {t('Forgot Password')}
                    </Text>
                    <Text style={[typo.subtitle, { color: colors.textSecondary, marginBottom: sp(6), textAlign: isMobile ? 'center' : 'left' }]}>
                      {t("Enter your email and we'll send you a reset link.")}
                    </Text>

                    <View style={[s.input, { borderColor: emailFocused ? colors.borderFocus : colors.border, borderWidth: emailFocused ? 1.5 : 1, backgroundColor: colors.surfaceAlt }]}>
                      <Ionicons name="mail-outline" size={20} color={emailFocused ? colors.primary : colors.textMuted} style={{ marginRight: sp(2) }} />
                      <TextInput
                        value={email}
                        onChangeText={(value) => { setEmail(value); setError(null); }}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        placeholder={t('Your email address')}
                        placeholderTextColor={colors.textMuted}
                        accessibilityLabel={t('Your email address')}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleSendEmail}
                        style={[typo.body, { flex: 1, color: colors.textPrimary }]}
                      />
                      {email.length > 0 && (
                        <Pressable onPress={() => setEmail('')} accessibilityRole="button" accessibilityLabel={t('Clear')} hitSlop={8}>
                          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                        </Pressable>
                      )}
                    </View>

                    {error && (
                      <View style={[s.errorBox, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}22`, marginTop: sp(3) }]}>
                        <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
                        <Text style={[typo.caption, { color: colors.error, marginLeft: sp(2), flex: 1, lineHeight: 18 }]}>{error}</Text>
                      </View>
                    )}

                    <Pressable
                      onPress={handleSendEmail}
                      disabled={isSubmitting}
                      style={({ pressed }) => [s.btn, { backgroundColor: colors.primary, marginTop: sp(5) }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 }, isSubmitting && { opacity: 0.7 }]}
                      accessibilityRole="button"
                      accessibilityLabel={t('Send Reset Link')}>
                      {isSubmitting ? <ActivityIndicator color="#fff" /> : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp(2) }}>
                          <Ionicons name="paper-plane-outline" size={17} color="#fff" />
                          <Text style={[typo.body, { color: '#fff', fontWeight: '700' }]}>{t('Send Reset Link')}</Text>
                        </View>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <>
                    {/* ── Phone step 1: enter number ───────────────────── */}
                    {phoneStep === 'phone' && (
                      <>
                        <Text style={[typo.title, { color: colors.textPrimary, marginBottom: sp(2), marginTop: sp(5), textAlign: isMobile ? 'center' : 'left' }]} accessibilityRole="header">
                          {t('Forgot Password')}
                        </Text>
                        <Text style={[typo.subtitle, { color: colors.textSecondary, marginBottom: sp(6), textAlign: isMobile ? 'center' : 'left' }]}>
                          {t("Enter your phone number and we'll text you a verification code.")}
                        </Text>

                        <View style={[s.input, { borderColor: phoneFocused ? colors.borderFocus : colors.border, borderWidth: phoneFocused ? 1.5 : 1, backgroundColor: colors.surfaceAlt }]}>
                          <Ionicons name="call-outline" size={20} color={phoneFocused ? colors.primary : colors.textMuted} style={{ marginRight: sp(2) }} />
                          <Text style={[typo.body, { color: colors.textMuted, marginRight: sp(1) }]}>+267</Text>
                          <TextInput
                            value={phone}
                            onChangeText={(value) => { setPhone(value); setPhoneError(null); }}
                            onFocus={() => setPhoneFocused(true)}
                            onBlur={() => setPhoneFocused(false)}
                            placeholder={t('71 234 567')}
                            placeholderTextColor={colors.textMuted}
                            accessibilityLabel={t('Your phone number')}
                            keyboardType="phone-pad"
                            returnKeyType="done"
                            onSubmitEditing={handleSendPhoneOtp}
                            style={[typo.body, { flex: 1, color: colors.textPrimary }]}
                          />
                          {phone.length > 0 && (
                            <Pressable onPress={() => setPhone('')} accessibilityRole="button" accessibilityLabel={t('Clear')} hitSlop={8}>
                              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                            </Pressable>
                          )}
                        </View>
                        <Text style={[typo.caption, { color: colors.textMuted, marginTop: sp(2) }]}>
                          {t('Botswana numbers only, e.g. 71 234 567 or +267 71 234 567.')}
                        </Text>

                        {phoneError && (
                          <View style={[s.errorBox, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}22`, marginTop: sp(3) }]}>
                            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
                            <Text style={[typo.caption, { color: colors.error, marginLeft: sp(2), flex: 1, lineHeight: 18 }]}>{phoneError}</Text>
                          </View>
                        )}

                        <Pressable
                          onPress={handleSendPhoneOtp}
                          disabled={phoneSubmitting}
                          style={({ pressed }) => [s.btn, { backgroundColor: colors.primary, marginTop: sp(5) }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 }, phoneSubmitting && { opacity: 0.7 }]}
                          accessibilityRole="button"
                          accessibilityLabel={t('Send Verification Code')}>
                          {phoneSubmitting ? <ActivityIndicator color="#fff" /> : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp(2) }}>
                              <Ionicons name="paper-plane-outline" size={17} color="#fff" />
                              <Text style={[typo.body, { color: '#fff', fontWeight: '700' }]}>{t('Send Verification Code')}</Text>
                            </View>
                          )}
                        </Pressable>
                      </>
                    )}

                    {/* ── Phone step 2: verify OTP ─────────────────────── */}
                    {phoneStep === 'otp' && (
                      <>
                        <Text style={[typo.title, { color: colors.textPrimary, marginBottom: sp(2), marginTop: sp(5), textAlign: isMobile ? 'center' : 'left' }]} accessibilityRole="header">
                          {t('Enter Verification Code')}
                        </Text>
                        <Text style={[typo.subtitle, { color: colors.textSecondary, marginBottom: sp(6), textAlign: isMobile ? 'center' : 'left' }]}>
                          {t('We sent a 6-digit code to')} <Text style={{ fontWeight: '700', color: colors.primary }}>{verifiedPhoneDisplay || phone}</Text>
                        </Text>

                        <View style={[s.input, { borderColor: otpFocused ? colors.borderFocus : colors.border, borderWidth: otpFocused ? 1.5 : 1, backgroundColor: colors.surfaceAlt }]}>
                          <Ionicons name="key-outline" size={20} color={otpFocused ? colors.primary : colors.textMuted} style={{ marginRight: sp(2) }} />
                          <TextInput
                            value={otp}
                            onChangeText={(value) => { setOtp(value.replace(/\D/g, '').slice(0, 6)); setPhoneError(null); }}
                            onFocus={() => setOtpFocused(true)}
                            onBlur={() => setOtpFocused(false)}
                            placeholder={t('123456')}
                            placeholderTextColor={colors.textMuted}
                            accessibilityLabel={t('Verification code')}
                            keyboardType="number-pad"
                            maxLength={6}
                            returnKeyType="done"
                            onSubmitEditing={handleVerifyOtp}
                            style={[typo.body, { flex: 1, color: colors.textPrimary, letterSpacing: 4, fontWeight: '700' }]}
                          />
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: sp(3) }}>
                          <Pressable onPress={handleChangeNumber} accessibilityRole="button" accessibilityLabel={t('Change phone number')}>
                            <Text style={[typo.caption, { color: colors.textSecondary, fontWeight: '700' }]}>{t('Wrong number?')}</Text>
                          </Pressable>
                          <Pressable onPress={handleResendOtp} disabled={resendCooldown > 0 || phoneSubmitting} accessibilityRole="button" accessibilityLabel={t('Resend code')}>
                            <Text style={[typo.caption, { color: resendCooldown > 0 ? colors.textMuted : colors.primary, fontWeight: '700' }]}>
                              {resendCooldown > 0 ? `${t('Resend code in')} ${resendCooldown}s` : t('Resend Code')}
                            </Text>
                          </Pressable>
                        </View>

                        {phoneError && (
                          <View style={[s.errorBox, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}22`, marginTop: sp(3) }]}>
                            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
                            <Text style={[typo.caption, { color: colors.error, marginLeft: sp(2), flex: 1, lineHeight: 18 }]}>{phoneError}</Text>
                          </View>
                        )}

                        <Pressable
                          onPress={handleVerifyOtp}
                          disabled={phoneSubmitting}
                          style={({ pressed }) => [s.btn, { backgroundColor: colors.primary, marginTop: sp(5) }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 }, phoneSubmitting && { opacity: 0.7 }]}
                          accessibilityRole="button"
                          accessibilityLabel={t('Verify Code')}>
                          {phoneSubmitting ? <ActivityIndicator color="#fff" /> : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp(2) }}>
                              <Ionicons name="checkmark-outline" size={17} color="#fff" />
                              <Text style={[typo.body, { color: '#fff', fontWeight: '700' }]}>{t('Verify Code')}</Text>
                            </View>
                          )}
                        </Pressable>
                      </>
                    )}

                    {/* ── Phone step 3: set new password ───────────────── */}
                    {phoneStep === 'password' && (
                      <>
                        <Text style={[typo.title, { color: colors.textPrimary, marginBottom: sp(2), marginTop: sp(5), textAlign: isMobile ? 'center' : 'left' }]} accessibilityRole="header">
                          {t('Set New Password')}
                        </Text>
                        <Text style={[typo.subtitle, { color: colors.textSecondary, marginBottom: sp(6), textAlign: isMobile ? 'center' : 'left' }]}>
                          {t('Choose a strong new password for your account.')}
                        </Text>

                        <View style={[s.input, { borderColor: newPasswordFocused ? colors.borderFocus : colors.border, borderWidth: newPasswordFocused ? 1.5 : 1, backgroundColor: colors.surfaceAlt }]}>
                          <Ionicons name="lock-closed-outline" size={20} color={newPasswordFocused ? colors.primary : colors.textMuted} style={{ marginRight: sp(2) }} />
                          <TextInput
                            value={newPassword}
                            onChangeText={(value) => { setNewPassword(value); setPhoneError(null); }}
                            onFocus={() => setNewPasswordFocused(true)}
                            onBlur={() => setNewPasswordFocused(false)}
                            placeholder={t('New password')}
                            placeholderTextColor={colors.textMuted}
                            accessibilityLabel={t('New password')}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="next"
                            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                            style={[typo.body, { flex: 1, color: colors.textPrimary }]}
                          />
                          <Pressable onPress={() => setShowPassword((v) => !v)} accessibilityRole="button" accessibilityLabel={t('Toggle password visibility')} hitSlop={8}>
                            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                          </Pressable>
                        </View>

                        <View style={[s.input, { borderColor: confirmPasswordFocused ? colors.borderFocus : colors.border, borderWidth: confirmPasswordFocused ? 1.5 : 1, backgroundColor: colors.surfaceAlt, marginTop: sp(3) }]}>
                          <Ionicons name="lock-closed-outline" size={20} color={confirmPasswordFocused ? colors.primary : colors.textMuted} style={{ marginRight: sp(2) }} />
                          <TextInput
                            ref={confirmPasswordRef}
                            value={confirmPassword}
                            onChangeText={(value) => { setConfirmPassword(value); setPhoneError(null); }}
                            onFocus={() => setConfirmPasswordFocused(true)}
                            onBlur={() => setConfirmPasswordFocused(false)}
                            placeholder={t('Confirm new password')}
                            placeholderTextColor={colors.textMuted}
                            accessibilityLabel={t('Confirm new password')}
                            secureTextEntry={!showConfirmPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={handleSetNewPassword}
                            style={[typo.body, { flex: 1, color: colors.textPrimary }]}
                          />
                          <Pressable onPress={() => setShowConfirmPassword((v) => !v)} accessibilityRole="button" accessibilityLabel={t('Toggle password visibility')} hitSlop={8}>
                            <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                          </Pressable>
                        </View>

                        <Text style={[typo.caption, { color: colors.textMuted, marginTop: sp(2) }]}>
                          {t('Use at least 8 characters.')}
                        </Text>

                        {phoneError && (
                          <View style={[s.errorBox, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}22`, marginTop: sp(3) }]}>
                            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
                            <Text style={[typo.caption, { color: colors.error, marginLeft: sp(2), flex: 1, lineHeight: 18 }]}>{phoneError}</Text>
                          </View>
                        )}

                        <Pressable
                          onPress={handleSetNewPassword}
                          disabled={phoneSubmitting}
                          style={({ pressed }) => [s.btn, { backgroundColor: colors.primary, marginTop: sp(5) }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 }, phoneSubmitting && { opacity: 0.7 }]}
                          accessibilityRole="button"
                          accessibilityLabel={t('Reset Password')}>
                          {phoneSubmitting ? <ActivityIndicator color="#fff" /> : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp(2) }}>
                              <Ionicons name="shield-checkmark-outline" size={17} color="#fff" />
                              <Text style={[typo.body, { color: '#fff', fontWeight: '700' }]}>{t('Reset Password')}</Text>
                            </View>
                          )}
                        </Pressable>
                      </>
                    )}
                  </>
                )}

                <Pressable
                  onPress={() => router.back()}
                  accessibilityRole="button"
                  accessibilityLabel={t('Back to Sign In')}
                  style={({ pressed }) => ({ marginTop: sp(5), opacity: pressed ? 0.7 : 1 })}>
                  <Text style={[typo.caption, { color: colors.primary, textAlign: 'center', fontWeight: '700' }]}>{t('Back to Sign In')}</Text>
                </Pressable>
              </View>
            </Animated.View>

            <StudentFooter topSpacing={sp(isMobile ? 8 : 10)} maxWidth={1240} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 }, container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  wrap:  { width: '100%', alignSelf: 'center' },
  side:  { padding: 24, flex: 1, maxWidth: 480 },
  form:  { padding: 24, borderRadius: 20 },
  input: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 12, minHeight: 52 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 12, borderWidth: 1 },
  btn:   { padding: 16, alignItems: 'center', borderRadius: 12, minHeight: 52, justifyContent: 'center' },
  tabs:  { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, gap: 4, marginTop: 4 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 9 },
  recaptchaContainer: { position: 'absolute', width: 0, height: 0, opacity: 0 },
});