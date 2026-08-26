import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOwem } from '@/lib/store';
import { palette, radius, space } from '@/theme';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { Press } from '@/components/ui/Pressable';
import { Txt } from '@/components/ui/Txt';

const FRAME = { light: '#F5F3EE', line: '#8E8E93', heavy: '#2C2C2E' };

/** A camera screen is always dark, whatever the app's mode is. */
export default function Capture() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createReceipt } = useOwem();

  const shoot = () => {
    const receiptId = createReceipt(id);
    router.replace({ pathname: '/event/[id]/extracting', params: { id, receiptId } });
  };

  const manual = () => {
    const receiptId = createReceipt(id);
    router.replace({ pathname: '/event/[id]/manual', params: { id, receiptId } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', paddingTop: insets.top }}>
      <Header close tint="rgba(255,255,255,0.14)" onBack={() => router.back()} />
      <Txt
        variant="bodyStrong"
        center
        style={{ color: '#FFFFFF', position: 'absolute', top: insets.top + space[5], left: 0, right: 0 }}
      >
        Photograph the receipt
      </Txt>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {/* Stand-in for the camera preview. */}
        <View
          style={{
            width: 200,
            height: 400,
            backgroundColor: FRAME.light,
            transform: [{ rotate: '-1.2deg' }],
            padding: space[5],
            gap: 9,
          }}
        >
          <View style={{ height: 10, width: 96, backgroundColor: FRAME.heavy, alignSelf: 'center' }} />
          <View style={{ height: 6, width: 64, backgroundColor: '#C7C7CC', alignSelf: 'center', marginBottom: space[3] }} />
          {[88, 74, 96, 60, 84, 70, 92].map((w, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ height: 6, width: w, backgroundColor: FRAME.line }} />
              <View style={{ height: 6, width: 26, backgroundColor: FRAME.line }} />
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: '#C7C7CC', marginVertical: 6 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ height: 8, width: 40, backgroundColor: FRAME.heavy }} />
            <View style={{ height: 8, width: 44, backgroundColor: FRAME.heavy }} />
          </View>
        </View>

        {/* Framing brackets. */}
        <View style={{ position: 'absolute', width: 302, height: 440 }}>
          {([
            { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
            { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
            { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
            { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
          ] as const).map((corner, i) => (
            <View key={i} style={{ position: 'absolute', width: 36, height: 36, borderColor: '#FFFFFF', ...corner }} />
          ))}
        </View>
      </View>

      <Txt variant="footnote" center style={{ color: 'rgba(255,255,255,0.65)', paddingBottom: space[6] }}>
        Get all four edges in frame. Creases are fine.
      </Txt>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space[8],
          paddingBottom: insets.bottom + space[6],
        }}
      >
        <Press
          onPress={shoot}
          style={{
            width: 56, height: 56, borderRadius: radius.md,
            backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="photo" size={24} color="#FFFFFF" />
        </Press>

        <Press
          onPress={shoot}
          haptic="select"
          style={{
            width: 76, height: 76, borderRadius: radius.full,
            borderWidth: 4, borderColor: 'rgba(255,255,255,0.35)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <View style={{ width: 62, height: 62, borderRadius: radius.full, backgroundColor: palette.light.accent }} />
        </Press>

        <Press onPress={manual} style={{ width: 56 }}>
          <Txt variant="footnote" center style={{ color: '#FFFFFF', fontWeight: '600' }}>
            Type it{'\n'}instead
          </Txt>
        </Press>
      </View>
    </View>
  );
}
