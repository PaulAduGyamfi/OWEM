import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { cents, formatMoney } from '@/lib/money.ts';
import { formatStamp, pluralise } from '@/lib/format.ts';
import { useEvent } from '@/lib/store';
import type { Settlement } from '@/lib/types.ts';
import { radius, space, useColors } from '@/theme';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Header, Title } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';

/**
 * INVARIANT 3, on screen. A settlement row is never updated: a correction
 * writes version + 1, and the old one stays exactly as it was sent — because
 * once you have told people what they owe, that is a promise.
 */
export default function History() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history, participants, event } = useEvent(id);

  const nameOf = (pid: string) => participants.find((p) => p.id === pid)?.displayName ?? '—';

  const deltas = (current: Settlement, previous: Settlement | undefined) => {
    if (!previous) return [];
    return current.lines
      .map((l) => {
        const before = previous.lines.find((x) => x.participantId === l.participantId);
        return {
          pid: l.participantId,
          before: before?.amountOwed ?? null,
          after: l.amountOwed,
          delta: (l.amountOwed - (before?.amountOwed ?? 0)),
        };
      })
      .filter((d) => d.delta !== 0 || d.before === null);
  };

  return (
    <Screen scroll>
      <Header />
      <Title
        text="History"
        sub={`${event?.title ?? ''} · ${pluralise(history.length, 'version')}`}
      />

      <View style={{ padding: space[4], gap: space[4] }}>
        {history.map((st, i) => {
          const previous = history[i + 1];
          const changes = deltas(st, previous);
          const current = i === 0;
          return (
            <Card
              key={st.id}
              padded
              style={{ borderRadius: radius.xl, gap: space[3], opacity: current ? 1 : 0.72 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                  <Txt variant="title3">Version {st.version}</Txt>
                  <Badge label={current ? 'CURRENT' : 'SUPERSEDED'} tone={current ? 'ink' : 'neutral'} />
                </View>
                <Txt variant="footnote" color="inkSecondary" tnum>{formatStamp(st.createdAt)}</Txt>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Txt variant={current ? 'displayLg' : 'title2'} tnum>{formatMoney(st.totalAmount)}</Txt>
                <Txt variant="footnote" color="inkSecondary">
                  {previous && previous.totalAmount === st.totalAmount
                    ? 'same total'
                    : current
                      ? 'what everyone was told'
                      : 'what everyone was told then'}
                </Txt>
              </View>

              {st.reason && (
                <View style={{ padding: space[3] - 2, paddingHorizontal: space[3], borderRadius: radius.md, backgroundColor: c.surfaceAlt }}>
                  <Txt variant="footnote" color="inkSecondary">{st.reason}</Txt>
                </View>
              )}

              {changes.length > 0 && (
                <View>
                  {changes.map((d) => (
                    <View
                      key={d.pid}
                      style={{ height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Txt variant="callout">{nameOf(d.pid)}</Txt>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] + 2 }}>
                        {d.before !== null && (
                          <Txt
                            variant="footnote"
                            color="inkTertiary"
                            tnum
                            style={{ textDecorationLine: 'line-through' }}
                          >
                            {formatMoney(d.before)}
                          </Txt>
                        )}
                        <Txt variant="callout" tnum style={{ fontWeight: '600' }}>{formatMoney(d.after)}</Txt>
                        <Txt
                          variant="footnote"
                          color="inkSecondary"
                          tnum
                          style={{ width: 56, textAlign: 'right', fontWeight: '600' }}
                        >
                          {d.delta === 0
                            ? 'new'
                            : `${d.delta > 0 ? '+' : '−'}${formatMoney(cents(Math.abs(d.delta)))}`}
                        </Txt>
                      </View>
                    </View>
                  ))}

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space[2],
                      paddingTop: space[3],
                      borderTopWidth: 0.5,
                      borderTopColor: c.border,
                    }}
                  >
                    <Icon name="check" size={16} color={c.positive} strokeWidth={2.4} />
                    <Txt variant="footnote" style={{ color: c.positiveText, flex: 1 }}>
                      {previous && previous.totalAmount === st.totalAmount
                        ? 'The changes cancel out. The total never moved.'
                        : 'Every share still adds up to the total.'}
                    </Txt>
                  </View>
                </View>
              )}
            </Card>
          );
        })}

        <Txt variant="footnote" color="inkSecondary">
          A settlement is never edited. A correction writes a new version, and the old one stays exactly
          as it was sent.
        </Txt>
      </View>
    </Screen>
  );
}
