import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cents, formatMoney } from '@/lib/money.ts';
import { formatShortDay } from '@/lib/format.ts';
import { api, useEvent, useOwem } from '@/lib/store';
import { radius, space, useColors } from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, Chip } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, Grouped, Row } from '@/components/ui/Card';
import { Header, Title } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { Press } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Banner } from '@/components/owem/Provenance';

type Tone = 'Friendly' | 'Direct' | 'Playful';

/**
 * The Reminder agent may read balances and draft text. It cannot move money,
 * change a debt, mark anyone paid, or send without approval — and those limits
 * live in the code that runs the tool, not in the prompt.
 */
function draft(tone: Tone, name: string, amount: string, event: string, when: string): string {
  if (tone === 'Direct') {
    return `Hi ${name} — your share of ${event} on ${when} was ${amount}. Venmo or Cash App both work. Thanks!`;
  }
  if (tone === 'Playful') {
    return `${name}! The ${event} receipt says ${amount} has your name on it. The calamari was a group decision, I'm told. No rush.`;
  }
  return `Hey ${name} — ${event} on ${when} came to ${amount} for your side of the table. No rush at all. I can send a request if that's easier.`;
}

export default function Reminders() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { s } = useOwem();
  const { event, settlement, participants, payer } = useEvent(id);
  const [tone, setTone] = useState<Tone>('Friendly');
  const [sent, setSent] = useState(false);

  const owing = useMemo(() => {
    if (!settlement) return [];
    return settlement.lines
      .filter((l) => l.participantId !== payer?.id)
      .map((l) => {
        const person = participants.find((p) => p.id === l.participantId)!;
        const left = cents(Math.max(0, l.amountOwed - api.paidBy(s, id, l.participantId)));
        return { person, left };
      })
      .filter((r) => r.left > 0);
  }, [settlement, participants, payer, s, id]);

  if (!event) return <Screen><Header /></Screen>;

  const first = owing[0];
  const preview = first
    ? draft(tone, first.person.displayName, formatMoney(first.left), event.title, formatShortDay(event.occurredAt))
    : '';

  return (
    <Screen>
      <Header />
      <Title
        text="Nudge"
        sub={
          owing.length === 0
            ? 'Nobody owes you anything on this one.'
            : `${owing.length} ${owing.length === 1 ? 'person' : 'people'}, ${owing.length === 1 ? 'one amount' : 'different amounts'}.`
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: space[4], gap: space[4] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
          {owing.map((r) => (
            <View
              key={r.person.id}
              style={{
                height: 36,
                paddingLeft: 6,
                paddingRight: space[3],
                borderRadius: radius.full,
                backgroundColor: c.surface,
                borderWidth: 0.5,
                borderColor: c.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space[2],
              }}
            >
              <Avatar name={r.person.displayName} size={24} />
              <Txt variant="footnote" tnum>
                {r.person.displayName} {formatMoney(r.left)}
              </Txt>
            </View>
          ))}
        </View>

        <Card padded style={{ borderRadius: radius.xl, gap: space[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Badge
              label="DRAFTED BY AI · NOT SENT"
              tone="accent"
              icon={<Icon name="sparkle" size={12} color={c.ink} strokeWidth={2} />}
            />
            <Icon name="edit" size={20} color={c.inkSecondary} />
          </View>

          <View
            style={{
              padding: space[4],
              borderRadius: radius.lg,
              borderTopLeftRadius: 6,
              backgroundColor: c.surfaceAlt,
            }}
          >
            <Txt variant="body">{preview}</Txt>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            {(['Friendly', 'Direct', 'Playful'] as Tone[]).map((t) => (
              <Chip key={t} label={t} selected={tone === t} onPress={() => setTone(t)} />
            ))}
            <View style={{ flex: 1 }} />
            <Press onPress={() => setTone(tone)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="refresh" size={16} color={c.ink} />
              <Txt variant="footnote" style={{ fontWeight: '600' }}>Redraft</Txt>
            </Press>
          </View>
        </Card>

        <Banner
          tone="neutral"
          icon="info"
          text="Each person's message carries their own amount. Nothing leaves your phone until you tap send — and the draft can't change what anyone owes."
        />

        <Grouped inset={space[4]}>
          <Row height={52}>
            <Txt variant="callout" color="inkSecondary" style={{ flex: 1 }}>Send through</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <Txt variant="callout" style={{ fontWeight: '600' }}>Messages</Txt>
              <Icon name="forward" size={16} color={c.inkTertiary} />
            </View>
          </Row>
        </Grouped>
      </ScrollView>

      <View style={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[4] }}>
        <Button
          label={sent ? 'Sent' : `Approve and send ${owing.length}`}
          disabled={owing.length === 0 || sent}
          onPress={() => {
            setSent(true);
            setTimeout(() => router.back(), 700);
          }}
        />
      </View>
    </Screen>
  );
}
