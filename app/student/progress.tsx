import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  useWindowDimensions,
  Platform,
  type ViewStyle,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  StudentMenuProvider,
  useStudentMenu,
} from '../../components/student/StudentMenu';

// ─────────────────────────────────────────────────────────────────────────────
// DashboardLayout & design tokens
// ─────────────────────────────────────────────────────────────────────────────
import DashboardLayout, {
  spacing,
  typography,
  radii,
  useTheme,
} from '../../components/student/DashboardLayout';

// ─────────────────────────────────────────────────────────────────────────────
// Firebase
// ─────────────────────────────────────────────────────────────────────────────
import { db, auth } from '../../constants/firebase';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type System = 'BGCSE' | 'IGCSE';
type BGCSETrack = 'Pure' | 'Double' | 'Single';
type IGCSETrack = 'Advanced' | 'Ordinary';
type Track = BGCSETrack | IGCSETrack;
type BGCSEForm = 'Form 4' | 'Form 5';
type IGCSEForm = 'Form 4' | 'Form 5' | 'Form 6 (A-Level)';
type Form = BGCSEForm | IGCSEForm;
type ExamType = 'End of Month Test' | 'End of Term Exam' | 'End of Year Exam';

type MarkRecord = {
  id: string;
  subject: string;
  score: number;
  examType: ExamType;
  date: string;
};

type StudentProfile = {
  system: System;
  track: Track;
  form: Form;
  subjects: string[];
};

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
const ADDITIONAL_SUBJECTS = 4; // Fixed as requested
const EXAM_TYPES: ExamType[] = ['End of Month Test', 'End of Term Exam', 'End of Year Exam'];

const EXAM_TYPE_ICONS: Record<ExamType, keyof typeof Ionicons.glyphMap> = {
  'End of Month Test': 'calendar-outline',
  'End of Term Exam': 'school-outline',
  'End of Year Exam': 'trophy-outline',
};

const BGCSE_FORMS: BGCSEForm[] = ['Form 4', 'Form 5'];
const IGCSE_FORMS: IGCSEForm[] = ['Form 4', 'Form 5', 'Form 6 (A-Level)'];

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
// PerformanceBar
// ─────────────────────────────────────────────────────────────────────────────
function PerformanceBar({ score }: { score: number }) {
  const colors = useTheme();
  const color = score >= 70 ? colors.success : score >= 50 ? colors.warning : colors.danger;

  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden', marginTop: spacing(1) }}>
      <View style={{ height: 8, width: `${score}%` as any, backgroundColor: color, borderRadius: 4 }} />
    </View>
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
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing(2),
        paddingHorizontal: spacing(4),
        paddingVertical: spacing(3),
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary : colors.surfaceAlt,
        opacity: pressed ? 0.85 : 1,
        transform: pressed ? [{ scale: 0.97 }] : [],
      })}
    >
      {icon && <Ionicons name={icon} size={16} color={selected ? '#fff' : colors.textSecondary} />}
      <Text style={[typography.label, { color: selected ? '#fff' : colors.textPrimary }]}>
        {label}
      </Text>
      {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SetupWizard (Updated)
// ─────────────────────────────────────────────────────────────────────────────
function SetupWizard({ onComplete }: { onComplete: (profile: StudentProfile) => void }) {
  const colors = useTheme();
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

  const stepIndex: Record<WizardStep, number> = { system: 0, track: 1, form: 2, subjects: 3, done: 4 };

  const goNext = useCallback(() => {
    if (step === 'system' && system) setStep('track');
    else if (step === 'track' && track) setStep('form');
    else if (step === 'form' && form) setStep('subjects');
    else if (step === 'subjects') {
      const filled = extraInputs.filter((s) => s.trim()).map((s) => s.trim());
      if (filled.length < ADDITIONAL_SUBJECTS) {
        Alert.alert('Incomplete', `Please enter all ${ADDITIONAL_SUBJECTS} additional subjects.`);
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

  const progressPct = ((stepIndex[step] as number) / 4) * 100;

  return (
    <View style={{ padding: isMobile ? spacing(5) : spacing(7) }}>
      <View style={{ marginBottom: spacing(6) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(2) }}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>STEP {stepIndex[step] + 1} OF 4</Text>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{Math.round(progressPct)}%</Text>
        </View>
        <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: 6, width: `${progressPct}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
        </View>
      </View>

      {/* Steps */}
      {step === 'system' && (
        <View style={{ gap: spacing(5) }}>
          <Text style={[typography.h1, { color: colors.textPrimary }]}>Welcome 👋</Text>
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 24 }]}>
            Which examination system are you enrolled in?
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
            <SelectionPill label="BGCSE" selected={system === 'BGCSE'} onPress={() => setSystem('BGCSE')} icon="school-outline" />
            <SelectionPill label="IGCSE" selected={system === 'IGCSE'} onPress={() => setSystem('IGCSE')} icon="globe-outline" />
          </View>
        </View>
      )}

      {step === 'track' && system && (
        <View style={{ gap: spacing(5) }}>
          <Text style={[typography.h1, { color: colors.textPrimary }]}>Your Track</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
            {(system === 'BGCSE' ? (['Pure', 'Double', 'Single'] as BGCSETrack[]) : (['Advanced', 'Ordinary'] as IGCSETrack[])).map((t) => (
              <SelectionPill key={t} label={t} selected={track === t} onPress={() => setTrack(t)} icon="flask-outline" />
            ))}
          </View>
        </View>
      )}

      {step === 'form' && system && (
        <View style={{ gap: spacing(5) }}>
          <Text style={[typography.h1, { color: colors.textPrimary }]}>Your Year Group</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
            {(system === 'BGCSE' ? BGCSE_FORMS : IGCSE_FORMS).map((f) => (
              <SelectionPill key={f} label={f} selected={form === f} onPress={() => setForm(f)} icon="person-outline" />
            ))}
          </View>
        </View>
      )}

      {step === 'subjects' && track && (
        <View style={{ gap: spacing(5) }}>
          <Text style={[typography.h1, { color: colors.textPrimary }]}>Your Subjects</Text>
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 24 }]}>
            You must enter exactly {ADDITIONAL_SUBJECTS} additional subjects.
          </Text>

          {/* Default Subjects */}
          <View style={{ gap: spacing(2) }}>
            <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5 }]}>DEFAULT SUBJECTS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
              {defaults.map((s, i) => (
                <View
                  key={i}
                  style={{
                    paddingHorizontal: spacing(3),
                    paddingVertical: spacing(2),
                    borderRadius: radii.pill,
                    backgroundColor: `${colors.primary}1A`,
                    borderWidth: 1,
                    borderColor: `${colors.primary}33`,
                  }}
                >
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{s}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Additional Subjects */}
          <View style={{ gap: spacing(3) }}>
            <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5 }]}>
              ADD {ADDITIONAL_SUBJECTS} ADDITIONAL SUBJECTS
            </Text>
            {extraInputs.map((val, i) => (
              <TextInput
                key={i}
                value={val}
                onChangeText={(text) => {
                  const copy = [...extraInputs];
                  copy[i] = text;
                  setExtraInputs(copy);
                }}
                placeholder={`Additional Subject ${i + 1}`}
                style={{
                  padding: spacing(4),
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                }}
              />
            ))}
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: spacing(3), marginTop: spacing(8) }}>
        {step !== 'system' && (
          <Pressable onPress={goBack} style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
            <Text style={[typography.label, { color: colors.textPrimary }]}>Back</Text>
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
            opacity: canNext ? (pressed ? 0.88 : 1) : 0.5,
          })}
        >
          <Text style={[typography.label, { color: canNext ? '#fff' : colors.textMuted }]}>
            {step === 'subjects' ? 'Save Profile' : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddRecordModal (Enhanced)
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
  const [subject, setSubject] = useState('');
  const [score, setScore] = useState(65);
  const [examType, setExamType] = useState<ExamType>('End of Term Exam');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const canSave = subject && examType && date;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: Date.now().toString(),
      subject,
      score,
      examType,
      date,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing(5) }} onPress={onClose}>
        <View style={{ width: '100%', maxWidth: 480, backgroundColor: colors.surface, borderRadius: radii.xxl, overflow: 'hidden' }}>
          <View style={{ height: 4, backgroundColor: colors.primary }} />

          <View style={{ padding: spacing(6), gap: spacing(5) }}>
            <Text style={[typography.h2, { color: colors.textPrimary }]}>Add New Record</Text>

            {/* Subject */}
            <View>
              <Text style={[typography.label, { color: colors.textPrimary, marginBottom: spacing(2) }]}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing(2) }}>
                  {subjects.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setSubject(s)}
                      style={({ pressed }) => ({
                        paddingHorizontal: spacing(4),
                        paddingVertical: spacing(2),
                        borderRadius: radii.pill,
                        backgroundColor: subject === s ? colors.primary : colors.surfaceAlt,
                        borderWidth: 1,
                        borderColor: subject === s ? colors.primary : colors.border,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Text style={{ color: subject === s ? '#fff' : colors.textPrimary }}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Score */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(2) }}>
                <Text style={[typography.label, { color: colors.textPrimary }]}>Score (%)</Text>
                <Text style={[typography.h2, { color: colors.primary }]}>{score}%</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing(1), paddingVertical: spacing(2) }}>
                  {Array.from({ length: 101 }, (_, i) => i).map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setScore(s)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: radii.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: s === score ? `${colors.primary}22` : colors.surfaceAlt,
                        borderWidth: 1,
                        borderColor: s === score ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{ color: s === score ? colors.primary : colors.textSecondary }}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Exam Type */}
            <View>
              <Text style={[typography.label, { color: colors.textPrimary, marginBottom: spacing(2) }]}>Exam Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                {EXAM_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setExamType(type)}
                    style={({ pressed }) => ({
                      paddingHorizontal: spacing(4),
                      paddingVertical: spacing(2),
                      borderRadius: radii.pill,
                      backgroundColor: examType === type ? colors.primary : colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: examType === type ? colors.primary : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ color: examType === type ? '#fff' : colors.textPrimary }}>{type}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Date */}
            <View>
              <Text style={[typography.label, { color: colors.textPrimary, marginBottom: spacing(2) }]}>Date</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                style={{
                  padding: spacing(4),
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                }}
              />
            </View>

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => ({
                height: 56,
                backgroundColor: canSave ? colors.primary : colors.surfaceAlt,
                borderRadius: radii.lg,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: canSave ? (pressed ? 0.9 : 1) : 0.6,
              })}
            >
              <Text style={[typography.label, { color: canSave ? '#fff' : colors.textMuted }]}>SAVE RECORD</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PerformanceTable (Enhanced)
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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [filter, setFilter] = useState<'all' | 'well' | 'poor'>('all');
  const [sortBy, setSortBy] = useState<'subject' | 'avg' | 'latest'>('subject');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

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
      return { subject, avg, latest: data.latest, latestDate: data.latestDate, examType: data.examType, scores: data.scores, count: data.scores.length };
    });
  }, [profile.subjects, marks]);

  const filtered = useMemo(() => {
    let rows = [...subjectStats];
    if (filter === 'well') rows = rows.filter((r) => r.avg && r.avg >= 60);
    if (filter === 'poor') rows = rows.filter((r) => r.avg && r.avg < 60);

    if (sortBy === 'avg') rows.sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
    if (sortBy === 'latest') rows.sort((a, b) => (b.latest ?? -1) - (a.latest ?? -1));
    if (sortBy === 'subject') rows.sort((a, b) => a.subject.localeCompare(b.subject));

    return rows;
  }, [subjectStats, filter, sortBy]);

  const overallAvg = useMemo(() => {
    const avgs = subjectStats.filter((s) => s.avg !== null).map((s) => s.avg!);
    return avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
  }, [subjectStats]);

  return (
    <View style={{ gap: spacing(6) }}>
      {/* Stats Overview */}
      <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: spacing(6) }, useElevation('md')]}>
        <Text style={[typography.h2, { color: colors.textPrimary }]}>Your Performance</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(4), marginTop: spacing(5) }}>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>OVERALL AVERAGE</Text>
            <Text style={{ fontSize: 42, fontWeight: '900', color: overallAvg ? (overallAvg >= 70 ? colors.success : colors.warning) : colors.textMuted }}>
              {overallAvg ?? '—'}%
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>SUBJECTS TRACKED</Text>
            <Text style={[typography.h1, { color: colors.textPrimary }]}>{profile.subjects.length}</Text>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing(3) }}>
        <View style={{ flexDirection: 'row', gap: spacing(2) }}>
          {(['all', 'well', 'poor'] as const).map((f) => (
            <Pressable key={f} onPress={() => setFilter(f)} style={({ pressed }) => ({ paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: filter === f ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: filter === f ? colors.primary : colors.border, opacity: pressed ? 0.85 : 1 })}>
              <Text style={{ color: filter === f ? '#fff' : colors.textPrimary }}>{f === 'all' ? 'All' : f === 'well' ? 'Strong' : 'Needs Work'}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing(3) }}>
          <Pressable onPress={onAddRecord} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(5), paddingVertical: spacing(3), backgroundColor: colors.primary, borderRadius: radii.lg, opacity: pressed ? 0.9 : 1 })}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={[typography.label, { color: '#fff' }]}>Add Record</Text>
          </Pressable>

          <Pressable onPress={onReset} style={({ pressed }) => ({ paddingHorizontal: spacing(4), paddingVertical: spacing(3), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.85 : 1 })}>
            <Ionicons name="refresh-outline" size={18} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      {/* Table */}
      <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, useElevation('md')]}>
        {filtered.length === 0 ? (
          <View style={{ padding: spacing(10), alignItems: 'center' }}>
            <Text style={[typography.body, { color: colors.textMuted }]}>No records match your filter.</Text>
          </View>
        ) : (
          filtered.map((row) => (
            <Pressable key={row.subject} onPress={() => setExpandedSubject(expandedSubject === row.subject ? null : row.subject)} style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
              <View style={{ flexDirection: 'row', padding: spacing(5), alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{row.subject}</Text>
                  {row.avg && <PerformanceBar score={row.avg} />}
                </View>
                <View style={{ alignItems: 'center', width: 70 }}>
                  <Text style={[typography.bodyStrong, { color: row.avg ? (row.avg >= 70 ? colors.success : colors.warning) : colors.textMuted }]}>
                    {row.avg ?? '—'}%
                  </Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────
export default function Progress() {
  const colors = useTheme();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const profileDoc = await getDoc(doc(db, 'students', user.uid, 'profile', 'main'));
        if (profileDoc.exists()) setProfile(profileDoc.data() as StudentProfile);

        const marksSnap = await getDocs(collection(db, 'students', user.uid, 'marks'));
        setMarks(marksSnap.docs.map(d => ({ id: d.id, ...d.data() } as MarkRecord)));
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleProfileComplete = async (newProfile: StudentProfile) => {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'students', userId, 'profile', 'main'), newProfile);
      setProfile(newProfile);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save profile. Check Firestore rules.');
    }
  };

  const handleAddRecord = async (record: MarkRecord) => {
    if (!userId) return;
    try {
      await addDoc(collection(db, 'students', userId, 'marks'), record);
      setMarks(prev => [...prev, record]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save record. Check Firestore rules.');
    }
  };

  const handleReset = async () => {
    if (!userId || !confirm('Delete ALL progress data?')) return;
    try {
      await deleteDoc(doc(db, 'students', userId, 'profile', 'main'));
      const marksSnap = await getDocs(collection(db, 'students', userId, 'marks'));
      marksSnap.docs.forEach(d => deleteDoc(d.ref));
      setProfile(null);
      setMarks([]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to reset data.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Progress" subtitle="Loading..." showPointsCard={false}>
        <ActivityIndicator size="large" color={colors.primary} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={profile ? 'Progress Analytics' : 'Setup Profile'}
      subtitle={profile ? `${profile.system} · ${profile.track}` : 'Configure your academic profile'}
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

      <AddRecordModal
        visible={addModalOpen}
        subjects={profile?.subjects || []}
        onSave={handleAddRecord}
        onClose={() => setAddModalOpen(false)}
      />
    </DashboardLayout>
  );
}