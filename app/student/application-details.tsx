// app/student/application-details.tsx
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import DashboardLayout, { spacing, typography, useTheme, radii } from '../../components/student/DashboardLayout';
import { StudentMenuProvider } from '../../components/student/StudentMenu';

// ──────────────────────────────────────────────────────────────────────────────
// Types & Data
// ──────────────────────────────────────────────────────────────────────────────
type AppStatus    = 'Accepted' | 'Rejected' | 'Submitted' | 'Under review' | 'Draft';
type ChecklistKey = 'submitted_form' | 'uploaded_certificate' | 'sent_reference_letters';

type ApplicationDetails = {
  id: string;
  university: string;
  program: string;
  date: string;
  status: AppStatus;
  deadline: string;
  checklist: Record<ChecklistKey, boolean>;
  notes: string;
};

const APPLICATION_DB: Record<string, ApplicationDetails> = {
  '1': {
    id: '1',
    university: 'University of Botswana',
    program: 'BSc Computer Science',
    date: 'Submitted March 15, 2026',
    status: 'Under review',
    deadline: '30 May 2026',
    checklist: {
      submitted_form:          true,
      uploaded_certificate:    false,
      sent_reference_letters:  false,
    },
    notes: 'Remember to upload certificate by April 10. Follow up on reference letters.',
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Status config
// ──────────────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<AppStatus, { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Accepted:       { bg: 'rgba(52,211,153,0.16)',  text: '#34D399', icon: 'checkmark-circle-outline' },
  Rejected:       { bg: 'rgba(239,68,68,0.16)',   text: '#EF4444', icon: 'close-circle-outline'     },
  Submitted:      { bg: 'rgba(59,130,246,0.16)',  text: '#3B82F6', icon: 'paper-plane-outline'      },
  'Under review': { bg: 'rgba(251,191,36,0.16)',  text: '#FBBF24', icon: 'time-outline'             },
  Draft:          { bg: 'rgba(148,163,184,0.16)', text: '#94A3B8', icon: 'document-outline'         },
};

const CHECKLIST_LABELS: Record<ChecklistKey, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  submitted_form:         { label: 'Application Form Submitted',  icon: 'document-text-outline'  },
  uploaded_certificate:   { label: 'Certificate Uploaded',        icon: 'cloud-upload-outline'   },
  sent_reference_letters: { label: 'Reference Letters Sent',      icon: 'mail-outline'           },
};

// ──────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ──────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: AppStatus }) {
  const colors = useTheme();
  const cfg    = STATUS_CFG[status];
  return (
    <View style={{
      flexDirection:    'row',
      alignItems:       'center',
      gap:              spacing(2),
      paddingHorizontal: spacing(3),
      paddingVertical:  spacing(2),
      backgroundColor:  cfg.bg,
      borderRadius:     radii.pill,
      borderWidth:      1,
      borderColor:      `${cfg.text}44`,
      alignSelf:        'flex-start',
    }}>
      <Ionicons name={cfg.icon} size={14} color={cfg.text} />
      <Text style={[typography.label, { color: cfg.text, fontWeight: '700', fontSize: 12 }]}>
        {status}
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MetaCard — a single stat tile
// ──────────────────────────────────────────────────────────────────────────────
function MetaCard({
  icon,
  label,
  value,
  accent,
  compact,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent?: string;
  compact?: boolean;
}) {
  const colors = useTheme();
  const color  = accent ?? colors.primary;
  return (
    <View style={{
      flex:            1,
      minWidth:        compact ? 90 : 110,
      backgroundColor: `${color}0F`,
      borderRadius:    radii.xl,
      borderWidth:     1,
      borderColor:     `${color}22`,
      padding:         compact ? spacing(3) : spacing(4),
      gap:             spacing(2),
    }}>
      <View style={{
        width:           compact ? 30 : 36,
        height:          compact ? 30 : 36,
        borderRadius:    radii.md,
        backgroundColor: `${color}22`,
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <Ionicons name={icon} size={compact ? 14 : 17} color={color} />
      </View>
      <Text style={[typography.caption, { color: colors.textSecondary, fontSize: compact ? 9 : 10, letterSpacing: 0.3 }]}>
        {label.toUpperCase()}
      </Text>
      <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: compact ? 12 : 13, lineHeight: compact ? 16 : 18 }]}>
        {value}
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ProgressRing — simple linear progress bar
// ──────────────────────────────────────────────────────────────────────────────
function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const colors  = useTheme();
  const pct     = total === 0 ? 0 : completed / total;
  const color   = pct === 1 ? '#34D399' : pct > 0.5 ? '#FBBF24' : colors.primary;
  return (
    <View style={{ gap: spacing(2) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>
          Checklist progress
        </Text>
        <Text style={[typography.label, { color, fontSize: 12, fontWeight: '700' }]}>
          {completed}/{total} done
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: colors.surfaceAlt, borderRadius: radii.pill, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%` as any, height: '100%', backgroundColor: color, borderRadius: radii.pill }} />
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ChecklistRow
// ──────────────────────────────────────────────────────────────────────────────
function ChecklistRow({
  label,
  icon,
  checked,
  onToggle,
  compact,
}: {
  label:    string;
  icon:     keyof typeof Ionicons.glyphMap;
  checked:  boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => ({
        flexDirection:    'row',
        alignItems:       'center',
        gap:              spacing(3),
        paddingVertical:  compact ? spacing(3) : spacing(4),
        paddingHorizontal: compact ? spacing(3) : spacing(4),
        borderRadius:     radii.lg,
        backgroundColor:  checked ? `${colors.primary}0F` : colors.surfaceAlt,
        borderWidth:      1,
        borderColor:      checked ? `${colors.primary}33` : colors.border,
        opacity:          pressed ? 0.82 : 1,
        transform:        pressed ? [{ scale: 0.99 }] : [],
      })}
    >
      {/* Icon */}
      <View style={{
        width:           compact ? 28 : 34,
        height:          compact ? 28 : 34,
        borderRadius:    radii.md,
        backgroundColor: checked ? `${colors.primary}22` : colors.surfaceAlt,
        borderWidth:     1,
        borderColor:     checked ? `${colors.primary}44` : colors.border,
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
      }}>
        <Ionicons name={icon} size={compact ? 13 : 15} color={checked ? colors.primary : colors.textMuted} />
      </View>

      {/* Label */}
      <Text style={[
        typography.body,
        {
          color:      checked ? colors.textPrimary : colors.textSecondary,
          flex:       1,
          fontSize:   compact ? 12 : 14,
          lineHeight: compact ? 17 : 20,
          textDecorationLine: checked ? 'line-through' : 'none',
        },
      ]}>
        {label}
      </Text>

      {/* Checkbox */}
      <View style={{
        width:           compact ? 20 : 24,
        height:          compact ? 20 : 24,
        borderRadius:    radii.sm,
        alignItems:      'center',
        justifyContent:  'center',
        borderWidth:     2,
        borderColor:     checked ? colors.primary : colors.border,
        backgroundColor: checked ? colors.primary : 'transparent',
        flexShrink:      0,
      }}>
        {checked && <Ionicons name="checkmark" size={compact ? 12 : 14} color="#fff" />}
      </View>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// NextStepRow
// ──────────────────────────────────────────────────────────────────────────────
function NextStepRow({ step, index, compact }: { step: string; index: number; compact?: boolean }) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3) }}>
      <View style={{
        width:           compact ? 22 : 26,
        height:          compact ? 22 : 26,
        borderRadius:    13,
        backgroundColor: `${colors.primary}22`,
        borderWidth:     1,
        borderColor:     `${colors.primary}44`,
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
        marginTop:       2,
      }}>
        <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', fontSize: compact ? 9 : 11 }]}>
          {index + 1}
        </Text>
      </View>
      <Text style={[typography.body, { color: colors.textSecondary, flex: 1, fontSize: compact ? 12 : 14, lineHeight: compact ? 18 : 22 }]}>
        {step}
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SectionCard — themed card container
// ──────────────────────────────────────────────────────────────────────────────
function SectionCard({
  title,
  icon,
  children,
  accentColor,
  compact,
}: {
  title:        string;
  icon:         keyof typeof Ionicons.glyphMap;
  children:     React.ReactNode;
  accentColor?: string;
  compact?:     boolean;
}) {
  const colors = useTheme();
  const color  = accentColor ?? colors.primary;
  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius:    radii.xxl,
      borderWidth:     1,
      borderColor:     colors.border,
      overflow:        'hidden',
      ...Platform.select({
        ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12 },
        android: { elevation: 4 },
        web:     { boxShadow: '0 4px 20px rgba(0,0,0,0.18)' } as any,
        default: {},
      }),
    }}>
      {/* Accent top bar */}
      <View style={{ height: 3, backgroundColor: color }} />

      {/* Header */}
      <View style={{
        flexDirection:  'row',
        alignItems:     'center',
        gap:            spacing(3),
        paddingHorizontal: compact ? spacing(4) : spacing(6),
        paddingTop:     compact ? spacing(4) : spacing(5),
        paddingBottom:  compact ? spacing(3) : spacing(4),
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}>
        <View style={{
          width:           compact ? 28 : 34,
          height:          compact ? 28 : 34,
          borderRadius:    radii.md,
          backgroundColor: `${color}22`,
          borderWidth:     1,
          borderColor:     `${color}44`,
          alignItems:      'center',
          justifyContent:  'center',
        }}>
          <Ionicons name={icon} size={compact ? 14 : 16} color={color} />
        </View>
        <Text style={[typography.h2, { color: colors.textPrimary, fontSize: compact ? 14 : 16 }]}>
          {title}
        </Text>
      </View>

      {/* Body */}
      <View style={{ padding: compact ? spacing(4) : spacing(6) }}>
        {children}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────────────────────────────────────
function ApplicationDetailsContent() {
  const colors       = useTheme();
  const { width }    = useWindowDimensions();
  const isMobile     = width < 768;
  const isTablet     = width >= 768 && width < 1024;
  const isDesktop    = width >= 1024;
  const compact      = isMobile;

  const params = useLocalSearchParams();
  const id     = typeof params.id === 'string' ? params.id : '1';
  const app    = APPLICATION_DB[id] ?? APPLICATION_DB['1'];

  const [notes,              setNotes]              = useState(app.notes);
  const [checklist,          setChecklist]          = useState(app.checklist);
  const [applyModalVisible,  setApplyModalVisible]  = useState(false);
  const [applyNote,          setApplyNote]          = useState('');

  const completed = Object.values(checklist).filter(Boolean).length;
  const total     = Object.keys(checklist).length;
  const cfg       = STATUS_CFG[app.status];

  const handleToggle = useCallback((key: ChecklistKey) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSave = useCallback(() => {
    Alert.alert('Saved', 'Changes have been saved successfully.');
  }, []);

  const handleConfirmApply = useCallback(() => {
    setApplyModalVisible(false);
    Alert.alert('Opening Portal', 'Redirecting to application portal...');
  }, []);

  const NEXT_STEPS = [
    'Ensure all checklist items are complete before the deadline.',
    'Review your notes and prepare any missing documents.',
    'Open the university portal to submit or check your application status.',
  ];

  return (
    <DashboardLayout
      title="Application Details"
      subtitle={`${app.program} · ${app.university}`}
      showPointsCard={false}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing(24) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: compact ? spacing(5) : spacing(7) }}>

          {/* ── Back + breadcrumb ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection:    'row'    as const,
                alignItems:       'center' as const,
                gap:              spacing(2),
                paddingHorizontal: spacing(compact ? 3 : 4),
                paddingVertical:  spacing(2),
                borderRadius:     radii.lg,
                backgroundColor:  colors.surfaceAlt,
                borderWidth:      1,
                borderColor:      colors.border,
                opacity:          pressed ? 0.8 : 1,
              })}
            >
              <Ionicons name="arrow-back" size={compact ? 15 : 17} color={colors.primary} />
              <Text style={[typography.label, { color: colors.primary, fontSize: compact ? 12 : undefined }]}>
                Back
              </Text>
            </Pressable>
            <Text style={[typography.caption, { color: colors.textMuted, flex: 1, fontSize: compact ? 10 : undefined }]} numberOfLines={1}>
              Applications › Details
            </Text>
          </View>

          {/* ── Hero Card ── */}
          <View style={{
            backgroundColor: colors.surface,
            borderRadius:    radii.xxl,
            borderWidth:     1,
            borderColor:     colors.border,
            overflow:        'hidden',
            ...Platform.select({
              ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 16 },
              android: { elevation: 6 },
              web:     { boxShadow: '0 6px 28px rgba(0,0,0,0.22)' } as any,
              default: {},
            }),
          }}>
            {/* Gradient-style accent bar */}
            <View style={{ height: 4, backgroundColor: cfg.text }} />

            <View style={{ padding: compact ? spacing(4) : spacing(7), gap: compact ? spacing(4) : spacing(6) }}>
              {/* Title row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing(3) }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.h1, { color: colors.textPrimary, fontSize: compact ? 18 : 24, lineHeight: compact ? 24 : 30 }]}>
                    {app.program}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginTop: spacing(2) }}>
                    <Ionicons name="school-outline" size={compact ? 12 : 14} color={colors.textSecondary} />
                    <Text style={[typography.body, { color: colors.textSecondary, fontSize: compact ? 12 : undefined }]}>
                      {app.university}
                    </Text>
                  </View>
                </View>
                <StatusBadge status={app.status} />
              </View>

              {/* Progress bar */}
              <ProgressBar completed={completed} total={total} />

              {/* Meta cards row */}
              <View style={{ flexDirection: 'row', gap: compact ? spacing(2) : spacing(3), flexWrap: 'wrap' }}>
                <MetaCard
                  icon="calendar-outline"
                  label="Submitted"
                  value={app.date.replace('Submitted ', '')}
                  accent={colors.primary}
                  compact={compact}
                />
                <MetaCard
                  icon="time-outline"
                  label="Deadline"
                  value={app.deadline}
                  accent="#FBBF24"
                  compact={compact}
                />
                <MetaCard
                  icon="checkbox-outline"
                  label="Progress"
                  value={`${completed} of ${total}`}
                  accent={completed === total ? '#34D399' : colors.primary}
                  compact={compact}
                />
              </View>
            </View>
          </View>

          {/* ── Main two-column area (desktop) or stacked (mobile/tablet) ── */}
          <View style={{
            flexDirection: isDesktop ? 'row' : 'column',
            gap:           compact ? spacing(5) : spacing(7),
            alignItems:    'flex-start',
          }}>
            {/* Left / main column */}
            <View style={{ flex: isDesktop ? 1 : undefined, gap: compact ? spacing(5) : spacing(7), minWidth: 0, width: isDesktop ? undefined : '100%' }}>

              {/* Checklist */}
              <SectionCard
                title="Application Checklist"
                icon="checkbox-outline"
                accentColor={colors.primary}
                compact={compact}
              >
                <View style={{ gap: compact ? spacing(2) : spacing(3) }}>
                  {(Object.entries(checklist) as [ChecklistKey, boolean][]).map(([key, checked]) => (
                    <ChecklistRow
                      key={key}
                      label={CHECKLIST_LABELS[key].label}
                      icon={CHECKLIST_LABELS[key].icon}
                      checked={checked}
                      onToggle={() => handleToggle(key)}
                      compact={compact}
                    />
                  ))}
                </View>

                {/* Completion callout */}
                {completed === total && (
                  <View style={{
                    marginTop:       spacing(4),
                    flexDirection:   'row',
                    alignItems:      'center',
                    gap:             spacing(3),
                    padding:         compact ? spacing(3) : spacing(4),
                    backgroundColor: 'rgba(52,211,153,0.12)',
                    borderRadius:    radii.lg,
                    borderWidth:     1,
                    borderColor:     'rgba(52,211,153,0.3)',
                  }}>
                    <Ionicons name="checkmark-circle" size={compact ? 18 : 22} color="#34D399" />
                    <Text style={[typography.body, { color: '#34D399', fontWeight: '600', fontSize: compact ? 12 : undefined }]}>
                      All items complete — you're ready to submit!
                    </Text>
                  </View>
                )}
              </SectionCard>

              {/* Notes */}
              <SectionCard
                title="My Notes"
                icon="create-outline"
                accentColor="#A78BFA"
                compact={compact}
              >
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholder="Add your notes here…"
                  placeholderTextColor={colors.textMuted}
                  style={{
                    minHeight:         compact ? 90 : 120,
                    borderRadius:      radii.lg,
                    borderWidth:       1,
                    borderColor:       colors.border,
                    padding:           compact ? spacing(3) : spacing(4),
                    backgroundColor:   colors.surfaceAlt,
                    color:             colors.textPrimary,
                    textAlignVertical: 'top' as const,
                    fontSize:          compact ? 13 : 15,
                    lineHeight:        compact ? 20 : 24,
                  }}
                />
              </SectionCard>
            </View>

            {/* Right / secondary column */}
            <View style={{ width: isDesktop ? 300 : '100%', flexShrink: 0, gap: compact ? spacing(5) : spacing(7) }}>

              {/* Next Steps */}
              <SectionCard
                title="Next Steps"
                icon="arrow-forward-circle-outline"
                accentColor="#FBBF24"
                compact={compact}
              >
                <View style={{ gap: compact ? spacing(3) : spacing(4) }}>
                  {NEXT_STEPS.map((step, i) => (
                    <NextStepRow key={i} step={step} index={i} compact={compact} />
                  ))}
                </View>
              </SectionCard>

              {/* Quick info panel */}
              <SectionCard
                title="Application Info"
                icon="information-circle-outline"
                accentColor="#34D399"
                compact={compact}
              >
                <View style={{ gap: compact ? spacing(3) : spacing(4) }}>
                  {[
                    { label: 'Application ID',  value: `#APP-${app.id.padStart(4, '0')}`, icon: 'barcode-outline'    as const },
                    { label: 'Institution',      value: app.university,                     icon: 'school-outline'     as const },
                    { label: 'Programme',        value: app.program,                        icon: 'book-outline'       as const },
                    { label: 'Status',           value: app.status,                         icon: 'pulse-outline'      as const },
                    { label: 'Deadline',         value: app.deadline,                       icon: 'alarm-outline'      as const },
                  ].map(({ label, value, icon }) => (
                    <View key={label} style={{
                      flexDirection:  'row',
                      alignItems:     'flex-start',
                      gap:            spacing(3),
                      paddingVertical: spacing(2),
                      borderBottomWidth: 1,
                      borderBottomColor: colors.divider,
                    }}>
                      <Ionicons name={icon} size={compact ? 13 : 15} color={colors.primary} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[typography.caption, { color: colors.textMuted, fontSize: compact ? 9 : 10, letterSpacing: 0.3 }]}>
                          {label.toUpperCase()}
                        </Text>
                        <Text style={[typography.body, { color: colors.textPrimary, fontSize: compact ? 12 : 13, lineHeight: compact ? 17 : 19, marginTop: 2 }]} numberOfLines={2}>
                          {value}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </SectionCard>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* ── Bottom Action Bar ── */}
      <View style={{
        position:        'absolute',
        bottom:          0,
        left:            0,
        right:           0,
        flexDirection:   'row',
        paddingHorizontal: compact ? spacing(4) : spacing(6),
        paddingVertical:  compact ? spacing(3) : spacing(4),
        paddingBottom:    compact ? spacing(5) : spacing(5),
        backgroundColor:  colors.surface,
        borderTopWidth:   1,
        borderTopColor:   colors.divider,
        gap:              spacing(3),
        alignItems:       'center',
        ...Platform.select({
          ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12 },
          android: { elevation: 8 },
          web:     { boxShadow: '0 -4px 20px rgba(0,0,0,0.15)' } as any,
          default: {},
        }),
      }}>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => ({
            flexDirection:    'row',
            alignItems:       'center',
            gap:              spacing(2),
            paddingVertical:  compact ? spacing(3) : spacing(4),
            paddingHorizontal: compact ? spacing(4) : spacing(6),
            borderRadius:     radii.pill,
            borderWidth:      1,
            borderColor:      colors.border,
            backgroundColor:  colors.surfaceAlt,
            opacity:          pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="save-outline" size={compact ? 15 : 17} color={colors.textPrimary} />
          <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: compact ? 13 : undefined }]}>
            Save
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setApplyModalVisible(true)}
          style={({ pressed }) => ({
            flex:             1,
            flexDirection:    'row',
            alignItems:       'center',
            justifyContent:   'center',
            gap:              spacing(2),
            paddingVertical:  compact ? spacing(3) : spacing(4),
            borderRadius:     radii.pill,
            backgroundColor:  colors.primary,
            opacity:          pressed ? 0.88 : 1,
            ...Platform.select({
              ios:     { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
              android: { elevation: 4 },
              web:     { boxShadow: `0 4px 14px ${colors.primary}55` } as any,
              default: {},
            }),
          })}
        >
          <Ionicons name="open-outline" size={compact ? 15 : 17} color="#fff" />
          <Text style={[typography.bodyStrong, { color: '#fff', fontSize: compact ? 13 : undefined }]}>
            Open Portal
          </Text>
        </Pressable>
      </View>

      {/* ── Apply / Portal Modal ── */}
      <Modal
        visible={applyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setApplyModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: spacing(5) }}
            onPress={() => setApplyModalVisible(false)}
          >
            <Pressable
              style={{
                width:           '100%',
                maxWidth:        480,
                backgroundColor: colors.surface,
                borderRadius:    radii.xxl,
                overflow:        'hidden',
                borderWidth:     1,
                borderColor:     colors.border,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Modal accent bar */}
              <View style={{ height: 3, backgroundColor: colors.primary }} />

              <View style={{ padding: compact ? spacing(5) : spacing(7), gap: compact ? spacing(4) : spacing(5) }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
                    <View style={{ width: 36, height: 36, borderRadius: radii.md, backgroundColor: `${colors.primary}22`, borderWidth: 1, borderColor: `${colors.primary}44`, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="open-outline" size={17} color={colors.primary} />
                    </View>
                    <Text style={[typography.h2, { color: colors.textPrimary, fontSize: compact ? 16 : 18 }]}>
                      Open Application Portal
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setApplyModalVisible(false)}
                    style={({ pressed }) => ({ padding: spacing(2), opacity: pressed ? 0.7 : 1 })}
                  >
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </Pressable>
                </View>

                {/* Info */}
                <View style={{ padding: compact ? spacing(3) : spacing(4), backgroundColor: `${colors.primary}0F`, borderRadius: radii.lg, borderWidth: 1, borderColor: `${colors.primary}22`, flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3) }}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginTop: 1 }} />
                  <Text style={[typography.body, { color: colors.textSecondary, flex: 1, fontSize: compact ? 12 : 14, lineHeight: compact ? 18 : 21 }]}>
                    You are about to continue to the official application portal for {app.university}.
                  </Text>
                </View>

                {/* Optional note */}
                <View style={{ gap: spacing(2) }}>
                  <Text style={[typography.label, { color: colors.textSecondary, fontSize: compact ? 11 : undefined }]}>
                    Optional note
                  </Text>
                  <TextInput
                    value={applyNote}
                    onChangeText={setApplyNote}
                    placeholder="Add a note before continuing…"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    style={{
                      minHeight:         compact ? 70 : 90,
                      borderRadius:      radii.lg,
                      borderWidth:       1,
                      borderColor:       colors.border,
                      padding:           compact ? spacing(3) : spacing(4),
                      backgroundColor:   colors.surfaceAlt,
                      color:             colors.textPrimary,
                      textAlignVertical: 'top' as const,
                      fontSize:          compact ? 13 : 14,
                      lineHeight:        compact ? 19 : 22,
                    }}
                  />
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: spacing(3) }}>
                  <Pressable
                    onPress={() => setApplyModalVisible(false)}
                    style={({ pressed }) => ({
                      flex:            1,
                      height:          compact ? 44 : 52,
                      borderRadius:    radii.lg,
                      backgroundColor: colors.surfaceAlt,
                      borderWidth:     1,
                      borderColor:     colors.border,
                      alignItems:      'center',
                      justifyContent:  'center',
                      opacity:         pressed ? 0.8 : 1,
                    })}
                  >
                    <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: compact ? 13 : undefined }]}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmApply}
                    style={({ pressed }) => ({
                      flex:            1,
                      height:          compact ? 44 : 52,
                      borderRadius:    radii.lg,
                      backgroundColor: colors.primary,
                      alignItems:      'center',
                      justifyContent:  'center',
                      gap:             spacing(2),
                      flexDirection:   'row',
                      opacity:         pressed ? 0.88 : 1,
                    })}
                  >
                    <Ionicons name="open-outline" size={compact ? 14 : 16} color="#fff" />
                    <Text style={[typography.bodyStrong, { color: '#fff', fontSize: compact ? 13 : undefined }]}>
                      Continue
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </DashboardLayout>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
export default function ApplicationDetailsScreen() {
  return (
    <StudentMenuProvider>
      <ApplicationDetailsContent />
    </StudentMenuProvider>
  );
}