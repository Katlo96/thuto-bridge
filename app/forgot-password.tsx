// app/forgot-password.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Image, TextInput, Pressable, Animated, StyleSheet,
  useWindowDimensions, Platform, KeyboardAvoidingView, ScrollView,
  ActivityIndicator, useColorScheme, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { forgotPassword, parseFirebaseError } from '../services/authService';
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

  const [email, setEmail]           = useState('');
  const [focused, setFocused]       = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [sent, setSent]             = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(fadeAnim,      { toValue: 1, friction: 9, tension: 50, useNativeDriver: true }),
      Animated.spring(translateAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSend = async () => {
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
      // Only show real errors for non-user-not-found cases.
      if (e?.code === 'auth/user-not-found') {
        setSent(true); // Don't reveal if email exists
      } else {
        setError(parseFirebaseError(e));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (sent) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={[s.scroll, { padding: sp(isMobile ? 5 : 10) }]}>
            <Animated.View style={[s.wrap, { maxWidth: 480, opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}>
              {/* Success icon */}
              <View style={{ alignItems: 'center', marginBottom: sp(6) }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: `${colors.success}18`, borderWidth: 2, borderColor: `${colors.success}44`, alignItems: 'center', justifyContent: 'center', marginBottom: sp(4) }}>
                  <Ionicons name="mail-open-outline" size={36} color={colors.success} />
                </View>
                <Text style={[typo.title, { color: colors.textPrimary, textAlign: 'center' }]}>{t('Check Your Inbox')}</Text>
                <Text style={[typo.subtitle, { color: colors.textSecondary, textAlign: 'center', marginTop: sp(2), maxWidth: 360, lineHeight: 22 }]}>
                  If an account exists for <Text style={{ fontWeight: '700', color: colors.primary }}>{email.trim()}</Text>, a password reset link has been sent. Check your inbox and spam folder.
                </Text>
              </View>

              {/* Info box */}
              <View style={{ padding: sp(4), backgroundColor: `${colors.primary}0F`, borderRadius: radii.lg, borderWidth: 1, borderColor: `${colors.primary}22`, marginBottom: sp(6), gap: sp(3) }}>
                {[
                  t("The link expires after 1 hour."),
                  t("Click the link in the email to set a new password."),
                  t("If you don't see it, check your spam or junk folder."),
                ].map((tip, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: sp(2) }}>
                    <Ionicons name="checkmark-circle-outline" size={15} color={colors.primary} style={{ marginTop: 1 }} />
                    <Text style={[typo.caption, { color: colors.textSecondary, flex: 1, lineHeight: 18 }]}>{tip}</Text>
                  </View>
                ))}
              </View>

              {/* Resend */}
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
accessibilityLabel={t('Back to Sign In')} style={({ pressed }) => ({ marginTop: sp(4), opacity: pressed ? 0.7 : 1 })}>
                <Text style={[typo.caption, { color: colors.primary, textAlign: 'center', fontWeight: '700' }]}>{t('Back to Sign In')}</Text>
              </Pressable>
            </Animated.View>

            <StudentFooter
              topSpacing={sp(isMobile ? 8 : 10)}
              maxWidth={1240}
            />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={[s.scroll, { padding: sp(isMobile ? 5 : 8) }]} keyboardShouldPersistTaps="handled">
            <Animated.View style={[s.wrap, { maxWidth: isDesktop ? 1240 : '100%', flexDirection: isDesktop ? 'row' : 'column', gap: sp(8), opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}>

              {/* Desktop sidebar */}
              {isDesktop && (
                <View style={[s.side]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp(3), marginBottom: 16 }}>
                    <Image source={LOGO} style={{ width: 48, height: 48 }} resizeMode="contain" />
                    <Text style={[typo.hero, { color: colors.textPrimary }]}>THUTO BRIDGE</Text>
                  </View>
                  <Text style={[typo.subtitle, { color: colors.textSecondary, marginTop: sp(4), marginBottom: sp(6) }]}>{t('Reset your password securely in just one step.')}</Text>
                  <View style={{ gap: sp(4) }}>
                    {[
                      { num: '1', title: t("Enter your email"),          desc: t("We'll send a reset link to your inbox") },
                      { num: '2', title: t("Click the link in the email"), desc: t("Opens Firebase's secure reset page")    },
                      { num: '3', title: t("Set your new password"),      desc: t("Choose a strong new password and done")  },
                    ].map((step, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: sp(4) }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>{step.num}</Text>
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

                <Text style={[typo.title, { color: colors.textPrimary, marginBottom: sp(2), textAlign: isMobile ? 'center' : 'left' }]} accessibilityRole="header">{t('Forgot Password')}</Text>
                <Text style={[typo.subtitle, { color: colors.textSecondary, marginBottom: sp(6), textAlign: isMobile ? 'center' : 'left' }]}>{t("Enter your email and we'll send you a reset link.")}</Text>

                {/* Email input */}
                <View style={[s.input, { borderColor: focused ? colors.borderFocus : colors.border, borderWidth: focused ? 1.5 : 1, backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name="mail-outline" size={20} color={focused ? colors.primary : colors.textMuted} style={{ marginRight: sp(2) }} />
                  <TextInput
                    value={email}
                    onChangeText={(value) => { setEmail(value); setError(null); }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={t('Your email address')}
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel={t('Your email address')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSend}
                    style={[typo.body, { flex: 1, color: colors.textPrimary }]}
                  />
                  {email.length > 0 && <Pressable
onPress={() => setEmail('')}
accessibilityRole="button"
accessibilityLabel={t('Clear')}
hitSlop={8}
><Ionicons name="close-circle" size={18} color={colors.textMuted} /></Pressable>}
                </View>

                {/* Error */}
                {error && (
                  <View style={[s.errorBox, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}22`, marginTop: sp(3) }]}>
                    <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
                    <Text style={[typo.caption, { color: colors.error, marginLeft: sp(2), flex: 1, lineHeight: 18 }]}>{error}</Text>
                  </View>
                )}

                {/* Submit */}
                <Pressable onPress={handleSend} disabled={isSubmitting}
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

                <Pressable
onPress={() => router.back()}
accessibilityRole="button"
accessibilityLabel={t('Back to Sign In')} style={({ pressed }) => ({ marginTop: sp(5), opacity: pressed ? 0.7 : 1 })}>
                  <Text style={[typo.caption, { color: colors.primary, textAlign: 'center', fontWeight: '700' }]}>{t('Back to Sign In')}</Text>
                </Pressable>
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
  fill: { flex: 1 }, container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  wrap:  { width: '100%', alignSelf: 'center' },
  side:  { padding: 24, flex: 1, maxWidth: 480 },
  form:  { padding: 24, borderRadius: 20 },
  input: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 12, minHeight: 52 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 12, borderWidth: 1 },
  btn:   { padding: 16, alignItems: 'center', borderRadius: 12, minHeight: 52, justifyContent: 'center' },
});