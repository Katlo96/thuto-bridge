// app/signup.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, Image, TextInput, Pressable, Animated, StyleSheet,
  useWindowDimensions, Platform, KeyboardAvoidingView, ScrollView,
  ActivityIndicator, useColorScheme, Modal, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signUpWithEmail, sendPhoneOTP, parseFirebaseError } from '../services/authService';
import { useLanguage } from '../contexts/LanguageContext';
import StudentFooter from '../components/student/StudentFooter';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOGO = require('../assets/images/splash-illustration.png');
const PRIVACY_POLICY_URL = 'https://thuto-bridge-web.web.app/privacy-policy/';
const TERMS_OF_USE_URL = 'https://thuto-bridge-web.web.app/terms-of-use/';
const SUPPORT_URL = 'https://thuto-bridge-web.web.app/support/';
const CONSENT_STORAGE_KEY = 'thuto_bridge_signup_consent_v1';
const sp = (n: number) => n * 4;
const typo = {
  hero:     { fontSize: 38, lineHeight: 44, fontWeight: '900' as const },
  title:    { fontSize: 30, lineHeight: 36, fontWeight: '800' as const },
  subtitle: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const },
  body:     { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  label:    { fontSize: 13, lineHeight: 18, fontWeight: '700' as const },
  caption:  { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
};
const radii = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

// ─────────────────────────────────────────────────────────────────────────────
// Password strength helpers
// ─────────────────────────────────────────────────────────────────────────────
type StrengthLevel = 'none' | 'weak' | 'fair' | 'strong' | 'excellent';
function getStrength(pw: string): StrengthLevel {
  if (!pw) return 'none';
  let s = 0;
  if (pw.length >= 8)           s++;
  if (pw.length >= 12)          s++;
  if (/[A-Z]/.test(pw))         s++;
  if (/[0-9]/.test(pw))         s++;
  if (/[^A-Za-z0-9]/.test(pw))  s++;
  if (s <= 1) return 'weak'; if (s === 2) return 'fair'; if (s === 3) return 'strong'; return 'excellent';
}
function strengthMeta(l: StrengthLevel) {
  switch (l) {
    case 'weak':      return { label: 'Weak',     color: '#EF4444', segments: 1 };
    case 'fair':      return { label: 'Fair',      color: '#FBBF24', segments: 2 };
    case 'strong':    return { label: 'Strong',    color: '#34D399', segments: 3 };
    case 'excellent': return { label: 'Excellent', color: '#60A5FA', segments: 4 };
    default:          return { label: '',          color: 'transparent', segments: 0 };
  }
}
function StrengthBar({ password, borderColor }: { password: string; borderColor: string }) {
  const { t } = useLanguage();
  const l = getStrength(password); const m = strengthMeta(l);
  if (l === 'none') return null;
  return (
    <View style={{ marginTop: sp(2), gap: sp(1) }}>
      <View style={{ flexDirection: 'row', gap: sp(1) }}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= m.segments ? m.color : borderColor }} />
        ))}
      </View>
      <Text style={[typo.caption, { color: m.color, fontWeight: '700' }]}>{t(m.label)} {t('password')}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirmation Modal — works on web AND native
// ─────────────────────────────────────────────────────────────────────────────
type ConfirmModalProps = {
  visible:     boolean;
  type:        'email' | 'phone';
  email?:      string;
  phone?:      string;
  onPrimary:   () => void;   // main CTA
  onSecondary?: () => void;  // optional secondary action
};

function ConfirmModal({ visible, type, email, phone, onPrimary, onSecondary }: ConfirmModalProps) {
  const { t } = useLanguage();
  const scheme = useColorScheme() || 'light';
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1,    friction: 8, tension: 60, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1,    duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const colors = {
    overlay:    'rgba(0,0,0,0.65)',
    card:       scheme === 'light' ? '#FFFFFF' : '#1A232E',
    textPrimary:   scheme === 'light' ? '#0A111A' : '#EAF2F8',
    textSecondary: scheme === 'light' ? '#4A6572' : '#A0B4C0',
    textMuted:     scheme === 'light' ? '#7A919E' : '#7A919E',
    primary:    '#4A9FC6',
    success:    '#22C55E',
    border:     scheme === 'light' ? 'rgba(10,17,26,0.08)' : 'rgba(234,242,248,0.12)',
    divider:    scheme === 'light' ? 'rgba(10,17,26,0.07)' : 'rgba(234,242,248,0.08)',
  };

  const isEmail = type === 'email';
  const accentColor = isEmail ? colors.success : colors.primary;
  const icon        = isEmail ? 'mail-open-outline' : 'phone-portrait-outline';

  const maskedPhone = phone && phone.length > 6
    ? `${phone.slice(0, 4)}****${phone.slice(-3)}`
    : phone ?? '';

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onPrimary}>
      <View style={[ms.overlay, { backgroundColor: colors.overlay }]}>
        <Animated.View style={[ms.card, { backgroundColor: colors.card, opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>

          {/* Top accent bar */}
          <View style={{ height: 4, backgroundColor: accentColor, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl }} />

          <View style={{ padding: sp(6) }}>
            {/* Icon */}
            <View style={{ alignItems: 'center', marginBottom: sp(5) }}>
              <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: `${accentColor}18`, borderWidth: 2, borderColor: `${accentColor}33`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={34} color={accentColor} />
              </View>
            </View>

            {/* Title */}
            <Text style={[typo.title, { color: colors.textPrimary, textAlign: 'center', marginBottom: sp(2), fontSize: 22 }]}>
              {isEmail ? t('Verify Your Email') : t('One More Step')}
            </Text>

            {/* Subtitle */}
            <Text style={[typo.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: sp(5) }]}>
              {isEmail
                ? `${t('A verification link has been sent to')}\n`
                : `${t('A one-time code has been sent to')}\n`}
              <Text style={{ color: accentColor, fontWeight: '700' }}>
                {isEmail ? email : maskedPhone}
              </Text>
            </Text>

            {/* Info steps — extracted to typed const to satisfy TypeScript */}
            {(() => {
              const steps: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = isEmail
                ? [
                    { icon: 'mail-outline',             text: t('Open the email from Thuto Bridge')          },
                    { icon: 'link-outline',             text: t('Click the verification link inside')        },
                    { icon: 'checkmark-circle-outline', text: t('Come back and sign in to your account')     },
                  ]
                : [
                    { icon: 'chatbubble-outline',       text: t('Check your SMS for the OTP code')           },
                    { icon: 'keypad-outline',           text: t('Enter the 6-digit code on the next screen') },
                    { icon: 'checkmark-circle-outline', text: t('Your account will be created instantly')    },
                  ];
              return (
                <View style={{ gap: sp(3), marginBottom: sp(6), padding: sp(4), backgroundColor: `${accentColor}0D`, borderRadius: radii.lg, borderWidth: 1, borderColor: `${accentColor}22` }}>
                  {steps.map(({ icon: ico, text }, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: sp(3) }}>
                      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${accentColor}18`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Ionicons name={ico} size={14} color={accentColor} />
                      </View>
                      <Text style={[typo.caption, { color: colors.textSecondary, flex: 1, lineHeight: 18 }]}>{text}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}

            {/* Extra note for email */}
            {isEmail && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: sp(2), marginBottom: sp(5), padding: sp(3), backgroundColor: `${colors.primary}0A`, borderRadius: radii.md, borderWidth: 1, borderColor: `${colors.primary}18` }}>
                <Ionicons name="information-circle-outline" size={14} color={colors.primary} style={{ marginTop: 1 }} />
                <Text style={[typo.caption, { color: colors.textSecondary, flex: 1, fontSize: 11, lineHeight: 16 }]}>
                  Can't find it? Check your spam or junk folder. The link expires in 24 hours.
                </Text>
              </View>
            )}

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: colors.divider, marginBottom: sp(5) }} />

            {/* Primary CTA */}
            <Pressable
onPress={onPrimary}
accessibilityRole="button"
accessibilityLabel={isEmail ? t('Go to Sign In') : t('Enter OTP Code')}
              style={({ pressed }) => ({ backgroundColor: accentColor, paddingVertical: sp(4), borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: sp(2), opacity: pressed ? 0.88 : 1, transform: pressed ? [{ scale: 0.97 }] : [] })}>
              <Ionicons name={isEmail ? 'log-in-outline' : 'arrow-forward-outline'} size={18} color="#fff" />
              <Text style={[typo.body, { color: '#fff', fontWeight: '700' }]}>
                {isEmail ? t('Go to Sign In') : t('Enter OTP Code')}
              </Text>
            </Pressable>

            {/* Secondary action */}
            {onSecondary && (
              <Pressable
onPress={onSecondary}
accessibilityRole="button"
accessibilityLabel={isEmail ? t("I'll verify later") : t('Change phone number')}
style={({ pressed }) => ({ marginTop: sp(3), opacity: pressed ? 0.7 : 1 })}>
                <Text style={[typo.caption, { color: colors.textMuted, textAlign: 'center', fontWeight: '600' }]}>
                  {isEmail ? t("I'll verify later") : t('Change phone number')}
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

type ConsentColors = {
  primary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  surfaceAlt2: string;
};

function ConsentRow({ checked, onToggle, label, detail, linkLabel, onOpenLink, colors }: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  detail?: string;
  linkLabel?: string;
  onOpenLink?: () => void;
  colors: ConsentColors;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: sp(3), paddingVertical: sp(2) }}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 26, height: 26, borderRadius: 8, borderWidth: 1.5,
          borderColor: checked ? colors.primary : colors.border,
          backgroundColor: checked ? colors.primary : colors.surfaceAlt2,
          alignItems: 'center', justifyContent: 'center',
          opacity: pressed ? 0.75 : 1, flexShrink: 0,
        })}
      >
        {checked && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked }}>
          <Text style={[typo.body, { color: colors.textPrimary, lineHeight: 20 }]}>{label}</Text>
        </Pressable>
        {detail ? <Text style={[typo.caption, { color: colors.textMuted, marginTop: 3, lineHeight: 16 }]}>{detail}</Text> : null}
        {linkLabel && onOpenLink ? (
          <Pressable onPress={onOpenLink} accessibilityRole="link" hitSlop={6} style={({ pressed }) => ({ marginTop: 4, alignSelf: 'flex-start', opacity: pressed ? 0.7 : 1 })}>
            <Text style={[typo.caption, { color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' }]}>{linkLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Signup screen
// ─────────────────────────────────────────────────────────────────────────────
export default function Signup() {
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
    border:        scheme === 'light' ? 'rgba(10,17,26,0.08)' : 'rgba(234,242,248,0.12)',
    borderFocus:   '#4A9FC6',
  }), [scheme]);

  const uiMode = useMemo(() => {
    if (width <= 479) return 'mobile'; if (width <= 1023) return 'tablet'; return 'desktop';
  }, [width]);
  const isMobile = uiMode === 'mobile'; const isDesktop = uiMode === 'desktop';

  // Form state
  const [inputMode,       setInputMode]       = useState<'email' | 'phone'>('email');
  const [identifier,      setIdentifier]      = useState('');
  const [fullName,        setFullName]        = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [focused,         setFocused]         = useState<string | null>(null);
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [acceptedTerms,   setAcceptedTerms]   = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedCookies, setAcceptedCookies] = useState(false);
  const [consentModalVisible, setConsentModalVisible] = useState(false);

  // Modal state
  const [modalVisible,     setModalVisible]     = useState(false);
  const [modalType,        setModalType]        = useState<'email' | 'phone'>('email');
  const [pendingPhone,     setPendingPhone]     = useState('');
  const [pendingVerifId,   setPendingVerifId]   = useState('');
  const [pendingEmail,     setPendingEmail]     = useState('');

  // Animations
  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(24)).current;
  const tabSlide      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(fadeAnim,      { toValue: 1, friction: 9, tension: 50, useNativeDriver: true }),
      Animated.spring(translateAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const switchMode = useCallback((mode: 'email' | 'phone') => {
    setInputMode(mode); setIdentifier(''); setError(null);
    Animated.spring(tabSlide, { toValue: mode === 'email' ? 0 : 1, friction: 8, tension: 60, useNativeDriver: false }).start();
  }, [tabSlide]);

  const tabLeft = tabSlide.interpolate({ inputRange: [0, 1], outputRange: ['2%', '51%'] });
  const matchState = !confirmPassword ? 'idle' : password === confirmPassword ? 'match' : 'mismatch';
  const allConsentAccepted = acceptedTerms && acceptedPrivacy && acceptedCookies;

  const openExternalLink = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch {
      setError(t('Unable to open this page right now. Please try again.'));
    }
  }, [t]);

  const validate = useCallback(() => {
    if (!fullName.trim() || fullName.trim().length < 2)   return t('Please enter your full name.');
    if (inputMode === 'email') {
      if (!identifier.trim() || !/\S+@\S+\.\S+/.test(identifier.trim())) return t('Please enter a valid email address.');
    } else {
      if (identifier.replace(/\D/g, '').length < 7)       return t('Please enter a valid phone number.');
    }
    if (!password.trim() || password.length < 8)          return t('Password must be at least 8 characters.');
    if (password !== confirmPassword)                      return t('Passwords do not match.');
    if (!acceptedTerms)                                     return t('Please accept the Terms of Use.');
    if (!acceptedPrivacy)                                   return t('Please acknowledge the Privacy Policy.');
    if (!acceptedCookies)                                   return t('Please allow essential cookies and secure local storage.');
    return null;
  }, [fullName, inputMode, identifier, password, confirmPassword, acceptedTerms, acceptedPrivacy, acceptedCookies, t]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSignup = useCallback(async () => {
    if (!allConsentAccepted) {
      setConsentModalVisible(true);
      setError(t('Please review and accept the required permissions before creating your account.'));
      return;
    }

    const err = validate();
    if (err) { setError(err); return; }
    setIsSubmitting(true); setError(null);

    try {
      await AsyncStorage.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify({
          termsAccepted: true,
          privacyAccepted: true,
          essentialStorageAccepted: true,
          acceptedAt: new Date().toISOString(),
          termsUrl: TERMS_OF_USE_URL,
          privacyUrl: PRIVACY_POLICY_URL,
        }),
      );
      if (inputMode === 'email') {
        // Create account + send verification email
        await signUpWithEmail(identifier.trim(), password, fullName.trim());
        setPendingEmail(identifier.trim());
        setModalType('email');
        setModalVisible(true);
      } else {
        // Send OTP for phone signup
        const result = await sendPhoneOTP(identifier.trim());
        setPendingPhone(identifier.trim());
        setPendingVerifId((result as any).verificationId ?? '');
        setModalType('phone');
        setModalVisible(true);
      }
    } catch (e: any) {
      setError(parseFirebaseError(e));
    } finally {
      setIsSubmitting(false);
    }
  }, [allConsentAccepted, validate, inputMode, identifier, password, fullName, t]);

  // ── Modal primary action ───────────────────────────────────────────────────
  const handleModalPrimary = useCallback(() => {
    setModalVisible(false);
    if (modalType === 'email') {
      router.replace('/login');
    } else {
      router.push({
        pathname: '/verify-code',
        params: {
          phone:          pendingPhone,
          verificationId: pendingVerifId,
          fullName:       fullName.trim(),
          mode:           'signup',
        },
      });
    }
  }, [modalType, pendingPhone, pendingVerifId, fullName]);

  // ── Input helpers ──────────────────────────────────────────────────────────
  const inp = useCallback((field: string) => ({
    borderColor:     focused === field ? colors.borderFocus : colors.border,
    borderWidth:     focused === field ? 1.5 : 1,
    backgroundColor: colors.surfaceAlt,
  }), [focused, colors]);
  const ic = useCallback((field: string) => focused === field ? colors.primary : colors.textMuted, [focused, colors]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={[s.scroll, { padding: sp(isDesktop ? 10 : 5) }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Animated.View style={[s.wrap, { maxWidth: isDesktop ? 1240 : '100%', flexDirection: isDesktop ? 'row' : 'column', gap: sp(6), opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}>

              {/* ── Desktop sidebar ── */}
              {isDesktop && (
                <View style={[s.side, { flex: 1, maxWidth: 520 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <Image source={LOGO} style={{ width: 48, height: 48 }} resizeMode="contain" />
                    <Text style={[typo.hero, { color: colors.textPrimary, marginLeft: sp(3) }]}>THUTO BRIDGE</Text>
                  </View>
                  <Text style={[typo.subtitle, { color: colors.textSecondary, marginBottom: sp(5) }]}>
                    Join a platform built for your educational journey across Botswana.
                  </Text>
                  <View style={{ gap: sp(3) }}>
                    {[
                      { icon: 'sparkles-outline',    title: t('Personalised Access'),       desc: t('Role-based dashboards tailored to you.')             },
                      { icon: 'lock-closed-outline', title: t('Secure Signup'),             desc: t('Quick and safe account creation.')                   },
                      { icon: 'school-outline',      title: t('University & Course Match'), desc: t('Find the right institution for your BGCSE results.') },
                      { icon: 'ribbon-outline',      title: t('Scholarship Discovery'),     desc: t('Bursaries and sponsorships matched to your profile.') },
                    ].map((b, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: radii.lg, borderWidth: 1, backgroundColor: colors.surfaceAlt2, borderColor: colors.border }}>
                        <View style={{ width: 38, height: 38, borderRadius: radii.md, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name={b.icon as any} size={18} color={colors.primary} />
                        </View>
                        <View style={{ marginLeft: sp(3), flex: 1 }}>
                          <Text style={[typo.label, { color: colors.textPrimary }]}>{b.title}</Text>
                          <Text style={[typo.caption, { color: colors.textMuted, marginTop: 2 }]}>{b.desc}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* ── Form ── */}
              <View style={[s.form, { flex: 1, maxWidth: isDesktop ? 480 : '100%' }]}>
                {!isDesktop && (
                  <View style={{ alignItems: 'center', marginBottom: sp(5) }}>
                    <Image source={LOGO} style={{ width: 64, height: 64 }} resizeMode="contain" />
                    <Text style={[typo.title, { color: colors.textPrimary, marginTop: sp(2) }]}>THUTO BRIDGE</Text>
                  </View>
                )}

                <Text style={[typo.title, { color: colors.textPrimary, marginBottom: sp(1), textAlign: isMobile ? 'center' : 'left' }]} accessibilityRole="header">
                  Create Account
                </Text>
                <Text style={[typo.subtitle, { color: colors.textSecondary, marginBottom: sp(5), textAlign: isMobile ? 'center' : 'left' }]}>
                  Start your journey with Thuto Bridge
                </Text>

                {/* Tabs */}
                <View style={[s.tabWrap, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Animated.View style={[s.tabBar, { left: tabLeft, width: '48%', backgroundColor: colors.primary }]} />
                  {(['email', 'phone'] as const).map((m) => (
                    <Pressable
key={m}
onPress={() => switchMode(m)}
style={s.tab}
accessibilityRole="tab"
accessibilityLabel={m === 'email' ? t('Email') : t('Phone')}
accessibilityState={{ selected: inputMode === m }}
>
                      <Ionicons name={m === 'email' ? 'mail-outline' : 'call-outline'} size={15} color={inputMode === m ? '#fff' : colors.textMuted} />
                      <Text style={[typo.label, { color: inputMode === m ? '#fff' : colors.textMuted, marginLeft: sp(2), fontSize: 13 }]}>
                        {m === 'email' ? t('Email') : t('Phone')}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Full name */}
                <View style={[s.input, { marginTop: sp(4) }, inp('name')]}>
                  <Ionicons name="person-outline" size={20} color={ic('name')} style={{ marginRight: sp(2) }} />
                  <TextInput value={fullName} onChangeText={(value) => { setFullName(value); setError(null); }} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                    placeholder={t('Full name')} placeholderTextColor={colors.textMuted} accessibilityLabel={t('Full name')} autoCapitalize="words" autoCorrect={false}
                    style={[typo.body, { flex: 1, color: colors.textPrimary }]} />
                  {fullName.length > 0 && <Pressable onPress={() => setFullName('')} accessibilityRole="button" accessibilityLabel={t('Clear')} hitSlop={8}><Ionicons name="close-circle" size={17} color={colors.textMuted} /></Pressable>}
                </View>

                {/* Email / Phone identifier */}
                <View style={[s.input, { marginTop: sp(3) }, inp('id')]}>
                  <Ionicons name={inputMode === 'email' ? 'mail-outline' : 'call-outline'} size={20} color={ic('id')} style={{ marginRight: sp(2) }} />
                  <TextInput value={identifier} onChangeText={(value) => { setIdentifier(value); setError(null); }} onFocus={() => setFocused('id')} onBlur={() => setFocused(null)}
                    placeholder={inputMode === 'email' ? t('Email address') : '71 234 567  or  +267 71 234 567'}
                    placeholderTextColor={colors.textMuted} accessibilityLabel={inputMode === 'email' ? t('Email address') : t('Phone number')} keyboardType={inputMode === 'email' ? 'email-address' : 'phone-pad'}
                    autoCapitalize="none" autoCorrect={false} style={[typo.body, { flex: 1, color: colors.textPrimary }]} />
                  {identifier.length > 0 && <Pressable onPress={() => setIdentifier('')} accessibilityRole="button" accessibilityLabel={t('Clear')} hitSlop={8}><Ionicons name="close-circle" size={17} color={colors.textMuted} /></Pressable>}
                </View>

                {inputMode === 'phone' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp(2), marginTop: sp(2), paddingHorizontal: sp(1) }}>
                    <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
                    <Text style={[typo.caption, { color: colors.textMuted, fontSize: 11 }]}>{t("You can enter just the number (71 234 567) — we'll add +267 automatically")}</Text>
                  </View>
                )}

                {/* Password */}
                <View style={[s.input, { marginTop: sp(3) }, inp('pw')]}>
                  <Ionicons name="lock-closed-outline" size={20} color={ic('pw')} style={{ marginRight: sp(2) }} />
                  <TextInput value={password} onChangeText={(value) => { setPassword(value); setError(null); }} onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)}
                    placeholder={t('Password')} placeholderTextColor={colors.textMuted} accessibilityLabel={t('Password')} secureTextEntry={!showPw} autoCapitalize="none" autoCorrect={false}
                    style={[typo.body, { flex: 1, color: colors.textPrimary }]} />
                  <Pressable onPress={() => setShowPw((p) => !p)} accessibilityRole="button" accessibilityLabel={showPw ? t('Hide password') : t('Show password')} hitSlop={8}>
                    <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
                {password.length > 0 && (
                  <View style={{ paddingHorizontal: sp(1), marginTop: sp(1) }}>
                    <StrengthBar password={password} borderColor={colors.border} />
                  </View>
                )}

                {/* Confirm password */}
                <View style={[s.input, { marginTop: sp(3), borderColor: matchState === 'match' ? '#34D399' : matchState === 'mismatch' ? colors.error : focused === 'confirm' ? colors.borderFocus : colors.border, borderWidth: focused === 'confirm' || matchState !== 'idle' ? 1.5 : 1, backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={matchState === 'match' ? '#34D399' : matchState === 'mismatch' ? colors.error : ic('confirm')} style={{ marginRight: sp(2) }} />
                  <TextInput value={confirmPassword} onChangeText={(value) => { setConfirmPassword(value); setError(null); }} onFocus={() => setFocused('confirm')} onBlur={() => setFocused(null)}
                    placeholder={t('Confirm password')} placeholderTextColor={colors.textMuted} accessibilityLabel={t('Confirm password')} secureTextEntry={!showConfirm} autoCapitalize="none" autoCorrect={false}
                    style={[typo.body, { flex: 1, color: colors.textPrimary }]} />
                  {matchState !== 'idle' && <Ionicons name={matchState === 'match' ? 'checkmark-circle' : 'close-circle'} size={18} color={matchState === 'match' ? '#34D399' : colors.error} style={{ marginRight: sp(1) }} />}
                  <Pressable onPress={() => setShowConfirm((p) => !p)} accessibilityRole="button" accessibilityLabel={showConfirm ? t('Hide password') : t('Show password')} hitSlop={8}>
                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
                {matchState === 'mismatch' && <Text style={[typo.caption, { color: colors.error,   marginTop: sp(1), paddingHorizontal: sp(1) }]}>{t('Passwords do not match')}</Text>}
                {matchState === 'match'    && <Text style={[typo.caption, { color: '#34D399', marginTop: sp(1), paddingHorizontal: sp(1) }]}>{t('Passwords match')} ✓</Text>}

                {/* Error */}
                {error && (
                  <View style={[s.errorBox, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}22`, marginTop: sp(3) }]}>
                    <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
                    <Text style={[typo.caption, { color: colors.error, marginLeft: sp(2), flex: 1, lineHeight: 18 }]}>{error}</Text>
                  </View>
                )}

                {/* Required consent */}
                <View style={[s.consentCard, { backgroundColor: colors.surfaceAlt, borderColor: allConsentAccepted ? `${colors.primary}55` : colors.border }]}>
                  <View style={s.consentHeader}>
                    <View style={[s.consentIcon, { backgroundColor: `${colors.primary}16` }]}>
                      <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typo.label, { color: colors.textPrimary }]}>{t('Privacy and permissions')}</Text>
                      <Text style={[typo.caption, { color: colors.textMuted, marginTop: 2, lineHeight: 17 }]}>
                        {t('Review each item before creating your account.')}
                      </Text>
                    </View>
                  </View>

                  <ConsentRow
                    checked={acceptedTerms}
                    onToggle={() => { setAcceptedTerms(v => !v); setError(null); }}
                    label={t('I accept the Terms of Use')}
                    linkLabel={t('Read terms')}
                    onOpenLink={() => void openExternalLink(TERMS_OF_USE_URL)}
                    colors={colors}
                  />
                  <ConsentRow
                    checked={acceptedPrivacy}
                    onToggle={() => { setAcceptedPrivacy(v => !v); setError(null); }}
                    label={t('I acknowledge the Privacy Policy')}
                    linkLabel={t('Read policy')}
                    onOpenLink={() => void openExternalLink(PRIVACY_POLICY_URL)}
                    colors={colors}
                  />
                  <ConsentRow
                    checked={acceptedCookies}
                    onToggle={() => { setAcceptedCookies(v => !v); setError(null); }}
                    label={t('Allow essential cookies and secure local storage')}
                    detail={t('Required to keep you signed in, protect your session, and remember security preferences.')}
                    colors={colors}
                  />

                  <Pressable onPress={() => setConsentModalVisible(true)} accessibilityRole="button" style={({ pressed }) => ({ marginTop: sp(2), opacity: pressed ? 0.7 : 1 })}>
                    <Text style={[typo.caption, { color: colors.primary, fontWeight: '700', textAlign: 'center' }]}>
                      {t('Why are these permissions required?')}
                    </Text>
                  </Pressable>
                </View>

                {/* Submit */}
                <Pressable onPress={handleSignup} disabled={isSubmitting}
                  style={({ pressed }) => [s.btn, { backgroundColor: colors.primary, marginTop: sp(4) }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 }, isSubmitting && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel={inputMode === 'phone' ? t('Send OTP Code') : t('Create Account')}>
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : (
                    <Text style={[typo.body, { color: '#fff', fontWeight: '700' }]}>
                      {inputMode === 'phone' ? t('Send OTP Code') : t('Create Account')}
                    </Text>
                  )}
                </Pressable>

                {/* Login link */}
                <View style={[s.footer, { marginTop: sp(4) }]}>
                  <Text style={[typo.caption, { color: colors.textMuted }]}>{t('Already have an account?')}</Text>
                  <Pressable onPress={() => router.replace('/login')} accessibilityRole="button" accessibilityLabel={t('Sign In')} hitSlop={8}>
                    <Text style={[typo.caption, { color: colors.primary, fontWeight: '700', marginLeft: sp(1) }]}>{t('Sign In')}</Text>
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

      <Modal
        visible={consentModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setConsentModalVisible(false)}
      >
        <View style={ms.overlay}>
          <View style={[ms.card, { backgroundColor: scheme === 'light' ? '#FFFFFF' : '#1A232E' }]}>
            <View style={{ height: 4, backgroundColor: colors.primary }} />
            <ScrollView contentContainerStyle={{ padding: sp(6) }} showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: 'center', marginBottom: sp(4) }}>
                <View style={{ width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}16` }}>
                  <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} />
                </View>
              </View>
              <Text style={[typo.title, { color: colors.textPrimary, textAlign: 'center', fontSize: 22 }]}>{t('Your privacy choices')}</Text>
              <Text style={[typo.body, { color: colors.textSecondary, textAlign: 'center', marginTop: sp(2), marginBottom: sp(5), lineHeight: 22 }]}>
                {t('Thuto Bridge needs your agreement to its legal terms and permission to use essential device storage for secure sign-in. Biometrics are separate and can be enabled later on the login screen.')}
              </Text>

              <ConsentRow checked={acceptedTerms} onToggle={() => setAcceptedTerms(v => !v)} label={t('I accept the Terms of Use')} linkLabel={t('Open')} onOpenLink={() => void openExternalLink(TERMS_OF_USE_URL)} colors={colors} />
              <ConsentRow checked={acceptedPrivacy} onToggle={() => setAcceptedPrivacy(v => !v)} label={t('I acknowledge the Privacy Policy')} linkLabel={t('Open')} onOpenLink={() => void openExternalLink(PRIVACY_POLICY_URL)} colors={colors} />
              <ConsentRow checked={acceptedCookies} onToggle={() => setAcceptedCookies(v => !v)} label={t('Allow essential cookies and secure local storage')} detail={t('This is used only for authentication sessions, fraud prevention, and saved security preferences.')} colors={colors} />

              <Pressable
                onPress={() => {
                  if (!allConsentAccepted) {
                    setError(t('Please accept all three required items.'));
                    return;
                  }
                  setError(null);
                  setConsentModalVisible(false);
                }}
                style={({ pressed }) => [s.btn, { backgroundColor: colors.primary, marginTop: sp(5) }, pressed && { opacity: 0.88 }]}
              >
                <Text style={[typo.body, { color: '#fff', fontWeight: '700' }]}>{t('Save and continue')}</Text>
              </Pressable>
              <Pressable onPress={() => void openExternalLink(SUPPORT_URL)} style={({ pressed }) => ({ marginTop: sp(3), opacity: pressed ? 0.7 : 1 })}>
                <Text style={[typo.caption, { color: colors.textMuted, textAlign: 'center' }]}>{t('Need help understanding these choices?')}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Confirmation Modal ── */}
      <ConfirmModal
        visible={modalVisible}
        type={modalType}
        email={pendingEmail}
        phone={pendingPhone}
        onPrimary={handleModalPrimary}
        onSecondary={() => setModalVisible(false)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  fill:    { flex: 1 },
  container: { flex: 1 },
  scroll:  { flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  wrap:    { width: '100%', alignSelf: 'center' },
  side:    { padding: 24, borderRadius: 20 },
  form:    { padding: 24, borderRadius: 20 },
  tabWrap: { flexDirection: 'row', borderRadius: 999, borderWidth: 1, padding: 3, position: 'relative', overflow: 'hidden', height: 48 },
  tabBar:  { position: 'absolute', top: 3, bottom: 3, borderRadius: 999, zIndex: 0 },
  tab:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 1, borderRadius: 999 },
  input:   { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 12, minHeight: 52 },
  errorBox:{ flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 12, borderWidth: 1 },
  btn:     { padding: 16, alignItems: 'center', borderRadius: 12, minHeight: 52, justifyContent: 'center' },
  footer:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  consentCard: { marginTop: 16, padding: 14, borderWidth: 1, borderRadius: 16, gap: 10 },
  consentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  consentIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

const ms = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 24 },
      android: { elevation: 16 },
      web:     { boxShadow: '0 12px 40px rgba(0,0,0,0.35)' } as any,
      default: {},
    }),
  },
});