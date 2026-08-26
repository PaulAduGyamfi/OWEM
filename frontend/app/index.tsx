import { useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useTheme } from '@/theme';
import { AvatarCluster } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Txt } from '@/components/ui/Txt';

const CROWD = ['Paul', 'Albert', 'Nia', 'Devon', 'Manny', 'Kai', 'Rae', 'Tom', 'Jo', 'Riley', 'Sam', 'Lena', 'Chris'];

export default function Welcome() {
  const { c, scheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const wash: [string, string, string] =
    scheme === 'dark'
      ? ['#0B1420', '#000000', '#000000']
      : ['#EAF3FF', '#FFFFFF', '#FDF0F5'];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <LinearGradient
        colors={wash}
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <AvatarCluster names={CROWD} payerName="Paul" width={width} height={Math.min(460, height * 0.5)} />
      </View>

      <View style={{ paddingHorizontal: space[6], gap: space[3] }}>
        <Txt variant="title1">One person pays.{'\n'}Everyone squares up.</Txt>
        <Txt variant="body" color="inkSecondary">
          Photograph the receipt, tap who had what, and every share of the tax and tip works out to
          the cent.
        </Txt>
      </View>

      <View
        style={{
          paddingHorizontal: space[4],
          paddingTop: space[10],
          paddingBottom: insets.bottom + space[6],
          gap: space[4],
        }}
      >
        <Button label="Get started" onPress={() => router.replace('/(tabs)')} />
        <Txt variant="footnote" color="inkSecondary" center>
          Your friends don't need the app. Only you.
        </Txt>
      </View>
    </View>
  );
}
