import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { allocate, formatMoney } from '@/lib/money.ts';
import type { ItemAssignment, Participant, ReceiptItem } from '@/lib/types.ts';
import { radius, space, useColors } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Grouped, Row } from '@/components/ui/Card';
import { Press } from '@/components/ui/Pressable';
import { Sheet } from '@/components/ui/Sheet';
import { Stepper } from '@/components/ui/Stepper';
import { Txt } from '@/components/ui/Txt';

/**
 * The complete set of people on one line, replaced atomically — there is no
 * moment where the item belongs to nobody.
 */
export function AssignSheet({
  item, participants, current, open, onClose, onSave,
}: {
  item: ReceiptItem | null;
  participants: Participant[];
  current: ItemAssignment[];
  open: boolean;
  onClose: () => void;
  onSave: (on: { participantId: string; weight: number }[]) => void;
}) {
  const c = useColors();
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!item) return;
    setWeights(Object.fromEntries(current.map((a) => [a.participantId, a.weight])));
  }, [item, current]);

  if (!item) return null;

  const chosen = participants.filter((p) => weights[p.id] > 0);
  const shares = chosen.length
    ? allocate(item.totalPrice, chosen.map((p) => weights[p.id]))
    : [];
  const even = shares.length > 0 && shares.every((s) => s === shares[0]);

  const toggle = (id: string) =>
    setWeights((w) => {
      const next = { ...w };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item.normalizedName}
      subtitle={`${formatMoney(item.totalPrice)} · ${item.quantity > 1 ? `${item.quantity} ordered` : 'one order'}`}
      detent="large"
    >
      <View style={{ flex: 1, gap: space[4] }}>
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          <Chip
            label="Everyone"
            onPress={() => setWeights(Object.fromEntries(participants.map((p) => [p.id, 1])))}
          />
          <Chip label="Clear" onPress={() => setWeights({})} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <Grouped inset={68}>
            {participants.map((p) => {
              const weight = weights[p.id] ?? 0;
              const on = weight > 0;
              return (
                <Row
                  key={p.id}
                  height={64}
                  tint={on ? c.accentSoft : undefined}
                  onPress={on ? undefined : () => toggle(p.id)}
                >
                  <Avatar name={p.displayName} size={40} payer={p.isPayer} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyStrong" color={on ? 'ink' : 'inkSecondary'}>
                      {p.displayName}
                      {p.isPayer ? <Txt variant="body" color="inkSecondary"> · you</Txt> : null}
                    </Txt>
                  </View>
                  {on ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                      <Stepper
                        value={weight}
                        min={0}
                        onChange={(v) => (v === 0 ? toggle(p.id) : setWeights((w) => ({ ...w, [p.id]: v })))}
                      />
                    </View>
                  ) : (
                    <Press onPress={() => toggle(p.id)}>
                      <View
                        style={{
                          width: 26, height: 26, borderRadius: radius.full,
                          borderWidth: 1.5, borderColor: c.border,
                        }}
                      />
                    </Press>
                  )}
                </Row>
              );
            })}
          </Grouped>

          {chosen.length > 1 && !even && (
            <View style={{ marginTop: space[3], gap: space[2] }}>
              {chosen.map((p, i) => (
                <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt variant="footnote" color="inkSecondary">
                    {p.displayName} · {weights[p.id]} of {chosen.reduce((a, x) => a + weights[x.id], 0)}
                  </Txt>
                  <Txt variant="footnote" tnum>{formatMoney(shares[i])}</Txt>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View
          style={{
            height: 56,
            borderRadius: radius.lg,
            backgroundColor: c.surfaceAlt,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: space[4],
          }}
        >
          <Txt variant="callout" color="inkSecondary">
            {chosen.length === 0
              ? 'Nobody on this line yet'
              : chosen.length === 1
                ? `All ${chosen[0].displayName}'s`
                : `Splits ${chosen.length} ways`}
          </Txt>
          {chosen.length > 1 && even && (
            <Txt variant="title3" tnum>{formatMoney(shares[0])} each</Txt>
          )}
        </View>

        <Button
          label="Save"
          disabled={chosen.length === 0}
          onPress={() => onSave(chosen.map((p) => ({ participantId: p.id, weight: weights[p.id] })))}
        />
      </View>
    </Sheet>
  );
}
