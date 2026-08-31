import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { totalOutstanding, useOwem } from '@/lib/store';
import { space, useColors, useTheme } from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Badge';
import { Grouped, Row } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { DOCK_HEIGHT } from '@/components/ui/TabBar';
import { Txt } from '@/components/ui/Txt';
import { Banner } from '@/components/owem/Provenance';

export default function Profile() {
  const c = useColors();
  const { pref, setPref } = useTheme();
  const { s, refresh } = useOwem();
  const insets = useSafeAreaInsets();

  const collected = totalOutstanding(s);
  const events = s.events.length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space[4], paddingBottom: DOCK_HEIGHT + space[6] }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: space[4], gap: space[5] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
          <Avatar name="Paul" size={64} payer />
          <View>
            <Txt variant="title2">Paul</Txt>
            <Txt variant="footnote" color="inkSecondary">The only account on this bill</Txt>
          </View>
        </View>

        <Grouped inset={space[4]}>
          <Row>
            <Txt variant="callout" color="inkSecondary" style={{ flex: 1 }}>Events</Txt>
            <Txt variant="callout" tnum>{events}</Txt>
          </Row>
          <Row>
            <Txt variant="callout" color="inkSecondary" style={{ flex: 1 }}>Still owed to you</Txt>
            <Money value={collected} />
          </Row>
          <Row>
            <Txt variant="callout" color="inkSecondary" style={{ flex: 1 }}>Settlement engine</Txt>
            <Txt variant="footnote" color="inkTertiary">{s.settlements[s.events[0]?.id ?? '']?.engineVersion ?? '—'}</Txt>
          </Row>
        </Grouped>

        <View style={{ gap: space[3] }}>
          <Txt variant="caption" color="inkSecondary">APPEARANCE</Txt>
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <Chip label="System" flex selected={pref === 'system'} onPress={() => setPref('system')} />
            <Chip label="Light" flex selected={pref === 'light'} onPress={() => setPref('light')} />
            <Chip label="Dark" flex selected={pref === 'dark'} onPress={() => setPref('dark')} />
          </View>
        </View>

        <View style={{ gap: space[3] }}>
          <Txt variant="caption" color="inkSecondary">PROTOTYPE</Txt>
          <Grouped inset={space[4]}>
            <Row onPress={() => void refresh()}>
              <Icon name="refresh" size={20} color={c.ink} />
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong">Reload from the server</Txt>
                <Txt variant="footnote" color="inkSecondary">Fetches every event again</Txt>
              </View>
            </Row>
          </Grouped>
        </View>

        <Banner
          tone="neutral"
          icon="info"
          text="Nothing here talks to a server. Every balance is worked out on the phone by the same rules the real engine will use, and no receipt photo ever leaves it."
        />
      </View>
    </ScrollView>
  );
}
