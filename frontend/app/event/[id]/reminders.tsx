import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cents, formatMoney } from '@/lib/money.ts';
import { formatShortDay } from '@/lib/format.ts';
import { paidBy, useEvent, useOwem } from '@/lib/store';
import { radius, space, type as typography, useColors } from '@/theme';
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

const TONES: Tone[] = ['Friendly', 'Direct', 'Playful'];

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
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const owing = useMemo(() => {
    if (!settlement) return [];
    return settlement.lines
      .filter((l) => l.participantId !== payer?.id)
      .map((l) => {
        const person = participants.find((p) => p.id === l.participantId);
        if (!person) return null;
        const left = cents(Math.max(0, l.amountOwed - paidBy(s, id, l.participantId)));
        return { person, left };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && r.left > 0);
  }, [settlement, participants, payer, s, id]);

  if (!event) return <Screen><Header /></Screen>;

  const active = owing.find((r) => r.person.id === selected) ?? owing[0];

  const drafted = (personId: string): string => {
    const row = owing.find((r) => r.person.id === personId);
    if (!row) return '';
    return draft(
      tone,
      row.person.displayName,
      formatMoney(row.left),
      event.title,
      formatShortDay(event.occurredAt),
    );
  };

  const messageFor = (personId: string): string => edits[personId] ?? drafted(personId);

  const retone = (next: Tone) => {
    setTone(next);
    setEdits({});
  };

  const redraftActive = () => {
    if (!active) return;
    const personId = active.person.id;
    setEdits((prev) => {
      const next = { ...prev };
      delete next[personId];
      return next;
    });
  };

  const edited = active ? edits[active.person.id] !== undefined : false;

  return (
    <Screen>
      <Header />
      <Title
        text="Nudge"
        sub={
          owing.length === 0
            ? 'Nobody owes you anything on this one.'
            : `${owing.length} ${owing.length === 1 ? 'person' : 'people'}, each with their own message.`
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: space[4], gap: space[4] }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
          {owing.map((r) => {
            const on = active?.person.id === r.person.id;
            return (
              <Press
                key={r.person.id}
                onPress={() => setSelected(r.person.id)}
                haptic="select"
                label={`Write to ${r.person.displayName}`}
                style={{
                  height: 36,
                  paddingLeft: 6,
                  paddingRight: space[3],
                  borderRadius: radius.full,
                  backgroundColor: on ? c.ink : c.surface,
                  borderWidth: 0.5,
                  borderColor: on ? c.ink : c.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space[2],
                }}
              >
                <Avatar name={r.person.displayName} size={24} />
                <Txt variant="footnote" tnum style={{ color: on ? c.onInk : c.ink }}>
                  {r.person.displayName} {formatMoney(r.left)}
                </Txt>
                {edits[r.person.id] !== undefined && (
                  <Icon name="edit" size={12} color={on ? c.onInk : c.inkSecondary} strokeWidth={2} />
                )}
              </Press>
            );
          })}
        </View>

        {active && (
          <Card padded style={{ borderRadius: radius.xl, gap: space[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Badge
                label={edited ? 'EDITED BY YOU · NOT SENT' : 'DRAFTED BY AI · NOT SENT'}
                tone="accent"
                icon={<Icon name={edited ? 'edit' : 'sparkle'} size={12} color={c.ink} strokeWidth={2} />}
              />
              <Txt variant="caption" color="inkSecondary">To {active.person.displayName}</Txt>
            </View>

            <TextInput
              value={messageFor(active.person.id)}
              onChangeText={(text) =>
                setEdits((prev) => ({ ...prev, [active.person.id]: text }))
              }
              multiline
              scrollEnabled={false}
              selectTextOnFocus={false}
              style={[
                typography.body,
                {
                  color: c.ink,
                  padding: space[4],
                  borderRadius: radius.lg,
                  borderTopLeftRadius: 6,
                  backgroundColor: c.surfaceAlt,
                  minHeight: 104,
                  textAlignVertical: 'top',
                },
              ]}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              {TONES.map((t) => (
                <Chip key={t} label={t} selected={tone === t} onPress={() => retone(t)} />
              ))}
              <View style={{ flex: 1 }} />
              <Press
                onPress={redraftActive}
                label="Redraft this message"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: edited ? 1 : 0.4 }}
              >
                <Icon name="refresh" size={16} color={c.ink} />
                <Txt variant="footnote" style={{ fontWeight: '600' }}>Redraft</Txt>
              </Press>
            </View>
          </Card>
        )}

        <Banner
          tone="neutral"
          icon="info"
          text="Each person gets their own message with their own amount. Nothing leaves your phone until you tap send — and no draft can change what anyone owes."
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
          label={
            sent
              ? 'Sent'
              : owing.length === 1
                ? `Send to ${owing[0].person.displayName}`
                : `Send ${owing.length} separate messages`
          }
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
