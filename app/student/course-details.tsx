import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
  Alert,
  ActivityIndicator,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StudentMenuProvider } from "../../components/student/StudentMenu";
import ApplyRedirectModal from "../../components/student/ApplyRedirectModal";

// ─────────────────────────────────────────────────────────────────────────────
// DashboardLayout & design tokens
// ─────────────────────────────────────────────────────────────────────────────
import DashboardLayout, {
  spacing,
  typography,
  radii,
  useTheme,
} from "../../components/student/DashboardLayout";

// ─────────────────────────────────────────────────────────────────────────────
// Firebase
// ─────────────────────────────────────────────────────────────────────────────
import { auth, db } from "../../constants/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  getSavedItemsErrorMessage,
  isItemSaved,
  saveItem,
} from "../../services/savedItemsService";
import { doc, getDoc } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Breakpoint = "mobile" | "tablet" | "desktop";

type Course = {
  id: string;
  title: string;
  qualificationLevel: string;
  duration: string;
  requiredPoints: number;
  tuitionPerYear?: number;
  mode: string;
  about: string;
  institutionId: string;
  facultyId: string;
  entryRequirements?: string[];
  careers?: string[];
};

type Institution = {
  id: string;
  name: string;
  badge: string;
  location: string;
  ownership: string;
  accentColor: string;
};

type Faculty = {
  id: string;
  name: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Elevation helper
// ─────────────────────────────────────────────────────────────────────────────
function useElevation(intensity: "sm" | "md" | "lg" = "md"): ViewStyle {
  return useMemo<ViewStyle>(() => {
    const opacity = 0.28;
    const radius = intensity === "sm" ? 6 : intensity === "md" ? 14 : 22;
    const offsetY = intensity === "sm" ? 2 : intensity === "md" ? 5 : 10;
    return (Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: offsetY },
        shadowOpacity: opacity,
        shadowRadius: radius,
      },
      android: {
        elevation: intensity === "sm" ? 3 : intensity === "md" ? 6 : 12,
      },
      web: {
        boxShadow: `0 ${offsetY}px ${radius * 1.5}px rgba(0,0,0,${opacity})`,
      } as any,
      default: {},
    }) ?? {}) as ViewStyle;
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable Components
// ─────────────────────────────────────────────────────────────────────────────
function Card({
  children,
  style,
  intensity = "md",
  accentColor,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: "sm" | "md" | "lg";
  accentColor?: string;
}) {
  const elevation = useElevation(intensity);
  const colors = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
        },
        elevation,
        style,
      ]}
    >
      {accentColor && (
        <View style={{ height: 3, backgroundColor: accentColor }} />
      )}
      {children}
    </View>
  );
}

function SectionLabel({ title }: { title: string }) {
  const colors = useTheme();
  return (
    <Text
      style={[
        typography.caption,
        {
          color: colors.textMuted,
          letterSpacing: 0.5,
          marginBottom: spacing(3),
        },
      ]}
    >
      {title.toUpperCase()}
    </Text>
  );
}

function SectionTitle({
  title,
  icon,
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const colors = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing(3),
        marginBottom: spacing(4),
      }}
    >
      {icon && <Ionicons name={icon} size={20} color={colors.primary} />}
      <Text style={[typography.h2, { color: colors.textPrimary }]}>
        {title}
      </Text>
    </View>
  );
}

function FactItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const colors = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing(3),
        paddingVertical: spacing(2),
        flex: 1,
        minWidth: 160,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: radii.lg,
          backgroundColor: `${colors.primary}22`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <Text
          style={[
            typography.bodyStrong,
            { color: colors.textPrimary, marginTop: 2 },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  const colors = useTheme();
  return (
    <View style={{ gap: spacing(3) }}>
      {items.map((item, idx) => (
        <View
          key={idx}
          style={{
            flexDirection: "row",
            gap: spacing(3),
            alignItems: "flex-start",
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: colors.primary,
              marginTop: 8,
              flexShrink: 0,
            }}
          />
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, flex: 1, lineHeight: 22 },
            ]}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Content
// ─────────────────────────────────────────────────────────────────────────────
function CourseDetailsContent() {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const courseId = typeof params.id === "string" ? params.id : "";

  const [course, setCourse] = useState<Course | null>(null);
  const [institution, setInstitution] = useState<any>(null);
  const [faculty, setFaculty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [applyModalVisible, setApplyModalVisible] = useState(false);

  const breakpoint = useMemo<Breakpoint>(
    () => (width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop"),
    [width],
  );
  const isMobile = breakpoint === "mobile";
  const isDesktop = breakpoint === "desktop";

  // Keep the bookmark state synced with this Firebase account.
  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      if (!user || !courseId) {
        setSaved(false);
        return;
      }

      try {
        const exists = await isItemSaved("course", courseId);
        if (active) setSaved(exists);
      } catch (saveStateError) {
        console.warn("Could not read saved course state:", saveStateError);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [courseId]);

  // Fetch full course data
  useEffect(() => {
    if (!courseId) {
      setError("Course ID not found");
      setLoading(false);
      return;
    }

    const fetchFullCourse = async () => {
      try {
        setLoading(true);
        setError(null);

        const courseDoc = await getDoc(doc(db, "courses", courseId));
        if (!courseDoc.exists()) {
          setError("Course not found");
          return;
        }

        const c = courseDoc.data();

        const courseData: Course = {
          id: courseDoc.id,
          title: c.title || "Untitled Course",
          qualificationLevel: c.qualificationLevel || "Bachelor Degree",
          duration: c.duration || "4 Years",
          requiredPoints: c.requiredPoints || 0,
          tuitionPerYear: c.tuitionPerYear || 25000,
          mode: c.mode || "Full-time",
          about: c.about || "No detailed description available.",
          institutionId: c.institutionId,
          facultyId: c.facultyId,
          entryRequirements: c.entryRequirements?.subjectRequirements?.map(
            (s: any) => `${s.subject} - Minimum ${s.minimumGrade}`,
          ) || ["Meet minimum entry points"],
          careers:
            Array.isArray(c.careers) && c.careers.length > 0
              ? c.careers
              : ["Various career opportunities"],
        };
        setCourse(courseData);

        // Fetch Institution
        if (c.institutionId) {
          const instDoc = await getDoc(
            doc(db, "institutions", c.institutionId),
          );
          if (instDoc.exists()) {
            const i = instDoc.data();
            setInstitution({
              id: instDoc.id,
              name: i.name,
              badge: i.badge || "INST",
              location: i.location || "Botswana",
              ownership: i.ownership || "Public",
              accentColor: i.ownership === "Private" ? "#34D399" : "#60A5FA",
            });
          }
        }

        // Fetch Faculty
        if (c.facultyId) {
          const facDoc = await getDoc(doc(db, "faculties", c.facultyId));
          if (facDoc.exists()) {
            setFaculty({ name: facDoc.data().name || "General Faculty" });
          }
        }
      } catch (err: any) {
        console.error("COURSE DETAILS ERROR:", err);
        setError("Failed to load course information");
      } finally {
        setLoading(false);
      }
    };

    fetchFullCourse();
  }, [courseId]);

  const handleApply = () => setApplyModalVisible(true);
  const handleCloseApplyModal = () => setApplyModalVisible(false);

  const handleSave = async () => {
    if (!course) return;

    if (!auth.currentUser) {
      Alert.alert(
        "Sign in required",
        "Please sign in before saving a course so it can sync across your devices.",
      );
      return;
    }

    try {
      if (await isItemSaved("course", course.id)) {
        setSaved(true);
        Alert.alert(
          "Already saved",
          `${course.title} is already available in your Saved Courses.`,
          [
            { text: "View Saved", onPress: () => router.push("/student/saved") },
            { text: "OK" },
          ],
        );
        return;
      }

      await saveItem("course", {
        id: course.id,
        title: course.title,
        institution: institution?.name ?? "Unknown Institution",
        institutionId: course.institutionId,
        facultyId: course.facultyId,
        duration: course.duration,
        fee: `BWP ${(course.tuitionPerYear ?? 25000).toLocaleString()}/yr`,
        level: course.qualificationLevel,
        requiredPoints: course.requiredPoints,
      });

      setSaved(true);
      Alert.alert(
        "Course saved",
        `${course.title} has been saved to your account and will be available on your other devices.`,
        [
          { text: "View Saved", onPress: () => router.push("/student/saved") },
          { text: "Done" },
        ],
      );
    } catch (saveError) {
      console.error("Failed to save course:", saveError);
      Alert.alert(
        "Could not save course",
        getSavedItemsErrorMessage(saveError),
      );
    }
  };

  const handleShare = () => Alert.alert("Share", `Sharing ${course?.title}`);

  if (loading) {
    return (
      <DashboardLayout
        title="Course Details"
        subtitle="Loading..."
        showPointsCard={false}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: spacing(12),
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, marginTop: spacing(4) },
            ]}
          >
            Loading comprehensive course details...
          </Text>
        </View>
      </DashboardLayout>
    );
  }

  if (error || !course) {
    return (
      <DashboardLayout
        title="Course Details"
        subtitle="Error"
        showPointsCard={false}
      >
        <View style={{ padding: spacing(8), alignItems: "center" }}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={colors.danger}
          />
          <Text
            style={[
              typography.h2,
              {
                color: colors.textPrimary,
                marginTop: spacing(4),
                textAlign: "center",
              },
            ]}
          >
            {error || "Course not found"}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{
              marginTop: spacing(6),
              paddingHorizontal: spacing(6),
              paddingVertical: spacing(3),
              backgroundColor: colors.primary,
              borderRadius: radii.lg,
            }}
          >
            <Text style={[typography.label, { color: "#fff" }]}>Go Back</Text>
          </Pressable>
        </View>
      </DashboardLayout>
    );
  }

  return (
    <>
      <DashboardLayout
        title="Course Details"
        subtitle={course.title}
        showPointsCard={false}
      >
        {/* Back + Breadcrumb */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing(3),
            marginBottom: spacing(6),
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: spacing(2),
              paddingHorizontal: spacing(4),
              paddingVertical: spacing(2),
              borderRadius: radii.lg,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons name="arrow-back" size={17} color={colors.primary} />
            <Text style={[typography.label, { color: colors.primary }]}>
              Back
            </Text>
          </Pressable>
          <Text
            style={[typography.caption, { color: colors.textMuted, flex: 1 }]}
            numberOfLines={1}
          >
            Courses › {institution?.badge || ""} › {course.title}
          </Text>
        </View>

        <View
          style={{
            flexDirection: isDesktop ? "row" : "column",
            gap: spacing(8),
          }}
        >
          {/* Main Content */}
          <View style={{ flex: 1 }}>
            {/* Hero Card */}
            <Card
              intensity="lg"
              accentColor={institution?.accentColor}
              style={{ marginBottom: spacing(7) }}
            >
              <View
                style={{
                  padding: isMobile ? spacing(5) : spacing(7),
                  gap: spacing(5),
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: spacing(2),
                  }}
                >
                  <View
                    style={{
                      paddingHorizontal: spacing(3),
                      paddingVertical: spacing(2),
                      borderRadius: radii.pill,
                      backgroundColor: `${institution?.accentColor}1A`,
                      borderWidth: 1,
                      borderColor: `${institution?.accentColor}44`,
                    }}
                  >
                    <Text
                      style={[
                        typography.label,
                        { color: institution?.accentColor },
                      ]}
                    >
                      {institution?.badge}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: spacing(3),
                      paddingVertical: spacing(2),
                      borderRadius: radii.pill,
                      backgroundColor: colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.textSecondary, fontWeight: "700" },
                      ]}
                    >
                      {course.qualificationLevel} • {course.duration}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    typography.hero,
                    {
                      color: colors.textPrimary,
                      fontSize: isMobile ? 24 : 32,
                      lineHeight: isMobile ? 30 : 38,
                    },
                  ]}
                >
                  {course.title}
                </Text>

                <Text
                  style={[typography.subtitle, { color: colors.textSecondary }]}
                >
                  {institution?.name}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing(4),
                    marginTop: spacing(1),
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing(2),
                    }}
                  >
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={institution?.accentColor}
                    />
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {institution?.location}
                    </Text>
                  </View>
                  {faculty && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: spacing(2),
                      }}
                    >
                      <Ionicons
                        name="layers-outline"
                        size={14}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          typography.caption,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {faculty.name}
                      </Text>
                    </View>
                  )}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: spacing(4),
                    paddingTop: spacing(4),
                    borderTopWidth: 1,
                    borderTopColor: colors.divider,
                  }}
                >
                  <FactItem
                    icon="analytics-outline"
                    label="Required Points"
                    value={course.requiredPoints.toString()}
                  />
                  <FactItem
                    icon="time-outline"
                    label="Duration"
                    value={course.duration}
                  />
                  <FactItem
                    icon="calendar-outline"
                    label="Mode"
                    value={course.mode}
                  />
                  <FactItem
                    icon="cash-outline"
                    label="Tuition / Year"
                    value={`BWP ${course.tuitionPerYear?.toLocaleString() || "25,000"}`}
                  />
                </View>
              </View>
            </Card>

            {/* About */}
            <Card style={{ marginBottom: spacing(6) }}>
              <View style={{ padding: spacing(6) }}>
                <SectionLabel title="Programme Overview" />
                <SectionTitle
                  title="About this Course"
                  icon="information-circle-outline"
                />
                <Text
                  style={[
                    typography.body,
                    { color: colors.textSecondary, lineHeight: 24 },
                  ]}
                >
                  {course.about}
                </Text>
              </View>
            </Card>

            {/* Entry Requirements */}
            <Card style={{ marginBottom: spacing(6) }}>
              <View style={{ padding: spacing(6) }}>
                <SectionLabel title="Admission" />
                <SectionTitle
                  title="Entry Requirements"
                  icon="school-outline"
                />
                <BulletList
                  items={
                    course.entryRequirements || [
                      "Minimum required points must be met",
                    ]
                  }
                />
              </View>
            </Card>

            {/* Careers */}
            <Card style={{ marginBottom: spacing(6) }}>
              <View style={{ padding: spacing(6) }}>
                <SectionLabel title="Future Opportunities" />
                <SectionTitle title="Careers" icon="briefcase-outline" />
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: spacing(2),
                  }}
                >
                  {(course.careers || ["Excellent career prospects"]).map(
                    (career, idx) => (
                      <View
                        key={idx}
                        style={{
                          paddingHorizontal: spacing(4),
                          paddingVertical: spacing(2),
                          backgroundColor: colors.surfaceAlt,
                          borderRadius: radii.pill,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text
                          style={[
                            typography.caption,
                            { color: colors.textPrimary, fontWeight: "600" },
                          ]}
                        >
                          {career}
                        </Text>
                      </View>
                    ),
                  )}
                </View>
              </View>
            </Card>
          </View>

          {/* Desktop Sidebar */}
          {isDesktop && (
            <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
              <Card intensity="md">
                <View style={{ padding: spacing(6), gap: spacing(4) }}>
                  <SectionLabel title="Actions" />
                  <SectionTitle title="Quick Actions" />
                  <Pressable
                    onPress={handleApply}
                    style={({ pressed }) => ({
                      padding: spacing(4),
                      backgroundColor: colors.primary,
                      borderRadius: radii.lg,
                      alignItems: "center",
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Text style={[typography.label, { color: "#fff" }]}>
                      Apply Now
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSave}
                    style={({ pressed }) => ({
                      padding: spacing(4),
                      backgroundColor: colors.surfaceAlt,
                      borderRadius: radii.lg,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center",
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Text style={[typography.label, { color: colors.primary }]}>
                      {saved ? "Saved ✓" : "Save for Later"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleShare}
                    style={({ pressed }) => ({
                      padding: spacing(4),
                      backgroundColor: colors.surfaceAlt,
                      borderRadius: radii.lg,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center",
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Text
                      style={[
                        typography.label,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Share Course
                    </Text>
                  </Pressable>
                </View>
              </Card>
            </View>
          )}
        </View>
      </DashboardLayout>

      {/* Mobile Sticky Bar */}
      {isMobile && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            flexDirection: "row",
            padding: spacing(5),
            paddingBottom: spacing(8),
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: spacing(3),
          }}
        >
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => ({
              flex: 1,
              height: 52,
              borderRadius: radii.lg,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={[typography.label, { color: colors.primary }]}>
              {saved ? "Saved" : "Save"}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleApply}
            style={({ pressed }) => ({
              flex: 2,
              height: 52,
              borderRadius: radii.lg,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={[typography.label, { color: "#fff" }]}>Apply Now</Text>
          </Pressable>
        </View>
      )}

      <ApplyRedirectModal
        visible={applyModalVisible}
        onClose={handleCloseApplyModal}
        targetType="course"
        targetTitle={course.title}
        providerName={institution?.name}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
export default function CourseDetailsScreen() {
  return (
    <StudentMenuProvider>
      <CourseDetailsContent />
    </StudentMenuProvider>
  );
}