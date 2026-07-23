import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';

import { auth } from '../../constants/firebase';
import type { AppLanguage } from '../../constants/translations';
import {
  type AppearancePreference,
  type DisplayDensity,
  type IconSizePreference,
  type TextSizePreference,
  useAppPreferences,
} from '../../contexts/AppPreferencesContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStudentMenu } from '../../components/student/StudentMenu';
import {
  iconSize,
  radii,
  spacing,
  typography,
  useTheme,
} from '../../components/student/DashboardLayout';
import StudentFooter from '../../components/student/StudentFooter';

type SettingRoute =
  | 'profile'
  | 'notifications'
  | 'terms'
  | 'privacy'
  | 'support'
  | 'faq'
  | 'logout'
  | 'delete';

type LanguageOption = {
  code: AppLanguage;
  name: string;
  nativeName: string;
  description: string;
  shortCode: string;
};

type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    description: 'Use Thuto-Bridge in English',
    shortCode: 'EN',
  },
  {
    code: 'tn',
    name: 'Setswana',
    nativeName: 'Setswana',
    description: 'Dirisa Thuto-Bridge ka Setswana',
    shortCode: 'TN',
  },
];

const APPEARANCE_OPTIONS: ChoiceOption<AppearancePreference>[] = [
  {
    value: 'system',
    label: 'System',
    description: 'Follow your device appearance',
    icon: 'phone-portrait-outline',
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Use a bright appearance',
    icon: 'sunny-outline',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Use a darker appearance',
    icon: 'moon-outline',
  },
];

const DENSITY_OPTIONS: ChoiceOption<DisplayDensity>[] = [
  {
    value: 'comfortable',
    label: 'Comfortable',
    description: 'More space between app elements',
    icon: 'resize-outline',
  },
  {
    value: 'compact',
    label: 'Compact',
    description: 'Fit more content on each screen',
    icon: 'contract-outline',
  },
];

const TEXT_SIZE_OPTIONS: ChoiceOption<TextSizePreference>[] = [
  { value: 'small', label: 'Small' },
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Large' },
  { value: 'extraLarge', label: 'Extra large' },
];

const ICON_SIZE_OPTIONS: ChoiceOption<IconSizePreference>[] = [
  { value: 'small', label: 'Small' },
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Large' },
];

const NAV_LINKS: Array<{
  key: SettingRoute;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'profile', label: 'Edit Profile', icon: 'person-outline' },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: 'notifications-outline',
  },
  {
    key: 'terms',
    label: 'Terms & Conditions',
    icon: 'document-text-outline',
  },
  {
    key: 'privacy',
    label: 'Privacy Policy',
    icon: 'shield-checkmark-outline',
  },
  {
    key: 'support',
    label: 'Contact Support',
    icon: 'help-circle-outline',
  },
  { key: 'faq', label: 'FAQ', icon: 'chatbubble-ellipses-outline' },
];

function useElevation(intensity: 'sm' | 'md' | 'lg' = 'md') {
  return useMemo(() => {
    const opacity = 0.24;
    const radius = intensity === 'sm' ? 6 : intensity === 'md' ? 14 : 22;
    const offsetY = intensity === 'sm' ? 2 : intensity === 'md' ? 5 : 10;

    return Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: offsetY },
        shadowOpacity: opacity,
        shadowRadius: radius,
      },
      android: {
        elevation: intensity === 'sm' ? 3 : intensity === 'md' ? 6 : 12,
      },
      web: {
        boxShadow: `0 ${offsetY}px ${radius * 1.5}px rgba(0,0,0,${opacity})`,
      },
      default: {},
    });
  }, [intensity]);
}

export default function StudentSettingsScreen() {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const { openMenu } = useStudentMenu();
  const elevationMd = useElevation('md');
  const [pushNotifs, setPushNotifs] = useState(true);
  const [deadlineReminders, setDeadlineReminders] = useState(true);

  const {
    language: selectedLanguage,
    isLanguageLoading,
    isLanguageSaving,
    setLanguage,
    t,
  } = useLanguage();

  const {
    preferences,
    resolvedAppearance,
    isPreferencesLoading,
    isPreferencesSaving,
    setAppearance,
    setDensity,
    setTextSize,
    setIconSize,
  } = useAppPreferences();

  const breakpoint = useMemo<'mobile' | 'tablet' | 'desktop'>(() => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const isMobile = breakpoint === 'mobile';
  const settingsBusy = isPreferencesLoading || isPreferencesSaving;

  const activeLanguage = useMemo(
    () =>
      LANGUAGE_OPTIONS.find(option => option.code === selectedLanguage) ??
      LANGUAGE_OPTIONS[0],
    [selectedLanguage],
  );

  const navigate = useCallback(async (route: SettingRoute) => {
    switch (route) {
      case 'profile':
        router.push('/student/profile');
        return;
      case 'notifications':
        router.push('/student/notifications');
        return;
      case 'terms':
        router.push('/student/terms-conditions');
        return;
      case 'privacy':
        router.push('/student/privacy-policy');
        return;
      case 'support':
        router.push('/student/contact-support');
        return;
      case 'faq':
        router.push('/student/faq');
        return;
      case 'logout':
        try {
          await signOut(auth);
          router.replace('/login');
        } catch (error) {
          console.error('Failed to log out:', error);
          Alert.alert('Could not log out', 'Please try again.');
        }
        return;
      case 'delete':
        Alert.alert('Coming soon', 'Account deletion will be added later.');
        return;
    }
  }, []);

  const handleLanguageChange = useCallback(
    async (nextLanguage: AppLanguage) => {
      if (
        nextLanguage === selectedLanguage ||
        isLanguageSaving ||
        isLanguageLoading
      ) {
        return;
      }

      try {
        await setLanguage(nextLanguage);
      } catch (error) {
        console.error('Failed to update preferred language:', error);
        Alert.alert(
          t('Could not update language'),
          t('Please check your internet connection and try again.'),
        );
      }
    },
    [
      isLanguageLoading,
      isLanguageSaving,
      selectedLanguage,
      setLanguage,
      t,
    ],
  );

  const runPreferenceUpdate = useCallback(
    async (operation: () => Promise<void>) => {
      if (settingsBusy) return;

      try {
        await operation();
      } catch (error) {
        console.error('Failed to update app preference:', error);
        Alert.alert(
          'Could not update preference',
          'Your previous setting has been restored. Please check your connection and try again.',
        );
      }
    },
    [settingsBusy],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: isMobile ? spacing(4) : spacing(7),
            paddingTop: isMobile ? spacing(4) : spacing(7),
            paddingBottom: spacing(14),
            maxWidth: isDesktop ? 1280 : '100%',
            alignSelf: 'center',
            width: '100%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing(7),
            }}
          >
            <View style={{ flex: 1, minWidth: 0, paddingRight: spacing(2) }}>
              <Text style={[typography.h1, { color: colors.textPrimary }]}>
                {t('Settings')}
              </Text>
              <Text
                style={[
                  typography.caption,
                  {
                    color: colors.textSecondary,
                    marginTop: spacing(1),
                  },
                ]}
              >
                {t('Manage your account, language, privacy and preferences')}
              </Text>
            </View>

            <Pressable
              onPress={openMenu}
              accessibilityRole="button"
              accessibilityLabel={t('Open student menu')}
              hitSlop={8}
              style={({ pressed }) => ({
                width: isMobile ? 44 : 48,
                height: isMobile ? 44 : 48,
                borderRadius: radii.lg,
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.84 : 1,
              })}
            >
              <Ionicons
                name="menu"
                size={iconSize(22)}
                color={colors.textPrimary}
              />
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: isDesktop ? 'row' : 'column',
              gap: spacing(8),
            }}
          >
            {isDesktop && (
              <View style={{ width: 300, flexShrink: 0 }}>
                <View
                  style={[
                    {
                      backgroundColor: colors.surface,
                      borderRadius: radii.xxl,
                      borderWidth: 1,
                      borderColor: colors.border,
                      overflow: 'hidden',
                    },
                    elevationMd,
                  ]}
                >
                  <View style={{ height: 3, backgroundColor: colors.primary }} />
                  <Text
                    style={[
                      typography.h2,
                      {
                        color: colors.textPrimary,
                        padding: spacing(6),
                        paddingBottom: spacing(4),
                      },
                    ]}
                  >
                    {t('Navigation')}
                  </Text>

                  {NAV_LINKS.map(item => (
                    <NavRow
                      key={item.key}
                      label={t(item.label)}
                      icon={item.icon}
                      onPress={() => void navigate(item.key)}
                      colors={colors}
                    />
                  ))}

                  <NavRow
                    label={t('Log Out')}
                    icon="log-out-outline"
                    onPress={() => void navigate('logout')}
                    colors={colors}
                    danger
                    last
                  />
                </View>
              </View>
            )}

            <View style={{ flex: 1, minWidth: 0 }}>
              <View
                style={[
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radii.xxl,
                    borderWidth: 1,
                    borderColor: colors.border,
                    overflow: 'hidden',
                    marginBottom: spacing(7),
                  },
                  elevationMd,
                ]}
              >
                <View style={{ height: 3, backgroundColor: colors.primary }} />
                <View style={{ padding: isMobile ? spacing(5) : spacing(6) }}>
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: radii.lg,
                      backgroundColor: `${colors.primary}18`,
                      borderWidth: 1,
                      borderColor: `${colors.primary}30`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: spacing(4),
                    }}
                  >
                    <Ionicons
                      name="settings-outline"
                      size={iconSize(22)}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={[typography.h2, { color: colors.textPrimary }]}>
                    {t('Student Settings')}
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
                    {t(
                      'Control your language, appearance, display size and account security.',
                    )}
                  </Text>
                </View>
              </View>

              <Section
                title={t('Language')}
                icon="language-outline"
                colors={colors}
              >
                <View style={{ padding: spacing(5) }}>
                  <SectionIntro
                    title={t('App language')}
                    description={t(
                      'Choose the language you would like to use throughout Thuto-Bridge.',
                    )}
                    icon="globe-outline"
                    colors={colors}
                  />
                  <View
                    style={{
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: spacing(3),
                    }}
                  >
                    {LANGUAGE_OPTIONS.map(option => (
                      <LanguageCard
                        key={option.code}
                        option={option}
                        selected={selectedLanguage === option.code}
                        disabled={isLanguageLoading || isLanguageSaving}
                        onPress={() => void handleLanguageChange(option.code)}
                        colors={colors}
                        displayDescription={t(option.description)}
                      />
                    ))}
                  </View>
                  <StatusBanner
                    loading={isLanguageLoading || isLanguageSaving}
                    text={`${t('Current language: ')}${activeLanguage.nativeName}`}
                    colors={colors}
                  />
                </View>
              </Section>

              <Section
                title={t('Appearance')}
                icon="color-palette-outline"
                colors={colors}
              >
                <View style={{ padding: spacing(5) }}>
                  <SectionIntro
                    title={t('Light and dark mode')}
                    description={t(
                      'Choose a theme or allow Thuto-Bridge to follow your device.',
                    )}
                    icon="contrast-outline"
                    colors={colors}
                  />
                  <ChoiceGrid
                    options={APPEARANCE_OPTIONS}
                    selected={preferences.appearance}
                    disabled={settingsBusy}
                    onSelect={value =>
                      void runPreferenceUpdate(() => setAppearance(value))
                    }
                    colors={colors}
                    columns={isMobile ? 1 : 3}
                  />
                  <StatusBanner
                    loading={settingsBusy}
                    text={`Active appearance: ${resolvedAppearance === 'dark' ? 'Dark' : 'Light'}`}
                    colors={colors}
                  />
                </View>
              </Section>

              <Section
                title={t('Display')}
                icon="options-outline"
                colors={colors}
              >
                <View style={{ padding: spacing(5) }}>
                  <SectionIntro
                    title={t('Display density')}
                    description={t(
                      'Compact mode reduces spacing throughout screens that use the shared design system.',
                    )}
                    icon="grid-outline"
                    colors={colors}
                  />
                  <ChoiceGrid
                    options={DENSITY_OPTIONS}
                    selected={preferences.density}
                    disabled={settingsBusy}
                    onSelect={value =>
                      void runPreferenceUpdate(() => setDensity(value))
                    }
                    colors={colors}
                    columns={isMobile ? 1 : 2}
                  />
                </View>

                <Divider colors={colors} />

                <View style={{ padding: spacing(5) }}>
                  <SectionIntro
                    title={t('Text size')}
                    description={t(
                      'Increase or decrease shared text styles across Thuto-Bridge.',
                    )}
                    icon="text-outline"
                    colors={colors}
                  />
                  <SegmentedChoice
                    options={TEXT_SIZE_OPTIONS}
                    selected={preferences.textSize}
                    disabled={settingsBusy}
                    onSelect={value =>
                      void runPreferenceUpdate(() => setTextSize(value))
                    }
                    colors={colors}
                  />
                  <PreviewCard colors={colors} />
                </View>

                <Divider colors={colors} />

                <View style={{ padding: spacing(5) }}>
                  <SectionIntro
                    title={t('Icon size')}
                    description={t(
                      'Adjust icons that use the shared icon sizing helper.',
                    )}
                    icon="apps-outline"
                    colors={colors}
                  />
                  <SegmentedChoice
                    options={ICON_SIZE_OPTIONS}
                    selected={preferences.iconSize}
                    disabled={settingsBusy}
                    onSelect={value =>
                      void runPreferenceUpdate(() => setIconSize(value))
                    }
                    colors={colors}
                  />
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: spacing(5),
                      marginTop: spacing(5),
                    }}
                  >
                    {(['home-outline', 'book-outline', 'settings-outline'] as const).map(
                      name => (
                        <Ionicons
                          key={name}
                          name={name}
                          size={iconSize(24)}
                          color={colors.primary}
                        />
                      ),
                    )}
                  </View>
                </View>

                <StatusBanner
                  loading={settingsBusy}
                  text="Display preferences are saved to your account and synchronised across devices."
                  colors={colors}
                  inset
                />
              </Section>

              <Section
                title={t('Notifications')}
                icon="notifications-outline"
                colors={colors}
              >
                <ToggleRow
                  label={t('Push notifications')}
                  description={t('Receive alerts directly on your device')}
                  value={pushNotifs}
                  setValue={setPushNotifs}
                  colors={colors}
                />
                <ToggleRow
                  label={t('Deadline reminders')}
                  description={t(
                    'Get reminded before application deadlines',
                  )}
                  value={deadlineReminders}
                  setValue={setDeadlineReminders}
                  colors={colors}
                  last
                />
              </Section>

              {!isDesktop && (
                <Section
                  title={t('Quick Links')}
                  icon="link-outline"
                  colors={colors}
                >
                  {NAV_LINKS.map((item, index) => (
                    <NavRow
                      key={item.key}
                      label={t(item.label)}
                      icon={item.icon}
                      onPress={() => void navigate(item.key)}
                      colors={colors}
                      last={index === NAV_LINKS.length - 1}
                    />
                  ))}
                </Section>
              )}

              <Section
                title={t('Danger Zone')}
                icon="warning-outline"
                colors={colors}
                danger
              >
                {!isDesktop && (
                  <NavRow
                    label={t('Log Out')}
                    description={t('Sign out of your account')}
                    icon="log-out-outline"
                    onPress={() => void navigate('logout')}
                    colors={colors}
                    danger
                  />
                )}
                <NavRow
                  label={t('Delete Account')}
                  description={t('Permanently remove your account and data')}
                  icon="trash-outline"
                  onPress={() => void navigate('delete')}
                  colors={colors}
                  danger
                  last
                />
              </Section>
            </View>
          </View>

          <StudentFooter
            topSpacing={isMobile ? spacing(8) : spacing(10)}
            maxWidth={1280}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({
  title,
  icon,
  children,
  colors,
  danger,
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>;
  danger?: boolean;
}) {
  const elevation = useElevation('md');
  const accent = danger ? colors.danger : colors.primary;

  return (
    <View style={{ marginBottom: spacing(7) }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(2),
          marginBottom: spacing(3),
        }}
      >
        <View
          style={{
            width: 3,
            height: 16,
            borderRadius: 2,
            backgroundColor: accent,
          }}
        />
        {icon && (
          <Ionicons name={icon} size={iconSize(14)} color={accent} />
        )}
        <Text
          style={[
            typography.caption,
            { color: accent, letterSpacing: 0.6, fontWeight: '700' },
          ]}
        >
          {title.toUpperCase()}
        </Text>
      </View>

      <View
        style={[
          {
            backgroundColor: colors.surface,
            borderRadius: radii.xxl,
            borderWidth: 1,
            borderColor: danger ? `${colors.danger}33` : colors.border,
            overflow: 'hidden',
          },
          elevation,
        ]}
      >
        <View style={{ height: 3, backgroundColor: accent }} />
        {children}
      </View>
    </View>
  );
}

function SectionIntro({
  title,
  description,
  icon,
  colors,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing(3),
        marginBottom: spacing(5),
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radii.md,
          backgroundColor: `${colors.primary}18`,
          borderWidth: 1,
          borderColor: `${colors.primary}30`,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Ionicons name={icon} size={iconSize(20)} color={colors.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[
            typography.body,
            { color: colors.textPrimary, fontWeight: '700' },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: colors.textMuted, marginTop: 3 },
          ]}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

function LanguageCard({
  option,
  selected,
  disabled,
  onPress,
  colors,
  displayDescription,
}: {
  option: LanguageOption;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>;
  displayDescription: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        padding: spacing(4),
        borderRadius: radii.xl,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? `${colors.primary}0D` : colors.surfaceAlt,
        opacity: disabled ? 0.6 : pressed ? 0.86 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: radii.lg,
            backgroundColor: selected ? colors.primary : colors.surface,
            borderWidth: 1,
            borderColor: selected ? colors.primary : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={[
              typography.body,
              {
                color: selected ? '#FFFFFF' : colors.textPrimary,
                fontWeight: '800',
              },
            ]}
          >
            {option.shortCode}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[
              typography.body,
              { color: colors.textPrimary, fontWeight: '700' },
            ]}
          >
            {option.nativeName}
          </Text>
          <Text
            style={[
              typography.caption,
              { color: colors.textMuted, marginTop: 3 },
            ]}
          >
            {displayDescription}
          </Text>
        </View>
        <SelectionIndicator selected={selected} colors={colors} />
      </View>
    </Pressable>
  );
}

function ChoiceGrid<T extends string>({
  options,
  selected,
  disabled,
  onSelect,
  colors,
  columns,
}: {
  options: ChoiceOption<T>[];
  selected: T;
  disabled: boolean;
  onSelect: (value: T) => void;
  colors: ReturnType<typeof useTheme>;
  columns: number;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
      {options.map(option => {
        const active = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled }}
            style={({ pressed }) => ({
              flexBasis:
                columns === 1
                  ? '100%'
                  : columns === 2
                    ? '47%'
                    : '30%',
              flexGrow: 1,
              minWidth: columns === 1 ? '100%' : 150,
              padding: spacing(4),
              borderRadius: radii.xl,
              borderWidth: active ? 2 : 1,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: active
                ? `${colors.primary}0D`
                : colors.surfaceAlt,
              opacity: disabled ? 0.6 : pressed ? 0.86 : 1,
            })}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(3),
              }}
            >
              {option.icon && (
                <Ionicons
                  name={option.icon}
                  size={iconSize(22)}
                  color={active ? colors.primary : colors.textSecondary}
                />
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    typography.body,
                    { color: colors.textPrimary, fontWeight: '700' },
                  ]}
                >
                  {option.label}
                </Text>
                {!!option.description && (
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.textMuted, marginTop: 3 },
                    ]}
                  >
                    {option.description}
                  </Text>
                )}
              </View>
              <SelectionIndicator selected={active} colors={colors} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function SegmentedChoice<T extends string>({
  options,
  selected,
  disabled,
  onSelect,
  colors,
}: {
  options: ChoiceOption<T>[];
  selected: T;
  disabled: boolean;
  onSelect: (value: T) => void;
  colors: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing(2),
        padding: spacing(2),
        borderRadius: radii.xl,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {options.map(option => {
        const active = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled }}
            style={({ pressed }) => ({
              flexGrow: 1,
              minWidth: 86,
              paddingHorizontal: spacing(3),
              paddingVertical: spacing(3),
              borderRadius: radii.lg,
              alignItems: 'center',
              backgroundColor: active ? colors.primary : 'transparent',
              opacity: disabled ? 0.6 : pressed ? 0.84 : 1,
            })}
          >
            <Text
              style={[
                typography.label,
                { color: active ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PreviewCard({ colors }: { colors: ReturnType<typeof useTheme> }) {
  return (
    <View
      style={{
        marginTop: spacing(5),
        padding: spacing(4),
        borderRadius: radii.xl,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={[typography.h2, { color: colors.textPrimary }]}>Aa</Text>
      <Text
        style={[
          typography.body,
          { color: colors.textSecondary, marginTop: spacing(2) },
        ]}
      >
        This preview changes immediately when you select a different text size.
      </Text>
    </View>
  );
}

function SelectionIndicator({
  selected,
  colors,
}: {
  selected: boolean;
  colors: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        width: 25,
        height: 25,
        borderRadius: 13,
        borderWidth: selected ? 0 : 1.5,
        borderColor: colors.border,
        backgroundColor: selected ? colors.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {selected && (
        <Ionicons name="checkmark" size={iconSize(16)} color="#FFFFFF" />
      )}
    </View>
  );
}

function StatusBanner({
  loading,
  text,
  colors,
  inset,
}: {
  loading: boolean;
  text: string;
  colors: ReturnType<typeof useTheme>;
  inset?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing(2),
        marginTop: spacing(4),
        marginHorizontal: inset ? spacing(5) : 0,
        marginBottom: inset ? spacing(5) : 0,
        paddingHorizontal: spacing(3),
        paddingVertical: spacing(3),
        borderRadius: radii.md,
        backgroundColor: `${colors.primary}0D`,
        borderWidth: 1,
        borderColor: `${colors.primary}20`,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons
          name="cloud-done-outline"
          size={iconSize(17)}
          color={colors.primary}
        />
      )}
      <Text
        style={[
          typography.caption,
          { color: colors.textSecondary, flex: 1 },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function Divider({ colors }: { colors: ReturnType<typeof useTheme> }) {
  return <View style={{ height: 1, backgroundColor: colors.divider }} />;
}

function NavRow({
  label,
  description,
  icon,
  onPress,
  colors,
  danger,
  last,
}: {
  label: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>;
  danger?: boolean;
  last?: boolean;
}) {
  const accent = danger ? colors.danger : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing(4),
        paddingHorizontal: spacing(5),
        paddingVertical: spacing(4),
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.divider,
        backgroundColor: pressed
          ? danger
            ? `${colors.danger}10`
            : colors.surfaceAlt
          : 'transparent',
      })}
    >
      {icon && (
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: radii.md,
            backgroundColor: `${accent}18`,
            borderWidth: 1,
            borderColor: `${accent}30`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={iconSize(18)} color={accent} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[
            typography.body,
            {
              color: danger ? colors.danger : colors.textPrimary,
              fontWeight: '600',
            },
          ]}
        >
          {label}
        </Text>
        {!!description && (
          <Text
            style={[
              typography.caption,
              { color: colors.textMuted, marginTop: 2 },
            ]}
          >
            {description}
          </Text>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={iconSize(16)}
        color={danger ? colors.danger : colors.textMuted}
      />
    </Pressable>
  );
}

function ToggleRow({
  label,
  description,
  value,
  setValue,
  colors,
  last,
}: {
  label: string;
  description?: string;
  value: boolean;
  setValue: (value: boolean) => void;
  colors: ReturnType<typeof useTheme>;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing(4),
        paddingHorizontal: spacing(5),
        paddingVertical: spacing(4),
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.divider,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: radii.md,
          backgroundColor: value ? `${colors.primary}18` : colors.surfaceAlt,
          borderWidth: 1,
          borderColor: value ? `${colors.primary}30` : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={value ? 'checkmark-circle-outline' : 'ellipse-outline'}
          size={iconSize(18)}
          color={value ? colors.primary : colors.textMuted}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[
            typography.body,
            { color: colors.textPrimary, fontWeight: '600' },
          ]}
        >
          {label}
        </Text>
        {!!description && (
          <Text
            style={[
              typography.caption,
              { color: colors.textMuted, marginTop: 2 },
            ]}
          >
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={setValue}
        accessibilityLabel={label}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}
