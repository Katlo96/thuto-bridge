import React, { useMemo } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Platform, useWindowDimensions, useColorScheme, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';

const BASE_SPACING = 4;
const spacing = (n: number) => n * BASE_SPACING;
const radii = { md: spacing(3), lg: spacing(4), xl: spacing(5), xxl: spacing(6), pill: 9999 };

function useElevation(): ViewStyle {
  return useMemo<ViewStyle>(() => {
    return (Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 24 },
      android: { elevation: 12 },
      web: { boxShadow: '0 10px 36px rgba(0,0,0,0.30)' } as any,
      default: {},
    }) ?? {}) as ViewStyle;
  }, []);
}

export default function FeedbackPromptModal({
  visible,
  onGiveFeedback,
  onNotNow,
}: {
  visible: boolean;
  onGiveFeedback: () => void;
  onNotNow: () => void;
}) {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const rawScheme = useColorScheme();
  const scheme: 'light' | 'dark' = rawScheme === 'dark' ? 'dark' : 'light';
  const elevation = useElevation();
  const isMobile = width < 480;

  const colors = useMemo(
    () => ({
      overlay: 'rgba(6,10,14,0.55)',
      text: scheme === 'light' ? '#0B0F12' : '#EAF2F8',
      muted: scheme === 'light' ? 'rgba(11,15,18,0.58)' : 'rgba(234,242,248,0.62)',
      card: scheme === 'light' ? '#FBFDFE' : '#151F28',
      cardBorder: scheme === 'light' ? 'rgba(11,15,18,0.08)' : 'rgba(234,242,248,0.12)',
      surfaceAlt: scheme === 'light' ? '#F1F6F7' : '#101820',
      primary: '#57AFC2',
      primarySoft: scheme === 'light' ? 'rgba(87,175,194,0.14)' : 'rgba(87,175,194,0.20)',
      primaryBorder: scheme === 'light' ? 'rgba(87,175,194,0.35)' : 'rgba(87,175,194,0.32)',
    }),
    [scheme]
  );

  const cardWidth = isMobile ? Math.min(width - spacing(8), 380) : 380;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onNotNow}>
      <View style={styles.root}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onNotNow} accessibilityRole="button" accessibilityLabel={t('Not Now')} />

        <View style={styles.centerLayer} pointerEvents="box-none">
          <View
            style={[
              styles.card,
              elevation,
              { width: cardWidth, backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>{t('Help us improve ThutoBridge')}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {t('Tell us about your experience so far — it takes less than a minute.')}
            </Text>

            <View style={styles.actions}>
              <Pressable
                onPress={onNotNow}
                accessibilityRole="button"
                accessibilityLabel={t('Not Now')}
                style={({ pressed }) => [styles.secondaryBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.cardBorder, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.secondaryText, { color: colors.text }]}>{t('Not Now')}</Text>
              </Pressable>

              <Pressable
                onPress={onGiveFeedback}
                accessibilityRole="button"
                accessibilityLabel={t('Give Feedback')}
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
              >
                <Ionicons name="paper-plane-outline" size={15} color="#fff" />
                <Text style={styles.primaryText}>{t('Give Feedback')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  centerLayer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(5) },

  card: {
    borderRadius: radii.xxl,
    borderWidth: 1,
    padding: spacing(6),
    alignItems: 'center',
  },

  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(4),
  },

  title: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: spacing(2),
  },

  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing(6),
  },

  actions: {
    flexDirection: 'row',
    gap: spacing(3),
    width: '100%',
  },

  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryText: {
    fontWeight: '800',
    fontSize: 13,
  },

  primaryBtn: {
    flex: 1.3,
    height: 48,
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
});