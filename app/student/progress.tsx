import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  useWindowDimensions,
  Platform,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  StudentMenuProvider,
  useStudentMenu,
} from '../../components/student/StudentMenu';
import { useLanguage } from '../../contexts/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// DashboardLayout & design tokens
// ─────────────────────────────────────────────────────────────────────────────
import DashboardLayout, {
  spacing,
  typography,
  radii,
  useTheme,
} from '../../components/student/DashboardLayout';
import StudentFooter from '../../components/student/StudentFooter';

// ─────────────────────────────────────────────────────────────────────────────

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from "../../constants/firebase";

import {
  getStudentProfile,
  saveStudentProfile,
  getStudentMarks,
  addStudentMark,
  resetStudentProgress,
} from "../../services/progressService";

import type {
  StudentProfile,
  MarkRecord,
  ExamType,
  System,
  Track,
  Form,
  BGCSETrack,
  IGCSETrack,
  BGCSEForm,
  IGCSEForm,
} from "../../services/progressService";

type WizardStep = 'system' | 'track' | 'form' | 'subjects' | 'done';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const BGCSE_DEFAULTS: Record<BGCSETrack, string[]> = {
  Pure: ['Mathematics Extended', 'English', 'Setswana', 'Chemistry', 'Physics', 'Biology'],
  Double: ['Chemistry', 'Biology', 'Physics', 'Mathematics Extended', 'English', 'Setswana'],
  Single: ['Chemistry', 'Biology', 'Physics', 'Mathematics', 'English', 'Setswana'],
};

const IGCSE_DEFAULTS: Record<IGCSETrack, string[]> = {
  Advanced: ['Chemistry', 'Physics', 'Biology', 'Mathematics Extended', 'English', 'Setswana'],
  Ordinary: ['Chemistry', 'Physics', 'Biology', 'Mathematics', 'English', 'Setswana'],
};

const TOTAL_SUBJECTS = 9;
const ADDITIONAL_SUBJECTS = 4;
const EXAM_TYPES: ExamType[] = ['End of Month Test', 'End of Term Exam', 'End of Year Exam'];

const EXAM_TYPE_SHORT: Record<ExamType, string> = {
  'End of Month Test': 'Monthly',
  'End of Term Exam': 'Term',
  'End of Year Exam': 'Annual',
};

const EXAM_TYPE_ICONS: Record<ExamType, keyof typeof Ionicons.glyphMap> = {
  'End of Month Test': 'calendar-outline',
  'End of Term Exam': 'school-outline',
  'End of Year Exam': 'trophy-outline',
};

const BGCSE_FORMS: BGCSEForm[] = ['Form 4', 'Form 5'];
const IGCSE_FORMS: IGCSEForm[] = ['Form 4', 'Form 5', 'Form 6 (A-Level)'];

// Grade bands
const getGrade = (score: number) => {
  if (score >= 80) return { letter: 'A', color: '#34D399' };
  if (score >= 70) return { letter: 'B', color: '#60A5FA' };
  if (score >= 60) return { letter: 'C', color: '#A78BFA' };
  if (score >= 50) return { letter: 'D', color: '#FBBF24' };
  if (score >= 40) return { letter: 'E', color: '#FB923C' };
  return { letter: 'U', color: '#F87171' };
};

const WIZARD_STEPS: { key: WizardStep; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'system', label: 'System', icon: 'school-outline' },
  { key: 'track', label: 'Track', icon: 'flask-outline' },
  { key: 'form', label: 'Year', icon: 'person-outline' },
  { key: 'subjects', label: 'Subjects', icon: 'book-outline' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Elevation helper
// ─────────────────────────────────────────────────────────────────────────────
function useElevation(intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  return useMemo<ViewStyle>(() => {
    const opacity = 0.28;
    const radius = intensity === 'sm' ? 6 : intensity === 'md' ? 14 : 22;
    const offsetY = intensity === 'sm' ? 2 : intensity === 'md' ? 5 : 10;
    return (Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: radius },
      android: { elevation: intensity === 'sm' ? 3 : intensity === 'md' ? 6 : 12 },
      web: { boxShadow: `0 ${offsetY}px ${radius * 1.5}px rgba(0,0,0,${opacity})` } as any,
      default: {},
    }) ?? {}) as ViewStyle;
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedCard — fade+slide in on mount
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedCard({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, useNativeDriver: true, damping: 18, stiffness: 120 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GradeRing — SVG arc progress ring (web only, fallback circle on native)
// ─────────────────────────────────────────────────────────────────────────────
function GradeRing({ score, size = 72 }: { score: number | null; size?: number }) {
  const colors = useTheme();
  const grade = score !== null ? getGrade(score) : null;
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const arc = score !== null ? circumference * (score / 100) : 0;
  const cx = size / 2;

  if (Platform.OS !== 'web') {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: grade ? `${grade.color}22` : colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: grade?.color ?? colors.border }}>
        <Text style={{ fontSize: size * 0.28, fontWeight: '900', color: grade?.color ?? colors.textMuted }}>{grade ? grade.letter : '—'}</Text>
        {score !== null && <Text style={{ fontSize: size * 0.18, color: colors.textMuted }}>{score}%</Text>}
      </View>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={radius} fill="none" stroke={colors.border} strokeWidth={5} />
      {score !== null && (
        <circle
          cx={cx} cy={cx} r={radius}
          fill="none"
          stroke={grade?.color ?? colors.primary}
          strokeWidth={5}
          strokeDasharray={`${arc} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)' } as any}
        />
      )}
      <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle" fill={grade?.color ?? colors.textMuted} fontSize={size * 0.26} fontWeight="900">
        {grade ? grade.letter : '—'}
      </text>
      {score !== null && (
        <text x="50%" y="68%" textAnchor="middle" dominantBaseline="middle" fill={colors.textMuted} fontSize={size * 0.17}>
          {score}%
        </text>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SelectionPill
// ─────────────────────────────────────────────────────────────────────────────
function SelectionPill({
  label,
  selected,
  onPress,
  icon,
  description,
  translateLabel = true,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  description?: string;
  translateLabel?: boolean;
}) {
  const colors = useTheme();
  const { t } = useLanguage();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12 }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(3),
          paddingHorizontal: spacing(5),
          paddingVertical: spacing(4),
          borderRadius: radii.xl,
          borderWidth: 1.5,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? `${colors.primary}1A` : colors.surfaceAlt,
          minWidth: 130,
          ...(Platform.OS === 'web' && {
            transition: 'all 0.18s ease',
            cursor: 'pointer',
          } as any),
        }}
      >
        {icon && (
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: selected ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={icon} size={16} color={selected ? '#fff' : colors.textSecondary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[typography.label, { color: selected ? colors.primary : colors.textPrimary, fontWeight: '700' }]}>{translateLabel ? t(label) : label}</Text>
          {description && <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>{description}</Text>}
        </View>
        <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: selected ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.primary : 'transparent' }}>
          {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WizardStepBar
// ─────────────────────────────────────────────────────────────────────────────
function WizardStepBar({ currentStep }: { currentStep: WizardStep }) {
  const colors = useTheme();
  const { t } = useLanguage();
  const currentIdx = WIZARD_STEPS.findIndex(s => s.key === currentStep);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing(8) }}>
      {WIZARD_STEPS.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={s.key}>
            <View style={{ alignItems: 'center', gap: spacing(1) }}>
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: done ? colors.success : active ? colors.primary : colors.surfaceAlt,
                borderWidth: 2,
                borderColor: done ? colors.success : active ? colors.primary : colors.border,
                alignItems: 'center', justifyContent: 'center',
                ...(Platform.OS === 'web' && { transition: 'all 0.3s ease' } as any),
              }}>
                {done
                  ? <Ionicons name="checkmark" size={18} color="#fff" />
                  : <Ionicons name={s.icon} size={16} color={active ? '#fff' : colors.textMuted} />
                }
              </View>
              <Text style={[typography.caption, { color: active ? colors.primary : done ? colors.success : colors.textMuted, fontWeight: active ? '700' : '400' }]}>
                {t(s.label)}
              </Text>
            </View>
            {i < WIZARD_STEPS.length - 1 && (
              <View style={{ flex: 1, height: 2, backgroundColor: i < currentIdx ? colors.success : colors.border, marginBottom: spacing(5), marginHorizontal: spacing(1) }} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SetupWizard
// ─────────────────────────────────────────────────────────────────────────────
function SetupWizard({ onComplete }: { onComplete: (profile: StudentProfile) => void }) {
  const colors = useTheme();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [step, setStep] = useState<WizardStep>('system');
  const [system, setSystem] = useState<System | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [extraInputs, setExtraInputs] = useState<string[]>(Array(ADDITIONAL_SUBJECTS).fill(''));

  const defaults = useMemo<string[]>(() => {
    if (!system || !track) return [];
    if (system === 'BGCSE') return BGCSE_DEFAULTS[track as BGCSETrack] ?? [];
    return IGCSE_DEFAULTS[track as IGCSETrack] ?? [];
  }, [system, track]);

  const goNext = useCallback(() => {
    if (step === 'system' && system) setStep('track');
    else if (step === 'track' && track) setStep('form');
    else if (step === 'form' && form) setStep('subjects');
    else if (step === 'subjects') {
      const filled = extraInputs.filter((s) => s.trim()).map((s) => s.trim());
      if (filled.length < ADDITIONAL_SUBJECTS) {
        Alert.alert(t('Incomplete'), `${t('Please enter all')} ${ADDITIONAL_SUBJECTS} ${t('additional subjects.')}`);
        return;
      }
      const allSubjects = [...defaults, ...filled];
      onComplete({ system: system!, track: track!, form: form!, subjects: allSubjects });
    }
  }, [step, system, track, form, defaults, extraInputs, onComplete]);

  const goBack = useCallback(() => {
    if (step === 'track') setStep('system');
    if (step === 'form') setStep('track');
    if (step === 'subjects') setStep('form');
  }, [step]);

  const canNext =
    (step === 'system' && !!system) ||
    (step === 'track' && !!track) ||
    (step === 'form' && !!form) ||
    (step === 'subjects' && extraInputs.filter((s) => s.trim()).length >= ADDITIONAL_SUBJECTS);

  const stepDescriptions: Record<WizardStep, { title: string; subtitle: string }> = {
    system: { title: t('Choose Your System'), subtitle: t('Select the examination board you are registered with.') },
    track: { title: t('Select Your Track'), subtitle: t('This determines your default subject set.') },
    form: { title: t('What Year Are You In?'), subtitle: t('We use this to personalise your academic timeline.') },
    subjects: { title: t('Confirm Your Subjects'), subtitle: `${t('Your')} ${defaults.length} ${t('core subjects are pre-loaded. Add')} ${ADDITIONAL_SUBJECTS} ${t('electives.')}` },
    done: { title: '', subtitle: '' },
  };

  return (
    <AnimatedCard style={{ padding: isMobile ? spacing(5) : spacing(8) }}>
      <WizardStepBar currentStep={step} />

      {/* Step heading */}
      <View style={{ marginBottom: spacing(7) }}>
        <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing(2) }]}>
          {stepDescriptions[step].title}
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 24 }]}>
          {stepDescriptions[step].subtitle}
        </Text>
      </View>

      {/* Steps */}
      {step === 'system' && (
        <View style={{ gap: spacing(3) }}>
          <SelectionPill
            label="BGCSE"
            translateLabel={false}
            description={t('Botswana General Certificate of Secondary Education')}
            selected={system === 'BGCSE'}
            onPress={() => setSystem('BGCSE')}
            icon="school-outline"
          />
          <SelectionPill
            label="IGCSE"
            translateLabel={false}
            description={t('International General Certificate of Secondary Education')}
            selected={system === 'IGCSE'}
            onPress={() => setSystem('IGCSE')}
            icon="globe-outline"
          />
        </View>
      )}

      {step === 'track' && system && (
        <View style={{ gap: spacing(3) }}>
          {(system === 'BGCSE'
            ? [{ value: 'Pure', desc: 'All three sciences as separate subjects' }, { value: 'Double', desc: 'Combined double science award' }, { value: 'Single', desc: 'Combined single science award' }] as { value: BGCSETrack; desc: string }[]
            : [{ value: 'Advanced', desc: 'Extended Mathematics & Sciences' }, { value: 'Ordinary', desc: 'Core level across subjects' }] as { value: IGCSETrack; desc: string }[]
          ).map(({ value, desc }) => (
            <SelectionPill
              key={value}
              label={value}
              description={t(desc)}
              selected={track === value}
              onPress={() => setTrack(value)}
              icon="flask-outline"
            />
          ))}
        </View>
      )}

      {step === 'form' && system && (
        <View style={{ gap: spacing(3) }}>
          {(system === 'BGCSE' ? BGCSE_FORMS : IGCSE_FORMS).map((f) => (
            <SelectionPill key={f} label={f} selected={form === f} onPress={() => setForm(f)} icon="person-outline" />
          ))}
        </View>
      )}

      {step === 'subjects' && track && (
        <View style={{ gap: spacing(6) }}>
          {/* Default subjects grid */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginBottom: spacing(3) }}>
              <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: colors.primary }} />
              <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 1, fontWeight: '700' }]}>{t('CORE SUBJECTS')} ({defaults.length})</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
              {defaults.map((s, i) => (
                <View
                  key={i}
                  style={{
                    paddingHorizontal: spacing(3),
                    paddingVertical: spacing(2),
                    borderRadius: radii.pill,
                    backgroundColor: `${colors.primary}18`,
                    borderWidth: 1,
                    borderColor: `${colors.primary}30`,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing(1),
                  }}
                >
                  <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>{s}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Additional inputs */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginBottom: spacing(3) }}>
              <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: colors.warning }} />
              <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 1, fontWeight: '700' }]}>{t('ADD')} {ADDITIONAL_SUBJECTS} {t('ELECTIVES')}</Text>
            </View>
            <View style={{ gap: spacing(3) }}>
              {extraInputs.map((val, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: val.trim() ? colors.success : colors.surfaceAlt, borderWidth: 1, borderColor: val.trim() ? colors.success : colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: val.trim() ? '#fff' : colors.textMuted }}>{i + 1}</Text>
                  </View>
                  <TextInput
                    value={val}
                    onChangeText={(text) => {
                      const copy = [...extraInputs];
                      copy[i] = text;
                      setExtraInputs(copy);
                    }}
                    placeholder={`${t('Elective subject')} ${i + 1}`}
                    placeholderTextColor={colors.textMuted}
                    style={{
                      flex: 1,
                      padding: spacing(4),
                      backgroundColor: colors.surfaceAlt,
                      borderRadius: radii.lg,
                      borderWidth: 1.5,
                      borderColor: val.trim() ? `${colors.success}66` : colors.border,
                      color: colors.textPrimary,
                      fontSize: 15,
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Navigation */}
      <View style={{ flexDirection: 'row', gap: spacing(3), marginTop: spacing(10) }}>
        {step !== 'system' && (
          <Pressable
            onPress={goBack}
            style={({ pressed }) => ({
              flex: 1,
              height: 52,
              borderRadius: radii.lg,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: spacing(2),
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
            <Text style={[typography.label, { color: colors.textPrimary }]}>{t('Back')}</Text>
          </Pressable>
        )}

        <Pressable
          onPress={canNext ? goNext : undefined}
          style={({ pressed }) => ({
            flex: step === 'system' ? 1 : 2,
            height: 52,
            borderRadius: radii.lg,
            backgroundColor: canNext ? colors.primary : colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: spacing(2),
            opacity: canNext ? (pressed ? 0.88 : 1) : 0.45,
            ...(Platform.OS === 'web' && canNext && { boxShadow: `0 4px 18px ${colors.primary}55` } as any),
          })}
        >
          <Text style={[typography.label, { color: canNext ? '#fff' : colors.textMuted, fontSize: 15, fontWeight: '700' }]}>
            {step === 'subjects' ? t('Save Profile') : t('Continue')}
          </Text>
          {step !== 'subjects' && canNext && <Ionicons name="arrow-forward" size={16} color="#fff" />}
          {step === 'subjects' && canNext && <Ionicons name="checkmark" size={16} color="#fff" />}
        </Pressable>
      </View>
    </AnimatedCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreSlider — smooth horizontal scroll score picker
// ─────────────────────────────────────────────────────────────────────────────
function ScoreSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const colors = useTheme();
  const grade = getGrade(value);
  const segments = [
    { label: 'U', range: [0, 39], color: '#F87171' },
    { label: 'E', range: [40, 49], color: '#FB923C' },
    { label: 'D', range: [50, 59], color: '#FBBF24' },
    { label: 'C', range: [60, 69], color: '#A78BFA' },
    { label: 'B', range: [70, 79], color: '#60A5FA' },
    { label: 'A', range: [80, 100], color: '#34D399' },
  ];

  return (
    <View style={{ gap: spacing(4) }}>
      {/* Grade band display */}
      <View style={{ flexDirection: 'row', gap: spacing(2) }}>
        {segments.map((seg) => {
          const active = value >= seg.range[0] && value <= seg.range[1];
          return (
            <Pressable
              key={seg.label}
              onPress={() => onChange(Math.round((seg.range[0] + seg.range[1]) / 2))}
              style={{
                flex: 1,
                height: 36,
                borderRadius: radii.md,
                backgroundColor: active ? seg.color : `${seg.color}22`,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: active ? seg.color : 'transparent',
                ...(Platform.OS === 'web' && { transition: 'all 0.2s ease', cursor: 'pointer' } as any),
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#fff' : seg.color }}>{seg.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Score dial */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(4) }}>
        <Pressable
          onPress={() => onChange(Math.max(0, value - 1))}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="remove" size={18} color={colors.textSecondary} />
        </Pressable>

        <View style={{ flex: 1, height: 56, backgroundColor: `${grade.color}15`, borderRadius: radii.lg, borderWidth: 1.5, borderColor: `${grade.color}55`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: grade.color }}>{value}%</Text>
        </View>

        <Pressable
          onPress={() => onChange(Math.min(100, value + 1))}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="add" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Quick picks */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
        {[0, 25, 40, 50, 60, 70, 75, 80, 85, 90, 95, 100].map((v) => (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            style={({ pressed }) => ({
              paddingHorizontal: spacing(3),
              paddingVertical: spacing(2),
              borderRadius: radii.md,
              backgroundColor: value === v ? `${getGrade(v).color}22` : colors.surfaceAlt,
              borderWidth: 1,
              borderColor: value === v ? getGrade(v).color : colors.border,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: value === v ? getGrade(v).color : colors.textSecondary }}>{v}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddRecordModal
// ─────────────────────────────────────────────────────────────────────────────
function AddRecordModal({
  visible,
  subjects,
  onSave,
  onClose,
}: {
  visible: boolean;
  subjects: string[];
  onSave: (record: MarkRecord) => void;
  onClose: () => void;
}) {
  const colors = useTheme();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const modalElevation = useElevation('lg');
  const [subject, setSubject] = useState('');
  const [score, setScore] = useState(65);
  const [examType, setExamType] = useState<ExamType>('End of Term Exam');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const canSave = !!subject && !!examType && !!date;
  const grade = getGrade(score);

  const handleSave = () => {
    if (!canSave) return;
    onSave({ id: Date.now().toString(), subject, score, examType, date });
    // reset
    setSubject('');
    setScore(65);
    setExamType('End of Term Exam');
    setDate(new Date().toISOString().slice(0, 10));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: spacing(4) }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[{ width: '100%', maxWidth: 520, backgroundColor: colors.surface, borderRadius: radii.xxl, overflow: 'hidden' }, modalElevation]}
        >
          {/* Header */}
          <View style={{ height: 5, backgroundColor: grade.color }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing(6), paddingBottom: spacing(4) }}>
            <View>
              <Text style={[typography.h2, { color: colors.textPrimary }]}>{t('Add Result')}</Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing(1) }]}>
                {subject ? `${subject} · ${grade.letter} ${t('grade')}` : t('Select a subject to get started')}
              </Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('Close')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: isMobile ? 520 : 600 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing(6), paddingTop: 0, gap: spacing(6) }}>

            {/* Subject */}
            <View>
              <Text style={[typography.label, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3) }]}>{t('SUBJECT')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing(2) }}>
                  {subjects.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setSubject(s)}
                      style={({ pressed }) => ({
                        paddingHorizontal: spacing(4),
                        paddingVertical: spacing(3),
                        borderRadius: radii.pill,
                        backgroundColor: subject === s ? colors.primary : colors.surfaceAlt,
                        borderWidth: 1.5,
                        borderColor: subject === s ? colors.primary : colors.border,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Text style={{ color: subject === s ? '#fff' : colors.textPrimary, fontWeight: subject === s ? '700' : '400', fontSize: 13 }}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Score */}
            <View>
              <Text style={[typography.label, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3) }]}>{t('SCORE')}</Text>
              <ScoreSlider value={score} onChange={setScore} />
            </View>

            {/* Exam Type */}
            <View>
              <Text style={[typography.label, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3) }]}>{t('EXAM TYPE')}</Text>
              <View style={{ gap: spacing(2) }}>
                {EXAM_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setExamType(type)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing(3),
                      padding: spacing(4),
                      borderRadius: radii.lg,
                      backgroundColor: examType === type ? `${colors.primary}15` : colors.surfaceAlt,
                      borderWidth: 1.5,
                      borderColor: examType === type ? `${colors.primary}66` : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: examType === type ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={EXAM_TYPE_ICONS[type]} size={16} color={examType === type ? '#fff' : colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.label, { color: examType === type ? colors.primary : colors.textPrimary }]}>{t(type)}</Text>
                    </View>
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: examType === type ? colors.primary : colors.border, backgroundColor: examType === type ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {examType === type && <Ionicons name="checkmark" size={11} color="#fff" />}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Date */}
            <View>
              <Text style={[typography.label, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3) }]}>{t('DATE')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), padding: spacing(4), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border }}>
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholderTextColor={colors.textMuted}
                  style={{ flex: 1, color: colors.textPrimary, fontSize: 15 }}
                />
              </View>
            </View>

            {/* Save */}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => ({
                height: 56,
                backgroundColor: canSave ? colors.primary : colors.surfaceAlt,
                borderRadius: radii.lg,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: spacing(2),
                opacity: canSave ? (pressed ? 0.9 : 1) : 0.5,
                ...(Platform.OS === 'web' && canSave && { boxShadow: `0 4px 18px ${colors.primary}55` } as any),
              })}
            >
              <Ionicons name="checkmark-circle" size={20} color={canSave ? '#fff' : colors.textMuted} />
              <Text style={[typography.label, { color: canSave ? '#fff' : colors.textMuted, fontSize: 15, fontWeight: '700' }]}>{t('SAVE RESULT')}</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GradeDistributionBar
// ─────────────────────────────────────────────────────────────────────────────
function GradeDistributionBar({ subjectStats }: { subjectStats: { avg: number | null }[] }) {
  const colors = useTheme();
  const { t } = useLanguage();
  const bands = [
    { label: 'A (80+)', color: '#34D399', count: subjectStats.filter(s => s.avg !== null && s.avg >= 80).length },
    { label: 'B (70–79)', color: '#60A5FA', count: subjectStats.filter(s => s.avg !== null && s.avg >= 70 && s.avg < 80).length },
    { label: 'C (60–69)', color: '#A78BFA', count: subjectStats.filter(s => s.avg !== null && s.avg >= 60 && s.avg < 70).length },
    { label: 'D (50–59)', color: '#FBBF24', count: subjectStats.filter(s => s.avg !== null && s.avg >= 50 && s.avg < 60).length },
    { label: 'E (40–49)', color: '#FB923C', count: subjectStats.filter(s => s.avg !== null && s.avg >= 40 && s.avg < 50).length },
    { label: 'U (<40)', color: '#F87171', count: subjectStats.filter(s => s.avg !== null && s.avg < 40).length },
  ];
  const total = bands.reduce((a, b) => a + b.count, 0);
  if (total === 0) return null;

  return (
    <View style={{ gap: spacing(3) }}>
      <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, fontWeight: '700' }]}>{t('GRADE DISTRIBUTION')}</Text>
      <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 1 }}>
        {bands.filter(b => b.count > 0).map((b) => (
          <View key={b.label} style={{ flex: b.count, backgroundColor: b.color }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
        {bands.filter(b => b.count > 0).map((b) => (
          <View key={b.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: b.color }} />
            <Text style={[typography.caption, { color: colors.textMuted }]}>{b.label}: {b.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SubjectCard — the signature element
// ─────────────────────────────────────────────────────────────────────────────
function SubjectCard({
  subject,
  avg,
  latest,
  latestDate,
  examType,
  count,
  marks,
  delay,
}: {
  subject: string;
  avg: number | null;
  latest: number | null;
  latestDate: string | null;
  examType: string | null;
  count: number;
  marks: MarkRecord[];
  delay: number;
}) {
  const colors = useTheme();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const elev = useElevation('sm');
  const grade = avg !== null ? getGrade(avg) : null;

  const subjectMarks = marks.filter(m => m.subject === subject).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <AnimatedCard delay={delay} style={[{ backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: expanded ? `${grade?.color ?? colors.border}44` : colors.border, overflow: 'hidden' }, elev]}>
      {/* Top accent line — grade colour */}
      {grade && <View style={{ height: 3, backgroundColor: grade.color }} />}

      <Pressable onPress={() => setExpanded(!expanded)} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing(5), gap: spacing(4) }}>
        {/* Ring */}
        <GradeRing score={avg} size={64} />

        {/* Subject info */}
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 15 }]} numberOfLines={1}>{subject}</Text>
          {count > 0 ? (
            <View style={{ flexDirection: 'row', gap: spacing(3), marginTop: spacing(2), flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
                <Ionicons name="document-text-outline" size={12} color={colors.textMuted} />
                <Text style={[typography.caption, { color: colors.textMuted }]}>{count} {count === 1 ? t('test') : t('tests')}</Text>
              </View>
              {latestDate && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
                  <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                  <Text style={[typography.caption, { color: colors.textMuted }]}>{latestDate}</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing(1) }]}>{t('No results yet')}</Text>
          )}
        </View>

        {/* Expand chevron */}
        <View style={{ alignItems: 'flex-end', gap: spacing(2) }}>
          {examType && (
            <View style={{ paddingHorizontal: spacing(3), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: `${colors.primary}18` }}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', fontSize: 10 }]}>
                {t(EXAM_TYPE_SHORT[examType as ExamType] ?? examType)}
              </Text>
            </View>
          )}
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
        </View>
      </Pressable>

      {/* Expanded history */}
      {expanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, padding: spacing(5), gap: spacing(3) }}>
          {subjectMarks.length === 0 ? (
            <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>{t('No results recorded for this subject yet.')}</Text>
          ) : (
            subjectMarks.map((m, i) => {
              const g = getGrade(m.score);
              return (
                <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), padding: spacing(3), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${g.color}22`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${g.color}44` }}>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: g.color }}>{g.letter}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 13 }]}>{t(EXAM_TYPE_SHORT[m.examType])} · {m.score}%</Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>{m.date}</Text>
                  </View>
                  <View style={{ height: 36, width: 36, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: g.color }}>{m.score}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
    </AnimatedCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PerformanceTable
// ─────────────────────────────────────────────────────────────────────────────
function PerformanceTable({
  profile,
  marks,
  onAddRecord,
  onReset,
}: {
  profile: StudentProfile;
  marks: MarkRecord[];
  onAddRecord: () => void;
  onReset: () => void;
}) {
  const colors = useTheme();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isDesktop = width >= 1024;
  const heroElevation = useElevation('md');

  const [filter, setFilter] = useState<'all' | 'well' | 'poor' | 'untested'>('all');
  const [sortBy, setSortBy] = useState<'subject' | 'avg' | 'count'>('subject');
  const [search, setSearch] = useState('');

  const subjectStats = useMemo(() => {
    const map = new Map<string, { scores: number[]; latest: number | null; latestDate: string | null; examType: string | null }>();
    profile.subjects.forEach((s) => map.set(s, { scores: [], latest: null, latestDate: null, examType: null }));
    [...marks].sort((a, b) => a.date.localeCompare(b.date)).forEach((m) => {
      const entry = map.get(m.subject);
      if (entry) {
        entry.scores.push(m.score);
        entry.latest = m.score;
        entry.latestDate = m.date;
        entry.examType = m.examType;
      }
    });
    return Array.from(map.entries()).map(([subject, data]) => {
      const avg = data.scores.length ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : null;
      return { subject, avg, latest: data.latest, latestDate: data.latestDate, examType: data.examType, count: data.scores.length };
    });
  }, [profile.subjects, marks]);

  const filtered = useMemo(() => {
    let rows = [...subjectStats];
    if (search.trim()) rows = rows.filter(r => r.subject.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'well') rows = rows.filter(r => r.avg !== null && r.avg >= 60);
    if (filter === 'poor') rows = rows.filter(r => r.avg !== null && r.avg < 60);
    if (filter === 'untested') rows = rows.filter(r => r.avg === null);
    if (sortBy === 'avg') rows.sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
    if (sortBy === 'count') rows.sort((a, b) => b.count - a.count);
    if (sortBy === 'subject') rows.sort((a, b) => a.subject.localeCompare(b.subject));
    return rows;
  }, [subjectStats, filter, sortBy, search]);

  const overallAvg = useMemo(() => {
    const avgs = subjectStats.filter(s => s.avg !== null).map(s => s.avg!);
    return avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
  }, [subjectStats]);

  const tested = subjectStats.filter(s => s.count > 0).length;
  const overallGrade = overallAvg !== null ? getGrade(overallAvg) : null;

  return (
    <View style={{ gap: spacing(6) }}>
      {/* Hero stats */}
      <AnimatedCard delay={0} style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, heroElevation]}>
        <View style={{ height: 4, backgroundColor: overallGrade?.color ?? colors.primary }} />
        <View style={{ padding: spacing(6), gap: spacing(5) }}>
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing(5), alignItems: isDesktop ? 'center' : 'flex-start' }}>
            {/* Overall avg big ring */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(5) }}>
              <GradeRing score={overallAvg} size={96} />
              <View>
                <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, fontWeight: '700' }]}>{t('OVERALL AVERAGE')}</Text>
                <Text style={{ fontSize: 38, fontWeight: '900', color: overallGrade?.color ?? colors.textMuted, lineHeight: 46 }}>
                  {overallAvg !== null ? `${overallAvg}%` : '—'}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing(1) }]}>
                  {profile.system} · {profile.track} · {profile.form}
                </Text>
              </View>
            </View>

            {isDesktop && <View style={{ flex: 1 }} />}

            {/* Mini stats */}
            <View style={{ flexDirection: 'row', gap: spacing(4), flexWrap: 'wrap' }}>
              {[
                { label: 'SUBJECTS', value: profile.subjects.length, icon: 'book-outline' as const, color: colors.primary },
                { label: 'TESTED', value: tested, icon: 'checkmark-circle-outline' as const, color: colors.success },
                { label: 'RESULTS', value: marks.length, icon: 'document-text-outline' as const, color: colors.warning },
              ].map((stat) => (
                <View key={stat.label} style={{ alignItems: 'center', gap: spacing(1), minWidth: 72 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${stat.color}20`, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={stat.icon} size={18} color={stat.color} />
                  </View>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: colors.textPrimary }}>{stat.value}</Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>{t(stat.label)}</Text>
                </View>
              ))}
            </View>
          </View>

          <GradeDistributionBar subjectStats={subjectStats} />
        </View>
      </AnimatedCard>

      {/* Controls */}
      <AnimatedCard delay={80}>
        <View style={{ gap: spacing(3) }}>
          {/* Search */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), padding: spacing(3), backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border }}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('Search subjects…')}
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, color: colors.textPrimary, fontSize: 15 }}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel={t('Clear Search')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Filter / sort row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing(3) }}>
            {/* Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing(2) }}>
                {([
                  { key: 'all', label: 'All', icon: 'grid-outline' },
                  { key: 'well', label: 'Strong', icon: 'trending-up-outline' },
                  { key: 'poor', label: 'Needs Work', icon: 'alert-circle-outline' },
                  { key: 'untested', label: 'Not Tested', icon: 'time-outline' },
                ] as const).map(({ key, label, icon }) => (
                  <Pressable
                    key={key}
                    onPress={() => setFilter(key)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing(2),
                      paddingHorizontal: spacing(4),
                      paddingVertical: spacing(2),
                      borderRadius: radii.pill,
                      backgroundColor: filter === key ? colors.primary : colors.surface,
                      borderWidth: 1.5,
                      borderColor: filter === key ? colors.primary : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Ionicons name={icon} size={13} color={filter === key ? '#fff' : colors.textSecondary} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: filter === key ? '#fff' : colors.textPrimary }}>{t(label)}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: spacing(2) }}>
              {/* Sort */}
              <Pressable
                onPress={() => setSortBy(s => s === 'subject' ? 'avg' : s === 'avg' ? 'count' : 'subject')}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: spacing(2),
                  paddingHorizontal: spacing(4), paddingVertical: spacing(2),
                  backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons name="swap-vertical-outline" size={14} color={colors.textSecondary} />
                <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }}>
                  {sortBy === 'subject' ? t('A–Z') : sortBy === 'avg' ? t('By Avg') : t('By Count')}
                </Text>
              </Pressable>

              <Pressable
                onPress={onAddRecord}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: spacing(2),
                  paddingHorizontal: spacing(5), paddingVertical: spacing(3),
                  backgroundColor: colors.primary, borderRadius: radii.lg,
                  opacity: pressed ? 0.9 : 1,
                  ...(Platform.OS === 'web' && { boxShadow: `0 4px 14px ${colors.primary}55` } as any),
                })}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={[typography.label, { color: '#fff', fontSize: 13 }]}>{t('Add Result')}</Text>
              </Pressable>

              <Pressable
                onPress={onReset}
                style={({ pressed }) => ({
                  width: 40, height: 40, borderRadius: radii.lg,
                  backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
                  alignItems: 'center', justifyContent: 'center',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons name="refresh-outline" size={16} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        </View>
      </AnimatedCard>

      {/* Subject cards */}
      {filtered.length === 0 ? (
        <AnimatedCard delay={100} style={{ padding: spacing(12), alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, gap: spacing(3) }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="search-outline" size={28} color={colors.textMuted} />
          </View>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{t('No subjects match')}</Text>
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>{t('Try a different filter or search term.')}</Text>
        </AnimatedCard>
      ) : (
        <View style={{ gap: spacing(3) }}>
          {filtered.map((row, i) => (
            <SubjectCard
              key={row.subject}
              subject={row.subject}
              avg={row.avg}
              latest={row.latest}
              latestDate={row.latestDate}
              examType={row.examType}
              count={row.count}
              marks={marks}
              delay={i * 40}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────
export default function Progress() {
  const colors = useTheme();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    try {
      if (user) {
        setUserId(user.uid);

        const loadedProfile = await getStudentProfile(user.uid);

        if (loadedProfile) {
          setProfile(loadedProfile);
        }

        const loadedMarks = await getStudentMarks(user.uid);
        setMarks(loadedMarks);
      }
    } catch (err) {
      console.error(err);
      Alert.alert(
        t("Error"),
        t("Failed to load your progress data.")
      );
    } finally {
      setLoading(false);
    }
  });

  return unsubscribe;
}, []);

  const handleProfileComplete = async (newProfile: StudentProfile) => {
    if (!userId) return;
    try {
      await saveStudentProfile(userId, newProfile);
    } catch (err) {
      console.error(err);
      Alert.alert(t('Error'), t('Failed to save profile. Check Firestore rules.'));
    }
  };

  const handleAddRecord = async (record: MarkRecord) => {
  if (!userId) return;

  try {
    const savedRecord = await addStudentMark(userId, record);

    setMarks((prev) => [
      ...prev,
      savedRecord,
    ]);
  } catch (err) {
    console.error(err);
    Alert.alert(
      t("Error"),
      t("Failed to save record. Check Firestore rules.")
    );
  }
};

  const handleReset = async () => {
  if (!userId) return;

  if (!confirm(t("Delete ALL progress data? This cannot be undone."))) {
    return;
  }

  try {
    await resetStudentProgress(userId);

    setProfile(null);
    setMarks([]);
  } catch (err) {
    console.error(err);
    Alert.alert(
      t("Error"),
      t("Failed to reset data.")
    );
  }
};

  if (loading) {
    return (
      <DashboardLayout title={t('Progress')} subtitle={t('Loading your data…')} showPointsCard={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing(4), paddingTop: spacing(12) }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textMuted }]}>{t('Fetching your results…')}</Text>
        </View>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={profile ? t('Progress Analytics') : t('Set Up Your Profile')}
      subtitle={profile ? `${profile.system} · ${profile.track} · ${profile.form}` : t('Tell us about your studies to get started.')}
      showPointsCard={false}
    >
      {!profile ? (
        <SetupWizard onComplete={handleProfileComplete} />
      ) : (
        <PerformanceTable
          profile={profile}
          marks={marks}
          onAddRecord={() => setAddModalOpen(true)}
          onReset={handleReset}
        />
      )}

      <StudentFooter
        topSpacing={isMobile ? spacing(8) : spacing(10)}
        maxWidth={1280}
      />

      <AddRecordModal
        visible={addModalOpen}
        subjects={profile?.subjects || []}
        onSave={handleAddRecord}
        onClose={() => setAddModalOpen(false)}
      />
    </DashboardLayout>
  );
}