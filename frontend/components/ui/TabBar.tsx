import { Platform, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HAIRLINE, radius, space, useColors, useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Press } from './Pressable';

type Dest = { href: '/(tabs)' | '/(tabs)/balances' | '/(tabs)/profile'; icon: IconName; label: string };

const DESTINATIONS: Dest[] = [
  { href: '/(tabs)', icon: 'home', label: 'Events' },
  { href: '/(tabs)/balances', icon: 'people', label: 'Balances' },
  { href: '/(tabs)/profile', icon: 'person', label: 'You' },
];

export function TabBar({ onCreate }: { onCreate?: () => void } = {}) {
  const c = useColors();
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const path = usePathname();

  const activeIndex = path.includes('balances') ? 1 : path.includes('profile') ? 2 : 0;

  const pill = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[1] + 2, gap: space[1] }}>
      {DESTINATIONS.map((d, i) => {
        const active = i === activeIndex;
        return (
          <Press
            key={d.href}
            haptic="select"
            onPress={() => router.navigate(d.href)}
            style={{
              width: 52,
              height: 44,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? c.accent : 'transparent',
            }}
          >
            <Icon
              name={d.icon}
              size={24}
              filled={active}
              color={active ? c.accentInk : c.inkTertiary}
            />
          </Press>
        );
      })}
    </View>
  );

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + space[4],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[3],
      }}
      pointerEvents="box-none"
    >
      {isLiquidGlassAvailable() ? (
        <GlassView glassEffectStyle="regular" style={{ height: 56, borderRadius: radius.full, justifyContent: 'center' }}>
          {pill}
        </GlassView>
      ) : Platform.OS === 'web' ? (
        <View
          style={{
            height: 56,
            borderRadius: radius.full,
            justifyContent: 'center',
            backgroundColor: c.glass,
            borderWidth: HAIRLINE,
            borderColor: c.glassBorder,
          }}
        >
          {pill}
        </View>
      ) : (
        <BlurView
          intensity={60}
          tint={scheme === 'dark' ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
          style={{
            height: 56,
            borderRadius: radius.full,
            justifyContent: 'center',
            overflow: 'hidden',
            borderWidth: HAIRLINE,
            borderColor: c.glassBorder,
          }}
        >
          {pill}
        </BlurView>
      )}

      <Press
        onPress={onCreate ?? (() => router.push('/event/new'))}
        haptic="select"
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.full,
          backgroundColor: c.ink,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        <Icon name="plus" size={26} color={c.onInk} strokeWidth={2} />
      </Press>
    </View>
  );
}

export const DOCK_HEIGHT = 96;
