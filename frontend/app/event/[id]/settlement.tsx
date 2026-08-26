import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMoney } from '@/lib/money.ts';
import { formatStamp, pluralise } from '@/lib/format.ts';
import { api, useEvent, useOwem } from '@/lib/store';
import { radius, space, useColors } from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Grouped, Row } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { CountingMoney, Money } from '@/components/ui/Money';
import { Press } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Banner } from '@/components/owem/Provenance';

/** An immutable snapshot of who owes what. Once you have told people what they
 *  owe, that is a promise — so this screen shows a version, not a live figure. */
export default function SettlementScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { s } = useOwem();
  const { settlement, participants, payer, summary, history } = useEvent(id);

  if (!settlement || !summary) {
    return (
      <Screen>
        <Header />
        <Txt variant="body" color="inkSecondary" style={{ padding: space[4] }}>
          No settlement yet — assign every line first.
        </Txt>
      </Screen>
    );
  }

  const owing = settlement.lines
    .filter((l) => l.participantId !== payer?.id)
    .sort((a, b) => b.amountOwed - a.amountOwed);
  const payerLine = settlement.lines.find((l) => l.participantId === payer?.id);

  return (
    <Screen>
      <Header
        right={
          <Press onPress={() => router.push({ pathname: '/event/[id]/history', params: { id } })}>
            <Badge label={`VERSION ${settlement.version}`} tone={history.length > 1 ? 'ink' : 'neutral'} />
          </Press>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: space[12] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: space[4], gap: space[1] }}>
          <Txt variant="caption" color="inkSecondary">OWED TO YOU</Txt>
          <CountingMoney value={summary.owedToPayer} />
          <Txt variant="body" color="inkSecondary" tnum>
            from {pluralise(owing.length, 'person', 'people')} · you covered {formatMoney(settlement.totalAmount)}
          </Txt>
        </View>

        <View style={{ padding: space[4], gap: space[4] }}>
          <Banner
            tone="positive"
            text={`The ${settlement.lines.length} shares add up to ${formatMoney(settlement.totalAmount)} — to the cent, the total on the receipt.`}
          />

          <Grouped inset={68}>
            {owing.map((l) => {
              const person = participants.find((p) => p.id === l.participantId)!;
              return (
                <Row
                  key={l.participantId}
                  height={68}
                  onPress={() =>
                    router.push({
                      pathname: '/event/[id]/participant/[pid]',
                      params: { id, pid: l.participantId },
                    })
                  }
                >
                  <Avatar name={person.displayName} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyStrong">{person.displayName}</Txt>
                    <Txt variant="footnote" color="inkSecondary" tnum>
                      {formatMoney(l.itemsSubtotal)} food · {formatMoney(l.taxShare)} tax ·{' '}
                      {formatMoney(l.tipShare)} tip
                    </Txt>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Money value={l.amountOwed} variant="title3" />
                    <Icon name="forward" size={18} color={c.inkTertiary} />
                  </View>
                </Row>
              );
            })}
          </Grouped>

          {payer && payerLine && (
            <View
              style={{
                height: 64,
                borderRadius: radius.lg,
                backgroundColor: c.surfaceAlt,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space[3],
                paddingHorizontal: space[4],
              }}
            >
              <Avatar name={payer.displayName} payer />
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong">You</Txt>
                <Txt variant="footnote" color="inkSecondary" tnum>
                  your own share was {formatMoney(payerLine.amountOwed)}
                </Txt>
              </View>
              <Txt variant="callout" color="inkSecondary" tnum>
                paid {formatMoney(settlement.totalAmount)}
              </Txt>
            </View>
          )}

          <Press
            onPress={() => router.push({ pathname: '/event/[id]/assign', params: { id } })}
            style={{ alignItems: 'center', paddingVertical: space[2] }}
          >
            <Txt variant="callout" style={{ fontWeight: '600' }}>Change who had what</Txt>
          </Press>

          <Txt variant="footnote" color="inkSecondary" center tnum>
            Locked {formatStamp(settlement.createdAt)} · {settlement.engineVersion}
          </Txt>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[4] }}>
        <Button
          label={summary.outstanding === 0 ? 'Everyone has paid' : 'Ask for the money'}
          disabled={summary.outstanding === 0}
          onPress={() => router.push({ pathname: '/event/[id]/collect', params: { id } })}
        />
      </View>
    </Screen>
  );
}
