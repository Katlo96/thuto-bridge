// app/student/academic-records.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
  ScrollView,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StudentMenuProvider, useStudentMenu } from '../../components/student/StudentMenu';

import {
  spacing,
  typography,
  radii,
  useTheme,
} from '../../components/student/DashboardLayout';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';
type SubjectGrade = 'A*' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'U';
type ExamBoard = 'BGCSE' | 'IGCSE' | 'AS Level' | 'A Level';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Subject = {
  id:       string;
  name:     string;
  grade:    SubjectGrade;
  points:   number;
  year:     string;
  board:    ExamBoard;
  category: 'Core' | 'Elective' | 'Additional';
};

type AcademicYear = {
  id:       string;
  label:    string;
  year:     string;
  board:    ExamBoard;
  subjects: Subject[];
  totalPoints: number;
  status:   'Verified' | 'Pending' | 'Draft';
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock data — realistic BGCSE results for a Botswana student
// ─────────────────────────────────────────────────────────────────────────────
const ACADEMIC_RECORDS: AcademicYear[] = [
  {
    id: '1',
    label: 'BGCSE Results',
    year: '2024',
    board: 'BGCSE',
    status: 'Verified',
    totalPoints: 38,
    subjects: [
      { id: 's1', name: 'English Language',      grade: 'B', points: 8, year: '2024', board: 'BGCSE', category: 'Core'     },
      { id: 's2', name: 'Mathematics',            grade: 'A', points: 9, year: '2024', board: 'BGCSE', category: 'Core'     },
      { id: 's3', name: 'Combined Science',       grade: 'B', points: 8, year: '2024', board: 'BGCSE', category: 'Core'     },
      { id: 's4', name: 'Setswana',               grade: 'A', points: 9, year: '2024', board: 'BGCSE', category: 'Core'     },
      { id: 's5', name: 'Computer Studies',       grade: 'A', points: 9, year: '2024', board: 'BGCSE', category: 'Elective' },
      { id: 's6', name: 'Business Studies',       grade: 'B', points: 8, year: '2024', board: 'BGCSE', category: 'Elective' },
      { id: 's7', name: 'Religious & Moral Edu.', grade: 'C', points: 7, year: '2024', board: 'BGCSE', category: 'Elective' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Grade config
// ─────────────────────────────────────────────────────────────────────────────
const GRADE_CFG: Record<SubjectGrade, { color: string; bg: string; label: string }> = {
  'A*': { color: '#60A5FA', bg: 'rgba(96,165,250,0.14)',  label: 'Distinction' },
  'A':  { color: '#34D399', bg: 'rgba(52,211,153,0.14)',  label: 'Excellent'   },
  'B':  { color: '#FBBF24', bg: 'rgba(251,191,36,0.14)',  label: 'Very Good'   },
  'C':  { color: '#F97316', bg: 'rgba(249,115,22,0.14)',  label: 'Good'        },
  'D':  { color: '#F472B6', bg: 'rgba(244,114,182,0.14)', label: 'Satisfactory'},
  'E':  { color: '#A78BFA', bg: 'rgba(167,139,250,0.14)', label: 'Pass'        },
  'F':  { color: '#94A3B8', bg: 'rgba(148,163,184,0.14)', label: 'Fail'        },
  'U':  { color: '#EF4444', bg: 'rgba(239,68,68,0.14)',   label: 'Ungraded'    },
};

const STATUS_CFG = {
  Verified: { color: '#34D399', bg: 'rgba(52,211,153,0.14)',  icon: 'shield-checkmark-outline' as const },
  Pending:  { color: '#FBBF24', bg: 'rgba(251,191,36,0.14)',  icon: 'time-outline'             as const },
  Draft:    { color: '#94A3B8', bg: 'rgba(148,163,184,0.14)', icon: 'document-outline'         as const },
};

const CATEGORY_CFG = {
  Core:       { color: '#60A5FA', icon: 'star-outline'     as const },
  Elective:   { color: '#34D399', icon: 'sparkles-outline' as const },
  Additional: { color: '#F472B6', icon: 'add-circle-outline' as const },
};

// ─────────────────────────────────────────────────────────────────────────────
// Elevation
// ─────────────────────────────────────────────────────────────────────────────
function useElevation(intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  return useMemo<ViewStyle>(() => {
    const opacity = 0.24;
    const radius  = intensity === 'sm' ? 6 : intensity === 'md' ? 14 : 22;
    const offsetY = intensity === 'sm' ? 2 : intensity === 'md' ? 5  : 10;
    return (Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: radius },
      android: { elevation: intensity === 'sm' ? 3 : intensity === 'md' ? 6 : 12 },
      web:     { boxShadow: `0 ${offsetY}px ${radius * 1.5}px rgba(0,0,0,${opacity})` } as any,
      default: {},
    }) ?? {}) as ViewStyle;
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard
// ─────────────────────────────────────────────────────────────────────────────
function SectionCard({
  title, icon, accentColor, children, compact, noPadding,
}: {
  title: string; icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string; children: React.ReactNode;
  compact?: boolean; noPadding?: boolean;
}) {
  const colors    = useTheme();
  const elevation = useElevation('md');
  const color     = accentColor ?? colors.primary;
  return (
    <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, elevation]}>
      <View style={{ height: 3, backgroundColor: color }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingHorizontal: compact ? spacing(4) : spacing(6), paddingTop: compact ? spacing(4) : spacing(5), paddingBottom: compact ? spacing(3) : spacing(4), borderBottomWidth: 1, borderBottomColor: colors.divider }}>
        <View style={{ width: compact ? 30 : 36, height: compact ? 30 : 36, borderRadius: radii.md, backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}44`, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={compact ? 14 : 16} color={color} />
        </View>
        <Text style={[typography.h2, { color: colors.textPrimary, fontSize: compact ? 14 : 16 }]}>{title}</Text>
      </View>
      {!noPadding && <View style={{ padding: compact ? spacing(4) : spacing(6) }}>{children}</View>}
      {noPadding && children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GradeBadge
// ─────────────────────────────────────────────────────────────────────────────
function GradeBadge({ grade, size = 'md' }: { grade: SubjectGrade; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = GRADE_CFG[grade];
  const dim = size === 'sm' ? 32 : size === 'md' ? 42 : 52;
  const fs  = size === 'sm' ? 12 : size === 'md' ? 16 : 22;
  return (
    <View style={{ width: dim, height: dim, borderRadius: dim / 2, backgroundColor: cfg.bg, borderWidth: 2, borderColor: `${cfg.color}55`, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: cfg.color, fontWeight: '900', fontSize: fs, letterSpacing: -0.5 }}>{grade}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PointsBar — visual bar for a subject's points out of 9
// ─────────────────────────────────────────────────────────────────────────────
function PointsBar({ points, color, compact }: { points: number; color: string; compact?: boolean }) {
  const colors = useTheme();
  const pct    = (points / 9) * 100;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
      <View style={{ flex: 1, height: compact ? 4 : 5, backgroundColor: colors.border, borderRadius: radii.pill, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: color, borderRadius: radii.pill }} />
      </View>
      <Text style={[typography.caption, { color, fontWeight: '700', fontSize: compact ? 10 : 11, minWidth: 14 }]}>{points}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SubjectRow
// ─────────────────────────────────────────────────────────────────────────────
function SubjectRow({ subject, compact, last }: { subject: Subject; compact?: boolean; last?: boolean }) {
  const colors  = useTheme();
  const gradeCfg = GRADE_CFG[subject.grade];
  const catCfg   = CATEGORY_CFG[subject.category];
  return (
    <View style={{ paddingVertical: compact ? spacing(3) : spacing(4), paddingHorizontal: compact ? spacing(4) : spacing(6), borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.divider }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(compact ? 3 : 4) }}>
        {/* Grade bubble */}
        <GradeBadge grade={subject.grade} size={compact ? 'sm' : 'md'} />

        {/* Name + category */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: compact ? 12 : 14, lineHeight: compact ? 17 : 20 }]} numberOfLines={1}>
            {subject.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1), marginTop: spacing(1) }}>
            <Ionicons name={catCfg.icon} size={compact ? 9 : 11} color={catCfg.color} />
            <Text style={[typography.caption, { color: catCfg.color, fontSize: compact ? 9 : 10, fontWeight: '600' }]}>{subject.category}</Text>
          </View>
        </View>

        {/* Points bar */}
        <View style={{ width: compact ? 70 : 90 }}>
          <PointsBar points={subject.points} color={gradeCfg.color} compact={compact} />
        </View>

        {/* Grade label pill */}
        <View style={{ paddingHorizontal: spacing(compact ? 2 : 3), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: gradeCfg.bg, borderWidth: 1, borderColor: `${gradeCfg.color}33` }}>
          <Text style={[typography.caption, { color: gradeCfg.color, fontWeight: '700', fontSize: compact ? 9 : 10 }]}>{gradeCfg.label}</Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ResultsCard — one exam sitting (BGCSE / JCE etc.)
// ─────────────────────────────────────────────────────────────────────────────
function ResultsCard({ record, compact }: { record: AcademicYear; compact?: boolean }) {
  const colors    = useTheme();
  const elevation = useElevation('md');
  const [expanded, setExpanded] = useState(record.id === '1'); // first open by default
  const statusCfg = STATUS_CFG[record.status];

  const gradeDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    record.subjects.forEach((s) => { dist[s.grade] = (dist[s.grade] || 0) + 1; });
    return dist;
  }, [record]);

  const bestGrade = useMemo(() => {
    const order: SubjectGrade[] = ['A*','A','B','C','D','E','F','U'];
    for (const g of order) {
      if (record.subjects.some((s) => s.grade === g)) return g;
    }
    return 'C' as SubjectGrade;
  }, [record]);

  return (
    <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, elevation]}>
      {/* Coloured top bar */}
      <View style={{ height: 4, backgroundColor: GRADE_CFG[bestGrade].color }} />

      {/* Header — always visible */}
      <Pressable
        onPress={() => setExpanded((p) => !p)}
        style={({ pressed }) => ({
          padding:   compact ? spacing(4) : spacing(6),
          opacity:   pressed ? 0.9 : 1,
          gap:       spacing(compact ? 3 : 4),
        })}
      >
        {/* Top row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing(3) }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.h2, { color: colors.textPrimary, fontSize: compact ? 15 : 18 }]}>{record.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginTop: spacing(1) }}>
              <Ionicons name="calendar-outline" size={compact ? 11 : 13} color={colors.textMuted} />
              <Text style={[typography.caption, { color: colors.textMuted, fontSize: compact ? 10 : 11 }]}>
                {record.year} · {record.board} · {record.subjects.length} subjects
              </Text>
            </View>
          </View>

          {/* Status + chevron */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
            <View style={{ paddingHorizontal: spacing(compact ? 2 : 3), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: statusCfg.bg, borderWidth: 1, borderColor: `${statusCfg.color}33` }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
                <Ionicons name={statusCfg.icon} size={compact ? 10 : 12} color={statusCfg.color} />
                <Text style={[typography.caption, { color: statusCfg.color, fontWeight: '700', fontSize: compact ? 9 : 10 }]}>{record.status}</Text>
              </View>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={compact ? 16 : 18}
              color={colors.textMuted}
            />
          </View>
        </View>

        {/* Stats strip */}
        <View style={{ flexDirection: 'row', gap: compact ? spacing(2) : spacing(3) }}>
          {/* Total points */}
          <View style={{ flex: 1, backgroundColor: `${colors.primary}0F`, borderRadius: radii.lg, borderWidth: 1, borderColor: `${colors.primary}22`, padding: compact ? spacing(3) : spacing(4), alignItems: 'center', gap: spacing(1) }}>
            <Text style={{ color: colors.primary, fontWeight: '900', fontSize: compact ? 20 : 26 }}>{record.totalPoints}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, fontSize: compact ? 9 : 10 }]}>TOTAL PTS</Text>
          </View>

          {/* Best grade */}
          <View style={{ flex: 1, backgroundColor: `${GRADE_CFG[bestGrade].color}0F`, borderRadius: radii.lg, borderWidth: 1, borderColor: `${GRADE_CFG[bestGrade].color}22`, padding: compact ? spacing(3) : spacing(4), alignItems: 'center', gap: spacing(1) }}>
            <Text style={{ color: GRADE_CFG[bestGrade].color, fontWeight: '900', fontSize: compact ? 20 : 26 }}>{bestGrade}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, fontSize: compact ? 9 : 10 }]}>BEST GRADE</Text>
          </View>

          {/* Subjects */}
          <View style={{ flex: 1, backgroundColor: `${colors.success}0F`, borderRadius: radii.lg, borderWidth: 1, borderColor: `${colors.success}22`, padding: compact ? spacing(3) : spacing(4), alignItems: 'center', gap: spacing(1) }}>
            <Text style={{ color: colors.success, fontWeight: '900', fontSize: compact ? 20 : 26 }}>{record.subjects.length}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, fontSize: compact ? 9 : 10 }]}>SUBJECTS</Text>
          </View>
        </View>

        {/* Grade distribution pills */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
          {Object.entries(gradeDistribution).map(([grade, count]) => {
            const cfg = GRADE_CFG[grade as SubjectGrade];
            return (
              <View key={grade} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1), paddingHorizontal: spacing(2), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: cfg.bg, borderWidth: 1, borderColor: `${cfg.color}33` }}>
                <Text style={[typography.caption, { color: cfg.color, fontWeight: '900', fontSize: compact ? 10 : 11 }]}>{grade}</Text>
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: cfg.color }} />
                <Text style={[typography.caption, { color: cfg.color, fontSize: compact ? 9 : 10 }]}>×{count}</Text>
              </View>
            );
          })}
        </View>
      </Pressable>

      {/* Subjects list — collapsible */}
      {expanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
          <View style={{ paddingHorizontal: compact ? spacing(4) : spacing(6), paddingVertical: spacing(2) }}>
            <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, fontSize: compact ? 9 : 10 }]}>
              SUBJECT BREAKDOWN
            </Text>
          </View>
          {record.subjects.map((subject, idx) => (
            <SubjectRow
              key={subject.id}
              subject={subject}
              compact={compact}
              last={idx === record.subjects.length - 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function SidebarPanel() {
  const colors = useTheme();

  const bgcse        = ACADEMIC_RECORDS[0];
  const allSubjects  = bgcse?.subjects ?? [];
  const totalPoints  = bgcse?.totalPoints ?? 0;
  const subjectCount = allSubjects.length;
  const avgPoints    = subjectCount > 0 ? (allSubjects.reduce((a, s) => a + s.points, 0) / subjectCount).toFixed(1) : '0';
  const eligible     = totalPoints >= 36;

  return (
    <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>

      {/* Summary */}
      <SectionCard title="Academic Summary" icon="analytics-outline" accentColor={colors.primary}>
        <View style={{ gap: spacing(3) }}>
          {[
            { icon: 'ribbon-outline'           as const, label: 'BGCSE Total Points',  value: `${totalPoints}`,   color: colors.primary },
            { icon: 'book-outline'             as const, label: 'Subjects Completed',  value: `${subjectCount}`,  color: '#34D399'      },
            { icon: 'trending-up-outline'      as const, label: 'Average Points',      value: `${avgPoints}/9`,   color: '#FBBF24'      },
            { icon: 'calendar-outline'         as const, label: 'Exam Year',           value: bgcse?.year ?? '2024', color: '#60A5FA'   },
          ].map(({ icon, label, value, color }) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing(2), borderBottomWidth: 1, borderBottomColor: colors.divider }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                <Ionicons name={icon} size={14} color={color} />
                <Text style={[typography.body, { color: colors.textSecondary, fontSize: 13 }]}>{label}</Text>
              </View>
              <Text style={[typography.bodyStrong, { color, fontSize: 13 }]}>{value}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      {/* Sponsorship eligibility */}
      <SectionCard title="Sponsorship Check" icon="cash-outline" accentColor={eligible ? '#34D399' : '#FBBF24'}>
        <View style={{ gap: spacing(4) }}>
          <View style={{ padding: spacing(4), backgroundColor: eligible ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)', borderRadius: radii.lg, borderWidth: 1, borderColor: eligible ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)', flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
            <Ionicons name={eligible ? 'checkmark-circle' : 'alert-circle'} size={22} color={eligible ? '#34D399' : '#FBBF24'} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyStrong, { color: eligible ? '#34D399' : '#FBBF24', fontSize: 13 }]}>
                {eligible ? 'Likely Eligible' : 'May Not Qualify'}
              </Text>
              <Text style={[typography.caption, { color: '#94A3B8', fontSize: 10, marginTop: 2 }]}>
                Gov. bursary requires 36+ pts
              </Text>
            </View>
          </View>

          {[
            { label: 'BURS Bursary',          req: '36 pts', met: totalPoints >= 36, color: '#60A5FA' },
            { label: 'Debswana Scholarship',   req: '40 pts', met: totalPoints >= 40, color: '#34D399' },
            { label: 'Standard Bank Bursary',  req: '34 pts', met: totalPoints >= 34, color: '#FBBF24' },
            { label: 'BIUST Merit Award',      req: '42 pts', met: totalPoints >= 42, color: '#F472B6' },
          ].map(({ label, req, met, color }) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
              <Ionicons name={met ? 'checkmark-circle-outline' : 'close-circle-outline'} size={16} color={met ? '#34D399' : '#94A3B8'} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.textPrimary, fontSize: 12 }]}>{label}</Text>
                <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10 }]}>Requires {req}</Text>
              </View>
              <Text style={[typography.caption, { color: met ? '#34D399' : '#94A3B8', fontWeight: '700', fontSize: 10 }]}>
                {met ? 'ELIGIBLE' : 'N/A'}
              </Text>
            </View>
          ))}
        </View>
      </SectionCard>

      {/* Quick actions */}
      <SectionCard title="Quick Actions" icon="flash-outline" accentColor="#FBBF24">
        <View style={{ gap: spacing(3) }}>
          {[
            { icon: 'cloud-upload-outline'  as const, label: 'Upload Results PDF',    color: colors.primary },
            { icon: 'calculator-outline'    as const, label: 'Calculate Points',       color: '#34D399'      },
            { icon: 'ribbon-outline'        as const, label: 'Check Scholarships',     color: '#FBBF24',     route: '/student/scholarships' },
            { icon: 'school-outline'        as const, label: 'Explore Universities',   color: '#60A5FA',     route: '/student/universities' },
          ].map(({ icon, label, color, route }) => (
            <Pressable
              key={label}
              onPress={() => route && router.push(route as any)}
              style={({ pressed }) => ({
                flexDirection:    'row' as const,
                alignItems:       'center' as const,
                gap:              spacing(3),
                paddingHorizontal: spacing(4),
                paddingVertical:  spacing(3),
                borderRadius:     radii.lg,
                borderWidth:      1,
                borderColor:      colors.border,
                backgroundColor:  colors.surfaceAlt,
                opacity:          pressed ? 0.82 : 1,
                transform:        pressed ? [{ scale: 0.98 }] : [],
              })}
            >
              <View style={{ width: 32, height: 32, borderRadius: radii.md, backgroundColor: `${color}18`, borderWidth: 1, borderColor: `${color}33`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={15} color={color} />
              </View>
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1, fontSize: 13 }]}>{label}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </SectionCard>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
function AcademicRecordsContent() {
  const { width }    = useWindowDimensions();
  const colors       = useTheme();
  const { openMenu } = useStudentMenu();
  const elevMd       = useElevation('md');
  const elevLg       = useElevation('lg');

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 768)  return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const isMobile  = breakpoint === 'mobile';
  const compact   = isMobile;
  const padX      = compact ? spacing(4) : spacing(7);

  // Overall stats for hero
  const bgcse         = ACADEMIC_RECORDS[0];
  const totalPoints   = bgcse?.totalPoints ?? 0;
  const subjectCount  = bgcse?.subjects.length ?? 0;
  const eligible      = totalPoints >= 36;

  // NavBar ────────────────────────────────────────────────────────────────────
  const NavBar = (
    <View style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: padX, paddingVertical: spacing(compact ? 3 : 4), backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing(3) }, elevMd]}>
      <Pressable onPress={() => router.back()} style={({ pressed }) => ({ width: compact ? 38 : 44, height: compact ? 38 : 44, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const, opacity: pressed ? 0.8 : 1 })}>
        <Ionicons name="arrow-back" size={compact ? 18 : 20} color={colors.primary} />
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text style={[typography.h2, { color: colors.textPrimary, fontSize: compact ? 15 : undefined }]}>Academic Records</Text>
        {!compact && <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>Your verified results and academic history</Text>}
      </View>

      {!compact && (
        <Pressable onPress={() => router.push('/student/profile' as any)} style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 })}>
          <Ionicons name="person-outline" size={15} color={colors.textSecondary} />
          <Text style={[typography.label, { color: colors.textSecondary, fontSize: 12 }]}>Profile</Text>
        </Pressable>
      )}

      <Pressable onPress={openMenu} style={({ pressed }) => ({ width: compact ? 38 : 44, height: compact ? 38 : 44, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const, opacity: pressed ? 0.8 : 1 })}>
        <Ionicons name="menu" size={compact ? 20 : 22} color={colors.textPrimary} />
      </Pressable>
    </View>
  );

  // Hero card ─────────────────────────────────────────────────────────────────
  const HeroCard = (
    <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing(compact ? 5 : 7) }, elevLg]}>
      <View style={{ height: 4, backgroundColor: colors.primary }} />
      <View style={{ padding: compact ? spacing(4) : spacing(7) }}>

        {/* Badge + heading */}
        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: `${colors.primary}22`, borderWidth: 1, borderColor: `${colors.primary}44`, marginBottom: spacing(compact ? 3 : 4) }}>
          <Ionicons name="school-outline" size={compact ? 11 : 13} color={colors.primary} />
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', fontSize: compact ? 10 : undefined }]}>ACADEMIC RECORDS</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: compact ? 'flex-start' : 'center', justifyContent: 'space-between', gap: spacing(4) }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.hero, { color: colors.textPrimary, fontSize: compact ? 20 : undefined, lineHeight: compact ? 26 : undefined }]}>
              Your Results
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2), lineHeight: compact ? 20 : 24, fontSize: compact ? 13 : undefined, maxWidth: 480 }]}>
              View your BGCSE and JCE results, track your academic progress, and check sponsorship eligibility across all your subjects.
            </Text>
          </View>

          {/* Points badge — desktop/tablet */}
          {!compact && (
            <View style={{ alignItems: 'center', gap: spacing(2), padding: spacing(5), backgroundColor: `${colors.primary}0F`, borderRadius: radii.xxl, borderWidth: 1, borderColor: `${colors.primary}22`, flexShrink: 0 }}>
              <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 40, lineHeight: 44 }}>{totalPoints}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11, letterSpacing: 0.5 }]}>BGCSE POINTS</Text>
            </View>
          )}
        </View>

        <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: compact ? spacing(4) : spacing(5) }} />

        {/* Key stat tiles */}
        <View style={{ flexDirection: 'row', gap: compact ? spacing(2) : spacing(3) }}>
          {[
            { icon: 'ribbon-outline'          as const, label: 'BGCSE Points',   value: `${totalPoints}`,  color: colors.primary  },
            { icon: 'book-outline'            as const, label: 'Subjects',       value: `${subjectCount}`, color: '#34D399'       },
            { icon: 'calendar-outline'        as const, label: 'Year',           value: bgcse?.year ?? '2024',        color: '#FBBF24' },
            { icon: 'cash-outline'            as const, label: 'Sponsorship',    value: eligible ? 'Eligible' : 'Check', color: eligible ? '#34D399' : '#FBBF24' },
          ].map(({ icon, label, value, color }) => (
            <View key={label} style={{ flex: 1, backgroundColor: `${color}0F`, borderRadius: radii.lg, borderWidth: 1, borderColor: `${color}22`, padding: compact ? spacing(2) : spacing(4), alignItems: 'center', gap: spacing(1) }}>
              <Ionicons name={icon} size={compact ? 14 : 18} color={color} />
              <Text style={{ color, fontWeight: '900', fontSize: compact ? 13 : 18 }}>{value}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, fontSize: compact ? 8 : 10, textAlign: 'center' }]} numberOfLines={1}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  // Mobile sponsorship strip ──────────────────────────────────────────────────
  const MobileSponsorStrip = compact && (
    <View style={{ marginBottom: spacing(4), padding: spacing(3), backgroundColor: eligible ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)', borderRadius: radii.xl, borderWidth: 1, borderColor: eligible ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)', flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
      <Ionicons name={eligible ? 'checkmark-circle' : 'alert-circle'} size={20} color={eligible ? '#34D399' : '#FBBF24'} />
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: eligible ? '#34D399' : '#FBBF24', fontSize: 12 }]}>
          {eligible ? `${totalPoints} points — Likely Eligible for Sponsorship` : `${totalPoints} points — Check Sponsorship Requirements`}
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10 }]}>Government bursary requires 36+ points</Text>
      </View>
    </View>
  );

  // Grade key (mobile only) ───────────────────────────────────────────────────
  const GradeKey = compact && (
    <View style={{ marginBottom: spacing(4), backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: spacing(3) }}>
      <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, fontSize: 9, marginBottom: spacing(2) }]}>GRADE REFERENCE</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
        {(['A*','A','B','C','D'] as SubjectGrade[]).map((g) => {
          const cfg = GRADE_CFG[g];
          return (
            <View key={g} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1), paddingHorizontal: spacing(2), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: cfg.bg }}>
              <Text style={{ color: cfg.color, fontWeight: '900', fontSize: 10 }}>{g}</Text>
              <Text style={[typography.caption, { color: cfg.color, fontSize: 9 }]}>{cfg.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {NavBar}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(12) }}>
          <View style={{ paddingHorizontal: padX, paddingTop: spacing(compact ? 5 : 7), maxWidth: 1280, alignSelf: 'center', width: '100%' }}>

            {/* Breadcrumb */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(compact ? 4 : 6) }}>
              <Pressable onPress={() => router.back()} style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(compact ? 3 : 4), paddingVertical: spacing(2), borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 })}>
                <Ionicons name="arrow-back" size={compact ? 14 : 16} color={colors.primary} />
                <Text style={[typography.label, { color: colors.primary, fontSize: compact ? 12 : undefined }]}>Back</Text>
              </Pressable>
              <Text style={[typography.caption, { color: colors.textMuted, flex: 1, fontSize: compact ? 10 : undefined }]} numberOfLines={1}>
                Profile › Academic Records
              </Text>
            </View>

            {/* Hero */}
            {HeroCard}

            {/* Two-column layout */}
            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: compact ? spacing(5) : spacing(8), alignItems: 'flex-start' }}>

              {/* Main column */}
              <View style={{ flex: 1, minWidth: 0, gap: compact ? spacing(4) : spacing(6) }}>

                {MobileSponsorStrip}
                {GradeKey}

                <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, fontSize: compact ? 10 : undefined }]}>
                  BGCSE RESULTS · {bgcse?.subjects.length ?? 0} SUBJECTS
                </Text>

                {ACADEMIC_RECORDS.map((record) => (
                  <ResultsCard key={record.id} record={record} compact={compact} />
                ))}

                {/* Upload CTA */}
                <Pressable
                  style={({ pressed }) => ({
                    flexDirection:   'row' as const,
                    alignItems:      'center' as const,
                    justifyContent:  'center' as const,
                    gap:             spacing(3),
                    padding:         compact ? spacing(4) : spacing(5),
                    borderRadius:    radii.xxl,
                    borderWidth:     2,
                    borderColor:     `${colors.primary}44`,
                    borderStyle:     'dashed' as const,
                    backgroundColor: `${colors.primary}08`,
                    opacity:         pressed ? 0.8 : 1,
                  })}
                >
                  <View style={{ width: 40, height: 40, borderRadius: radii.lg, backgroundColor: `${colors.primary}22`, borderWidth: 1, borderColor: `${colors.primary}44`, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[typography.bodyStrong, { color: colors.primary, fontSize: compact ? 13 : undefined }]}>Upload Results PDF</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, fontSize: compact ? 10 : undefined }]}>Add your official results document</Text>
                  </View>
                </Pressable>
              </View>

              {/* Sidebar — desktop only */}
              {isDesktop && <SidebarPanel />}
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
export default function AcademicRecordsScreen() {
  return (
    <StudentMenuProvider>
      <AcademicRecordsContent />
    </StudentMenuProvider>
  );
}