import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
  Alert,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StudentMenuProvider } from '../../components/student/StudentMenu';

import DashboardLayout, {
  spacing,
  typography,
  radii,
  useTheme,
} from '../../components/student/DashboardLayout';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Breakpoint = 'mobile' | 'tablet' | 'desktop';
type Level = 'BGCSE' | 'IGCSE';
type Track = 'PURE' | 'DOUBLE' | 'SINGLE' | 'ADVANCED' | 'ORDINARY';

const GRADES_STANDARD = ['A*', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'U'] as const;
type StandardGrade = (typeof GRADES_STANDARD)[number];

const GRADES_DOUBLE = ['A*A*', 'AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG', 'HH', 'UU'] as const;
type DoubleGrade = (typeof GRADES_DOUBLE)[number];

type Grade = StandardGrade | DoubleGrade | '';

type ResultRow = { id: string; subject: string; grade: Grade };
type BestUnit  = { key: string; subject: string; points: number; rowId: string };
type BestRowSummary = { subject: string; grade: string; points: number; countsAs: 1 | 2 };

// ─────────────────────────────────────────────────────────────────────────────
// Calculation logic
// ─────────────────────────────────────────────────────────────────────────────
const DOUBLE_AWARD_SUBJECT = 'SCIENCE DOUBLE AWARD';

function normalizeSubjectName(s: string) {
  return s.trim().replace(/\s+/g, ' ').toUpperCase();
}
function isDoubleAward(subject: string): boolean {
  return normalizeSubjectName(subject) === DOUBLE_AWARD_SUBJECT;
}

const STANDARD_POINTS: Record<StandardGrade, number> = {
  'A*': 8, A: 8, B: 7, C: 6, D: 5, E: 4, F: 3, G: 2, H: 1, U: 0,
};
const DOUBLE_AWARD_POINTS: Record<DoubleGrade, number> = {
  'A*A*': 16, AA: 16, BB: 14, CC: 12, DD: 10, EE: 8, FF: 6, GG: 4, HH: 2, UU: 0,
};

const DEFAULTS = {
  BGCSE: {
    PURE:   ['CHEMISTRY', 'PHYSICS', 'BIOLOGY', 'EXTENDED MATH', 'ENGLISH', 'SETSWANA'],
    DOUBLE: [DOUBLE_AWARD_SUBJECT, 'ENGLISH', 'SETSWANA', 'MATH'],
    SINGLE: ['INTEGRATED SCIENCE', 'MATH', 'ENGLISH', 'SETSWANA'],
  },
  IGCSE: {
    ADVANCED: ['CHEMISTRY', 'PHYSICS', 'BIOLOGY', 'EXTENDED MATH', 'ENGLISH', 'SETSWANA'],
    ORDINARY: ['INTEGRATED SCIENCE', 'MATH', 'ENGLISH', 'SETSWANA'],
  },
} as const;

function allowedTracksForLevel(level: Level): Track[] {
  return level === 'BGCSE' ? ['PURE', 'DOUBLE', 'SINGLE'] : ['ADVANCED', 'ORDINARY'];
}

// ── Optional subjects bumped from 3 → 4 (Pure / Double / Single) ──────────────
// Pure:   6 prefilled + 4 optional = 10 slots
// Double: 4 prefilled + 4 optional = 8 slots
// Single: 4 prefilled + 4 optional = 8 slots
function requiredSubjectSlots(level: Level, track: Track): number {
  if (level === 'BGCSE') return track === 'PURE' ? 10 : 8;
  return track === 'ADVANCED' ? 9 : 7;
}
function defaultsForSelection(level: Level, track: Track): readonly string[] {
  if (level === 'BGCSE') {
    if (track === 'PURE')   return DEFAULTS.BGCSE.PURE;
    if (track === 'DOUBLE') return DEFAULTS.BGCSE.DOUBLE;
    return DEFAULTS.BGCSE.SINGLE;
  }
  return track === 'ADVANCED' ? DEFAULTS.IGCSE.ADVANCED : DEFAULTS.IGCSE.ORDINARY;
}
function uid(prefix = 'row') {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}
function toTitle(value: string) {
  return value.toLowerCase().split(' ').filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function buildRows(level: Level, track: Track): ResultRow[] {
  const required  = requiredSubjectSlots(level, track);
  const defaults  = [...defaultsForSelection(level, track)];
  const prefilled = defaults.map((s) => ({ id: uid('subject'), subject: toTitle(s), grade: '' as Grade }));
  const empties   = Array.from({ length: Math.max(0, required - prefilled.length) })
    .map(() => ({ id: uid('empty'), subject: '', grade: '' as Grade }));
  return [...prefilled, ...empties];
}
function computePointsForRow(row: ResultRow): { points: number; countsAs: 1 | 2 } | null {
  const subject = row.subject.trim();
  const grade   = row.grade;
  if (!subject || !grade) return null;
  if (isDoubleAward(subject)) {
    if (!GRADES_DOUBLE.includes(grade as DoubleGrade)) return null;
    return { points: DOUBLE_AWARD_POINTS[grade as DoubleGrade], countsAs: 2 };
  }
  if (!GRADES_STANDARD.includes(grade as StandardGrade)) return null;
  return { points: STANDARD_POINTS[grade as StandardGrade], countsAs: 1 };
}
function pickBestSix(rows: ResultRow[]) {
  const units: BestUnit[] = [];
  for (const row of rows) {
    const calc = computePointsForRow(row);
    if (!calc) continue;
    if (calc.countsAs === 2) {
      const perUnit = calc.points / 2;
      units.push({ key: `${row.id}-1`, subject: normalizeSubjectName(row.subject), points: perUnit, rowId: row.id });
      units.push({ key: `${row.id}-2`, subject: normalizeSubjectName(row.subject), points: perUnit, rowId: row.id });
    } else {
      units.push({ key: `${row.id}-single`, subject: normalizeSubjectName(row.subject), points: calc.points, rowId: row.id });
    }
  }
  units.sort((a, b) => b.points - a.points);
  const bestSixUnits = units.slice(0, 6);
  const totalPoints  = Math.round(bestSixUnits.reduce((sum, u) => sum + u.points, 0));
  const rowMap = new Map<string, { row: ResultRow; totalPoints: number }>();
  for (const unit of bestSixUnits) {
    const row = rows.find((r) => r.id === unit.rowId);
    if (!row) continue;
    const existing = rowMap.get(unit.rowId);
    rowMap.set(unit.rowId, existing
      ? { row, totalPoints: existing.totalPoints + unit.points }
      : { row, totalPoints: unit.points });
  }
  const bestRows: BestRowSummary[] = Array.from(rowMap.values()).map((e) => ({
    subject:  normalizeSubjectName(e.row.subject),
    grade:    String(e.row.grade || ''),
    points:   Math.round(e.totalPoints),
    countsAs: isDoubleAward(e.row.subject) ? 2 : 1,
  }));
  return { totalPoints, bestRows, eligible: totalPoints >= 36, threshold: 36 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Elevation helper — softer, modern shadows
// ─────────────────────────────────────────────────────────────────────────────
function useElevation(intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  return useMemo<ViewStyle>(() => {
    const opacity = intensity === 'sm' ? 0.08 : intensity === 'md' ? 0.12 : 0.18;
    const radius  = intensity === 'sm' ? 10 : intensity === 'md' ? 20 : 34;
    const offsetY = intensity === 'sm' ? 3 : intensity === 'md' ? 8 : 16;
    return Platform.select({
      ios:     { shadowColor: '#0B1220', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: radius },
      android: { elevation: intensity === 'sm' ? 2 : intensity === 'md' ? 5 : 10 },
      web:     { boxShadow: `0 ${offsetY}px ${radius * 1.4}px rgba(11,18,32,${opacity})` } as any,
      default: {},
    }) ?? {};
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Accent bar (gradient-style header strip)
// ─────────────────────────────────────────────────────────────────────────────
function AccentBar({ color, tall = false }: { color: string; tall?: boolean }) {
  return (
    <View style={{ height: tall ? 5 : 4, flexDirection: 'row', overflow: 'hidden' }}>
      <View style={{ flex: 2, backgroundColor: color }} />
      <View style={{ flex: 1, backgroundColor: `${color}AA` }} />
      <View style={{ flex: 1, backgroundColor: `${color}55` }} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card shell
// ─────────────────────────────────────────────────────────────────────────────
function Card({
  children,
  accent,
  style,
  intensity = 'lg',
}: {
  children: React.ReactNode;
  accent?: string;
  style?: ViewStyle;
  intensity?: 'sm' | 'md' | 'lg';
}) {
  const colors = useTheme();
  const elevation = useElevation(intensity);
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        elevation,
        style,
      ]}
    >
      {accent ? <AccentBar color={accent} /> : null}
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  tone = 'neutral',
  compact = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: 'neutral' | 'primary' | 'success';
  compact?: boolean;
}) {
  const colors = useTheme();
  const accent =
    tone === 'primary' ? colors.primary
    : tone === 'success' ? colors.success
    : colors.textSecondary;
  const bg =
    tone === 'primary' ? `${colors.primary}14`
    : tone === 'success' ? `${colors.success}14`
    : colors.surfaceAlt;
  const borderColor =
    tone === 'primary' ? `${colors.primary}33`
    : tone === 'success' ? `${colors.success}33`
    : colors.border;

  return (
    <View
      style={{
        flex: 1,
        minWidth: compact ? 0 : 150,
        backgroundColor: bg,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor,
        padding: spacing(3),
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing(2),
      }}
    >
      <View
        style={{
          width: compact ? 34 : 40,
          height: compact ? 34 : 40,
          borderRadius: radii.md,
          backgroundColor: tone === 'neutral' ? colors.surface : `${accent}22`,
          borderWidth: 1,
          borderColor: tone === 'neutral' ? colors.border : `${accent}44`,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Ionicons name={icon} size={compact ? 15 : 18} color={accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[typography.caption, { color: colors.textMuted, fontSize: compact ? 10 : 11, letterSpacing: 0.3 }]} numberOfLines={1}>
          {label}
        </Text>
        <Text
          style={[typography.label, { color: colors.textPrimary, marginTop: 1, fontSize: compact ? 13 : 14, fontWeight: '800' }]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress ring (mobile hero)
// ─────────────────────────────────────────────────────────────────────────────
function ProgressBar({ completed, total, colors }: { completed: number; total: number; colors: any }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const done = pct === 100;
  return (
    <View style={{ marginBottom: spacing(5) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(2) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
          <Ionicons name={done ? 'checkmark-circle' : 'hourglass-outline'} size={14} color={done ? colors.success : colors.primary} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Completion</Text>
        </View>
        <Text style={[typography.caption, { color: done ? colors.success : colors.textPrimary, fontWeight: '800' }]}>
          {completed}/{total} · {pct}%
        </Text>
      </View>
      <View style={{ height: 10, backgroundColor: colors.surfaceAlt, borderRadius: radii.pill, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
        <View
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: done ? colors.success : colors.primary,
            borderRadius: radii.pill,
          }}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grade Picker Modal
// ─────────────────────────────────────────────────────────────────────────────
function GradePickerModal({
  visible,
  activeRow,
  onSelect,
  onClose,
}: {
  visible: boolean;
  activeRow: ResultRow | null;
  onSelect: (g: Grade) => void;
  onClose: () => void;
}) {
  const colors    = useTheme();
  const elevation = useElevation('lg');
  const isDouble  = activeRow ? isDoubleAward(activeRow.subject) : false;
  const grades    = isDouble ? GRADES_DOUBLE : GRADES_STANDARD;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(8,12,22,0.62)',
          justifyContent: 'flex-end',
          ...Platform.select({ web: { justifyContent: 'center', alignItems: 'center', padding: spacing(5) } }),
        }}
        onPress={onClose}
      >
        <Pressable
          style={[
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xxl,
              borderTopRightRadius: radii.xxl,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
              paddingBottom: spacing(9),
            },
            Platform.select({
              web: { width: '92%', maxWidth: 440, borderRadius: radii.xxl } as any,
            }),
            elevation,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {Platform.OS !== 'web' && (
            <View style={{ alignItems: 'center', paddingTop: spacing(3), paddingBottom: spacing(1) }}>
              <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border }} />
            </View>
          )}

          <AccentBar color={colors.primary} />

          <View style={{ padding: spacing(5) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(3) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
                <View style={{ width: 40, height: 40, borderRadius: radii.lg, backgroundColor: `${colors.primary}1A`, borderWidth: 1, borderColor: `${colors.primary}33`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[typography.h2, { color: colors.textPrimary }]}>Select Grade</Text>
              </View>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  width: 40, height: 40, borderRadius: radii.lg,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1, borderColor: colors.border,
                  alignItems: 'center' as const, justifyContent: 'center' as const,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {activeRow?.subject ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(3), backgroundColor: `${colors.primary}12`, borderRadius: radii.lg, borderLeftWidth: 3, borderLeftColor: colors.primary, marginBottom: spacing(4) }}>
                <Ionicons name={isDouble ? 'flask-outline' : 'book-outline'} size={15} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>
                  {activeRow.subject} — {isDouble ? 'Double Award scale' : 'Standard scale'}
                </Text>
              </View>
            ) : null}

            {/* Grade grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2.5), marginBottom: spacing(4) }}>
              {grades.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => onSelect(g as Grade)}
                  style={({ pressed }) => ({
                    flexGrow: 1,
                    flexBasis: '28%',
                    minWidth: 72,
                    paddingVertical: spacing(4),
                    borderRadius: radii.lg,
                    backgroundColor: pressed ? `${colors.primary}1A` : colors.surfaceAlt,
                    borderWidth: 1.5,
                    borderColor: pressed ? colors.primary : colors.border,
                    alignItems: 'center' as const,
                    transform: pressed ? [{ scale: 0.96 }] : [],
                  })}
                >
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 18, fontWeight: '800' }]}>{g}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => onSelect('')}
              style={({ pressed }) => ({
                padding: spacing(4),
                borderRadius: radii.lg,
                backgroundColor: `${colors.danger}10`,
                borderWidth: 1,
                borderColor: `${colors.danger}33`,
                alignItems: 'center' as const,
                opacity: pressed ? 0.8 : 1,
                flexDirection: 'row' as const,
                justifyContent: 'center' as const,
                gap: spacing(2),
              })}
            >
              <Ionicons name="backspace-outline" size={16} color={colors.danger} />
              <Text style={[typography.label, { color: colors.danger }]}>Clear Grade</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm Modal
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmModal({
  visible,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const colors    = useTheme();
  const elevation = useElevation('lg');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(8,12,22,0.62)', justifyContent: 'center', alignItems: 'center', padding: spacing(5) }}
        onPress={onClose}
      >
        <Pressable
          style={[{
            width: '94%', maxWidth: 430,
            backgroundColor: colors.surface,
            borderRadius: radii.xxl,
            borderWidth: 1, borderColor: colors.border,
            overflow: 'hidden',
          }, elevation]}
          onPress={(e) => e.stopPropagation()}
        >
          <AccentBar color={colors.primary} />
          <View style={{ padding: spacing(6), gap: spacing(4) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
              <View style={{ width: 48, height: 48, borderRadius: radii.lg, backgroundColor: `${colors.primary}1A`, borderWidth: 1, borderColor: `${colors.primary}44`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="calculator-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[typography.h2, { color: colors.textPrimary, flex: 1 }]}>Confirm Calculation</Text>
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
              We'll automatically select your best 6 subjects. Science Double Award counts as 2 subjects when included.
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing(3), marginTop: spacing(2) }}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  flex: 1, height: 54, borderRadius: radii.lg,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1, borderColor: colors.border,
                  alignItems: 'center' as const, justifyContent: 'center' as const,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={[typography.label, { color: colors.textPrimary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                style={({ pressed }) => ({
                  flex: 1, height: 54, borderRadius: radii.lg,
                  backgroundColor: colors.primary,
                  flexDirection: 'row' as const,
                  alignItems: 'center' as const, justifyContent: 'center' as const,
                  gap: spacing(2),
                  opacity: pressed ? 0.9 : 1,
                  transform: pressed ? [{ scale: 0.98 }] : [],
                })}
              >
                <Ionicons name="flash" size={16} color="#fff" />
                <Text style={[typography.label, { color: '#fff' }]}>Calculate</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Results Modal
// ─────────────────────────────────────────────────────────────────────────────
function ResultsModal({
  visible,
  calculation,
  onClose,
}: {
  visible: boolean;
  calculation: ReturnType<typeof pickBestSix> | null;
  onClose: () => void;
}) {
  const colors    = useTheme();
  const elevation = useElevation('lg');
  const eligible  = calculation?.eligible ?? false;
  const tone      = eligible ? colors.success : colors.danger;
  const total     = calculation?.totalPoints ?? 0;
  const threshold = calculation?.threshold ?? 36;
  const pct       = Math.min(100, Math.round((total / threshold) * 100));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(8,12,22,0.66)',
          justifyContent: 'flex-end',
          ...Platform.select({ web: { justifyContent: 'center', alignItems: 'center', padding: spacing(5) } }),
        }}
        onPress={onClose}
      >
        <Pressable
          style={[
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xxl,
              borderTopRightRadius: radii.xxl,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
              maxHeight: '92%',
              paddingBottom: spacing(8),
            },
            Platform.select({
              web: { width: '94%', maxWidth: 500, borderRadius: radii.xxl, maxHeight: '88%' } as any,
            }),
            elevation,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {Platform.OS !== 'web' && (
            <View style={{ alignItems: 'center', paddingTop: spacing(3), paddingBottom: spacing(1) }}>
              <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border }} />
            </View>
          )}

          <AccentBar color={tone} tall />

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={{ padding: spacing(6) }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(5) }}>
              <Text style={[typography.h2, { color: colors.textPrimary }]}>Your Results</Text>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  width: 40, height: 40, borderRadius: radii.lg,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1, borderColor: colors.border,
                  alignItems: 'center' as const, justifyContent: 'center' as const,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Score hero */}
            <View style={{
              backgroundColor: `${tone}12`,
              borderRadius: radii.xl,
              borderWidth: 1,
              borderColor: `${tone}33`,
              padding: spacing(5),
              marginBottom: spacing(5),
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 46, lineHeight: 50, fontWeight: '900', color: colors.textPrimary }}>
                    {total}
                  </Text>
                  <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '700' }]}>points · best 6</Text>
                </View>
                <View style={{
                  paddingHorizontal: spacing(4), paddingVertical: spacing(3),
                  borderRadius: radii.xl,
                  backgroundColor: `${tone}1A`,
                  borderWidth: 1,
                  borderColor: tone,
                  alignItems: 'center',
                }}>
                  <Ionicons
                    name={eligible ? 'checkmark-circle' : 'close-circle'}
                    size={30}
                    color={tone}
                  />
                  <Text style={[typography.label, { color: tone, marginTop: spacing(1) }]}>
                    {eligible ? 'Eligible' : 'Not Eligible'}
                  </Text>
                </View>
              </View>

              {/* threshold bar */}
              <View style={{ marginTop: spacing(4) }}>
                <View style={{ height: 8, backgroundColor: colors.surface, borderRadius: radii.pill, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ height: '100%', width: `${pct}%`, backgroundColor: tone, borderRadius: radii.pill }} />
                </View>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing(2) }]}>
                  {total} / {threshold} points required for eligibility
                </Text>
              </View>
            </View>

            {/* Table header */}
            <View style={{ flexDirection: 'row', paddingBottom: spacing(2), borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: spacing(2) }}>
              <Text style={[typography.caption, { color: colors.textMuted, flex: 1, fontWeight: '800', letterSpacing: 0.5 }]}>SUBJECT</Text>
              <Text style={[typography.caption, { color: colors.textMuted, width: 56, textAlign: 'center', fontWeight: '800', letterSpacing: 0.5 }]}>GRADE</Text>
              <Text style={[typography.caption, { color: colors.textMuted, width: 44, textAlign: 'right', fontWeight: '800', letterSpacing: 0.5 }]}>PTS</Text>
            </View>

            {(calculation?.bestRows ?? []).map((row) => (
              <View
                key={`${row.subject}-${row.grade}`}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(3), borderBottomWidth: 1, borderBottomColor: colors.divider }}
              >
                <View style={{ flex: 1, paddingRight: spacing(2) }}>
                  <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]} numberOfLines={2}>
                    {toTitle(row.subject)}
                  </Text>
                  {row.countsAs === 2 && (
                    <View style={{ alignSelf: 'flex-start', marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing(2), paddingVertical: 2, backgroundColor: `${colors.primary}1A`, borderRadius: radii.pill }}>
                      <Ionicons name="flask-outline" size={10} color={colors.primary} />
                      <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>Double ×2</Text>
                    </View>
                  )}
                </View>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary, width: 56, textAlign: 'center' }]}>
                  {row.grade}
                </Text>
                <Text style={[typography.bodyStrong, { color: colors.primary, width: 44, textAlign: 'right', fontSize: 17, fontWeight: '800' }]}>
                  {row.points}
                </Text>
              </View>
            ))}

            {/* CTA buttons */}
            <View style={{ gap: spacing(3), marginTop: spacing(5) }}>
              <Pressable
                onPress={() => { onClose(); router.push('/student/courses'); }}
                style={({ pressed }) => ({
                  height: 56, borderRadius: radii.xl,
                  backgroundColor: colors.primary,
                  flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
                  gap: spacing(2), opacity: pressed ? 0.9 : 1,
                  transform: pressed ? [{ scale: 0.99 }] : [],
                })}
              >
                <Ionicons name="school-outline" size={18} color="#fff" />
                <Text style={[typography.label, { color: '#fff', letterSpacing: 0.3 }]}>View Recommended Courses</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  height: 54, borderRadius: radii.xl,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1, borderColor: colors.border,
                  alignItems: 'center' as const, justifyContent: 'center' as const,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={[typography.label, { color: colors.textPrimary }]}>Close</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar panel (desktop only)
// ─────────────────────────────────────────────────────────────────────────────
function SidebarPanel({
  rows,
  missingSubjects,
  missingGrades,
  doubleAwardRowsCount,
  onAddRow,
  onReset,
}: {
  rows: ResultRow[];
  missingSubjects: number;
  missingGrades: number;
  doubleAwardRowsCount: number;
  onAddRow: () => void;
  onReset: () => void;
}) {
  const colors = useTheme();

  return (
    <View style={{ width: 320, flexShrink: 0, gap: spacing(5) }}>
      <Card accent={colors.primary}>
        <View style={{ padding: spacing(6), gap: spacing(4) }}>
          <Text style={[typography.h2, { color: colors.textPrimary }]}>Calculation Summary</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
            Best 6 subjects chosen automatically. Double Award counts as 2 slots.
          </Text>
          <View style={{ gap: spacing(3) }}>
            <StatCard icon="albums-outline"       label="Rows on screen"    value={`${rows.length}`} tone="primary" />
            <StatCard icon="close-circle-outline" label="Missing subjects"  value={`${missingSubjects}`} />
            <StatCard icon="warning-outline"      label="Missing grades"    value={`${missingGrades}`} />
            <StatCard icon="flask-outline"        label="Double Award rows" value={`${doubleAwardRowsCount}`} />
          </View>
          <View style={{ padding: spacing(4), backgroundColor: `${colors.primary}12`, borderRadius: radii.lg, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(2) }}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginTop: 1 }} />
              <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, lineHeight: 18 }]}>
                Changing a subject to Science Double Award resets its grade and uses the double-grade scale.
              </Text>
            </View>
          </View>
          <View style={{ gap: spacing(3) }}>
            <Pressable
              onPress={onAddRow}
              style={({ pressed }) => ({
                flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(3),
                padding: spacing(4), borderRadius: radii.lg,
                borderWidth: 1.5, borderColor: colors.primary,
                backgroundColor: `${colors.primary}14`,
                opacity: pressed ? 0.85 : 1, transform: pressed ? [{ scale: 0.98 }] : [],
              })}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={[typography.label, { color: colors.primary }]}>Add Subject</Text>
            </Pressable>
            <Pressable
              onPress={onReset}
              style={({ pressed }) => ({
                flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(3),
                padding: spacing(4), borderRadius: radii.lg,
                borderWidth: 1, borderColor: colors.border,
                backgroundColor: colors.surfaceAlt,
                opacity: pressed ? 0.85 : 1, transform: pressed ? [{ scale: 0.98 }] : [],
              })}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.textPrimary} />
              <Text style={[typography.label, { color: colors.textPrimary }]}>Reset to Defaults</Text>
            </Pressable>
          </View>
        </View>
      </Card>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile stat strip
// ─────────────────────────────────────────────────────────────────────────────
function MobileStatStrip({ level, track, requiredSlots, completedRows, total, allFilled }: any) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap', marginBottom: spacing(4) }}>
      <StatCard icon="school-outline"         label="Level"    value={level}            tone="primary"  compact />
      <StatCard icon="git-branch-outline"     label="Track"    value={track}                            compact />
      <StatCard icon="list-outline"           label="Required" value={`${requiredSlots}`}               compact />
      <StatCard icon="checkmark-done-outline" label="Done"     value={`${completedRows}/${total}`} tone={allFilled ? 'success' : 'neutral'} compact />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject Row (mobile)
// ─────────────────────────────────────────────────────────────────────────────
function SubjectRow({
  row,
  index,
  canRemove,
  colors,
  onSubjectChange,
  onGradePress,
  onRemove,
}: {
  row: ResultRow;
  index: number;
  canRemove: boolean;
  colors: any;
  onSubjectChange: (id: string, text: string) => void;
  onGradePress: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const isDouble    = isDoubleAward(row.subject);
  const hasSubject  = row.subject.trim().length > 0;
  const hasGrade    = row.grade !== '';
  const isComplete  = hasSubject && hasGrade;

  const statusColor = isDouble ? colors.primary : isComplete ? colors.success : colors.border;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.xl,
        borderWidth: 1.5,
        borderColor: isDouble
          ? `${colors.primary}55`
          : isComplete
          ? `${colors.success}55`
          : colors.border,
        marginBottom: spacing(3),
        overflow: 'hidden',
      }}
    >
      {/* left status spine */}
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 5, backgroundColor: statusColor }} />
        <View style={{ flex: 1 }}>
          {/* Row top bar */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing(4),
            paddingTop: spacing(3),
            paddingBottom: spacing(2),
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
              <View style={{
                width: 26, height: 26, borderRadius: 13,
                backgroundColor: isComplete ? `${colors.success}22` : `${colors.primary}18`,
                borderWidth: 1,
                borderColor: isComplete ? `${colors.success}55` : `${colors.primary}44`,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: isComplete ? colors.success : colors.primary }}>
                  {index + 1}
                </Text>
              </View>
              {isDouble && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing(2), paddingVertical: 3, backgroundColor: `${colors.primary}18`, borderRadius: radii.pill }}>
                  <Ionicons name="flask-outline" size={10} color={colors.primary} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>Double Award</Text>
                </View>
              )}
              {isComplete && !isDouble && (
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              )}
            </View>
            {canRemove && (
              <Pressable
                onPress={() => onRemove(row.id)}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 32, height: 32, borderRadius: radii.md,
                  backgroundColor: `${colors.danger}15`,
                  alignItems: 'center' as const, justifyContent: 'center' as const,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name="trash-outline" size={15} color={colors.danger} />
              </Pressable>
            )}
          </View>

          {/* Inputs */}
          <View style={{ paddingHorizontal: spacing(4), paddingBottom: spacing(4), gap: spacing(3) }}>
            <View>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing(1), letterSpacing: 0.4 }]}>
                SUBJECT
              </Text>
              <View style={{
                height: 52,
                paddingHorizontal: spacing(4),
                borderWidth: 1.5,
                borderRadius: radii.lg,
                borderColor: isDouble ? colors.primary : hasSubject ? `${colors.success}55` : colors.border,
                backgroundColor: colors.surfaceAlt,
                justifyContent: 'center',
              }}>
                <TextInput
                  value={row.subject}
                  onChangeText={(text) => onSubjectChange(row.id, text)}
                  placeholder="e.g. Mathematics"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}
                />
              </View>
            </View>

            <View>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing(1), letterSpacing: 0.4 }]}>
                GRADE
              </Text>
              <Pressable
                onPress={() => onGradePress(row.id)}
                style={({ pressed }) => ({
                  height: 52,
                  paddingHorizontal: spacing(4),
                  borderWidth: 1.5,
                  borderRadius: radii.lg,
                  borderColor: row.grade
                    ? isDouble ? colors.primary : `${colors.success}88`
                    : colors.border,
                  backgroundColor: row.grade
                    ? isDouble ? `${colors.primary}12` : `${colors.success}12`
                    : colors.surfaceAlt,
                  flexDirection: 'row' as const,
                  alignItems: 'center' as const,
                  justifyContent: 'space-between' as const,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={[
                  typography.bodyStrong,
                  {
                    color: row.grade ? colors.textPrimary : colors.textMuted,
                    fontSize: row.grade ? 17 : 14,
                    fontWeight: row.grade ? '800' : '500',
                  }
                ]}>
                  {row.grade || 'Tap to select grade'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
                  {row.grade ? (
                    <View style={{
                      paddingHorizontal: spacing(2), paddingVertical: 3,
                      backgroundColor: `${colors.success}22`,
                      borderRadius: radii.pill,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.success }}>SET</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Segmented selector pill
// ─────────────────────────────────────────────────────────────────────────────
function SegPill({
  label,
  active,
  onPress,
  fill,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  fill: boolean;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: fill ? 1 : 0,
        paddingVertical: spacing(3.5),
        paddingHorizontal: spacing(5),
        borderRadius: radii.pill,
        borderWidth: 1.5,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary : colors.surfaceAlt,
        alignItems: 'center' as const,
        opacity: pressed ? 0.85 : 1,
        transform: pressed ? [{ scale: 0.97 }] : [],
      })}
    >
      <Text style={[typography.label, { color: active ? '#fff' : colors.textPrimary, fontWeight: active ? '800' : '600' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main content
// ─────────────────────────────────────────────────────────────────────────────
function EnterResultsContent() {
  const { width } = useWindowDimensions();
  const colors    = useTheme();

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 768)  return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isMobile  = breakpoint === 'mobile';
  const isDesktop = breakpoint === 'desktop';

  // ── Form state ─────────────────────────────────────────────────────────────
  const [level, setLevel] = useState<Level>('BGCSE');
  const [track, setTrack] = useState<Track>('PURE');
  const [rows,  setRows]  = useState<ResultRow[]>(() => buildRows('BGCSE', 'PURE'));

  const [activeRowId,     setActiveRowId]     = useState<string | null>(null);
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [showResults,     setShowResults]     = useState(false);
  const [calculation,     setCalculation]     = useState<ReturnType<typeof pickBestSix> | null>(null);

  const activeRow            = useMemo(() => rows.find((r) => r.id === activeRowId) || null, [rows, activeRowId]);
  const availableTracks      = useMemo(() => allowedTracksForLevel(level), [level]);
  const requiredSlots        = useMemo(() => requiredSubjectSlots(level, track), [level, track]);
  const completedRows        = useMemo(() => rows.filter((r) => r.subject.trim() && r.grade !== '').length, [rows]);
  const missingSubjects      = useMemo(() => rows.filter((r) => !r.subject.trim()).length, [rows]);
  const missingGrades        = useMemo(() => rows.filter((r) => r.grade === '').length, [rows]);
  const allFilled            = useMemo(() => rows.length >= requiredSlots && rows.every((r) => r.subject.trim() && r.grade !== ''), [rows, requiredSlots]);
  const doubleAwardRowsCount = useMemo(() => rows.filter((r) => isDoubleAward(r.subject)).length, [rows]);

  const resetRowsFor = useCallback((l: Level, t: Track) => setRows(buildRows(l, t)), []);

  const handleLevelChange = useCallback((l: Level) => {
    const t = l === 'BGCSE' ? 'PURE' : 'ADVANCED';
    setLevel(l); setTrack(t); resetRowsFor(l, t);
  }, [resetRowsFor]);

  const handleTrackChange = useCallback((t: Track) => {
    setTrack(t); resetRowsFor(level, t);
  }, [level, resetRowsFor]);

  const handleAddRow = useCallback(() => {
    setRows((prev) => [...prev, { id: uid('extra'), subject: '', grade: '' }]);
  }, []);

  const handleRemoveRow = useCallback((id: string) => {
    setRows((prev) => prev.length > requiredSlots ? prev.filter((r) => r.id !== id) : prev);
  }, [requiredSlots]);

  const handleSubjectChange = useCallback((rowId: string, text: string) => {
    setRows((prev) => prev.map((row) => {
      if (row.id !== rowId) return row;
      const nextIsDouble = isDoubleAward(text);
      const prevIsDouble = isDoubleAward(row.subject);
      return nextIsDouble !== prevIsDouble ? { ...row, subject: text, grade: '' } : { ...row, subject: text };
    }));
  }, []);

  const handleGradePress = useCallback((id: string) => {
    setActiveRowId(id);
    setShowGradePicker(true);
  }, []);

  const handleGradeSelect = useCallback((grade: Grade) => {
    if (!activeRowId) return;
    setRows((prev) => prev.map((r) => r.id === activeRowId ? { ...r, grade } : r));
    setShowGradePicker(false);
    setActiveRowId(null);
  }, [activeRowId]);

  const handleClearAll = useCallback(() => resetRowsFor(level, track), [level, track, resetRowsFor]);

  const handleCalculate = useCallback(() => {
    if (!allFilled) {
      Alert.alert(
        'Incomplete Results',
        `Please complete all rows before calculating.\n\nMissing subjects: ${missingSubjects}\nMissing grades: ${missingGrades}`,
        [{ text: 'OK' }],
      );
      return;
    }
    setCalculation(pickBestSix(rows));
    setShowConfirm(true);
  }, [allFilled, missingSubjects, missingGrades, rows]);

  const confirmCalculation = useCallback(() => {
    setShowConfirm(false);
    setShowResults(true);
  }, []);

  // ── Hero card ──────────────────────────────────────────────────────────────
  const HeroCard = (
    <Card accent={colors.primary} style={{ marginBottom: spacing(5) }}>
      <View style={{ padding: isMobile ? spacing(5) : spacing(7) }}>
        <View style={{
          alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
          gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(2),
          borderRadius: radii.pill,
          backgroundColor: `${colors.primary}1A`, borderWidth: 1, borderColor: `${colors.primary}44`,
          marginBottom: spacing(3),
        }}>
          <Ionicons name="calculator-outline" size={12} color={colors.primary} />
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '800', letterSpacing: 0.6 }]}>
            RESULTS CALCULATOR
          </Text>
        </View>

        <Text style={{ fontSize: isMobile ? 26 : 36, lineHeight: isMobile ? 32 : 42, fontWeight: '900', color: colors.textPrimary }}>
          Enter Your Results
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2), lineHeight: 22, maxWidth: 560 }]}>
          {isMobile
            ? 'Choose your qualification, fill every subject, and calculate your best 6 points.'
            : 'Choose your qualification, complete every subject row, and calculate your best 6 points. Science Double Award is handled automatically.'}
        </Text>

        <View style={{
          alignSelf: 'flex-start', marginTop: spacing(4),
          flexDirection: 'row', alignItems: 'center', gap: spacing(2),
          paddingHorizontal: spacing(4), paddingVertical: spacing(2.5),
          borderRadius: radii.pill,
          backgroundColor: allFilled ? `${colors.success}1A` : `${colors.primary}1A`,
          borderWidth: 1, borderColor: allFilled ? `${colors.success}44` : `${colors.primary}44`,
        }}>
          <Ionicons
            name={allFilled ? 'checkmark-circle' : 'list-outline'}
            size={14}
            color={allFilled ? colors.success : colors.primary}
          />
          <Text style={[typography.label, { color: allFilled ? colors.success : colors.primary, fontSize: 13 }]}>
            {allFilled ? 'Ready to calculate' : `${completedRows} of ${rows.length} complete`}
          </Text>
        </View>

        {!isMobile && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3), marginTop: spacing(5) }}>
            <StatCard icon="school-outline"         label="Level"     value={level}                    tone="primary" />
            <StatCard icon="git-branch-outline"     label="Track"     value={track}                    />
            <StatCard icon="list-outline"           label="Required"  value={`${requiredSlots}`}       />
            <StatCard icon="checkmark-done-outline" label="Completed" value={`${completedRows}/${rows.length}`} tone={allFilled ? 'success' : 'neutral'} />
          </View>
        )}
      </View>
    </Card>
  );

  // ── Selector section ───────────────────────────────────────────────────────
  const SelectorSection = (
    <Card accent={colors.primary} style={{ marginBottom: spacing(5) }}>
      <View style={{ padding: isMobile ? spacing(5) : spacing(6) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(4) }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5 }]}>EXAM SETUP</Text>
            <Text style={[typography.h2, { color: colors.textPrimary, marginTop: spacing(1) }]}>
              Qualification & Track
            </Text>
          </View>
          {!isDesktop && (
            <Pressable
              onPress={handleClearAll}
              style={({ pressed }) => ({
                flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2),
                paddingHorizontal: spacing(3), paddingVertical: spacing(2.5),
                borderRadius: radii.lg,
                backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Ionicons name="refresh-outline" size={15} color={colors.textSecondary} />
              <Text style={[typography.label, { color: colors.textSecondary, fontSize: 12 }]}>Reset</Text>
            </Pressable>
          )}
        </View>

        <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(2) }]}>
          LEVEL
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing(3), marginBottom: spacing(5), flexWrap: 'wrap' }}>
          {(['BGCSE', 'IGCSE'] as const).map((l) => (
            <SegPill key={l} label={l} active={level === l} onPress={() => handleLevelChange(l)} fill={isMobile} colors={colors} />
          ))}
        </View>

        <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(2) }]}>
          TRACK
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing(3), marginBottom: spacing(5), flexWrap: 'wrap' }}>
          {availableTracks.map((t) => (
            <SegPill key={t} label={t} active={track === t} onPress={() => handleTrackChange(t)} fill={isMobile} colors={colors} />
          ))}
        </View>

        <View style={{ gap: spacing(3) }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3), padding: spacing(4), backgroundColor: `${colors.primary}10`, borderRadius: radii.lg, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginTop: 1, flexShrink: 0 }} />
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, lineHeight: 18 }]}>
              {requiredSlots} subject slots (incl. 4 optional). Best 6 used. Science Double Award counts as 2.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3), padding: spacing(4), backgroundColor: allFilled ? `${colors.success}10` : colors.surfaceAlt, borderRadius: radii.lg, borderLeftWidth: 3, borderLeftColor: allFilled ? colors.success : colors.border }}>
            <Ionicons name={allFilled ? 'checkmark-circle-outline' : 'list-outline'} size={16} color={allFilled ? colors.success : colors.textSecondary} style={{ marginTop: 1, flexShrink: 0 }} />
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, lineHeight: 18 }]}>
              {allFilled ? 'All rows complete — ready to calculate.' : `${completedRows} of ${rows.length} rows complete. Every row needs a subject and grade.`}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );

  // ── Subject table ──────────────────────────────────────────────────────────
  const SubjectTable = (
    <Card accent={colors.primary} style={{ marginBottom: spacing(5) }}>
      <View style={{ padding: isMobile ? spacing(4) : spacing(6) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(5) }}>
          <View>
            <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5 }]}>SUBJECTS & GRADES</Text>
            <Text style={[typography.h2, { color: colors.textPrimary, marginTop: spacing(1) }]}>
              Your Subjects
            </Text>
          </View>
          <View style={{
            paddingHorizontal: spacing(3.5), paddingVertical: spacing(2),
            borderRadius: radii.pill,
            backgroundColor: allFilled ? `${colors.success}1A` : `${colors.primary}1A`,
            borderWidth: 1,
            borderColor: allFilled ? `${colors.success}44` : `${colors.primary}44`,
          }}>
            <Text style={[typography.caption, {
              color: allFilled ? colors.success : colors.primary,
              fontWeight: '800',
            }]}>
              {completedRows}/{rows.length}
            </Text>
          </View>
        </View>

        {isMobile && (
          <>
            <MobileStatStrip
              level={level} track={track} requiredSlots={requiredSlots}
              completedRows={completedRows} total={rows.length}
              allFilled={allFilled}
            />
            <ProgressBar completed={completedRows} total={rows.length} colors={colors} />
          </>
        )}

        {!isMobile && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingHorizontal: spacing(1), marginBottom: spacing(3) }}>
            <View style={{ width: 34 }} />
            <Text style={[typography.caption, { color: colors.textMuted, flex: 1, letterSpacing: 0.5 }]}>SUBJECT</Text>
            <Text style={[typography.caption, { color: colors.textMuted, width: 132, textAlign: 'center', letterSpacing: 0.5 }]}>GRADE</Text>
            {rows.length > requiredSlots && <View style={{ width: 42 }} />}
          </View>
        )}

        {isMobile ? (
          <View>
            {rows.map((row, index) => (
              <SubjectRow
                key={row.id}
                row={row}
                index={index}
                canRemove={rows.length > requiredSlots}
                colors={colors}
                onSubjectChange={handleSubjectChange}
                onGradePress={handleGradePress}
                onRemove={handleRemoveRow}
              />
            ))}
          </View>
        ) : (
          <View style={{ gap: spacing(3) }}>
            {rows.map((row, index) => {
              const isDouble = isDoubleAward(row.subject);
              const complete = row.subject.trim() && row.grade !== '';
              return (
                <View
                  key={row.id}
                  style={{
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: radii.xl,
                    borderWidth: 1.5,
                    borderColor: isDouble ? `${colors.primary}55` : complete ? `${colors.success}44` : colors.border,
                    padding: spacing(3),
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: spacing(3),
                  }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: radii.pill, backgroundColor: complete ? `${colors.success}22` : `${colors.primary}1A`, borderWidth: 1, borderColor: complete ? `${colors.success}55` : `${colors.primary}44`, alignItems: 'center', justifyContent: 'center', marginTop: spacing(2) }}>
                    <Text style={[typography.caption, { color: complete ? colors.success : colors.primary, fontWeight: '800' }]}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ minHeight: 52, paddingHorizontal: spacing(3), paddingVertical: spacing(3), borderWidth: 1.5, borderRadius: radii.lg, borderColor: isDouble ? colors.primary : colors.border, backgroundColor: colors.surface, justifyContent: 'center' }}>
                      <TextInput
                        value={row.subject}
                        onChangeText={(text) => handleSubjectChange(row.id, text)}
                        placeholder={`Subject ${index + 1}`}
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="words"
                        autoCorrect={false}
                        style={[typography.bodyStrong, { color: colors.textPrimary }]}
                      />
                    </View>
                    {isDouble && (
                      <Text style={[typography.caption, { color: colors.primary, marginTop: spacing(2), fontWeight: '700' }]}>
                        Double Award — double-grade scale enabled.
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => handleGradePress(row.id)}
                    style={({ pressed }) => ({
                      width: 132, minHeight: 52, paddingHorizontal: spacing(3),
                      borderWidth: 1.5, borderRadius: radii.lg,
                      borderColor: row.grade ? (isDouble ? colors.primary : `${colors.success}88`) : colors.border,
                      backgroundColor: row.grade ? (isDouble ? `${colors.primary}12` : `${colors.success}10`) : colors.surface,
                      flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={[typography.bodyStrong, { color: row.grade ? colors.textPrimary : colors.textMuted, fontWeight: row.grade ? '800' : '500' }]}>
                      {row.grade || 'Grade'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                  </Pressable>
                  {rows.length > requiredSlots && (
                    <Pressable
                      onPress={() => handleRemoveRow(row.id)}
                      style={({ pressed }) => ({
                        width: 42, height: 42, borderRadius: radii.lg,
                        backgroundColor: `${colors.danger}1A`,
                        alignItems: 'center' as const, justifyContent: 'center' as const,
                        marginTop: spacing(1), opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {!isDesktop && (
          <View style={{ flexDirection: 'row', gap: spacing(3), marginTop: spacing(5) }}>
            <Pressable
              onPress={handleAddRow}
              style={({ pressed }) => ({
                flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
                gap: spacing(2), padding: spacing(4), borderRadius: radii.lg,
                borderWidth: 1.5, borderColor: colors.primary,
                backgroundColor: `${colors.primary}14`,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={[typography.label, { color: colors.primary }]}>Add Subject</Text>
            </Pressable>
            <Pressable
              onPress={handleClearAll}
              style={({ pressed }) => ({
                flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
                gap: spacing(2), padding: spacing(4), borderRadius: radii.lg,
                borderWidth: 1, borderColor: colors.border,
                backgroundColor: colors.surfaceAlt,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.textPrimary} />
              <Text style={[typography.label, { color: colors.textPrimary }]}>Reset</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          onPress={handleCalculate}
          disabled={!allFilled}
          style={({ pressed }) => ({
            marginTop: spacing(6),
            height: isMobile ? 62 : 58,
            borderRadius: radii.xl,
            backgroundColor: allFilled ? colors.primary : colors.surfaceAlt,
            borderWidth: 1,
            borderColor: allFilled ? colors.primary : colors.border,
            flexDirection: 'row' as const,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            gap: spacing(3),
            opacity: allFilled ? (pressed ? 0.9 : 1) : 0.5,
            transform: allFilled && pressed ? [{ scale: 0.99 }] : [],
          })}
        >
          <Ionicons name="calculator-outline" size={20} color={allFilled ? '#fff' : colors.textMuted} />
          <Text style={[typography.label, {
            color: allFilled ? '#fff' : colors.textMuted,
            letterSpacing: 0.8,
            fontSize: isMobile ? 15 : 14,
          }]}>
            CALCULATE POINTS
          </Text>
          {allFilled && (
            <View style={{ paddingHorizontal: spacing(2.5), paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: radii.pill }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>READY</Text>
            </View>
          )}
        </Pressable>
      </View>
    </Card>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <DashboardLayout
        title="Enter Results"
        subtitle="Calculate your best 6 subject points"
        showPointsCard={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(6) }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2),
              paddingHorizontal: spacing(4), paddingVertical: spacing(2.5),
              borderRadius: radii.lg,
              backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons name="arrow-back" size={17} color={colors.primary} />
            <Text style={[typography.label, { color: colors.primary }]}>Back</Text>
          </Pressable>
          <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
            Dashboard › Enter Results
          </Text>
        </View>

        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing(8), alignItems: 'flex-start' }}>
          <KeyboardAvoidingView
            style={{ flex: 1, minWidth: 0, width: isDesktop ? undefined : '100%' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {HeroCard}
            {SelectorSection}
            {SubjectTable}
          </KeyboardAvoidingView>

          {isDesktop && (
            <SidebarPanel
              rows={rows}
              missingSubjects={missingSubjects}
              missingGrades={missingGrades}
              doubleAwardRowsCount={doubleAwardRowsCount}
              onAddRow={handleAddRow}
              onReset={handleClearAll}
            />
          )}
        </View>
      </DashboardLayout>

      <GradePickerModal
        visible={showGradePicker}
        activeRow={activeRow}
        onSelect={handleGradeSelect}
        onClose={() => { setShowGradePicker(false); setActiveRowId(null); }}
      />
      <ConfirmModal
        visible={showConfirm}
        onConfirm={confirmCalculation}
        onClose={() => setShowConfirm(false)}
      />
      <ResultsModal
        visible={showResults}
        calculation={calculation}
        onClose={() => setShowResults(false)}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported screen
// ─────────────────────────────────────────────────────────────────────────────
export default function EnterResults() {
  return (
    <StudentMenuProvider>
      <EnterResultsContent />
    </StudentMenuProvider>
  );
}