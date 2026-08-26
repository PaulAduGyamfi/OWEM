import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { allocate, formatMoney } from '@/lib/money.ts';
import { api, useEvent, useOwem } from '@/lib/store';
import { space, useColors } from '@/theme';
import { AvatarStack } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Badge';
import { Grouped, Row } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/Progress';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { AssignSheet } from '@/components/owem/AssignSheet';
import { Banner } from '@/components/owem/Provenance';

export default function Assign() {
  const c = useColors();
  const { id, receiptId } = useLocalSearchParams<{ id: string; receiptId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { s } = useOwem();
  const { putAssignments, createSettlement, confirmReceipt } = useOwem();
  const { items, participants } = useEvent(id);
  const [open, setOpen] = useState<string | null>(null);

  const assignedCount = items.filter((i) => api.assignmentsOf(s, i.id).length > 0).length;
  const missing = items.length - assignedCount;
  const item = items.find((i) => i.id === open) ?? null;
  const payerName = participants.find((p) => p.isPayer)?.displayName;

  const everyone = (itemId: string) =>
    putAssignments(itemId, participants.map((p) => ({ participantId: p.id, weight: 1 })));

  // Re-settling after an edit writes a NEW version; it never rewrites the old one.
  const existing = api.latestSettlement(s, id);
  const settle = () => {
    if (receiptId) confirmReceipt(receiptId);
    createSettlement(id, existing ? 'You changed who was on a line.' : null);
    router.push({ pathname: '/event/[id]/settlement', params: { id } });
  };

  return (
    <Screen>
      <Header
        right={<Txt variant="callout" color="inkSecondary" tnum>{assignedCount} of {items.length}</Txt>}
      />
      <View style={{ paddingHorizontal: space[4], gap: space[4] }}>
        <Txt variant="title1">Who had what</Txt>
        <ProgressBar value={items.length === 0 ? 0 : assignedCount / items.length} />
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          <Chip
            label="Everyone on everything"
            onPress={() => items.forEach((i) => everyone(i.id))}
          />
          <Chip
            label="Just me"
            onPress={() => {
              const payer = participants.find((p) => p.isPayer);
              if (payer) items.forEach((i) => putAssignments(i.id, [{ participantId: payer.id, weight: 1 }]));
            }}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, marginTop: space[4] }}
        contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: space[12] }}
        showsVerticalScrollIndicator={false}
      >
        <Grouped inset={space[4]}>
          {items.map((i) => {
            const on = api.assignmentsOf(s, i.id);
            const names = on
              .map((a) => participants.find((p) => p.id === a.participantId)?.displayName ?? '?')
              .filter(Boolean);
            const shares = on.length ? allocate(i.totalPrice, on.map((a) => a.weight)) : [];
            const even = shares.length > 1 && shares.every((x) => x === shares[0]);

            return (
              <Row key={i.id} height={72} onPress={() => setOpen(i.id)}>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong">
                    {i.normalizedName}
                    {i.quantity > 1 ? ` ×${i.quantity}` : ''}
                  </Txt>
                  <Txt variant="footnote" tnum color={on.length ? 'inkSecondary' : 'warningText'}>
                    {formatMoney(i.totalPrice)}
                    {on.length === 0
                      ? ' · nobody yet'
                      : on.length === 1
                        ? ` · all ${names[0]}'s`
                        : even
                          ? ` · ${on.length} ways · ${formatMoney(shares[0])} each`
                          : ` · ${on.length} ways, unevenly`}
                  </Txt>
                </View>
                {on.length === 0 ? (
                  <View
                    style={{
                      height: 32,
                      paddingHorizontal: space[3],
                      borderRadius: 999,
                      backgroundColor: c.warningSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Txt variant="footnote" style={{ fontWeight: '600', color: c.warningText }}>Assign</Txt>
                  </View>
                ) : (
                  <AvatarStack names={names} payerName={payerName} max={3} />
                )}
              </Row>
            );
          })}
        </Grouped>
      </ScrollView>

      <View style={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[4], gap: space[3] }}>
        {missing > 0 && (
          <Banner
            tone="warning"
            text={`${missing} ${missing === 1 ? 'line has' : 'lines have'} nobody on them. The maths can't run until they do.`}
          />
        )}
        <Button
          label={existing ? `Save as version ${existing.version + 1}` : 'Work out the balances'}
          disabled={missing > 0}
          onPress={settle}
        />
      </View>

      <AssignSheet
        item={item}
        participants={participants}
        current={item ? api.assignmentsOf(s, item.id) : []}
        open={item !== null}
        onClose={() => setOpen(null)}
        onSave={(on) => {
          if (open) putAssignments(open, on);
          setOpen(null);
        }}
      />
    </Screen>
  );
}
