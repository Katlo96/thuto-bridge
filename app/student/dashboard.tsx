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
import { StudentMenuProvider } from '../../components/student/StudentMenu';

export default function StudentDashboardScreen() {
  return (
    <StudentMenuProvider>
      <DashboardContent />
    </StudentMenuProvider>
  );
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
  '#34D399', // Upload Results  — emerald
  '#A78BFA', // View Courses    — violet
  '#F59E0B', // Institutions    — amber
  '#FB923C', // Scholarships    — orange
  '#38BDF8', // Progress        — sky
];

// ─── Dashboard Content ────────────────────────────────────────────────────────
function DashboardContent() {
  const colors = useTheme();
  const layout = useLayout();

  const [showInstitutionModal, setShowInstitutionModal] = useState(false);
  const openInstitutionModal  = useCallback(() => setShowInstitutionModal(true),  []);
  const closeInstitutionModal = useCallback(() => setShowInstitutionModal(false), []);

  const quickActions = useMemo(
    () => [
      {
        label:   'Enter Results',
        icon:    'create-outline'       as const,
        href:    '/student/enter-results',
        accent:  ACTION_ACCENTS[0],
        desc:    'Log your marks',
      },
      {
        label:   'Upload Results',
        icon:    'cloud-upload-outline' as const,
        href:    '/student/upload-results',
        accent:  ACTION_ACCENTS[1],
        desc:    'Share certificates',
      },
      {
        label:   'View Courses',
        icon:    'eye-outline'          as const,
        href:    '/student/courses',
        accent:  ACTION_ACCENTS[2],
        desc:    'Browse programmes',
      },
      {
        label:   'Institutions',
        icon:    'school-outline'       as const,
        onPress: openInstitutionModal,
        accent:  ACTION_ACCENTS[3],
        desc:    'Find your school',
      },
      {
        label:   'Scholarships',
        icon:    'ribbon-outline'       as const,
        href:    '/student/scholarships',
        accent:  ACTION_ACCENTS[4],
        desc:    'Funding options',
      },
      {
        label:   'Progress',
        icon:    'trending-up-outline'  as const,
        href:    '/student/progress',
        accent:  ACTION_ACCENTS[5],
        desc:    'Track your grades',
      },
    ],
    [openInstitutionModal],
  );

  const recommended = useMemo(
    () => [
      {
        title:      'Biology',
        subtitle:   'University of Botswana',
        badge:      'Highly Suitable',
        badgeColor: '#34D399',
        icon:       'leaf-outline'      as const,
        match:      96,
      },
      {
        title:      'Economics',
        subtitle:   'Botswana Accountancy College',
        badge:      'Highly Suitable',
        badgeColor: '#34D399',
        icon:       'bar-chart-outline' as const,
        match:      91,
      },
      {
        title:      'Computer Science',
        subtitle:   'University of Botswana',
        badge:      'Good Match',
        badgeColor: '#FBBF24',
        icon:       'code-slash-outline' as const,
        match:      78,
      },
    ],
    [],
  );

  const { actionCols, recCols, isMobile } = layout;

  return (
    <DashboardLayout
      showPointsCard={true}
      points={48}
      lastUpdated="28 March 2026"
      isEligible={true}
    >
      {/* ── Activity strip ── */}
      <FadeIn delay={60}>
        <ActivityStrip isMobile={isMobile} colors={colors} />
      </FadeIn>

      {/* ── Quick Actions ── */}
      <FadeIn delay={140} style={{ marginTop: spacing(8) }}>
        <SectionHeader
          title="Quick Actions"
          subtitle="Everything you need, one tap away"
          colors={colors}
          isMobile={isMobile}
        />

        <View style={[styles.grid, { marginHorizontal: -spacing(isMobile ? 1.5 : 2) }]}>
          {quickActions.map((action, index) => (
            <FadeIn
              key={index}
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

      {/* ── Recommended ── */}
      <FadeIn delay={400} style={{ marginTop: spacing(10), marginBottom: spacing(6) }}>
        <SectionHeader
          title="Recommended for You"
          subtitle="Based on your academic profile"
          colors={colors}
          isMobile={isMobile}
          action={{ label: 'See all', onPress: () => router.push('/student/courses') }}
        />

        {isMobile ? (
          /* Mobile: vertical feed */
          <View style={{ gap: spacing(3) }}>
            {recommended.map((rec, idx) => (
              <FadeIn key={idx} delay={440 + idx * 60}>
                <RecommendationRow rec={rec} colors={colors} />
              </FadeIn>
            ))}
          </View>
        ) : (
          /* Tablet/Desktop: grid */
          <View style={[styles.grid, { marginHorizontal: -spacing(2) }]}>
            {recommended.map((rec, idx) => (
              <FadeIn
                key={idx}
                delay={440 + idx * 60}
                style={[styles.gridItem, { width: `${100 / recCols}%`, paddingHorizontal: spacing(2) }]}
              >
                <RecommendationCard rec={rec} colors={colors} />
              </FadeIn>
            ))}
          </View>
        )}
      </FadeIn>

      {/* ── Tips banner ── */}
      <FadeIn delay={620} style={{ marginBottom: spacing(4) }}>
        <TipsBanner colors={colors} isMobile={isMobile} />
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
  { icon: 'checkmark-circle-outline' as const, label: '3 results logged',   color: '#34D399' },
  { icon: 'ribbon-outline'           as const, label: '2 scholarships open', color: '#FBBF24' },
  { icon: 'flame-outline'            as const, label: '5-day streak',         color: '#FB923C' },
];

function ActivityStrip({ isMobile, colors }: { isMobile: boolean; colors: any }) {
  return (
    <View style={{
      flexDirection:     'row',
      gap:               spacing(isMobile ? 2 : 3),
      paddingVertical:   spacing(1),
      flexWrap:          isMobile ? 'wrap' : 'nowrap',
    }}>
      {ACTIVITY_ITEMS.map((item, i) => (
        <View
          key={i}
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
            {item.label}
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

// ─── Recommendation Row (mobile) ──────────────────────────────────────────────
function RecommendationRow({ rec, colors }: { rec: any; colors: any }) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPressIn={() =>
        Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, damping: 15, stiffness: 300 }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, { toValue: 1,    useNativeDriver: true, damping: 12, stiffness: 200 }).start()
      }
    >
      <Animated.View
        style={[
          {
            flexDirection:     'row',
            alignItems:        'center',
            gap:               spacing(4),
            paddingVertical:   spacing(4),
            paddingHorizontal: spacing(4),
            backgroundColor:   colors.surface,
            borderRadius:      radii.xl,
            borderWidth:       1,
            borderColor:       colors.divider,
            transform:         [{ scale }],
          },
          Platform.OS === 'web' && { cursor: 'pointer' } as any,
        ]}
      >
        {/* Icon */}
        <View style={{
          width:           46,
          height:          46,
          borderRadius:    radii.lg,
          backgroundColor: `${rec.badgeColor}18`,
          borderWidth:     1,
          borderColor:     `${rec.badgeColor}35`,
          alignItems:      'center',
          justifyContent:  'center',
          flexShrink:      0,
        }}>
          <Ionicons name={rec.icon} size={20} color={rec.badgeColor} />
        </View>

        {/* Text */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
            {rec.title}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
            {rec.subtitle}
          </Text>
          <View style={[styles.badge, { backgroundColor: `${rec.badgeColor}1A`, borderColor: `${rec.badgeColor}44`, marginTop: spacing(2) }]}>
            <View style={[styles.badgeDot, { backgroundColor: rec.badgeColor }]} />
            <Text style={{ color: rec.badgeColor, fontWeight: '700', fontSize: 10, letterSpacing: 0.3 }}>
              {rec.badge}
            </Text>
          </View>
        </View>

        {/* Match score */}
        <View style={{ alignItems: 'center', gap: spacing(1) }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: rec.badgeColor }}>{rec.match}%</Text>
          <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.3 }}>MATCH</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Recommendation Card (tablet/desktop) ────────────────────────────────────
function RecommendationCard({ rec, colors }: { rec: any; colors: any }) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPressIn={() =>
        Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, damping: 15, stiffness: 300 }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, { toValue: 1,    useNativeDriver: true, damping: 12, stiffness: 200 }).start()
      }
    >
      <Animated.View
        style={[
          styles.recCard,
          {
            backgroundColor: colors.surface,
            borderColor:     `${rec.badgeColor}28`,
            transform:       [{ scale }],
            padding:         spacing(5),
          },
          Platform.OS === 'web' && { cursor: 'pointer', transition: 'box-shadow 0.18s ease' } as any,
        ]}
      >
        {/* Match score pill (top-right) */}
        <View style={{
          position:        'absolute',
          top:             spacing(4),
          right:           spacing(4),
          paddingHorizontal: spacing(2),
          paddingVertical:  spacing(0.5),
          borderRadius:    radii.pill,
          backgroundColor: `${rec.badgeColor}20`,
          borderWidth:     1,
          borderColor:     `${rec.badgeColor}44`,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: rec.badgeColor }}>
            {rec.match}%
          </Text>
        </View>

        {/* Icon */}
        <View style={{
          width:           52,
          height:          52,
          borderRadius:    radii.lg,
          backgroundColor: `${rec.badgeColor}18`,
          borderWidth:     1,
          borderColor:     `${rec.badgeColor}35`,
          alignItems:      'center',
          justifyContent:  'center',
          marginBottom:    spacing(3),
        }}>
          <Ionicons name={rec.icon} size={24} color={rec.badgeColor} />
        </View>

        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
          {rec.title}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: spacing(1), lineHeight: 16 }} numberOfLines={2}>
          {rec.subtitle}
        </Text>

        <View style={[styles.badge, { backgroundColor: `${rec.badgeColor}1A`, borderColor: `${rec.badgeColor}44`, marginTop: spacing(3) }]}>
          <View style={[styles.badgeDot, { backgroundColor: rec.badgeColor }]} />
          <Text style={{ color: rec.badgeColor, fontWeight: '700', fontSize: 11, letterSpacing: 0.3 }}>
            {rec.badge}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Tips Banner ─────────────────────────────────────────────────────────────
const TIPS = [
  { icon: 'bulb-outline' as const,       text: 'Add your Form 5 results to unlock more course matches.' },
  { icon: 'medal-outline' as const,      text: 'Students with complete profiles get 3× more scholarship suggestions.' },
  { icon: 'rocket-outline' as const,     text: 'Upload your certificates to speed up the application process.' },
];

function TipsBanner({ colors, isMobile }: { colors: any; isMobile: boolean }) {
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
        {tip.text}
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
        accessibilityLabel="Next tip"
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
];

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
                  Choose Institution
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  85 institutions in Botswana
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={16}
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
            Select the type of institution you'd like to explore
          </Text>

          {/* Options */}
          <View style={modalStyles.options}>
            {INSTITUTION_OPTIONS.map((opt, i) => (
              <ModalOption
                key={opt.label}
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
  opt:     (typeof INSTITUTION_OPTIONS)[0];
  colors:  any;
  onClose: () => void;
  delay:   number;
}) {
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
              {opt.label}
            </Text>
            <Text style={[modalStyles.optDesc, { color: colors.textSecondary }]}>
              {opt.desc}
            </Text>
            <Text style={{ fontSize: 10, color: opt.iconColor, fontWeight: '700', marginTop: 3, letterSpacing: 0.3 }}>
              {opt.count.toUpperCase()}
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

  recCard: {
    borderRadius: radii.xl,
    borderWidth:  1,
    overflow:     'hidden',
  },

  badge: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing(3),
    paddingVertical:   spacing(1),
    borderRadius:      radii.pill,
    borderWidth:       1,
    alignSelf:         'flex-start',
    gap:               spacing(1),
  },
  badgeDot: {
    width:        5,
    height:       5,
    borderRadius: 3,
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