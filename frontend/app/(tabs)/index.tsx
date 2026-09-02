import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatShortDay, pluralise } from '@/lib/format.ts';
import { summarise, totalOutstanding, useOwem } from '@/lib/store';
import { radius, space, useTheme } from '@/theme';
import { Avatar, AvatarStack } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Grouped, Row } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { CountingMoney, Money } from '@/components/ui/Money';
import { Press } from '@/components/ui/Pressable';
import { DOCK_HEIGHT } from '@/components/ui/TabBar';
import { Txt } from '@/components/ui/Txt';
import { Banner } from '@/components/owem/Provenance';
import { DeleteEventSheet } from '@/components/owem/DeleteEventSheet';

export default function Events() {
  const { c, scheme } = useTheme();
  const { s, loading, deleteEvent } = useOwem();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [doomed, setDoomed] = useState<{ id: string; title: string; settled: boolean } | null>(null);

  const cardBg = scheme === 'dark' ? c.surfaceAlt : c.ink;
  const cardFg = scheme === 'dark' ? c.ink : c.onInk;
  const cardMuted = scheme === 'dark' ? c.inkSecondary : 'rgba(255,255,255,0.6)';

  const events = s.events;
  const outstanding = totalOutstanding(s);
  const openCount = events.filter((e) => summarise(s, e.id).outstanding > 0).length;

  const action = (icon: IconName, label: string, onPress: () => void) => (
    <Press onPress={onPress} style={{ alignItems: 'center', gap: space[2] }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: scheme === 'dark' ? c.border : 'rgba(255,255,255,0.2)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={22} color={cardFg} />
      </View>
      <Txt variant="caption" style={{ color: cardMuted }}>{label}</Txt>
    </Press>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: DOCK_HEIGHT + space[6] }}
        stickyHeaderIndices={[]}
      >
        <View
          style={{
            backgroundColor: cardBg,
            borderBottomLeftRadius: radius.xxl,
            borderBottomRightRadius: radius.xxl,
            paddingTop: insets.top + space[2],
            paddingHorizontal: space[5],
            paddingBottom: space[8],
          }}
        >
          <View
            style={{
              height: 44,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: space[4],
            }}
          >
            <Txt variant="bodyStrong" style={{ color: cardFg, letterSpacing: 0.5 }}>OWEM</Txt>
            <Press onPress={() => router.navigate('/(tabs)/profile')} label="Your profile">
              <Avatar name="Paul" size={32} payer />
            </Press>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt variant="footnote" style={{ color: cardMuted }}>You're owed</Txt>
            <View
              style={{
                height: 28,
                paddingHorizontal: space[3],
                borderRadius: radius.full,
                backgroundColor: scheme === 'dark' ? c.bg : 'rgba(255,255,255,0.12)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Txt variant="caption" style={{ color: cardFg }}>USD</Txt>
              <Icon name="down" size={12} color={cardFg} strokeWidth={2} />
            </View>
          </View>

          <View style={{ marginTop: space[1] }}>
            <CountingMoney value={outstanding} color={scheme === 'dark' ? 'ink' : 'onInk'} />
          </View>
          <Txt variant="footnote" style={{ color: cardMuted, marginTop: space[1] }}>
            across {pluralise(openCount, 'open event')}
          </Txt>

          <View style={{ flexDirection: 'row', gap: space[8] - 4, marginTop: space[6] }}>
            {action('plus', 'New event', () => router.push('/event/new'))}
            {action('bell', 'Remind', () => {
              const first = events.find((e) => summarise(s, e.id).outstanding > 0);
              if (first) router.push({ pathname: '/event/[id]/reminders', params: { id: first.id } });
            })}
            {action('camera', 'Scan', () => router.push('/scan'))}
          </View>
        </View>

        <View style={{ padding: space[4], gap: space[4] }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Txt variant="title3">Events</Txt>
            <Txt variant="footnote" color="inkSecondary">{pluralise(events.length, 'total', 'total')}</Txt>
          </View>

          <Grouped inset={92}>
            {events.map((e) => {
              const summary = summarise(s, e.id);
              const names = summary.participants.map((p) => p.displayName);
              const worked = summary.settlement !== null;
              const settled = worked && summary.outstanding === 0;
              return (
                <Row
                  key={e.id}
                  height={76}
                  onLongPress={() => setDoomed({ id: e.id, title: e.title, settled })}
                  onPress={() =>
                    router.push(
                      !worked
                        ? { pathname: '/event/[id]/participants', params: { id: e.id } }
                        : {
                            pathname: settled ? '/event/[id]/settlement' : '/event/[id]/collect',
                            params: { id: e.id },
                          },
                    )
                  }
                >
                  <AvatarStack names={names} payerName={summary.participants.find((p) => p.isPayer)?.displayName} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyStrong" numberOfLines={1}>{e.title}</Txt>
                    <Txt variant="footnote" color="inkSecondary">
                      {pluralise(summary.headcount, 'person', 'people')} · {formatShortDay(e.occurredAt)}
                    </Txt>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: space[1] }}>
                    <Money value={summary.outstanding} color={settled ? 'inkSecondary' : 'ink'} />
                    <Badge
                      label={!worked ? 'Draft' : settled ? 'Settled' : 'Collecting'}
                      tone={!worked ? 'neutral' : settled ? 'positive' : 'warning'}
                    />
                  </View>
                </Row>
              );
            })}
          </Grouped>

          <Banner
            tone="neutral"
            icon="info"
            text="Every amount here was worked out by the settlement engine, not typed in. Change an assignment and the numbers move with it."
          />
        </View>
      </ScrollView>

      <DeleteEventSheet
        event={doomed}
        onClose={() => setDoomed(null)}
        onConfirm={(eventId) => {
          setDoomed(null);
          void deleteEvent(eventId);
        }}
      />
    </View>
  );
}
