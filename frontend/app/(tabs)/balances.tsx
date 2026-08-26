import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pluralise } from '@/lib/format.ts';
import { cents } from '@/lib/money.ts';
import { api, useOwem } from '@/lib/store';
import { space, useColors } from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Grouped, Row } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { DOCK_HEIGHT } from '@/components/ui/TabBar';
import { Txt } from '@/components/ui/Txt';

/** Everyone who owes you anything, across every event. */
export default function Balances() {
  const c = useColors();
  const { s } = useOwem();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const rows = s.events.flatMap((event) => {
    const summary = api.summarise(s, event.id);
    if (!summary.settlement) return [];
    return summary.settlement.lines
      .filter((l) => !api.isPayer(s, l.participantId))
      .map((l) => {
        const person = s.participants.find((p) => p.id === l.participantId)!;
        const paid = api.paidBy(s, event.id, l.participantId);
        return { event, person, owed: l.amountOwed, paid, left: cents(Math.max(0, l.amountOwed - paid)) };
      })
      .filter((r) => r.left > 0);
  });

  const total = cents(rows.reduce((a, r) => a + r.left, 0));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space[4], paddingBottom: DOCK_HEIGHT + space[6] }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: space[4], gap: space[1] }}>
        <Txt variant="title1">Balances</Txt>
        <Txt variant="body" color="inkSecondary">
          {rows.length === 0
            ? 'Nobody owes you anything. Enjoy it.'
            : `${pluralise(rows.length, 'person', 'people')} across ${pluralise(
                new Set(rows.map((r) => r.event.id)).size, 'event')}.`}
        </Txt>
      </View>

      {rows.length > 0 && (
        <View style={{ paddingHorizontal: space[4], paddingTop: space[6], gap: space[4] }}>
          <View>
            <Txt variant="caption" color="inkSecondary">STILL OUT</Txt>
            <Money value={total} variant="displayXl" />
          </View>

          <Grouped inset={68}>
            {rows.map((r) => (
              <Row
                key={`${r.event.id}-${r.person.id}`}
                height={72}
                onPress={() =>
                  router.push({
                    pathname: '/event/[id]/participant/[pid]',
                    params: { id: r.event.id, pid: r.person.id },
                  })
                }
              >
                <Avatar name={r.person.displayName} />
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong">{r.person.displayName}</Txt>
                  <Txt variant="footnote" color="inkSecondary" numberOfLines={1}>{r.event.title}</Txt>
                </View>
                <View style={{ alignItems: 'flex-end', gap: space[1] }}>
                  <Money value={r.left} variant="title3" />
                  {r.paid > 0 && <Badge label="Part paid" tone="warning" />}
                </View>
              </Row>
            ))}
          </Grouped>
        </View>
      )}
    </ScrollView>
  );
}
