import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Platform,
  useWindowDimensions,
  Animated,
  Easing,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { spacing, typography, radii, useTheme } from "./DashboardLayout";
import { useLanguage } from "../../contexts/LanguageContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** What kind of opportunity the user tapped "Apply" on. Drives copy + icon. */
export type ApplyTargetType = "course" | "scholarship";

export type ApplyRedirectModalProps = {
  /** Controls modal visibility. */
  visible: boolean;
  /** Called when the user dismisses the modal (backdrop tap, X, or CTA). */
  onClose: () => void;
  /** 'course' or 'scholarship' — tailors the copy and icon shown. */
  targetType?: ApplyTargetType;
  /** Name of the specific course or scholarship the user tapped Apply on. */
  targetTitle?: string;
  /** Name of the institution or provider who ultimately hosts the application. */
  providerName?: string;
};

type RoadmapStage = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const ROADMAP_STAGES: RoadmapStage[] = [
  { key: "development", label: "In Development", icon: "code-slash-outline" },
  { key: "testing", label: "Testing & Beta", icon: "flask-outline" },
  { key: "launch", label: "Public Launch", icon: "rocket-outline" },
];

// Thuto-Bridge is currently in the first stage. Bump this to 1 once beta
// testing begins, and to 2 at public launch, to keep this indicator honest.
const CURRENT_STAGE_INDEX = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Roadmap stepper — the modal's signature element. It doubles as an honest,
// at-a-glance status of the redirect feature rather than a decorative device.
// ─────────────────────────────────────────────────────────────────────────────
function RoadmapStepper({ compact }: { compact: boolean }) {
  const colors = useTheme();
  const { t } = useLanguage();

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      {ROADMAP_STAGES.map((stage, i) => {
        const isDone = i < CURRENT_STAGE_INDEX;
        const isActive = i === CURRENT_STAGE_INDEX;
        const isLast = i === ROADMAP_STAGES.length - 1;

        const dotColor = isDone || isActive ? colors.primary : colors.border;
        const dotBg = isActive
          ? colors.primary
          : isDone
            ? `${colors.primary}22`
            : colors.surfaceAlt;
        const iconColor = isActive
          ? "#fff"
          : isDone
            ? colors.primary
            : colors.textMuted;
        const lineColor = isDone ? colors.primary : colors.border;

        return (
          <React.Fragment key={stage.key}>
            <View style={{ alignItems: "center", width: compact ? 74 : 88 }}>
              <View
                style={{
                  width: compact ? 34 : 40,
                  height: compact ? 34 : 40,
                  borderRadius: 999,
                  backgroundColor: dotBg,
                  borderWidth: isActive ? 0 : 1.5,
                  borderColor: dotColor,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={stage.icon}
                  size={compact ? 15 : 17}
                  color={iconColor}
                />
              </View>
              <Text
                style={[
                  typography.caption,
                  {
                    color: isActive ? colors.textPrimary : colors.textMuted,
                    fontWeight: isActive ? "700" : "500",
                    fontSize: compact ? 9.5 : 10.5,
                    textAlign: "center",
                    marginTop: spacing(2),
                    lineHeight: compact ? 12 : 13,
                  },
                ]}
              >
                {t(stage.label)}
              </Text>
              {isActive && (
                <View
                  style={{
                    marginTop: spacing(1),
                    paddingHorizontal: spacing(2),
                    paddingVertical: 2,
                    borderRadius: radii.pill,
                    backgroundColor: `${colors.warning}1E`,
                    borderWidth: 1,
                    borderColor: `${colors.warning}44`,
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: colors.warning,
                        fontWeight: "700",
                        fontSize: 8.5,
                      },
                    ]}
                  >
                    WE ARE HERE
                  </Text>
                </View>
              )}
            </View>

            {!isLast && (
              <View
                style={{
                  flex: 1,
                  height: 1.5,
                  backgroundColor: lineColor,
                  marginTop: compact ? 17 : 20,
                  marginHorizontal: -6,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Layered icon badge — a destination glyph (compass) with a small "in
// progress" clock badge overlapping it, so the icon itself communicates
// "you're headed somewhere, it's just not open yet."
// ─────────────────────────────────────────────────────────────────────────────
function DestinationBadge({ size = 72 }: { size?: number }) {
  const colors = useTheme();
  const badgeSize = Math.round(size * 0.44);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Soft outer glow rings */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: `${colors.primary}12`,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size * 0.8,
          height: size * 0.8,
          borderRadius: 999,
          backgroundColor: `${colors.primary}1C`,
        }}
      />
      {/* Core badge */}
      <View
        style={{
          width: size * 0.64,
          height: size * 0.64,
          borderRadius: 999,
          backgroundColor: `${colors.primary}22`,
          borderWidth: 1.5,
          borderColor: `${colors.primary}44`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name="compass-outline"
          size={size * 0.32}
          color={colors.primary}
        />
      </View>
      {/* Overlapping "in progress" badge */}
      <View
        style={{
          position: "absolute",
          right: size * 0.02,
          top: size * 0.02,
          width: badgeSize,
          height: badgeSize,
          borderRadius: 999,
          backgroundColor: colors.warning,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2.5,
          borderColor: colors.card,
        }}
      >
        <Ionicons
          name="hourglass-outline"
          size={badgeSize * 0.52}
          color="#fff"
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function ApplyRedirectModal({
  visible,
  onClose,
  targetType = "scholarship",
  targetTitle,
  providerName,
}: ApplyRedirectModalProps) {
  const colors = useTheme();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Entrance animation: soft fade + rise + scale, feels intentional rather
  // than the default abrupt modal pop.
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, progress]);

  const cardAnimatedStyle = {
    opacity: progress,
    transform: [
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.93, 1],
        }),
      },
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };

  const isScholarship = targetType === "scholarship";
  const noun = isScholarship ? "scholarship" : "course";
  const displayedNoun = t(noun);
  const destinationLabel = isScholarship
    ? "application page"
    : "admissions page";
  const providerPossessive = providerName
    ? `${providerName}’s`
    : `the official ${noun} provider’s`;

  const cardMaxWidth = 460;
  const cardStyle: ViewStyle = {
    width: isMobile ? "100%" : cardMaxWidth,
    maxWidth: cardMaxWidth,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(10, 14, 20, 0.62)",
          alignItems: "center",
          justifyContent: "center",
          padding: spacing(5),
        }}
      >
        <Animated.View style={[cardStyle, cardAnimatedStyle]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: radii.xxl,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: "hidden",
                ...Platform.select({
                  ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 16 },
                    shadowOpacity: 0.3,
                    shadowRadius: 30,
                  },
                  android: { elevation: 14 },
                  web: { boxShadow: "0 24px 60px rgba(0,0,0,0.35)" } as any,
                  default: {},
                }),
              }}
            >
              {/* Top accent */}
              <View style={{ height: 4, backgroundColor: colors.primary }} />

              {/* Close button */}
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
                hitSlop={8}
                style={({ pressed }) => ({
                  position: "absolute",
                  top: spacing(4),
                  right: spacing(4),
                  zIndex: 2,
                  width: 34,
                  height: 34,
                  borderRadius: radii.lg,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="close" size={17} color={colors.textSecondary} />
              </Pressable>

              <View
                style={{
                  padding: isMobile ? spacing(6) : spacing(8),
                  paddingTop: isMobile ? spacing(7) : spacing(8),
                  gap: spacing(6),
                }}
              >
                {/* Icon + heading */}
                <View style={{ alignItems: "center", gap: spacing(4) }}>
                  <DestinationBadge size={isMobile ? 64 : 72} />

                  <View style={{ alignItems: "center", gap: spacing(2) }}>
                    <Text
                      style={[
                        typography.h2,
                        {
                          color: colors.textPrimary,
                          textAlign: "center",
                          fontSize: isMobile ? 18 : 20,
                        },
                      ]}
                    >
                      Applications Open Soon
                    </Text>
                    <Text
                      style={[
                        typography.body,
                        {
                          color: colors.textSecondary,
                          textAlign: "center",
                          lineHeight: 21,
                          fontSize: isMobile ? 13.5 : 14.5,
                        },
                      ]}
                    >
                      Thuto-Bridge is still being built. Once we've finished
                      testing, tapping{" "}
                      <Text
                        style={{ fontWeight: "700", color: colors.textPrimary }}
                      >
                        Apply
                      </Text>{" "}
                      on{" "}
                      {targetTitle ? (
                        <Text
                          style={{
                            fontWeight: "700",
                            color: colors.textPrimary,
                          }}
                        >
                          “{targetTitle}”
                        </Text>
                      ) : (
                        `this ${noun}`
                      )}{" "}
                      will take you straight to {providerPossessive} official{" "}
                      {destinationLabel} — no extra steps needed.
                    </Text>
                  </View>
                </View>

                {/* Roadmap */}
                <View
                  style={{
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: radii.xl,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: isMobile ? spacing(4) : spacing(5),
                    gap: spacing(4),
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: colors.textMuted,
                        letterSpacing: 0.5,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    OUR ROADMAP TO LAUNCH
                  </Text>
                  <RoadmapStepper compact={isMobile} />
                </View>

                {/* Reassurance strip */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: spacing(3),
                    padding: spacing(4),
                    backgroundColor: `${colors.success}12`,
                    borderRadius: radii.lg,
                    borderLeftWidth: 3,
                    borderLeftColor: colors.success,
                  }}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={17}
                    color={colors.success}
                    style={{ marginTop: 1 }}
                  />
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.textSecondary, flex: 1, lineHeight: 17 },
                    ]}
                  >
                    You won't lose your place. Browse and shortlist
                    opportunities now — full applications unlock the moment we
                    go live.
                  </Text>
                </View>

                {/* CTA */}
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => ({
                    height: 52,
                    borderRadius: radii.lg,
                    backgroundColor: colors.primary,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: spacing(2),
                    opacity: pressed ? 0.88 : 1,
                    transform: pressed ? [{ scale: 0.985 }] : [],
                  })}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#fff"
                  />
                  <Text style={[typography.label, { color: "#fff" }]}>
                    Got It, Thanks
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}