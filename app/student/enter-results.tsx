import React, { useMemo, useState, useCallback, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StudentMenuProvider } from "../../components/student/StudentMenu";
import { useLanguage } from "../../contexts/LanguageContext";
import DashboardLayout, {
  spacing,
  typography,
  radii,
  useTheme,
} from "../../components/student/DashboardLayout";
import StudentFooter from "../../components/student/StudentFooter";

import { db, auth } from "../../constants/firebase";
import { doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Breakpoint = "mobile" | "tablet" | "desktop";

type Level = "BGCSE" | "IGCSE";
type Track = "PURE" | "DOUBLE" | "SINGLE" | "ADVANCED" | "ORDINARY";

const GRADES_STANDARD = [
  "A*",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "U",
] as const;
type StandardGrade = (typeof GRADES_STANDARD)[number];

const GRADES_DOUBLE = [
  "A*A*",
  "AA",
  "BB",
  "CC",
  "DD",
  "EE",
  "FF",
  "GG",
  "HH",
  "UU",
] as const;
type DoubleGrade = (typeof GRADES_DOUBLE)[number];

type Grade = StandardGrade | DoubleGrade | "";

type ResultRow = { id: string; subject: string; grade: Grade };
type BestUnit = { key: string; subject: string; points: number; rowId: string };
type BestRowSummary = {
  subject: string;
  grade: string;
  points: number;
  countsAs: 1 | 2;
};

// ─────────────────────────────────────────────────────────────────────────────
// Calculation logic – unchanged
// ─────────────────────────────────────────────────────────────────────────────

const DOUBLE_AWARD_SUBJECT = "SCIENCE DOUBLE AWARD";

function normalizeSubjectName(s: string) {
  return s.trim().replace(/\s+/g, " ").toUpperCase();
}
function isDoubleAward(subject: string): boolean {
  return normalizeSubjectName(subject) === DOUBLE_AWARD_SUBJECT;
}

const STANDARD_POINTS: Record<StandardGrade, number> = {
  "A*": 8,
  A: 8,
  B: 7,
  C: 6,
  D: 5,
  E: 4,
  F: 3,
  G: 2,
  H: 1,
  U: 0,
};
const DOUBLE_AWARD_POINTS: Record<DoubleGrade, number> = {
  "A*A*": 16,
  AA: 16,
  BB: 14,
  CC: 12,
  DD: 10,
  EE: 8,
  FF: 6,
  GG: 4,
  HH: 2,
  UU: 0,
};

const DEFAULTS = {
  BGCSE: {
    PURE: [
      "CHEMISTRY",
      "PHYSICS",
      "BIOLOGY",
      "EXTENDED MATH",
      "ENGLISH",
      "SETSWANA",
    ],
    DOUBLE: [DOUBLE_AWARD_SUBJECT, "ENGLISH", "SETSWANA", "MATH"],
    SINGLE: ["INTEGRATED SCIENCE", "MATH", "ENGLISH", "SETSWANA"],
  },
  IGCSE: {
    ADVANCED: [
      "CHEMISTRY",
      "PHYSICS",
      "BIOLOGY",
      "EXTENDED MATH",
      "ENGLISH",
      "SETSWANA",
    ],
    ORDINARY: ["INTEGRATED SCIENCE", "MATH", "ENGLISH", "SETSWANA"],
  },
} as const;

function allowedTracksForLevel(level: Level): Track[] {
  return level === "BGCSE"
    ? ["PURE", "DOUBLE", "SINGLE"]
    : ["ADVANCED", "ORDINARY"];
}

function requiredSubjectSlots(level: Level, track: Track): number {
  if (level === "BGCSE") return track === "PURE" ? 10 : 8;
  return track === "ADVANCED" ? 9 : 7;
}

function defaultsForSelection(level: Level, track: Track): readonly string[] {
  if (level === "BGCSE") {
    if (track === "PURE") return DEFAULTS.BGCSE.PURE;
    if (track === "DOUBLE") return DEFAULTS.BGCSE.DOUBLE;
    return DEFAULTS.BGCSE.SINGLE;
  }
  return track === "ADVANCED"
    ? DEFAULTS.IGCSE.ADVANCED
    : DEFAULTS.IGCSE.ORDINARY;
}

function uid(prefix = "row") {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}
function toTitle(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildRows(level: Level, track: Track): ResultRow[] {
  const required = requiredSubjectSlots(level, track);
  const defaults = [...defaultsForSelection(level, track)];
  const prefilled = defaults.map((s) => ({
    id: uid("subject"),
    subject: toTitle(s),
    grade: "" as Grade,
  }));
  const empties = Array.from({
    length: Math.max(0, required - prefilled.length),
  }).map(() => ({ id: uid("empty"), subject: "", grade: "" as Grade }));
  return [...prefilled, ...empties];
}

function computePointsForRow(
  row: ResultRow,
): { points: number; countsAs: 1 | 2 } | null {
  const subject = row.subject.trim();
  const grade = row.grade;
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
      units.push({
        key: `${row.id}-1`,
        subject: normalizeSubjectName(row.subject),
        points: perUnit,
        rowId: row.id,
      });
      units.push({
        key: `${row.id}-2`,
        subject: normalizeSubjectName(row.subject),
        points: perUnit,
        rowId: row.id,
      });
    } else {
      units.push({
        key: `${row.id}-single`,
        subject: normalizeSubjectName(row.subject),
        points: calc.points,
        rowId: row.id,
      });
    }
  }
  units.sort((a, b) => b.points - a.points);
  const bestSixUnits = units.slice(0, 6);
  const totalPoints = Math.round(
    bestSixUnits.reduce((sum, u) => sum + u.points, 0),
  );
  const rowMap = new Map<string, { row: ResultRow; totalPoints: number }>();
  for (const unit of bestSixUnits) {
    const row = rows.find((r) => r.id === unit.rowId);
    if (!row) continue;
    const existing = rowMap.get(unit.rowId);
    rowMap.set(
      unit.rowId,
      existing
        ? { row, totalPoints: existing.totalPoints + unit.points }
        : { row, totalPoints: unit.points },
    );
  }
  const bestRows: BestRowSummary[] = Array.from(rowMap.values()).map((e) => ({
    subject: normalizeSubjectName(e.row.subject),
    grade: String(e.row.grade || ""),
    points: Math.round(e.totalPoints),
    countsAs: isDoubleAward(e.row.subject) ? 2 : 1,
  }));
  // sort best rows by points desc for display
  bestRows.sort((a, b) => b.points - a.points);
  return { totalPoints, bestRows, eligible: totalPoints >= 36, threshold: 36 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore persistence — saves the latest calculation so the dashboard can
// read it back as "Your Points".
// ─────────────────────────────────────────────────────────────────────────────
const USERS_COLLECTION = "users";

async function savePointsToProfile(
  uid: string,
  calculation: ReturnType<typeof pickBestSix>,
): Promise<void> {
  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    {
      pointsTotal: calculation.totalPoints,
      pointsEligible: calculation.eligible,
      pointsBestRows: calculation.bestRows,
      pointsCalculatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local persistence — this is the fix for the "View Recommended Courses" bug.
// Previously the results were only passed as router params
// (JSON.stringify(bestRows) in the URL). Expo Router params can come back as
// `undefined` on the receiving screen (stale navigation state, param size
// limits, fast double-taps, etc.), which is exactly what caused course-rec's
// "no matches found" issue. We now write the calculation to AsyncStorage the
// moment it's computed — not right before navigating — so course-rec's
// AsyncStorage fallback always has fresh data to read, regardless of whether
// the router params make it through.
//
// NOTE: confirm this key matches what course-rec.tsx reads from AsyncStorage.
// ─────────────────────────────────────────────────────────────────────────────
const RESULTS_STORAGE_KEY = "thutobridge:lastResults";

async function persistResultsLocally(
  calculation: ReturnType<typeof pickBestSix>,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      RESULTS_STORAGE_KEY,
      JSON.stringify({
        totalPoints: calculation.totalPoints,
        bestRows: calculation.bestRows,
        eligible: calculation.eligible,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch (err) {
    console.error("[EnterResults] failed to persist results locally:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Elevation – Thuto-Bridge soft
// ─────────────────────────────────────────────────────────────────────────────
function useElevation(intensity: "sm" | "md" | "lg" = "md"): ViewStyle {
  return useMemo<ViewStyle>(() => {
    const opacity = 0.08;
    const radius = intensity === "sm" ? 8 : intensity === "md" ? 16 : 28;
    const offsetY = intensity === "sm" ? 2 : intensity === "md" ? 6 : 12;
    return (Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: offsetY },
        shadowOpacity: opacity + 0.05,
        shadowRadius: radius,
      },
      android: {
        elevation: intensity === "sm" ? 2 : intensity === "md" ? 4 : 8,
      },
      web: {
        boxShadow: `0 ${offsetY}px ${radius}px rgba(15,23,42,${opacity})`,
      } as any,
      default: {},
    }) ?? {}) as ViewStyle;
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────────
function Card({
  children,
  accent,
  style,
  intensity = "md",
  noPad = false,
}: {
  children: React.ReactNode;
  accent?: string;
  style?: ViewStyle;
  intensity?: "sm" | "md" | "lg";
  noPad?: boolean;
}) {
  const colors = useTheme();
  const elevation = useElevation(intensity);
  const { width } = useWindowDimensions();
  const isNarrow = width < 400;
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
        },
        elevation,
        style,
      ]}
    >
      {accent ? (
        <View style={{ height: 3.5, backgroundColor: accent }} />
      ) : null}
      <View
        style={noPad ? undefined : { padding: spacing(isNarrow ? 4 : 5.5) }}
      >
        {children}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: "neutral" | "primary" | "success";
}) {
  const colors = useTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 400;
  const accent =
    tone === "primary"
      ? colors.primary
      : tone === "success"
        ? colors.success
        : colors.textSecondary;

  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: isNarrow ? "47%" : 150,
        minWidth: isNarrow ? "47%" : 140,
        backgroundColor: tone === "neutral" ? colors.surfaceAlt : `${accent}10`,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: tone === "neutral" ? colors.border : `${accent}28`,
        padding: spacing(isNarrow ? 3 : 3.5),
        flexDirection: "row",
        alignItems: "center",
        gap: spacing(2.5),
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: tone === "neutral" ? colors.surface : `${accent}16`,
          borderWidth: 1,
          borderColor: tone === "neutral" ? colors.border : `${accent}30`,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[
            typography.caption,
            { color: colors.textMuted, fontSize: 11 },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={[
            typography.bodyStrong,
            { color: colors.textPrimary, fontSize: 14.5, marginTop: 1 },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress bar
// ─────────────────────────────────────────────────────────────────────────────
function CompletionBar({
  completed,
  total,
  colors,
}: {
  completed: number;
  total: number;
  colors: any;
}) {
  const { t } = useLanguage();
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const done = pct === 100;
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: spacing(2),
        }}
      >
        <Text
          style={[
            typography.caption,
            { color: colors.textSecondary, fontWeight: "600" },
          ]}
        >
          {completed}{t(' of ')}{total} {t('subjects completed')}
        </Text>
        <Text
          style={[
            typography.caption,
            {
              color: done ? colors.success : colors.textPrimary,
              fontWeight: "700",
            },
          ]}
        >
          {pct}%
        </Text>
      </View>
      <View
        style={{
          height: 10,
          backgroundColor: colors.surfaceAlt,
          borderRadius: radii.pill,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View
          style={{
            height: "100%",
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
// Grade Picker Modal – Thuto-Bridge style
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
  const { t } = useLanguage();
  const colors = useTheme();
  const elevation = useElevation("lg");
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const isDouble = activeRow ? isDoubleAward(activeRow.subject) : false;
  const grades = isDouble ? GRADES_DOUBLE : GRADES_STANDARD;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(8,12,22,0.55)",
          justifyContent: "flex-end",
          ...Platform.select({
            web: {
              justifyContent: "center",
              alignItems: "center",
              padding: spacing(5),
            } as any,
          }),
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
              maxHeight: "88%",
            },
            Platform.select({ web: { width: 460, borderRadius: 28 } as any }),
            elevation,
          ]}
        >
          {Platform.OS !== "web" && (
            <View
              style={{
                alignItems: "center",
                paddingTop: spacing(3.5),
                paddingBottom: spacing(1),
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: colors.border,
                }}
              />
            </View>
          )}
          <View style={{ height: 3, backgroundColor: colors.primary }} />
          <ScrollView
            contentContainerStyle={{
              padding: spacing(isNarrow ? 4 : 5.5),
              paddingBottom: spacing(8),
            }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing(2),
              }}
            >
              <Text
                style={[
                  typography.h2,
                  { color: colors.textPrimary, fontSize: 18 },
                ]}
              >
                Select Grade
              </Text>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                  borderWidth: 1,
                  borderColor: colors.border,
                })}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {activeRow?.subject ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing(2),
                  paddingHorizontal: spacing(3),
                  paddingVertical: spacing(2.5),
                  backgroundColor: `${colors.primary}0F`,
                  borderRadius: radii.lg,
                  marginBottom: spacing(4.5),
                  borderWidth: 1,
                  borderColor: `${colors.primary}22`,
                }}
              >
                <Ionicons
                  name={isDouble ? "flask-outline" : "book-outline"}
                  size={14}
                  color={colors.primary}
                />
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textSecondary, flex: 1 },
                  ]}
                  numberOfLines={1}
                >
                  {activeRow.subject} ·{" "}
                  {isDouble ? t("Double Award scale") : t("Standard scale")}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing(2.5),
                marginBottom: spacing(4),
              }}
            >
              {grades.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => onSelect(g as Grade)}
                  style={({ pressed }) => ({
                    width: isNarrow ? "47%" : "30.8%",
                    minWidth: isNarrow ? undefined : 88,
                    flexGrow: 1,
                    height: 58,
                    borderRadius: 14,
                    backgroundColor: pressed
                      ? `${colors.primary}14`
                      : colors.surfaceAlt,
                    borderWidth: 1.5,
                    borderColor: pressed ? colors.primary : colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}
                >
                  <Text
                    style={[
                      typography.h2,
                      { color: colors.textPrimary, fontSize: 18 },
                    ]}
                  >
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => onSelect("")}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: 14,
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: spacing(2),
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Ionicons
                name="close-circle-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={[typography.label, { color: colors.textSecondary }]}>
                Clear Grade
              </Text>
            </Pressable>
          </ScrollView>
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
  count,
}: {
  visible: boolean;
  onConfirm: () => void;
  onClose: () => void;
  count: number;
}) {
  const { t } = useLanguage();
  const colors = useTheme();
  const elevation = useElevation("lg");
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(8,12,22,0.55)",
          justifyContent: "center",
          alignItems: "center",
          padding: spacing(4),
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            {
              width: "100%",
              maxWidth: 420,
              backgroundColor: colors.surface,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
            },
            elevation,
          ]}
        >
          <View style={{ height: 3, backgroundColor: colors.primary }} />
          <View
            style={{ padding: spacing(isNarrow ? 4.5 : 6), gap: spacing(3.5) }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: `${colors.primary}14`,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: `${colors.primary}28`,
              }}
            >
              <Ionicons
                name="calculator-outline"
                size={24}
                color={colors.primary}
              />
            </View>
            <Text
              style={[
                typography.h2,
                { color: colors.textPrimary, fontSize: 18 },
              ]}
            >
              Calculate your points?
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, lineHeight: 22 },
              ]}
            >
              We'll pick your best 6 subjects automatically. Science Double
              Award counts as 2 subjects. You entered {count} subjects.
            </Text>
            <View
              style={{
                flexDirection: "row",
                gap: spacing(2.5),
                marginTop: spacing(1.5),
              }}
            >
              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 50,
                  borderRadius: 14,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={[typography.label, { color: colors.textPrimary }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 50,
                  borderRadius: 14,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: spacing(1.5),
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Ionicons name="flash" size={15} color="#fff" />
                <Text style={[typography.label, { color: "#fff" }]}>
                  Calculate
                </Text>
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
  const { t } = useLanguage();
  const colors = useTheme();
  const elevation = useElevation("lg");
  const { width, height } = useWindowDimensions();
  const isNarrow = width < 380;
  const isMobile = width < 720;
  const modalMaxHeight = Math.min(height * 0.9, isMobile ? 720 : 760);
  const eligible = calculation?.eligible ?? false;
  const tone = eligible ? colors.success : "#EF4444";
  const total = calculation?.totalPoints ?? 0;
  const threshold = calculation?.threshold ?? 36;

  // Guards against double-taps and makes sure the AsyncStorage write (the
  // course-rec fallback data source) is settled before we navigate away.
  const [navigating, setNavigating] = useState(false);

  const handleViewCourses = useCallback(async () => {
    if (navigating) return;
    setNavigating(true);
    try {
      if (calculation) {
        await persistResultsLocally(calculation);
      }
    } catch (err) {
      console.error(
        "[ResultsModal] could not persist results before navigating:",
        err,
      );
    } finally {
      setNavigating(false);
      onClose();
      if (calculation) {
        router.push({
          pathname: "/student/course-rec",
          params: {
            totalPoints: calculation.totalPoints.toString(),
            bestRows: JSON.stringify(calculation.bestRows),
          },
        });
      } else {
        router.push("/student/course-rec");
      }
    }
  }, [calculation, navigating, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(8,12,22,0.55)",
          justifyContent: "center",
          alignItems: "center",
          padding: spacing(4),
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            {
              width: "100%",
              maxWidth: 520,
              maxHeight: modalMaxHeight,
              backgroundColor: colors.surface,
              borderRadius: isMobile ? 24 : 26,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
            },
            elevation,
          ]}
        >
          <View style={{ height: 4, backgroundColor: tone }} />
          <ScrollView
            style={{ maxHeight: modalMaxHeight - (isMobile ? 104 : 112) }}
            contentContainerStyle={{
              padding: spacing(isNarrow ? 4 : 5.5),
              paddingBottom: spacing(4),
            }}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing(4),
              }}
            >
              <Text
                style={[
                  typography.h2,
                  { color: colors.textPrimary, fontSize: 18 },
                ]}
              >
                Your Points
              </Text>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Score hero */}
            <View
              style={{
                backgroundColor: `${tone}0F`,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: `${tone}2A`,
                padding: spacing(isNarrow ? 4 : 5),
                marginBottom: spacing(4.5),
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: spacing(3),
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: isNarrow ? 36 : 44,
                    fontWeight: "900",
                    color: colors.textPrimary,
                    letterSpacing: -0.5,
                  }}
                >
                  {total}
                </Text>
                <Text
                  style={[
                    typography.body,
                    { color: colors.textSecondary, fontWeight: "600" },
                  ]}
                >
                  points · best 6
                </Text>
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textMuted, marginTop: 4 },
                  ]}
                >
                  {total} / {threshold} {t('required')}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: spacing(3.5),
                  paddingVertical: spacing(2.5),
                  borderRadius: 14,
                  backgroundColor: `${tone}16`,
                  borderWidth: 1,
                  borderColor: `${tone}3A`,
                  alignItems: "center",
                  minWidth: 108,
                }}
              >
                <Ionicons
                  name={eligible ? "checkmark-circle" : "alert-circle"}
                  size={26}
                  color={tone}
                />
                <Text
                  style={[
                    typography.label,
                    { color: tone, marginTop: 4, fontSize: 12.5 },
                  ]}
                >
                  {eligible ? t("Eligible") : t("Below 36")}
                </Text>
              </View>
            </View>

            {/* Best subjects */}
            <Text
              style={[
                typography.caption,
                {
                  color: colors.textMuted,
                  fontWeight: "700",
                  letterSpacing: 0.3,
                  marginBottom: spacing(2.5),
                },
              ]}
            >
              BEST 6 CONTRIBUTING SUBJECTS
            </Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                overflow: "hidden",
                marginBottom: spacing(4.5),
                backgroundColor: colors.surfaceAlt,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  paddingHorizontal: spacing(3.5),
                  paddingVertical: spacing(2.5),
                  backgroundColor: colors.surface,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textMuted, flex: 1, fontWeight: "700" },
                  ]}
                >
                  SUBJECT
                </Text>
                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.textMuted,
                      width: 56,
                      textAlign: "center",
                      fontWeight: "700",
                    },
                  ]}
                >
                  {t('GRADE')}
                </Text>
                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.textMuted,
                      width: 44,
                      textAlign: "right",
                      fontWeight: "700",
                    },
                  ]}
                >
                  {t('PTS')}
                </Text>
              </View>
              {(calculation?.bestRows ?? []).map((row, i) => (
                <View
                  key={`${row.subject}-${i}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: spacing(isNarrow ? 3 : 3.5),
                    paddingVertical: spacing(3),
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.divider,
                    backgroundColor: colors.surfaceAlt,
                  }}
                >
                  <View style={{ flex: 1, paddingRight: spacing(2) }}>
                    <Text
                      style={[
                        typography.body,
                        {
                          color: colors.textPrimary,
                          fontWeight: "600",
                          fontSize: 13.5,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {toTitle(row.subject)}
                    </Text>
                    {row.countsAs === 2 && (
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: colors.primary,
                            fontWeight: "700",
                            fontSize: 10.5,
                            marginTop: 2,
                          },
                        ]}
                      >
                        Double Award ×2
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      typography.bodyStrong,
                      {
                        color: colors.textPrimary,
                        width: 56,
                        textAlign: "center",
                        fontSize: 13.5,
                      },
                    ]}
                  >
                    {row.grade}
                  </Text>
                  <Text
                    style={[
                      typography.bodyStrong,
                      { color: colors.primary, width: 44, textAlign: "right" },
                    ]}
                  >
                    {row.points}
                  </Text>
                </View>
              ))}
            </View>

          </ScrollView>

          <View
            style={{
              padding: spacing(isNarrow ? 4 : 5),
              paddingTop: spacing(3.5),
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
              gap: spacing(2.5),
            }}
          >
            <Pressable
              onPress={handleViewCourses}
              disabled={navigating}
              accessibilityRole="button"
              accessibilityLabel={t('View Recommended Courses')}
              style={({ pressed }) => ({
                height: 54,
                borderRadius: 16,
                backgroundColor: colors.primary,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: spacing(2),
                opacity: navigating ? 0.7 : pressed ? 0.9 : 1,
                transform: [{ scale: pressed && !navigating ? 0.99 : 1 }],
              })}
            >
              <Ionicons
                name={navigating ? "hourglass-outline" : "school-outline"}
                size={17}
                color="#fff"
              />
              <Text style={[typography.label, { color: "#fff" }]}>
                {navigating ? t("Loading…") : t("View Recommended Courses")}
              </Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('Close results modal')}
              style={({ pressed }) => ({
                height: 48,
                borderRadius: 14,
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={[typography.label, { color: colors.textPrimary }]}>
                {t('Close')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject Row – spacious, un-squashed
// ─────────────────────────────────────────────────────────────────────────────
function SubjectRow({
  row,
  index,
  canRemove,
  onSubjectChange,
  onGradePress,
  onRemove,
  inputTwoCol,
}: {
  row: ResultRow;
  index: number;
  canRemove: boolean;
  onSubjectChange: (id: string, text: string) => void;
  onGradePress: (id: string) => void;
  onRemove: (id: string) => void;
  inputTwoCol: boolean;
}) {
  const { t } = useLanguage();
  const colors = useTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 390;
  const isDouble = isDoubleAward(row.subject);
  const hasSubject = row.subject.trim().length > 0;
  const hasGrade = row.grade !== "";
  const isComplete = hasSubject && hasGrade;

  const statusColor = isDouble
    ? colors.primary
    : isComplete
      ? colors.success
      : colors.border;
  const borderColor = isDouble
    ? `${colors.primary}45`
    : isComplete
      ? `${colors.success}38`
      : colors.border;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor,
        overflow: "hidden",
      }}
    >
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: 4, backgroundColor: statusColor }} />
        <View style={{ flex: 1, padding: spacing(isNarrow ? 3 : 4) }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: spacing(3.5),
              gap: spacing(2),
              flexWrap: isNarrow ? "wrap" : "nowrap",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing(2),
                flex: 1,
                minWidth: 0,
                flexWrap: "wrap",
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  backgroundColor: isComplete
                    ? `${colors.success}16`
                    : `${colors.primary}12`,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: isComplete
                    ? `${colors.success}30`
                    : `${colors.primary}28`,
                }}
              >
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: "800",
                    color: isComplete ? colors.success : colors.primary,
                  }}
                >
                  {index + 1}
                </Text>
              </View>
              <Text
                style={[
                  typography.caption,
                  { color: colors.textMuted, fontWeight: "700" },
                ]}
              >
                SUBJECT {index + 1}
              </Text>
              {isDouble && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: spacing(2),
                    paddingVertical: 3,
                    backgroundColor: `${colors.primary}12`,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: `${colors.primary}28`,
                  }}
                >
                  <Ionicons
                    name="flask-outline"
                    size={10}
                    color={colors.primary}
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "800",
                      color: colors.primary,
                    }}
                  >
                    DOUBLE
                  </Text>
                </View>
              )}
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing(2),
              }}
            >
              {isComplete && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colors.success}
                />
              )}
              {canRemove && (
                <Pressable
                  onPress={() => onRemove(row.id)}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    backgroundColor: `${colors.danger ?? "#EF4444"}12`,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.75 : 1,
                    borderWidth: 1,
                    borderColor: `${colors.danger ?? "#EF4444"}22`,
                  })}
                >
                  <Ionicons
                    name="trash-outline"
                    size={14}
                    color={colors.danger ?? "#EF4444"}
                  />
                </Pressable>
              )}
            </View>
          </View>

          {/* Inputs */}
          <View
            style={{
              flexDirection: inputTwoCol ? "row" : "column",
              gap: spacing(3.5),
            }}
          >
            {/* Subject */}
            <View style={{ flex: inputTwoCol ? 1.6 : undefined }}>
              <Text
                style={[
                  typography.caption,
                  {
                    color: colors.textMuted,
                    marginBottom: spacing(1.5),
                    fontWeight: "600",
                    letterSpacing: 0.2,
                  },
                ]}
              >
                Subject Name
              </Text>
              <View
                style={{
                  height: isNarrow ? 50 : 54,
                  borderRadius: 13,
                  borderWidth: 1.5,
                  borderColor: hasSubject
                    ? isDouble
                      ? colors.primary
                      : `${colors.success}42`
                    : colors.border,
                  backgroundColor: colors.surfaceAlt,
                  paddingHorizontal: spacing(3.5),
                  justifyContent: "center",
                }}
              >
                <TextInput
                  value={row.subject}
                  onChangeText={(text) => onSubjectChange(row.id, text)}
                  placeholder={t('e.g. Mathematics')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={[
                    typography.body,
                    {
                      color: colors.textPrimary,
                      fontWeight: "600",
                      padding: 0,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Grade */}
            <View style={{ width: inputTwoCol ? 162 : undefined }}>
              <Text
                style={[
                  typography.caption,
                  {
                    color: colors.textMuted,
                    marginBottom: spacing(1.5),
                    fontWeight: "600",
                    letterSpacing: 0.2,
                  },
                ]}
              >
                {t('GRADE')}
              </Text>
              <Pressable
                onPress={() => onGradePress(row.id)}
                style={({ pressed }) => ({
                  height: isNarrow ? 50 : 54,
                  borderRadius: 13,
                  borderWidth: 1.5,
                  borderColor: hasGrade
                    ? isDouble
                      ? colors.primary
                      : `${colors.success}55`
                    : colors.border,
                  backgroundColor: hasGrade
                    ? isDouble
                      ? `${colors.primary}0F`
                      : `${colors.success}0E`
                    : colors.surfaceAlt,
                  paddingHorizontal: spacing(3.5),
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  opacity: pressed ? 0.88 : 1,
                })}
              >
                <Text
                  style={[
                    typography.bodyStrong,
                    {
                      color: hasGrade ? colors.textPrimary : colors.textMuted,
                      fontSize: hasGrade ? 16.5 : 14,
                    },
                  ]}
                >
                  {row.grade || t("Select")}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {isDouble && (
            <Text
              style={[
                typography.caption,
                {
                  color: colors.primary,
                  marginTop: spacing(2.5),
                  fontWeight: "600",
                },
              ]}
            >
              Double Award active — counts as 2 subjects, double points scale.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Segmented pill
// ─────────────────────────────────────────────────────────────────────────────
function SegButton({
  label,
  active,
  onPress,
  grow = false,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  grow?: boolean;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexGrow: grow ? 1 : 0,
        paddingVertical: spacing(3),
        paddingHorizontal: spacing(4),
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary : colors.surfaceAlt,
        alignItems: "center",
        opacity: pressed ? 0.86 : 1,
      })}
    >
      <Text
        style={[
          typography.label,
          {
            color: active ? "#fff" : colors.textPrimary,
            fontWeight: active ? "800" : "600",
            fontSize: 13,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function SidebarPanel({
  rows,
  missingSubjects,
  missingGrades,
  doubleAwardRowsCount,
  onAddRow,
  onReset,
  completedRows,
}: {
  rows: ResultRow[];
  missingSubjects: number;
  missingGrades: number;
  doubleAwardRowsCount: number;
  onAddRow: () => void;
  onReset: () => void;
  completedRows: number;
}) {
  const { t } = useLanguage();
  const colors = useTheme();
  return (
    <View style={{ width: 324, flexShrink: 0, gap: spacing(4.5) }}>
      <Card accent={colors.primary}>
        <Text
          style={[
            typography.h2,
            {
              color: colors.textPrimary,
              fontSize: 16,
              marginBottom: spacing(1),
            },
          ]}
        >
          Calculation Summary
        </Text>
        <Text
          style={[
            typography.body,
            {
              color: colors.textSecondary,
              fontSize: 13,
              lineHeight: 19,
              marginBottom: spacing(3.5),
            },
          ]}
        >
          Best 6 subjects are selected automatically. Science Double Award
          counts as 2.
        </Text>

        <View style={{ gap: spacing(2.5), marginBottom: spacing(3.5) }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Rows on screen
            </Text>
            <Text style={[typography.label, { color: colors.textPrimary }]}>
              {rows.length}
            </Text>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Completed
            </Text>
            <Text style={[typography.label, { color: colors.success }]}>
              {completedRows}
            </Text>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Missing subjects
            </Text>
            <Text style={[typography.label, { color: colors.textPrimary }]}>
              {missingSubjects}
            </Text>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Missing grades
            </Text>
            <Text style={[typography.label, { color: colors.textPrimary }]}>
              {missingGrades}
            </Text>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Double Award rows
            </Text>
            <Text style={[typography.label, { color: colors.textPrimary }]}>
              {doubleAwardRowsCount}
            </Text>
          </View>
        </View>

        <View style={{ gap: spacing(2.5) }}>
          <Pressable
            onPress={onAddRow}
            style={({ pressed }) => ({
              height: 48,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: colors.primary,
              backgroundColor: `${colors.primary}10`,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing(2),
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons
              name="add-circle-outline"
              size={17}
              color={colors.primary}
            />
            <Text style={[typography.label, { color: colors.primary }]}>
              Add Subject
            </Text>
          </Pressable>
          <Pressable
            onPress={onReset}
            style={({ pressed }) => ({
              height: 48,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceAlt,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing(2),
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons
              name="refresh-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={[typography.label, { color: colors.textSecondary }]}>
              Reset to Defaults
            </Text>
          </Pressable>
        </View>
      </Card>

      <View
        style={{
          padding: spacing(4),
          backgroundColor: `${colors.primary}0D`,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: `${colors.primary}22`,
          borderLeftWidth: 3,
          borderLeftColor: colors.primary,
        }}
      >
        <Text
          style={[
            typography.label,
            { color: colors.textPrimary, marginBottom: 6, fontSize: 13 },
          ]}
        >
          Tip for students
        </Text>
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
          ]}
        >
          Changing a subject name to “Science Double Award” automatically
          switches to the double-grade scale and resets the grade.
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main content
// ─────────────────────────────────────────────────────────────────────────────
function EnterResultsContent() {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const colors = useTheme();

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 720) return "mobile";
    if (width < 1100) return "tablet";
    return "desktop";
  }, [width]);

  const isMobile = breakpoint === "mobile";
  const isTablet = breakpoint === "tablet";
  const isDesktop = breakpoint === "desktop";

  // Track the signed-in user so we know where to persist calculated points.
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return unsub;
  }, []);

  // Form state
  const [level, setLevel] = useState<Level>("BGCSE");
  const [track, setTrack] = useState<Track>("PURE");
  const [rows, setRows] = useState<ResultRow[]>(() =>
    buildRows("BGCSE", "PURE"),
  );

  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [calculation, setCalculation] = useState<ReturnType<
    typeof pickBestSix
  > | null>(null);
  const [savingPoints, setSavingPoints] = useState(false);

  const activeRow = useMemo(
    () => rows.find((r) => r.id === activeRowId) || null,
    [rows, activeRowId],
  );
  const availableTracks = useMemo(() => allowedTracksForLevel(level), [level]);
  const requiredSlots = useMemo(
    () => requiredSubjectSlots(level, track),
    [level, track],
  );
  const completedRows = useMemo(
    () => rows.filter((r) => r.subject.trim() && r.grade !== "").length,
    [rows],
  );
  const missingSubjects = useMemo(
    () => rows.filter((r) => !r.subject.trim()).length,
    [rows],
  );
  const missingGrades = useMemo(
    () => rows.filter((r) => r.grade === "").length,
    [rows],
  );
  const allFilled = useMemo(
    () =>
      rows.length >= requiredSlots &&
      rows.every((r) => r.subject.trim() && r.grade !== ""),
    [rows, requiredSlots],
  );
  const doubleAwardRowsCount = useMemo(
    () => rows.filter((r) => isDoubleAward(r.subject)).length,
    [rows],
  );

  const resetRowsFor = useCallback(
    (selectedLevel: Level, selectedTrack: Track) =>
      setRows(buildRows(selectedLevel, selectedTrack)),
    [],
  );
  const handleLevelChange = useCallback(
    (l: Level) => {
      const nextTrack: Track = l === "BGCSE" ? "PURE" : "ADVANCED";
      setLevel(l);
      setTrack(nextTrack);
      resetRowsFor(l, nextTrack);
    },
    [resetRowsFor],
  );
  const handleTrackChange = useCallback(
    (selectedTrack: Track) => {
      setTrack(selectedTrack);
      resetRowsFor(level, selectedTrack);
    },
    [level, resetRowsFor],
  );
  const handleAddRow = useCallback(
    () =>
      setRows((prev) => [
        ...prev,
        { id: uid("extra"), subject: "", grade: "" },
      ]),
    [],
  );
  const handleRemoveRow = useCallback(
    (id: string) => {
      setRows((prev) =>
        prev.length > requiredSlots ? prev.filter((r) => r.id !== id) : prev,
      );
    },
    [requiredSlots],
  );

  const handleSubjectChange = useCallback((rowId: string, text: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const nextIsDouble = isDoubleAward(text);
        const prevIsDouble = isDoubleAward(row.subject);
        return nextIsDouble !== prevIsDouble
          ? { ...row, subject: text, grade: "" }
          : { ...row, subject: text };
      }),
    );
  }, []);

  const handleGradePress = useCallback((id: string) => {
    setActiveRowId(id);
    setShowGradePicker(true);
  }, []);
  const handleGradeSelect = useCallback(
    (grade: Grade) => {
      if (!activeRowId) return;
      setRows((prev) =>
        prev.map((r) => (r.id === activeRowId ? { ...r, grade } : r)),
      );
      setShowGradePicker(false);
      setActiveRowId(null);
    },
    [activeRowId],
  );

  const handleClearAll = useCallback(
    () => resetRowsFor(level, track),
    [level, track, resetRowsFor],
  );

  const handleCalculate = useCallback(() => {
    if (!allFilled) {
      Alert.alert(
        "Incomplete Results",
        `Please complete all rows before calculating.\n\nMissing subjects: ${missingSubjects}\nMissing grades: ${missingGrades}`,
        [{ text: "OK" }],
      );
      return;
    }
    const result = pickBestSix(rows);
    setCalculation(result);
    // Persist immediately — well before the user ever taps "View Recommended
    // Courses" — so course-rec's AsyncStorage fallback always has something
    // fresh to read, even if the router params fail to arrive.
    persistResultsLocally(result);
    setShowConfirm(true);
  }, [allFilled, missingSubjects, missingGrades, rows]);

  const confirmCalculation = useCallback(() => {
    setShowConfirm(false);
    setShowResults(true);

    // Persist the calculation so the dashboard's "Your Points" card can show it.
    if (calculation && currentUser) {
      setSavingPoints(true);
      savePointsToProfile(currentUser.uid, calculation)
        .catch((err) => {
          console.error("[EnterResults] failed to save points:", err);
        })
        .finally(() => setSavingPoints(false));
    }
  }, [calculation, currentUser]);

  // Subject row input layout: only go two-column once we're truly off mobile.
  // Previously this was `width >= 560`, which still fires on mid/large phones
  // and crushes the subject + grade fields into an unreadable 2-column row.
  const inputTwoCol = !isMobile && width >= 560;

  return (
    <>
      <DashboardLayout
        title={t('Enter Results')}
        subtitle="Calculate your best 6 subject points"
        showPointsCard={false}
      >
        {/* Breadcrumb */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing(2.5),
            marginBottom: spacing(4),
            flexWrap: "wrap",
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: spacing(1.5),
              paddingHorizontal: spacing(3),
              paddingVertical: spacing(1.5),
              borderRadius: radii.lg,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons name="arrow-back" size={14} color={colors.primary} />
            <Text
              style={[
                typography.label,
                { color: colors.primary, fontSize: 12.5 },
              ]}
            >
              Back
            </Text>
          </Pressable>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Dashboard › Enter Results
          </Text>
        </View>

        <View
          style={{
            flexDirection: isDesktop ? "row" : "column",
            gap: spacing(isDesktop ? 7 : 5),
            alignItems: "flex-start",
            paddingBottom: spacing(isMobile ? 8 : 6),
          }}
        >
          <View
            style={{
              flex: 1,
              minWidth: 0,
              width: "100%",
              gap: spacing(isMobile ? 4 : 5),
            }}
          >
            {/* Hero */}
            <Card accent={colors.primary} intensity="lg">
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: spacing(3),
                  marginBottom: spacing(2),
                }}
              >
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      alignSelf: "flex-start",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing(1.5),
                      paddingHorizontal: spacing(2.5),
                      paddingVertical: spacing(1.25),
                      borderRadius: 999,
                      backgroundColor: `${colors.primary}14`,
                      borderWidth: 1,
                      borderColor: `${colors.primary}28`,
                      marginBottom: spacing(2.5),
                    }}
                  >
                    <Ionicons
                      name="calculator-outline"
                      size={12}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: colors.primary,
                          fontWeight: "800",
                          fontSize: 10.5,
                          letterSpacing: 0.3,
                        },
                      ]}
                    >
                      THUTO-BRIDGE CALCULATOR
                    </Text>
                  </View>
                  <Text
                    style={[
                      typography.hero,
                      {
                        color: colors.textPrimary,
                        fontSize: isMobile ? 22 : 30,
                        lineHeight: isMobile ? 28 : 36,
                      },
                    ]}
                  >
                    Enter Your Results
                  </Text>
                  <Text
                    style={[
                      typography.body,
                      {
                        color: colors.textSecondary,
                        marginTop: spacing(2),
                        maxWidth: 540,
                        lineHeight: 22,
                        fontSize: isMobile ? 13.5 : 15,
                      },
                    ]}
                  >
                    Choose your qualification, fill in every subject, and
                    calculate your best 6 points. Science Double Award is
                    handled automatically.
                  </Text>
                </View>
                {!isMobile && (
                  <View
                    style={{
                      paddingHorizontal: spacing(3),
                      paddingVertical: spacing(2),
                      borderRadius: 999,
                      backgroundColor: allFilled
                        ? `${colors.success}14`
                        : `${colors.primary}12`,
                      borderWidth: 1,
                      borderColor: allFilled
                        ? `${colors.success}30`
                        : `${colors.primary}28`,
                    }}
                  >
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: allFilled ? colors.success : colors.primary,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {allFilled ? "READY" : `${completedRows}/${rows.length}`}
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: spacing(2.5),
                  marginTop: spacing(3.5),
                }}
              >
                <StatCard
                  icon="school-outline"
                  label="Level"
                  value={level}
                  tone="primary"
                />
                <StatCard
                  icon="git-branch-outline"
                  label="Track"
                  value={track}
                />
                <StatCard
                  icon="list-outline"
                  label="Required"
                  value={`${requiredSlots}`}
                />
                <StatCard
                  icon="checkmark-done-outline"
                  label="Completed"
                  value={`${completedRows}/${rows.length}`}
                  tone={allFilled ? "success" : "neutral"}
                />
              </View>

              <View style={{ marginTop: spacing(4) }}>
                <CompletionBar
                  completed={completedRows}
                  total={rows.length}
                  colors={colors}
                />
              </View>
            </Card>

            {/* Qualification */}
            <Card accent={colors.primary}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: spacing(4),
                  flexWrap: "wrap",
                  gap: spacing(2),
                }}
              >
                <View>
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: colors.textMuted,
                        fontWeight: "700",
                        letterSpacing: 0.3,
                      },
                    ]}
                  >
                    EXAM SETUP
                  </Text>
                  <Text
                    style={[
                      typography.h2,
                      { color: colors.textPrimary, fontSize: 17, marginTop: 2 },
                    ]}
                  >
                    Qualification & Track
                  </Text>
                </View>
                <Pressable
                  onPress={handleClearAll}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing(1.5),
                    paddingHorizontal: spacing(3),
                    paddingVertical: spacing(2),
                    borderRadius: 10,
                    backgroundColor: colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.textSecondary, fontWeight: "700" },
                    ]}
                  >
                    Reset
                  </Text>
                </Pressable>
              </View>

              <Text
                style={[
                  typography.caption,
                  {
                    color: colors.textMuted,
                    fontWeight: "700",
                    marginBottom: spacing(2),
                  },
                ]}
              >
                LEVEL
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: spacing(2.5),
                  marginBottom: spacing(4),
                }}
              >
                {(["BGCSE", "IGCSE"] as const).map((l) => (
                  <SegButton
                    key={l}
                    label={l}
                    active={level === l}
                    onPress={() => handleLevelChange(l)}
                    grow={isMobile}
                  />
                ))}
              </View>

              <Text
                style={[
                  typography.caption,
                  {
                    color: colors.textMuted,
                    fontWeight: "700",
                    marginBottom: spacing(2),
                  },
                ]}
              >
                TRACK
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: spacing(2.5),
                  marginBottom: spacing(4),
                }}
              >
                {availableTracks.map((trackOption) => (
                  <SegButton
                    key={trackOption}
                    label={t(trackOption)}
                    active={track === trackOption}
                    onPress={() => handleTrackChange(trackOption)}
                    grow={isMobile}
                  />
                ))}
              </View>

              <View
                style={{
                  padding: spacing(3.5),
                  borderRadius: 14,
                  backgroundColor: `${colors.primary}0E`,
                  borderWidth: 1,
                  borderColor: `${colors.primary}22`,
                  flexDirection: "row",
                  gap: spacing(2.5),
                  alignItems: "flex-start",
                }}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.primary}
                  style={{ marginTop: 1 }}
                />
                <Text
                  style={[
                    typography.body,
                    {
                      color: colors.textSecondary,
                      flex: 1,
                      fontSize: 13,
                      lineHeight: 19,
                    },
                  ]}
                >
                  {requiredSlots} subject slots including optional subjects.
                  Best 6 are used for your points total. Science Double Award
                  counts as 2 subjects.
                </Text>
              </View>
            </Card>

            {/* Subjects */}
            <Card accent={colors.primary}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: spacing(4),
                  gap: spacing(2),
                  flexWrap: isMobile ? "wrap" : "nowrap",
                }}
              >
                <View style={{ flex: 1, minWidth: 180 }}>
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: colors.textMuted,
                        fontWeight: "700",
                        letterSpacing: 0.3,
                      },
                    ]}
                  >
                    {t('SUBJECT')}S & GRADES
                  </Text>
                  <Text
                    style={[
                      typography.h2,
                      { color: colors.textPrimary, fontSize: 17, marginTop: 2 },
                    ]}
                  >
                    Your Subjects
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: spacing(2.5),
                    paddingVertical: spacing(1.5),
                    borderRadius: 999,
                    backgroundColor: allFilled
                      ? `${colors.success}14`
                      : colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: allFilled
                      ? `${colors.success}30`
                      : colors.border,
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: allFilled
                          ? colors.success
                          : colors.textSecondary,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {completedRows}/{rows.length}
                  </Text>
                </View>
              </View>

              <View style={{ gap: spacing(3.5) }}>
                {rows.map((row, index) => (
                  <SubjectRow
                    key={row.id}
                    row={row}
                    index={index}
                    canRemove={rows.length > requiredSlots}
                    onSubjectChange={handleSubjectChange}
                    onGradePress={handleGradePress}
                    onRemove={handleRemoveRow}
                    inputTwoCol={inputTwoCol}
                  />
                ))}
              </View>

              {/* Add / Reset row actions */}
              <View
                style={{
                  flexDirection: "row",
                  gap: spacing(2.5),
                  marginTop: spacing(4),
                  flexWrap: "wrap",
                }}
              >
                <Pressable
                  onPress={handleAddRow}
                  style={({ pressed }) => ({
                    flexGrow: 1,
                    minWidth: 160,
                    height: 50,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}0F`,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: spacing(2),
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={17}
                    color={colors.primary}
                  />
                  <Text style={[typography.label, { color: colors.primary }]}>
                    {t('Add Subject')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleClearAll}
                  style={({ pressed }) => ({
                    flexGrow: 1,
                    minWidth: 140,
                    height: 50,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceAlt,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: spacing(2),
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[typography.label, { color: colors.textSecondary }]}
                  >
                    Reset
                  </Text>
                </Pressable>
              </View>

              {/* Calculate button – centered and comfortable on mobile */}
              <View
                style={{
                  alignItems: "center",
                  marginTop: spacing(isMobile ? 5 : 4.5),
                }}
              >
                <Pressable
                  onPress={handleCalculate}
                  disabled={!allFilled}
                  style={({ pressed }) => ({
                    width: isMobile ? "88%" : "100%",
                    maxWidth: isMobile ? 360 : undefined,
                    height: isMobile ? 58 : 56,
                    borderRadius: isMobile ? 18 : 14,
                    backgroundColor: allFilled
                      ? colors.primary
                      : colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: allFilled ? colors.primary : colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: spacing(2.5),
                    opacity: allFilled ? (pressed ? 0.9 : 1) : 0.55,
                    transform: [{ scale: pressed && allFilled ? 0.98 : 1 }],
                  })}
                >
                  <Ionicons
                    name="calculator-outline"
                    size={18}
                    color={allFilled ? "#fff" : colors.textMuted}
                  />
                  <Text
                    style={[
                      typography.label,
                      {
                        color: allFilled ? "#fff" : colors.textMuted,
                        letterSpacing: 0.2,
                        fontSize: isMobile ? 14 : undefined,
                      },
                    ]}
                  >
                    CALCULATE POINTS{" "}
                    {allFilled ? "" : `(${completedRows}/${rows.length})`}
                  </Text>
                </Pressable>

                {isMobile && (
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: allFilled ? colors.success : colors.textMuted,
                        textAlign: "center",
                        marginTop: spacing(2),
                        lineHeight: 17,
                      },
                    ]}
                  >
                    {allFilled
                      ? "Ready — tap to calculate your best 6 subjects."
                      : "Complete all subjects and grades to enable calculation."}
                  </Text>
                )}
              </View>
            </Card>

          </View>

          {isDesktop && (
            <View style={{ position: "sticky", top: 16 } as any}>
              <SidebarPanel
                rows={rows}
                missingSubjects={missingSubjects}
                missingGrades={missingGrades}
                doubleAwardRowsCount={doubleAwardRowsCount}
                onAddRow={handleAddRow}
                onReset={handleClearAll}
                completedRows={completedRows}
              />
            </View>
          )}
        </View>

        {/* Shared responsive student footer */}
        <StudentFooter
          topSpacing={isMobile ? spacing(8) : spacing(10)}
          maxWidth={1280}
        />
      </DashboardLayout>

      {/* Modals */}
      <GradePickerModal
        visible={showGradePicker}
        activeRow={activeRow}
        onSelect={handleGradeSelect}
        onClose={() => {
          setShowGradePicker(false);
          setActiveRowId(null);
        }}
      />
      <ConfirmModal
        visible={showConfirm}
        count={rows.length}
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

export default function EnterResults() {
  return (
    <StudentMenuProvider>
      <EnterResultsContent />
    </StudentMenuProvider>
  );
}
