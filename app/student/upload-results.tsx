// app/student/upload-results.tsx

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import DashboardLayout, {
  spacing,
  radii,
  typography,
  useTheme,
} from '../../components/student/DashboardLayout';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

type UploadedFile = {
  name: string;
  size?: number;
  mimeType?: string;
};

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const MAX_WIDTH = 1320;

function getBreakpoint(width: number): Breakpoint {
  if (width < 640) return 'mobile';
  if (width < 1100) return 'tablet';
  return 'desktop';
}

// ─────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────

export default function UploadResultsScreen() {
  const { width } = useWindowDimensions();
  const colors = useTheme();

  const breakpoint = useMemo(() => getBreakpoint(width), [width]);

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';

  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  // ───────────────────────────────────────────────────────────
  // Pick File
  // ───────────────────────────────────────────────────────────

  const handlePickFile = useCallback(async () => {
    try {
      setIsUploading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/jpg',
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];

        setUploadedFile({
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType,
        });
      }
    } catch (error) {
      Alert.alert(
        'Upload Failed',
        'Something went wrong while selecting your file.'
      );
    } finally {
      setIsUploading(false);
    }
  }, []);

  // ───────────────────────────────────────────────────────────
  // Remove File
  // ───────────────────────────────────────────────────────────

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
  }, []);

  // ───────────────────────────────────────────────────────────
  // Process File
  // ───────────────────────────────────────────────────────────

  const handleProcessFile = useCallback(() => {
    if (!uploadedFile) return;

    Alert.alert(
      'Processing Results',
      `${uploadedFile.name} is ready for backend processing integration.`
    );
  }, [uploadedFile]);

  // ───────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';

    const mb = bytes / (1024 * 1024);

    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${mb.toFixed(2)} MB`;
  };

  // ───────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────

  return (
    <DashboardLayout
      title="Upload Results"
      subtitle="Upload your academic certificate or statement of results"
      showPointsCard={false}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: spacing(12),
        }}
      >
        <View
          style={[
            styles.container,
            {
              maxWidth: MAX_WIDTH,
              alignSelf: 'center',
              width: '100%',
            },
          ]}
        >
          {/* Hero */}
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.heroContent,
                isMobile && {
                  flexDirection: 'column',
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <View
                  style={[
                    styles.heroIconWrap,
                    {
                      backgroundColor: 'rgba(96,165,250,0.15)',
                    },
                  ]}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={32}
                    color={colors.primary}
                  />
                </View>

                <Text
                  style={[
                    typography.h1,
                    {
                      color: colors.textPrimary,
                      marginTop: spacing(4),
                    },
                  ]}
                >
                  Upload Academic Results
                </Text>

                <Text
                  style={[
                    typography.body,
                    {
                      color: colors.textSecondary,
                      marginTop: spacing(3),
                      maxWidth: 700,
                    },
                  ]}
                >
                  Upload your certificate, transcript, or statement of results.
                  The platform will later extract subjects, grades, and career
                  recommendations automatically.
                </Text>

                <View
                  style={[
                    styles.supportedWrap,
                    {
                      marginTop: spacing(5),
                    },
                  ]}
                >
                  <SupportedChip
                    icon="document-text-outline"
                    label="PDF"
                    colors={colors}
                  />

                  <SupportedChip
                    icon="image-outline"
                    label="JPG"
                    colors={colors}
                  />

                  <SupportedChip
                    icon="image-outline"
                    label="PNG"
                    colors={colors}
                  />
                </View>
              </View>

              {!isMobile && (
                <View
                  style={[
                    styles.heroStatusCard,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      uploadedFile
                        ? 'checkmark-circle'
                        : 'document-outline'
                    }
                    size={44}
                    color={
                      uploadedFile
                        ? colors.success
                        : colors.textSecondary
                    }
                  />

                  <Text
                    style={[
                      typography.subtitle,
                      {
                        color: colors.textPrimary,
                        marginTop: spacing(3),
                      },
                    ]}
                  >
                    {uploadedFile
                      ? 'File Ready'
                      : 'Awaiting Upload'}
                  </Text>

                  <Text
                    style={[
                      typography.caption,
                      {
                        color: colors.textSecondary,
                        marginTop: spacing(1),
                        textAlign: 'center',
                      },
                    ]}
                  >
                    {uploadedFile
                      ? 'Your document is ready for processing'
                      : 'No document selected yet'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Main Layout */}
          <View
            style={[
              styles.mainGrid,
              isDesktop && {
                flexDirection: 'row',
                alignItems: 'flex-start',
              },
            ]}
          >
            {/* Upload Area */}
            <View style={{ flex: 1 }}>
              <View
                style={[
                  styles.uploadCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.h2,
                    {
                      color: colors.textPrimary,
                    },
                  ]}
                >
                  Upload Document
                </Text>

                <Text
                  style={[
                    typography.body,
                    {
                      color: colors.textSecondary,
                      marginTop: spacing(2),
                    },
                  ]}
                >
                  Drag and drop or select a supported document.
                </Text>

                <View
                  style={[
                    styles.uploadZone,
                    {
                      borderColor: uploadedFile
                        ? colors.success
                        : colors.border,
                      backgroundColor: colors.surfaceAlt,
                    },
                  ]}
                >
                  {uploadedFile ? (
                    <>
                      <View
                        style={[
                          styles.fileIcon,
                          {
                            backgroundColor:
                              'rgba(52,211,153,0.14)',
                          },
                        ]}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={30}
                          color={colors.success}
                        />
                      </View>

                      <Text
                        style={[
                          typography.subtitle,
                          {
                            color: colors.textPrimary,
                            marginTop: spacing(4),
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {uploadedFile.name}
                      </Text>

                      <Text
                        style={[
                          typography.caption,
                          {
                            color: colors.textSecondary,
                            marginTop: spacing(2),
                          },
                        ]}
                      >
                        {formatFileSize(uploadedFile.size)}
                      </Text>

                      <View
                        style={[
                          styles.actionRow,
                          isMobile && {
                            flexDirection: 'column',
                          },
                        ]}
                      >
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Remove file"
                          onPress={handleRemoveFile}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            {
                              borderColor: colors.danger,
                              backgroundColor:
                                'rgba(248,113,113,0.12)',
                            },
                            pressed && styles.buttonPressed,
                          ]}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={colors.danger}
                          />

                          <Text
                            style={[
                              styles.secondaryButtonText,
                              {
                                color: colors.danger,
                              },
                            ]}
                          >
                            Remove File
                          </Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Process file"
                          onPress={handleProcessFile}
                          style={({ pressed }) => [
                            styles.primaryButton,
                            {
                              backgroundColor: colors.primary,
                            },
                            pressed && styles.buttonPressed,
                          ]}
                        >
                          <Ionicons
                            name="sparkles-outline"
                            size={18}
                            color="#FFFFFF"
                          />

                          <Text style={styles.primaryButtonText}>
                            Process Results
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      <View
                        style={[
                          styles.uploadIconWrap,
                          {
                            backgroundColor:
                              'rgba(96,165,250,0.12)',
                          },
                        ]}
                      >
                        <Ionicons
                          name="cloud-upload-outline"
                          size={52}
                          color={colors.primary}
                        />
                      </View>

                      <Text
                        style={[
                          typography.h2,
                          {
                            color: colors.textPrimary,
                            marginTop: spacing(5),
                          },
                        ]}
                      >
                        Select a File
                      </Text>

                      <Text
                        style={[
                          typography.body,
                          {
                            color: colors.textSecondary,
                            marginTop: spacing(3),
                            textAlign: 'center',
                            maxWidth: 460,
                          },
                        ]}
                      >
                        Upload a clean academic document for accurate
                        extraction and recommendations.
                      </Text>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Select file"
                        disabled={isUploading}
                        onPress={handlePickFile}
                        style={({ pressed }) => [
                          styles.uploadButton,
                          {
                            backgroundColor: colors.primary,
                          },
                          pressed && styles.buttonPressed,
                          isUploading && {
                            opacity: 0.7,
                          },
                        ]}
                      >
                        {isUploading ? (
                          <>
                            <ActivityIndicator color="#FFFFFF" />

                            <Text
                              style={styles.uploadButtonText}
                            >
                              Selecting File...
                            </Text>
                          </>
                        ) : (
                          <>
                            <Ionicons
                              name="add-circle-outline"
                              size={22}
                              color="#FFFFFF"
                            />

                            <Text
                              style={styles.uploadButtonText}
                            >
                              Select File
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Sidebar */}
            {isDesktop && (
              <View style={styles.sidebar}>
                <View
                  style={[
                    styles.sidebarCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.h2,
                      {
                        color: colors.textPrimary,
                      },
                    ]}
                  >
                    Upload Guidelines
                  </Text>

                  <View style={{ marginTop: spacing(5) }}>
                    <SidebarItem
                      icon="checkmark-circle-outline"
                      text="Ensure the document is readable"
                      colors={colors}
                    />

                    <SidebarItem
                      icon="checkmark-circle-outline"
                      text="Upload complete pages only"
                      colors={colors}
                    />

                    <SidebarItem
                      icon="checkmark-circle-outline"
                      text="Supported formats: PDF, JPG, PNG"
                      colors={colors}
                    />

                    <SidebarItem
                      icon="checkmark-circle-outline"
                      text="Results extraction will be automated later"
                      colors={colors}
                    />
                  </View>
                </View>

                <View
                  style={[
                    styles.sidebarCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      marginTop: spacing(5),
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.h2,
                      {
                        color: colors.textPrimary,
                      },
                    ]}
                  >
                    Upload Status
                  </Text>

                  <View
                    style={[
                      styles.statusCard,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: colors.textSecondary,
                        },
                      ]}
                    >
                      CURRENT STATUS
                    </Text>

                    <Text
                      style={[
                        typography.h2,
                        {
                          color: uploadedFile
                            ? colors.success
                            : colors.warning,
                          marginTop: spacing(2),
                        },
                      ]}
                    >
                      {uploadedFile
                        ? 'Ready'
                        : 'Pending Upload'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </DashboardLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────

function SupportedChip({
  icon,
  label,
  colors,
}: any) {
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={colors.textSecondary}
      />

      <Text
        style={[
          typography.caption,
          {
            color: colors.textSecondary,
            marginLeft: spacing(2),
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function SidebarItem({
  icon,
  text,
  colors,
}: any) {
  return (
    <View style={styles.sidebarItem}>
      <Ionicons
        name={icon}
        size={18}
        color={colors.success}
      />

      <Text
        style={[
          typography.body,
          {
            color: colors.textSecondary,
            marginLeft: spacing(3),
            flex: 1,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  heroCard: {
    borderWidth: 1,
    borderRadius: radii.xxl,
    padding: spacing(7),
    overflow: 'hidden',
  },

  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing(6),
  },

  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroStatusCard: {
    width: 280,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing(6),
    alignItems: 'center',
    justifyContent: 'center',
  },

  mainGrid: {
    marginTop: spacing(6),
    gap: spacing(6),
  },

  uploadCard: {
    borderWidth: 1,
    borderRadius: radii.xxl,
    padding: spacing(6),
  },

  uploadZone: {
    marginTop: spacing(5),
    minHeight: 420,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radii.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(8),
  },

  uploadIconWrap: {
    width: 110,
    height: 110,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  uploadButton: {
    minHeight: 56,
    borderRadius: radii.lg,
    marginTop: spacing(6),
    paddingHorizontal: spacing(7),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(3),
  },

  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  fileIcon: {
    width: 84,
    height: 84,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionRow: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing(4),
    marginTop: spacing(6),
  },

  primaryButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing(2),
    paddingHorizontal: spacing(5),
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  secondaryButton: {
    flex: 1,
    minHeight: 54,
    borderWidth: 1,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing(2),
    paddingHorizontal: spacing(5),
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },

  sidebar: {
    width: 340,
  },

  sidebarCard: {
    borderWidth: 1,
    borderRadius: radii.xxl,
    padding: spacing(6),
  },

  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing(4),
  },

  statusCard: {
    marginTop: spacing(4),
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing(5),
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    marginRight: spacing(3),
  },

  supportedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});