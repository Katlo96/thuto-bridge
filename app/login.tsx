import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, Image, TextInput, Pressable, Animated, StyleSheet,
  useWindowDimensions, Platform, KeyboardAvoidingView, ScrollView,
  ActivityIndicator, useColorScheme, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { loginWithEmail, sendPhoneOTP, resendVerificationEmail, parseFirebaseError } from '../services/authService';

const LOGO = require('../assets/images/splash-illustration.png');

function getBiometricLabel(types: LocalAuthentication.AuthenticationType[]): {
  label: string; icon: 'finger-print' | 'scan-circle-outline' | 'shield-checkmark-outline';
} {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return { label: 'Face ID', icon: 'scan-circle-outline' };
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT))        return { label: 'Fingerprint', icon: 'finger-print' };
  return { label: 'Biometrics', icon: 'shield-checkmark-outline' };
}

export default function Login() {
  const { width } = useWindowDimensions();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  const colors = useMemo(() => ({
    background:    scheme === 'light' ? '#F8FCFD' : '#0A111A',
    surfaceAlt:    scheme === 'light' ? '#F4F8FA' : '#222B36',
    surfaceAlt2:   scheme === 'light' ? '#E8F4F8' : '#1E2A36',
    textPrimary:   scheme === 'light' ? '#0A111A' : '#EAF2F8',
    textSecondary: scheme === 'light' ? '#4A6572' : '#A0B4C0',
    textMuted:     scheme === 'light' ? '#7A919E' : '#7A919E',
    primary:       '#4A9FC6',
    error:         '#D32F2F',
    warning:       '#F59E0B',
    border:        scheme === 'light' ? 'rgba(10,17,26,0.08)' : 'rgba(234,242,248,0.12)',
    borderFocus:   '#4A9FC6',
    divider:       scheme === 'light' ? 'rgba(10,17,26,0.06)' : 'rgba(234,242,248,0.08)',
    biometricBg:   scheme === 'light' ? '#EAF6F8' : '#1E2E3A',
  }), [scheme]);

  const sp = (n: number) => n * 4;
  const typo = {
    title:    { fontSize: 30, lineHeight: 36, fontWeight: '900' as const },
    subtitle: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const },
    body:     { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
    label:    { fontSize: 13, lineHeight: 18, fontWeight: '700' as const },
    caption:  { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  };
  const radii = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

  const uiMode = useMemo<'mobile' | 'tablet' | 'desktop'>(() => {
    if (width <= 479) return 'mobile';
    if (width <= 1023) return 'tablet';
    return 'desktop';
  }, [width]);
  const isMobile = uiMode === 'mobile';
  const isDesktop = uiMode === 'desktop';

  const [inputMode, setInputMode]       = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier]     = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResend, setShowResend]     = useState(false);

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricTypes, setBiometricTypes]         = useState<LocalAuthentication.AuthenticationType[]>([]);
  const [biometricEnrolled, setBiometricEnrolled]   = useState(false);
  const [biometricLoading, setBiometricLoading]     = useState(false);

  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(24)).current;
  const tabSlide      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(fadeAnim,      { toValue: 1, friction: 9, tension: 50, useNativeDriver: true }),
      Animated.spring(translateAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        if (!compatible) return;
        setBiometricAvailable(true);
        setBiometricEnrolled(await LocalAuthentication.isEnrolledAsync());
        setBiometricTypes(await LocalAuthentication.supportedAuthenticationTypesAsync());
      } catch { /* ignore */ }
    })();
  }, []);

  const switchMode = useCallback((mode: 'email' | 'phone') => {
    setInputMode(mode); setIdentifier(''); setErrorMessage(null); setShowResend(false);
    Animated.spring(tabSlide, { toValue: mode === 'email' ? 0 : 1, friction: 8, tension: 60, useNativeDriver: false }).start();
  }, [tabSlide]);

  const tabLeft = tabSlide.interpolate({ inputRange: [0, 1], outputRange: ['2%', '51%'] });

  const validate = useCallback(() => {
    if (inputMode === 'email') {
      if (!identifier.trim() || !/\S+@\S+\.\S+/.test(identifier)) return 'Please enter a valid email address.';
      if (!password.trim() || password.length < 8) return 'Password must be at least 8 characters.';
    } else {
      if (identifier.replace(/\D/g, '').length < 7) return 'Please enter a valid phone number.';
    }
    return null;
  }, [inputMode, identifier, password]);

  const handleLogin = useCallback(async () => {
    const err = validate();
    if (err) { setErrorMessage(err); return; }
    setIsSubmitting(true); setErrorMessage(null); setShowResend(false);
    try {
      if (inputMode === 'email') {
        await loginWithEmail(identifier.trim(), password);
        router.replace('/student/dashboard');
      } else {
        await sendPhoneOTP(identifier.trim());
        router.push({
          pathname: '/verify-code',
          params: { phone: identifier.trim(), mode: 'login' },
        });
      }
    } catch (e: any) {
      const msg = parseFirebaseError(e);
      setErrorMessage(msg);
      if (e?.code === 'auth/email-not-verified') setShowResend(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, inputMode, identifier, password]);

  const handleResend = useCallback(async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter your email and password first.');
      return;
    }
    setIsSubmitting(true);
    try {
      await resendVerificationEmail(identifier.trim(), password);
      Alert.alert('Email Sent', `A new verification link has been sent to ${identifier.trim()}. Please check your inbox and spam folder.`);
      setShowResend(false); setErrorMessage(null);
    } catch (e: any) {
      setErrorMessage(parseFirebaseError(e));
    } finally {
      setIsSubmitting(false);
    }
  }, [identifier, password]);

  const handleBiometric = useCallback(async () => {
    if (!biometricEnrolled) { Alert.alert('Not Set Up', 'Please set up biometrics in your device settings first.'); return; }
    setBiometricLoading(true); setErrorMessage(null);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: getBiometricLabel(biometricTypes).label === 'Face ID' ? 'Use Face ID to sign in' : 'Place your finger to sign in',
        fallbackLabel: 'Use Password', cancelLabel: 'Cancel', disableDeviceFallback: false,
      });
      if (result.success) router.replace('/student/dashboard');
      else if (result.error !== 'user_cancel') setErrorMessage('Biometric failed. Please sign in with your password.');
    } catch { setErrorMessage('Biometric authentication is not available.'); }
    finally { setBiometricLoading(false); }
  }, [biometricEnrolled, biometricTypes]);

  const showBiometric = isMobile && biometricAvailable && Platform.OS !== 'web';
  const bioLabel = getBiometricLabel(biometricTypes);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={s.fill} edges={['top']}>
        <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={[s.scroll, { padding: sp(isDesktop ? 10 : 5) }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Animated.View style={[s.wrap, { maxWidth: isDesktop ? 1240 : '100%', opacity: fadeAnim, transform: [{ translateY: translateAnim }], flexDirection: isDesktop ? 'row' : 'column', gap: sp(6) }]}>

              {/* Desktop side panel */}
              {isDesktop && (
                <View style={[s.side, { flex: 1, maxWidth: 520 }]}>
                  <View style={s.logoRow}><Image source={LOGO} style={s.logo} resizeMode="contain" /><Text style={[typo.title, { color: colors.textPrimary }]}>THUTO BRIDGE</Text></View>
                  <Text style={[typo.subtitle, { color: colors.textSecondary, marginBottom: sp(5) }]}>Empowering Botswana students with tailored academic guidance and pathways.</Text>
                  <View style={{ gap: 10 }}>
                    {[
                      { icon: 'sparkles',         text: 'Intelligent course & university matching' },
                      { icon: 'shield-checkmark', text: 'Secure, role-based access control'       },
                      { icon: 'trending-up',      text: 'Real-time progress & results analytics'  },
                      { icon: 'ribbon',           text: 'Scholarship & bursary discovery'         },
                    ].map((f, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt2, borderRadius: radii.lg, padding: sp(3), borderWidth: 1, borderColor: colors.border }}>
                        <View style={{ width: 36, height: 36, borderRadius: radii.md, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name={`${f.icon}-outline` as any} size={18} color={colors.primary} />
                        </View>
                        <Text style={[typo.body, { color: colors.textPrimary, marginLeft: sp(3), flex: 1 }]}>{f.text}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Form */}
              <View style={[s.form, { flex: 1, maxWidth: isDesktop ? 480 : '100%' }]}>
                {!isDesktop && (
                  <View style={{ alignItems: 'center', marginBottom: sp(5) }}>
                    <Image source={LOGO} style={[s.logo, { width: 64, height: 64 }]} resizeMode="contain" />
                    <Text style={[typo.title, { color: colors.textPrimary, marginTop: sp(2) }]}>THUTO BRIDGE</Text>
                  </View>
                )}

                <Text style={[typo.title, { color: colors.textPrimary, marginBottom: sp(1), textAlign: isMobile ? 'center' : 'left' }]} accessibilityRole="header">Sign In</Text>
                <Text style={[typo.subtitle, { color: colors.textSecondary, marginBottom: sp(5), textAlign: isMobile ? 'center' : 'left' }]}>Access your personalised dashboard</Text>

                {/* Tab */}
                <View style={[s.tabWrap, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Animated.View style={[s.tabBar, { left: tabLeft, width: '48%', backgroundColor: colors.primary }]} />
                  {(['email', 'phone'] as const).map((m) => (
                    <Pressable key={m} onPress={() => switchMode(m)} style={s.tab} accessibilityRole="tab">
                      <Ionicons name={m === 'email' ? 'mail-outline' : 'call-outline'} size={15} color={inputMode === m ? '#fff' : colors.textMuted} />
                      <Text style={[typo.label, { color: inputMode === m ? '#fff' : colors.textMuted, marginLeft: sp(2), fontSize: 13 }]}>{m === 'email' ? 'Email' : 'Phone'}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Identifier input */}
                <View style={[s.input, { borderColor: focusedField === 'id' ? colors.borderFocus : colors.border, backgroundColor: colors.surfaceAlt, marginTop: sp(4), borderWidth: focusedField === 'id' ? 1.5 : 1 }]}>
                  <Ionicons name={inputMode === 'email' ? 'mail-outline' : 'call-outline'} size={20} color={focusedField === 'id' ? colors.primary : colors.textMuted} style={{ marginRight: sp(2) }} />
                  <TextInput value={identifier} onChangeText={(t) => { setIdentifier(t); setErrorMessage(null); setShowResend(false); }} onFocus={() => setFocusedField('id')} onBlur={() => setFocusedField(null)}
                    placeholder={inputMode === 'email' ? 'Email address' : '71 234 567  or  +267 71 234 567'} placeholderTextColor={colors.textMuted}
                    keyboardType={inputMode === 'email' ? 'email-address' : 'phone-pad'} autoCapitalize="none" autoCorrect={false}
                    style={[typo.body, { flex: 1, color: colors.textPrimary }]} />
                  {identifier.length > 0 && <Pressable onPress={() => setIdentifier('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.textMuted} /></Pressable>}
                </View>

                {/* Password — email only */}
                {inputMode === 'email' && (
                  <View style={[s.input, { borderColor: focusedField === 'pw' ? colors.borderFocus : colors.border, backgroundColor: colors.surfaceAlt, marginTop: sp(3), borderWidth: focusedField === 'pw' ? 1.5 : 1 }]}>
                    <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'pw' ? colors.primary : colors.textMuted} style={{ marginRight: sp(2) }} />
                    <TextInput value={password} onChangeText={(t) => { setPassword(t); setErrorMessage(null); }} onFocus={() => setFocusedField('pw')} onBlur={() => setFocusedField(null)}
                      placeholder="Password" placeholderTextColor={colors.textMuted} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false}
                      style={[typo.body, { flex: 1, color: colors.textPrimary }]} />
                    <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={8}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} /></Pressable>
                  </View>
                )}

                {/* Phone hint */}
                {inputMode === 'phone' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp(2), marginTop: sp(2) }}>
                    <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
                    <Text style={[typo.caption, { color: colors.textMuted, fontSize: 11 }]}>You can enter just the number (71 234 567) — we'll add +267 automatically</Text>
                  </View>
                )}

                {/* Forgot password */}
                {inputMode === 'email' && (
                  <View style={{ alignItems: 'flex-end', marginTop: 8, marginBottom: 4 }}>
                    <Pressable onPress={() => router.push('/forgot-password')} hitSlop={12}>
                      <Text style={[typo.caption, { color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' }]}>Forgot password?</Text>
                    </Pressable>
                  </View>
                )}

                {/* Error */}
                {errorMessage && (
                  <View style={[s.errorBox, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}22`, marginTop: sp(3) }]}>
                    <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
                    <Text style={[typo.caption, { color: colors.error, marginLeft: sp(2), flex: 1, lineHeight: 18 }]}>{errorMessage}</Text>
                  </View>
                )}

                {/* Resend verification */}
                {showResend && (
                  <Pressable onPress={handleResend} disabled={isSubmitting} style={[s.resendBtn, { borderColor: colors.warning, backgroundColor: `${colors.warning}10` }]}>
                    <Ionicons name="mail-outline" size={16} color={colors.warning} />
                    <Text style={[typo.caption, { color: colors.warning, fontWeight: '700', marginLeft: sp(2) }]}>Resend verification email</Text>
                  </Pressable>
                )}

                {/* Submit */}
                <Pressable onPress={handleLogin} disabled={isSubmitting}
                  style={({ pressed }) => [s.btn, { backgroundColor: colors.primary, marginTop: sp(4) }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 }, isSubmitting && { opacity: 0.7 }]}
                  accessibilityRole="button">
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={[typo.body, { color: '#fff', fontWeight: '700' }]}>{inputMode === 'phone' ? 'Send OTP Code' : 'Sign In'}</Text>}
                </Pressable>

                {/* Biometric */}
                {showBiometric && (
                  <View style={{ marginTop: sp(4) }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp(3), marginBottom: sp(4) }}>
                      <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
                      <Text style={[typo.caption, { color: colors.textMuted }]}>or continue with</Text>
                      <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
                    </View>
                    <Pressable onPress={handleBiometric} disabled={biometricLoading}
                      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sp(3), paddingVertical: sp(4), paddingHorizontal: sp(5), borderRadius: radii.lg, borderWidth: 1.5, borderColor: biometricEnrolled ? `${colors.primary}55` : colors.border, backgroundColor: biometricEnrolled ? colors.biometricBg : colors.surfaceAlt, opacity: pressed || biometricLoading ? 0.8 : 1, transform: pressed ? [{ scale: 0.97 }] : [] })}>
                      {biometricLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name={bioLabel.icon} size={26} color={biometricEnrolled ? colors.primary : colors.textMuted} />}
                      <View>
                        <Text style={[typo.label, { color: biometricEnrolled ? colors.primary : colors.textMuted, fontSize: 14 }]}>{biometricLoading ? 'Authenticating…' : `Sign in with ${bioLabel.label}`}</Text>
                        {!biometricEnrolled && <Text style={[typo.caption, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>Not set up on this device</Text>}
                      </View>
                    </Pressable>
                    {biometricEnrolled && (
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: sp(2), marginTop: sp(3), padding: sp(3), backgroundColor: `${colors.primary}0A`, borderRadius: radii.md, borderWidth: 1, borderColor: `${colors.primary}22` }}>
                        <Ionicons name="information-circle-outline" size={14} color={colors.primary} style={{ marginTop: 1 }} />
                        <Text style={[typo.caption, { color: colors.textSecondary, flex: 1, fontSize: 11, lineHeight: 16 }]}>{bioLabel.label} uses your device's secure hardware. No biometric data is sent to Thuto Bridge.</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Sign up */}
                <View style={[s.footer, { marginTop: sp(5) }]}>
                  <Text style={[typo.caption, { color: colors.textMuted }]}>Don't have an account?</Text>
                  <Pressable onPress={() => router.push('/signup')} hitSlop={8}>
                    <Text style={[typo.caption, { color: colors.primary, fontWeight: '700', marginLeft: sp(1) }]}>Sign Up</Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 }, container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  wrap:   { width: '100%', alignSelf: 'center' },
  side:   { padding: 24, borderRadius: 20 },
  logoRow:{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  logo:   { width: 48, height: 48 },
  form:   { padding: 24, borderRadius: 20 },
  tabWrap:{ flexDirection: 'row', borderRadius: 999, borderWidth: 1, padding: 3, position: 'relative', overflow: 'hidden', height: 48 },
  tabBar: { position: 'absolute', top: 3, bottom: 3, borderRadius: 999, zIndex: 0 },
  tab:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 1, borderRadius: 999 },
  input:  { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 12, minHeight: 52 },
  errorBox:  { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 12, borderWidth: 1 },
  resendBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  btn:    { padding: 16, alignItems: 'center', borderRadius: 12, minHeight: 52, justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});