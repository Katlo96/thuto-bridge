// app/student/dashboard.tsx
import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  useWindowDimensions,
  Platform,
  Animated,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import DashboardLayout, {
  spacing,
  typography,
  useTheme,
  radii,
} from '../../components/student/DashboardLayout';
import { db, auth } from '../../constants/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useLanguage } from '../../contexts/LanguageContext';
import StudentFooter from '../../components/student/StudentFooter';

export default function StudentDashboardScreen() {
  return <DashboardContent />;
}

// ─── Responsive breakpoints ──────────────────────────────────────────────────
function useLayout() {
  const { width } = useWindowDimensions();
  const isMobile  = width < 480;
  const isTablet  = width >= 480 && width < 1024;
  const isDesktop = width >= 1024;
  const actionCols = isMobile ? 2 : 3;
  const recCols    = isMobile ? 1 : isTablet ? 2 : 3;
  return { width, isMobile, isTablet, isDesktop, actionCols, recCols };
}



// ─── Spring entrance hook ────────────────────────────────────────────────────
function useEntranceAnim(delay = 0) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue:        1,
        duration:       400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue:        0,
        delay,
        useNativeDriver: true,
        damping:         20,
        stiffness:       140,
      }),
    ]).start();
  }, []);

  return { opacity, translateY };
}

// ─── Animated section wrapper ────────────────────────────────────────────────
function FadeIn({
  delay,
  children,
  style,
}: {
  delay:    number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { opacity, translateY } = useEntranceAnim(delay);
  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// ─── Per-action accent colours ───────────────────────────────────────────────
const ACTION_ACCENTS = [
  '#60A5FA', // Enter Results   — blue
  '#A78BFA', // View Courses    — violet
  '#F59E0B', // Institutions    — amber
  '#FB923C', // Scholarships    — orange
  '#38BDF8', // Progress        — sky
  '#F472B6', // My Career       — pink
  '#22D3EE', // Saved           — cyan
];

// ─── Profile / points data shape stored in Firestore (users/{uid}) ──────────
type DashboardProfileData = {
  name?: string;
  phone?: string;
  school?: string;
  yearForm?: string;
  bio?: string;
  pointsTotal?: number;
  pointsEligible?: boolean;
  pointsCalculatedAt?: string; // ISO date string
};

// Mirrors the completeness weighting used on the profile screen.
function computeCompleteness(data: DashboardProfileData): number {
  let s = 0;
  if (data.name?.trim())     s += 25;
  if (data.phone?.trim())    s += 15;
  if (data.school?.trim())   s += 20;
  if (data.yearForm?.trim()) s += 15;
  if (data.bio?.trim())      s += 25;
  return s;
}

function formatCalculatedDate(
  iso: string | undefined,
  language: 'en' | 'tn',
): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return new Intl.DateTimeFormat(language === 'tn' ? 'tn-BW' : 'en-BW', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  }).format(d);
}

// ─── Profile completion alert banner ─────────────────────────────────────────
function ProfileAlertBanner({ colors, isMobile }: { colors: any; isMobile: boolean }) {
  const { t } = useLanguage();

  return (
    <View
      style={{
        flexDirection:     'row',
        alignItems:        'center',
        gap:               spacing(3),
        padding:           spacing(isMobile ? 4 : 5),
        backgroundColor:   `${colors.warning}14`,
        borderRadius:      radii.xl,
        borderWidth:       1,
        borderColor:       `${colors.warning}40`,
        borderLeftWidth:   3,
        borderLeftColor:   colors.warning,
      }}
    >
      <View
        style={{
          width:           isMobile ? 34 : 38,
          height:          isMobile ? 34 : 38,
          borderRadius:    radii.md,
          backgroundColor: `${colors.warning}22`,
          alignItems:      'center',
          justifyContent:  'center',
          flexShrink:      0,
        }}
      >
        <Ionicons name="alert-circle-outline" size={isMobile ? 16 : 18} color={colors.warning} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: isMobile ? 12.5 : 13.5, fontWeight: '700', color: colors.textPrimary }}>
          {t('Finish updating your profile')}
        </Text>
        <Text style={{ fontSize: isMobile ? 11 : 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 }}>
          {t('Complete your profile to unlock stronger recommendations.')}
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/student/profile')}
        accessibilityRole="button"
        accessibilityLabel={t('UPDATE')}
        style={({ pressed }) => ({
          flexDirection:     'row',
          alignItems:        'center',
          gap:               spacing(1),
          paddingHorizontal: spacing(3),
          paddingVertical:   spacing(2),
          borderRadius:      radii.pill,
          backgroundColor:   colors.warning,
          opacity:           pressed ? 0.85 : 1,
          flexShrink:        0,
        })}
      >
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#000' }}>{t('UPDATE')}</Text>
        <Ionicons name="chevron-forward" size={12} color="#000" />
      </Pressable>
    </View>
  );
}



// ─── Dashboard Content ────────────────────────────────────────────────────────
function DashboardContent() {
  const colors = useTheme();
  const { t, language } = useLanguage();
  const layout = useLayout();

  const [showInstitutionModal, setShowInstitutionModal] = useState(false);
  const openInstitutionModal  = useCallback(() => setShowInstitutionModal(true),  []);
  const closeInstitutionModal = useCallback(() => setShowInstitutionModal(false), []);

  // ── Firestore-backed profile/points state ──────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileData, setProfileData] = useState<DashboardProfileData>({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setProfileData({});
        setProfileLoaded(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        setProfileData(snap.exists() ? (snap.data() as DashboardProfileData) : {});
      } catch (err) {
        console.error('[Dashboard] failed to load profile/points:', err);
        setProfileData({});
      } finally {
        setProfileLoaded(true);
      }
    });
    return unsub;
  }, []);

  const name          = profileData.name?.trim() || '';
  const completeness  = useMemo(() => computeCompleteness(profileData), [profileData]);
  const hasPoints     = profileLoaded && typeof profileData.pointsTotal === 'number';
  const lastUpdated   = formatCalculatedDate(profileData.pointsCalculatedAt, language);

  const title = name ? `${t('Welcome back, ')}${name}` : undefined;

  const showProfileBanner = profileLoaded && !!currentUser && completeness < 100;

  const quickActions = useMemo(
    () => [
      {
        label:   t('Enter Results'),
        icon:    'create-outline'       as const,
        href:    '/student/enter-results',
        accent:  ACTION_ACCENTS[0],
        desc:    t('Log your marks'),
      },
      {
        label:   t('View Courses'),
        icon:    'eye-outline'          as const,
        href:    '/student/courses',
        accent:  ACTION_ACCENTS[1],
        desc:    t('Browse programmes'),
      },
      {
        label:   t('Institutions'),
        icon:    'school-outline'       as const,
        onPress: openInstitutionModal,
        accent:  ACTION_ACCENTS[2],
        desc:    t('Find your school'),
      },
      {
        label:   t('Scholarships'),
        icon:    'ribbon-outline'       as const,
        href:    '/student/scholarships',
        accent:  ACTION_ACCENTS[3],
        desc:    t('Funding options'),
      },
      {
        label:   t('Progress'),
        icon:    'trending-up-outline'  as const,
        href:    '/student/progress',
        accent:  ACTION_ACCENTS[4],
        desc:    t('Track your grades'),
      },
      // ── NEW ITEMS ─────────────────────────────────────
      {
        label:   t('My Career'),
        icon:    'compass-outline'      as const,
        href:    '/student/my-career',
        accent:  ACTION_ACCENTS[5],
        desc:    t('Explore career paths'),
      },
      {
        label:   t('Saved'),
        icon:    'bookmark-outline'     as const,
        href:    '/student/saved',
        accent:  ACTION_ACCENTS[6],
        desc:    t('Bookmarked items'),
      },
    ],
    [openInstitutionModal, t],
  );

  const { actionCols, isMobile } = layout;

  

  return (
    <DashboardLayout
      title={title}
      showPointsCard={hasPoints}
      points={profileData.pointsTotal}
      lastUpdated={lastUpdated}
      eligible={profileData.pointsEligible}
      banner={showProfileBanner ? <ProfileAlertBanner colors={colors} isMobile={isMobile} /> : undefined}
    >
      {/* ── Activity strip ── */}
      <FadeIn delay={60}>
        <ActivityStrip isMobile={isMobile} colors={colors} />
      </FadeIn>

      {/* ── Quick Actions ── */}
      <FadeIn delay={140} style={{ marginTop: spacing(8) }}>
        <SectionHeader
          title={t('Quick Actions')}
          subtitle={t('Everything you need, one tap away')}
          colors={colors}
          isMobile={isMobile}
        />

        <View style={[styles.grid, { marginHorizontal: -spacing(isMobile ? 1.5 : 2) }]}>
          {quickActions.map((action, index) => (
            <FadeIn
              key={action.href ?? action.label}
              delay={180 + index * 55}
              style={[
                styles.gridItem,
                {
                  width:             `${100 / actionCols}%`,
                  paddingHorizontal: spacing(isMobile ? 1.5 : 2),
                },
              ]}
            >
              <ActionCard
                action={action}
                colors={colors}
                isMobile={isMobile}
              />
            </FadeIn>
          ))}
        </View>
      </FadeIn>

      {/* ── Tips banner ── */}
      <FadeIn delay={620} style={{ marginBottom: spacing(4) }}>
        <TipsBanner colors={colors} isMobile={isMobile} />
      </FadeIn>

      {/* ── Shared responsive student footer ── */}
      <FadeIn delay={700}>
        <StudentFooter
          topSpacing={spacing(isMobile ? 6 : 8)}
          maxWidth={1200}
        />
      </FadeIn>

      {/* ── Institution Modal ── */}
      <InstitutionModal
        visible={showInstitutionModal}
        onClose={closeInstitutionModal}
        colors={colors}
        isMobile={isMobile}
      />
    </DashboardLayout>
  );
}

// ─── Activity Strip ───────────────────────────────────────────────────────────
const ACTIVITY_ITEMS = [
  { icon: 'book-outline' as const, label: 'Courses available', color: '#34D399' },
  { icon: 'ribbon-outline' as const, label: 'Scholarships open', color: '#FBBF24' },
  { icon: 'school-outline' as const, label: 'Institutions listed', color: '#FB923C' },
] as const;

function ActivityStrip({ isMobile, colors }: { isMobile: boolean; colors: any }) {
  const { t } = useLanguage();

  return (
    <View style={{
      flexDirection:     'row',
      gap:               spacing(isMobile ? 2 : 3),
      paddingVertical:   spacing(1),
      flexWrap:          isMobile ? 'wrap' : 'nowrap',
    }}>
      {ACTIVITY_ITEMS.map(item => (
        <View
          key={item.label}
          accessible
          accessibilityLabel={t(item.label)}
          style={{
            flex:              isMobile ? undefined : 1,
            flexDirection:     'row',
            alignItems:        'center',
            gap:               spacing(2),
            paddingHorizontal: spacing(3),
            paddingVertical:   spacing(2),
            borderRadius:      radii.lg,
            backgroundColor:   `${item.color}12`,
            borderWidth:       1,
            borderColor:       `${item.color}28`,
          }}
        >
          <Ionicons name={item.icon} size={isMobile ? 13 : 15} color={item.color} />
          <Text style={{
            fontSize:   isMobile ? 11 : 12,
            fontWeight: '600',
            color:      item.color,
          }}>
            {t(item.label)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  colors,
  isMobile,
  action,
}: {
  title:    string;
  subtitle?: string;
  colors:   any;
  isMobile: boolean;
  action?:  { label: string; onPress: () => void };
}) {
  return (
    <View style={{ marginBottom: spacing(isMobile ? 4 : 5) }}>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), flex: 1 }}>
          <View style={[styles.sectionAccent, { backgroundColor: colors.primary }]} />
          <Text style={[typography.h2, { color: colors.textPrimary, fontSize: isMobile ? 15 : 17 }]}>
            {title}
          </Text>
        </View>
        {action && (
          <Pressable
            onPress={action.onPress}
            style={({ pressed }) => ({
              flexDirection:     'row',
              alignItems:        'center',
              gap:               spacing(1),
              paddingHorizontal: spacing(3),
              paddingVertical:   spacing(1),
              borderRadius:      radii.pill,
              backgroundColor:   `${colors.primary}15`,
              borderWidth:       1,
              borderColor:       `${colors.primary}30`,
              opacity:           pressed ? 0.75 : 1,
            })}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 0.3 }}>
              {action.label.toUpperCase()}
            </Text>
            <Ionicons name="chevron-forward" size={11} color={colors.primary} />
          </Pressable>
        )}
      </View>
      {subtitle && (
        <Text style={{
          fontSize:   isMobile ? 11 : 12,
          color:      colors.textMuted,
          marginLeft: spacing(3) + 3, // align with title text (accent bar width + gap)
          marginTop:  spacing(1),
        }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

// ─── Action Card ──────────────────────────────────────────────────────────────
function ActionCard({
  action,
  colors,
  isMobile,
}: {
  action:   any;
  colors:   any;
  isMobile: boolean;
}) {
  const scale   = useRef(new Animated.Value(1)).current;
  const glowOp  = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale,  { toValue: 0.94, useNativeDriver: true, damping: 15, stiffness: 300 }),
      Animated.timing(glowOp, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale,  { toValue: 1,   useNativeDriver: true, damping: 12, stiffness: 200 }),
      Animated.timing(glowOp, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = action.onPress
    ? action.onPress
    : () => router.push(action.href!);

  const accent = action.accent as string;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={action.label}
    >
      <Animated.View
        style={[
          styles.actionCard,
          {
            backgroundColor:   colors.surfaceAlt,
            borderColor:       `${accent}28`,
            minHeight:         isMobile ? 108 : 138,
            paddingVertical:   isMobile ? spacing(4) : spacing(5),
            paddingHorizontal: isMobile ? spacing(3) : spacing(5),
            transform:         [{ scale }],
          },
          Platform.OS === 'web' && {
            cursor:     'pointer',
            transition: 'box-shadow 0.18s ease',
          } as any,
        ]}
      >
        {/* Top-right accent dot */}
        <View style={{
          position:        'absolute',
          top:             spacing(2),
          right:           spacing(2),
          width:           6,
          height:          6,
          borderRadius:    3,
          backgroundColor: accent,
          opacity:         0.5,
        }} />

        {/* Glow overlay on press */}
        <Animated.View
          pointerEvents="none"
          style={{
            position:        'absolute',
            inset:           0,
            borderRadius:    radii.xl,
            backgroundColor: accent,
            opacity:         Animated.multiply(glowOp, 0.06),
          }}
        />

        {/* Icon bubble */}
        <View
          style={{
            width:           isMobile ? 50 : 62,
            height:          isMobile ? 50 : 62,
            borderRadius:    isMobile ? radii.lg : radii.xl,
            backgroundColor: `${accent}18`,
            borderWidth:     1,
            borderColor:     `${accent}35`,
            alignItems:      'center',
            justifyContent:  'center',
          }}
        >
          <Ionicons
            name={action.icon}
            size={isMobile ? 22 : 27}
            color={accent}
          />
        </View>

        {/* Label + description */}
        <View style={{ marginTop: spacing(isMobile ? 2 : 3) }}>
          <Text
            style={{
              color:      colors.textPrimary,
              fontWeight: '700',
              fontSize:   isMobile ? 12 : 13,
              lineHeight: isMobile ? 16 : 18,
            }}
            numberOfLines={2}
          >
            {action.label}
          </Text>
          <Text
            style={{
              color:     colors.textMuted,
              fontSize:  isMobile ? 10 : 11,
              marginTop: spacing(0.5),
            }}
            numberOfLines={1}
          >
            {action.desc}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Tips Banner ─────────────────────────────────────────────────────────────
const TIPS = [
  { icon: 'bulb-outline' as const, text: 'Explore courses that match your academic interests.' },
  { icon: 'medal-outline' as const, text: 'Check scholarship opportunities regularly before deadlines close.' },
  { icon: 'rocket-outline' as const, text: 'Save courses and institutions so you can compare them later.' },
] as const;

function TipsBanner({ colors, isMobile }: { colors: any; isMobile: boolean }) {
  const { t } = useLanguage();
  const [tipIdx, setTipIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const rotateTip = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setTipIdx(i => (i + 1) % TIPS.length);
      Animated.timing(fadeAnim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    });
  }, [fadeAnim]);

  const tip = TIPS[tipIdx];

  return (
    <View style={{
      flexDirection:     'row',
      alignItems:        'center',
      gap:               spacing(3),
      padding:           spacing(isMobile ? 4 : 5),
      backgroundColor:   `${colors.primary}0D`,
      borderRadius:      radii.xl,
      borderWidth:       1,
      borderColor:       `${colors.primary}22`,
      borderLeftWidth:   3,
      borderLeftColor:   colors.primary,
    }}>
      <View style={{
        width:           isMobile ? 34 : 38,
        height:          isMobile ? 34 : 38,
        borderRadius:    radii.md,
        backgroundColor: `${colors.primary}20`,
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
      }}>
        <Ionicons name={tip.icon} size={isMobile ? 16 : 18} color={colors.primary} />
      </View>

      <Animated.Text
        style={{
          flex:       1,
          fontSize:   isMobile ? 12 : 13,
          color:      colors.textSecondary,
          lineHeight: isMobile ? 17 : 19,
          opacity:    fadeAnim,
        }}
      >
        {t(tip.text)}
      </Animated.Text>

      <Pressable
        onPress={rotateTip}
        hitSlop={12}
        style={({ pressed }) => ({
          width:           32,
          height:          32,
          borderRadius:    16,
          backgroundColor: colors.surfaceAlt,
          borderWidth:     1,
          borderColor:     colors.border,
          alignItems:      'center',
          justifyContent:  'center',
          opacity:         pressed ? 0.7 : 1,
          flexShrink:      0,
        })}
        accessibilityRole="button"
        accessibilityLabel={t('Next tip')}
      >
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

// ─── Institution Modal ────────────────────────────────────────────────────────
const INSTITUTION_OPTIONS = [
  {
    label:     'Universities',
    icon:      'school-outline'    as const,
    iconColor: '#60A5FA',
    iconBg:    '#172554',
    href:      '/student/universities',
    desc:      'Degree & postgraduate programmes',
    count:     '12 institutions',
  },
  {
    label:     'Colleges',
    icon:      'business-outline'  as const,
    iconColor: '#34D399',
    iconBg:    '#14532D',
    href:      '/student/colleges',
    desc:      'Diploma & certificate courses',
    count:     '28 institutions',
  },
  {
    label:     'Brigades',
    icon:      'construct-outline' as const,
    iconColor: '#FBBF24',
    iconBg:    '#78350F',
    href:      '/student/brigades',
    desc:      'Technical & vocational training',
    count:     '45 centres',
  },
] as const;

function InstitutionModal({
  visible,
  onClose,
  colors,
  isMobile,
}: {
  visible:  boolean;
  onClose:  () => void;
  colors:   any;
  isMobile: boolean;
}) {
  const { t } = useLanguage();
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1,   useNativeDriver: true, damping: 18, stiffness: 200 }),
        Animated.timing(opacAnim,  { toValue: 1,   duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, damping: 18, stiffness: 260 }),
        Animated.timing(opacAnim,  { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Animated.View style={[modalStyles.overlay, { opacity: opacAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[
            modalStyles.container,
            {
              backgroundColor: colors.surface,
              width:           isMobile ? '94%' : '88%',
              transform:       [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Accent bar */}
          <View style={{ height: 4, backgroundColor: colors.primary }} />

          {/* Header */}
          <View style={[modalStyles.header, { borderBottomColor: colors.divider }]}>
            <View style={modalStyles.headerLeft}>
              <View style={[modalStyles.headerIconWrap, { backgroundColor: `${colors.primary}22` }]}>
                <Ionicons name="school-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[modalStyles.title, { color: colors.textPrimary }]}>
                  {t('Choose Institution')}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {t('85 institutions in Botswana')}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
              style={({ pressed }) => ([
                modalStyles.closeBtn,
                { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.7 : 1 },
              ])}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Subtitle */}
          <Text style={[modalStyles.subtitle, { color: colors.textSecondary }]}>
            {t("Select the type of institution you'd like to explore")}
          </Text>

          {/* Options */}
          <View style={modalStyles.options}>
            {INSTITUTION_OPTIONS.map((opt, i) => (
              <ModalOption
                key={opt.href}
                opt={opt}
                colors={colors}
                onClose={onClose}
                delay={i * 50}
              />
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function ModalOption({
  opt,
  colors,
  onClose,
  delay,
}: {
  opt:     (typeof INSTITUTION_OPTIONS)[number];
  colors:  any;
  onClose: () => void;
  delay:   number;
}) {
  const { t } = useLanguage();
  const scale  = useRef(new Animated.Value(1)).current;
  const entrY  = useRef(new Animated.Value(10)).current;
  const entrOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entrOp, { toValue: 1, duration: 260, delay, useNativeDriver: true }),
      Animated.spring(entrY,  { toValue: 0, delay,          useNativeDriver: true, damping: 18, stiffness: 160 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: entrOp, transform: [{ translateY: entrY }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t(opt.label)}. ${t(opt.desc)}. ${t(opt.count)}`}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, damping: 15, stiffness: 300 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1,    useNativeDriver: true, damping: 12, stiffness: 200 }).start()
        }
        onPress={() => {
          onClose();
          router.push(opt.href as any);
        }}
      >
        <Animated.View
          style={[
            modalStyles.option,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor:     colors.border,
              transform:       [{ scale }],
            },
            Platform.OS === 'web' && { cursor: 'pointer' } as any,
          ]}
        >
          <View style={[modalStyles.optIconWrap, { backgroundColor: opt.iconBg }]}>
            <Ionicons name={opt.icon} size={26} color={opt.iconColor} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[modalStyles.optLabel, { color: colors.textPrimary }]}>
              {t(opt.label)}
            </Text>
            <Text style={[modalStyles.optDesc, { color: colors.textSecondary }]}>
              {t(opt.desc)}
            </Text>
            <Text style={{ fontSize: 10, color: opt.iconColor, fontWeight: '700', marginTop: 3, letterSpacing: 0.3 }}>
              {t(opt.count).toUpperCase()}
            </Text>
          </View>

          <View style={{
            width:           28,
            height:          28,
            borderRadius:    14,
            backgroundColor: `${opt.iconColor}18`,
            borderWidth:     1,
            borderColor:     `${opt.iconColor}33`,
            alignItems:      'center',
            justifyContent:  'center',
          }}>
            <Ionicons name="chevron-forward" size={14} color={opt.iconColor} />
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
  },
  gridItem: {
    paddingBottom: spacing(4),
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  sectionAccent: {
    width:        3,
    height:       20,
    borderRadius: 2,
  },

  actionCard: {
    borderRadius: radii.xl,
    borderWidth:  1,
    overflow:     'hidden',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex:              1,
    backgroundColor:   'rgba(0,0,0,0.72)',
    justifyContent:    'center',
    alignItems:        'center',
    paddingHorizontal: spacing(4),
  },
  container: {
    maxWidth:     440,
    borderRadius: radii.xxl,
    overflow:     'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.55, shadowRadius: 40 },
      android: { elevation: 24 },
      web:     { boxShadow: '0 20px 60px rgba(0,0,0,0.55)' } as any,
    }),
  },
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: spacing(6),
    paddingTop:        spacing(6),
    paddingBottom:     spacing(4),
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing(3),
  },
  headerIconWrap: {
    width:           38,
    height:          38,
    borderRadius:    radii.md,
    alignItems:      'center',
    justifyContent:  'center',
  },
  title: {
    fontSize:      17,
    fontWeight:    '700',
    letterSpacing: -0.2,
  },
  closeBtn: {
    width:           34,
    height:          34,
    borderRadius:    17,
    alignItems:      'center',
    justifyContent:  'center',
  },
  subtitle: {
    fontSize:          13,
    paddingHorizontal: spacing(6),
    paddingTop:        spacing(3),
    paddingBottom:     spacing(1),
    lineHeight:        18,
  },
  options: {
    padding: spacing(5),
    gap:     spacing(3),
  },
  option: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   spacing(4),
    paddingHorizontal: spacing(4),
    borderRadius:      radii.xl,
    borderWidth:       1,
    gap:               spacing(4),
  },
  optIconWrap: {
    width:           52,
    height:          52,
    borderRadius:    radii.md,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  optLabel: {
    fontSize:      15,
    fontWeight:    '700',
    letterSpacing: -0.1,
  },
  optDesc: {
    fontSize:   12,
    marginTop:  2,
    lineHeight: 16,
  },
});