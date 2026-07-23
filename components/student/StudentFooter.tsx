import React, { useCallback, useMemo } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useLanguage } from '../../contexts/LanguageContext';
import {
  radii,
  spacing,
  typography,
  useTheme,
} from './DashboardLayout';

type StudentFooterProps = {
  /** Adds extra space above the footer when it follows page content. */
  topSpacing?: number;
  /** Limits footer width on large web displays. */
  maxWidth?: number;
};

type FooterLink = {
  label: string;
  url: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const FOOTER_LINKS: FooterLink[] = [
  {
    label: 'Privacy',
    url: 'https://www.thutobridge.com/privacy',
    icon: 'shield-checkmark-outline',
  },
  {
    label: 'Terms',
    url: 'https://www.thutobridge.com/terms',
    icon: 'document-text-outline',
  },
  {
    label: 'Help',
    url: 'mailto:support@thutobridge.com',
    icon: 'help-circle-outline',
  },
];

function getWebShadow(): ViewStyle {
  return (
    Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
      } as ViewStyle,
      default: {},
    }) ?? {}
  ) as ViewStyle;
}

export default function StudentFooter({
  topSpacing = spacing(10),
  maxWidth = 1200,
}: StudentFooterProps) {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const { t } = useLanguage();
  const shadow = useMemo(getWebShadow, []);

  const isMobile = width < 600;
  const isTablet = width >= 600 && width < 960;
  const horizontalPadding = isMobile
    ? spacing(4)
    : isTablet
      ? spacing(5)
      : spacing(7);

  const openLink = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch {
      // Keep footer interactions silent if the target platform cannot open a URL.
    }
  }, []);

  return (
    <View
      style={{
        width: '100%',
        maxWidth,
        alignSelf: 'center',
        marginTop: topSpacing,
      }}
    >
      <View
        style={[
          {
            width: '100%',
            paddingHorizontal: horizontalPadding,
            paddingVertical: isMobile ? spacing(5) : spacing(6),
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.xxl,
            overflow: 'hidden',
          },
          shadow,
        ]}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: colors.primary,
          }}
        />

        <View
          style={{
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'center' : 'flex-start',
            justifyContent: 'space-between',
            gap: isMobile ? spacing(4) : spacing(6),
          }}
        >
          <View
            style={{
              flex: isMobile ? undefined : 1,
              width: isMobile ? '100%' : undefined,
              maxWidth: 560,
              alignItems: isMobile ? 'center' : 'flex-start',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(2.5),
                marginBottom: spacing(2),
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: radii.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${colors.primary}14`,
                  borderWidth: 1,
                  borderColor: `${colors.primary}28`,
                }}
              >
                <Ionicons name="school-outline" size={18} color={colors.primary} />
              </View>

              <Text
                style={[
                  typography.bodyStrong,
                  {
                    color: colors.textPrimary,
                    fontSize: isMobile ? 15 : 16,
                  },
                ]}
              >
                Thuto-Bridge
              </Text>
            </View>

            <Text
              style={[
                typography.body,
                {
                  color: colors.textSecondary,
                  textAlign: isMobile ? 'center' : 'left',
                  lineHeight: 20,
                  fontSize: 13.5,
                },
              ]}
            >
              {t('Connecting Botswana students to university opportunities.')}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: isMobile ? 'center' : 'flex-end',
              gap: spacing(2),
              maxWidth: isMobile ? '100%' : 430,
            }}
          >
            {FOOTER_LINKS.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="link"
                accessibilityLabel={t(item.label)}
                onPress={() => openLink(item.url)}
                style={({ pressed }) => ({
                  minHeight: 40,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing(1.5),
                  paddingHorizontal: spacing(3),
                  paddingVertical: spacing(2),
                  borderRadius: radii.lg,
                  backgroundColor: pressed
                    ? `${colors.primary}12`
                    : colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: pressed
                    ? `${colors.primary}30`
                    : colors.border,
                  opacity: pressed ? 0.82 : 1,
                })}
              >
                <Ionicons
                  name={item.icon}
                  size={14}
                  color={pressedColor(colors.primary, colors.textMuted)}
                />
                <Text
                  style={[
                    typography.label,
                    {
                      color: colors.textSecondary,
                      fontSize: 12.5,
                    },
                  ]}
                >
                  {t(item.label)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View
          style={{
            marginTop: spacing(5),
            paddingTop: spacing(4),
            borderTopWidth: 1,
            borderTopColor: colors.divider,
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing(2),
          }}
        >
          <Text
            style={[
              typography.caption,
              {
                color: colors.textMuted,
                textAlign: isMobile ? 'center' : 'left',
                fontSize: 11.5,
                lineHeight: 17,
              },
            ]}
          >
            © {new Date().getFullYear()} Thuto-Bridge. {t('All rights reserved.')}
          </Text>

          <Text
            style={[
              typography.caption,
              {
                color: colors.textMuted,
                textAlign: isMobile ? 'center' : 'right',
                fontSize: 11.5,
                lineHeight: 17,
              },
            ]}
          >
            {t('Designed and developed by')}{' '}
            <Text style={{ fontWeight: '700', color: colors.textSecondary }}>
              BrightCode Studios
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

function pressedColor(primary: string, fallback: string): string {
  return primary || fallback;
}
