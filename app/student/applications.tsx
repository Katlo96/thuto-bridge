// app/student/applications.tsx
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
import { router } from 'expo-router';
import DashboardLayout, { spacing, typography, useTheme, radii } from '../../components/student/DashboardLayout';
import { StudentMenuProvider } from '../../components/student/StudentMenu';

// ──────────────────────────────────────────────────────────────────────────────
// Types & Data
// ──────────────────────────────────────────────────────────────────────────────
type AppStatus = 'Accepted' | 'Rejected' | 'Submitted' | 'Under review' | 'Draft';

interface ApplicationItem {
  id: string;
  university: string;
  program: string;
  date: string;
  status: AppStatus;
}

const DATA: ApplicationItem[] = [
  { id: '1', university: 'University of Botswana', program: 'Computer Science Program', date: '24 Apr 2026', status: 'Accepted' },
  { id: '2', university: 'University of Botswana', program: 'Computer Science Program', date: '24 Apr 2026', status: 'Rejected' },
  { id: '3', university: 'University of Botswana', program: 'Computer Science Program', date: '24 Apr 2026', status: 'Submitted' },
  { id: '4', university: 'Botho University',        program: 'Computer Science Program', date: '24 Apr 2026', status: 'Under review' },
  { id: '5', university: 'BAC',                     program: 'Computer Science Program', date: '24 Apr 2026', status: 'Draft' },
];

// ──────────────────────────────────────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────────────────────────────────────
function ApplicationsContent() {
  const colors        = useTheme();
  const { width }     = useWindowDimensions();
  const isMobile      = width < 768;

  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [modalVisible,   setModalVisible]   = useState(false);
  const [newUniversity,  setNewUniversity]  = useState('');
  const [newProgram,     setNewProgram]     = useState('');
  const [newDate,        setNewDate]        = useState('');

  const selected = useMemo(() =>
    DATA.find((item) => item.id === selectedId) || null,
    [selectedId]
  );

  const statusCounts = useMemo(() => {
    return DATA.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<AppStatus, number>);
  }, []);

  const statusConfig: Record<AppStatus, { bg: string; text: string }> = {
    Accepted:      { bg: 'rgba(52,211,153,0.15)',  text: '#34D399' },
    Rejected:      { bg: 'rgba(239,68,68,0.15)',   text: '#EF4444' },
    Submitted:     { bg: 'rgba(59,130,246,0.15)',  text: '#3B82F6' },
    'Under review':{ bg: 'rgba(251,191,36,0.15)',  text: '#FBBF24' },
    Draft:         { bg: 'rgba(107,114,128,0.15)', text: '#6B7280' },
  };

  const handleSelect = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const handleViewDetails = (item: ApplicationItem) => {
    router.push({
      pathname: '/student/application-details',
      params: {
        id:         item.id,
        university: item.university,
        program:    item.program,
        date:       item.date,
        status:     item.status,
      },
    });
  };

  const handleNewApplication  = () => setModalVisible(true);
  const closeModal             = () => setModalVisible(false);

  const handleSaveApplication = () => {
    Alert.alert('Application Started', 'Your new application has been created (placeholder)');
    closeModal();
    setNewUniversity('');
    setNewProgram('');
    setNewDate('');
  };

  return (
    <DashboardLayout
      title="Applications"
      subtitle="Track your progress and manage submissions"
      showPointsCard={false}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(12) }}>
        <View style={{ gap: spacing(6) }}>

          {/* ── Back + breadcrumb ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection:   'row'    as const,
                alignItems:      'center' as const,
                gap:             spacing(2),
                paddingHorizontal: spacing(isMobile ? 3 : 4),
                paddingVertical: spacing(2),
                borderRadius:    radii.lg,
                backgroundColor: colors.surfaceAlt,
                borderWidth:     1,
                borderColor:     colors.border,
                opacity:         pressed ? 0.8 : 1,
              })}
            >
              <Ionicons name="arrow-back" size={isMobile ? 15 : 17} color={colors.primary} />
              <Text style={[typography.label, { color: colors.primary, fontSize: isMobile ? 12 : undefined }]}>
                Back
              </Text>
            </Pressable>
            <Text style={[typography.caption, { color: colors.textMuted, fontSize: isMobile ? 11 : undefined }]} numberOfLines={1}>
              Dashboard › Applications
            </Text>
          </View>

          {/* ── Status Chips ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing(3), paddingVertical: spacing(2) }}
          >
            {Object.entries(statusCounts).map(([status, count]) => (
              <View
                key={status}
                style={[styles.chip, { backgroundColor: statusConfig[status as AppStatus].bg, borderColor: colors.border }]}
              >
                <Text style={[typography.label, { color: statusConfig[status as AppStatus].text, fontWeight: '600' }]}>
                  {status} ({count})
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* ── Section label ── */}
          <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, fontSize: isMobile ? 10 : undefined }]}>
            ALL APPLICATIONS · {DATA.length} FOUND
          </Text>

          {/* ── 2-column card grid — 48% width works on web & native ── */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
            {DATA.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleSelect(item.id)}
                style={({ pressed }) => ({
                  // 48% + flexWrap = 2 columns on every screen size
                  width:           '48%' as any,
                  backgroundColor: colors.surface,
                  borderColor:     selectedId === item.id ? colors.primary : colors.border,
                  borderWidth:     selectedId === item.id ? 2 : 1,
                  borderRadius:    radii.xl,
                  overflow:        'hidden' as const,
                  opacity:         pressed ? 0.92 : 1,
                  transform:       pressed ? [{ scale: 0.98 }] : [],
                  // elevation / shadow
                  ...Platform.select({
                    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10 },
                    android: { elevation: 5 },
                    web:     { boxShadow: '0 4px 16px rgba(0,0,0,0.22)' } as any,
                    default: {},
                  }),
                })}
              >
                {/* Status accent bar */}
                <View style={{ height: 3, backgroundColor: statusConfig[item.status].text }} />

                <View style={{ padding: isMobile ? spacing(3) : spacing(5), gap: isMobile ? spacing(2) : spacing(3) }}>
                  {/* University + status badge */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing(2) }}>
                    <Text
                      style={[typography.bodyStrong, { color: colors.textPrimary, flex: 1, fontSize: isMobile ? 12 : undefined, lineHeight: isMobile ? 17 : undefined }]}
                      numberOfLines={2}
                    >
                      {item.university}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig[item.status].bg }]}>
                      <Text style={[typography.caption, { color: statusConfig[item.status].text, fontSize: isMobile ? 9 : undefined }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  {/* Program */}
                  <Text
                    style={[typography.body, { color: colors.textSecondary, fontSize: isMobile ? 11 : undefined, lineHeight: isMobile ? 16 : undefined }]}
                    numberOfLines={2}
                  >
                    {item.program}
                  </Text>

                  {/* Date */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
                    <Ionicons name="calendar-outline" size={isMobile ? 11 : 14} color={colors.textMuted} />
                    <Text style={[typography.caption, { color: colors.textMuted, fontSize: isMobile ? 10 : undefined }]}>
                      {item.date}
                    </Text>
                  </View>

                  {/* View details footer */}
                  <Pressable
                    onPress={() => handleViewDetails(item)}
                    style={({ pressed }) => ({
                      flexDirection:  'row'    as const,
                      alignItems:     'center' as const,
                      justifyContent: 'space-between' as const,
                      paddingTop:     spacing(2),
                      borderTopWidth: 1,
                      borderTopColor: colors.divider,
                      opacity:        pressed ? 0.75 : 1,
                    })}
                  >
                    <Text style={[typography.label, { color: colors.primary, fontSize: isMobile ? 11 : undefined }]}>
                      View Details
                    </Text>
                    <Ionicons name="chevron-forward" size={isMobile ? 13 : 16} color={colors.primary} />
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>

        </View>
      </ScrollView>

      {/* ── Floating New Button ── */}
      <Pressable onPress={handleNewApplication} style={styles.floatingButton}>
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </Pressable>

      {/* ── New Application Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={modalStyles.overlay} onPress={closeModal}>
            <Pressable style={[modalStyles.container, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <View style={[modalStyles.header, { borderBottomColor: colors.divider }]}>
                <Text style={[typography.h2, { color: colors.textPrimary }]}>New Application</Text>
                <Pressable onPress={closeModal}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={modalStyles.form}>
                <View style={modalStyles.inputGroup}>
                  <Text style={[typography.label, { color: colors.textSecondary }]}>University / Institution</Text>
                  <TextInput
                    style={[modalStyles.input, { color: colors.textPrimary, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                    value={newUniversity}
                    onChangeText={setNewUniversity}
                    placeholder="e.g. University of Botswana"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={modalStyles.inputGroup}>
                  <Text style={[typography.label, { color: colors.textSecondary }]}>Program / Course</Text>
                  <TextInput
                    style={[modalStyles.input, { color: colors.textPrimary, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                    value={newProgram}
                    onChangeText={setNewProgram}
                    placeholder="e.g. BSc Computer Science"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={modalStyles.inputGroup}>
                  <Text style={[typography.label, { color: colors.textSecondary }]}>Application Date</Text>
                  <TextInput
                    style={[modalStyles.input, { color: colors.textPrimary, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                    value={newDate}
                    onChangeText={setNewDate}
                    placeholder="e.g. 15/05/2026"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={[modalStyles.footer, { borderTopColor: colors.divider }]}>
                <Pressable style={[modalStyles.cancelButton, { backgroundColor: colors.surfaceAlt }]} onPress={closeModal}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Cancel</Text>
                </Pressable>
                <Pressable style={modalStyles.saveButton} onPress={handleSaveApplication}>
                  <Text style={[typography.bodyStrong, { color: '#FFFFFF' }]}>Start Application</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </DashboardLayout>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing(4),
    paddingVertical:   spacing(2),
    borderRadius:      radii.pill,
    borderWidth:       1,
  },
  statusBadge: {
    paddingHorizontal: spacing(2),
    paddingVertical:   spacing(1),
    borderRadius:      radii.pill,
    flexShrink:        0,
  },
  floatingButton: {
    position:        'absolute',
    bottom:          spacing(8),
    right:           spacing(8),
    width:           56,
    height:          56,
    borderRadius:    9999,
    backgroundColor: '#3B82F6',
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.3,
    shadowRadius:    8,
    elevation:       8,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         spacing(6),
  },
  container: {
    width:        '90%',
    maxWidth:     460,
    borderRadius: radii.xxl,
    overflow:     'hidden',
  },
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    padding:           spacing(7),
    borderBottomWidth: 1,
  },
  form: {
    padding: spacing(7),
    gap:     spacing(6),
  },
  inputGroup: {
    gap: spacing(2),
  },
  input: {
    borderWidth:  1,
    borderRadius: radii.lg,
    padding:      spacing(5),
    fontSize:     16,
  },
  footer: {
    flexDirection:  'row',
    padding:        spacing(7),
    gap:            spacing(4),
    borderTopWidth: 1,
  },
  cancelButton: {
    flex:           1,
    height:         52,
    borderRadius:   radii.lg,
    alignItems:     'center',
    justifyContent: 'center',
  },
  saveButton: {
    flex:            1,
    height:          52,
    borderRadius:    radii.lg,
    backgroundColor: '#3B82F6',
    alignItems:      'center',
    justifyContent:  'center',
  },
});

export default function ApplicationsScreen() {
  return (
    <StudentMenuProvider>
      <ApplicationsContent />
    </StudentMenuProvider>
  );
}