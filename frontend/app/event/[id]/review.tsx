import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONFIDENCE_FLOOR } from '@/lib/types.ts';
import { formatMoney, sum } from '@/lib/money.ts';
import { useEvent, useOwem } from '@/lib/store';
import { pluralise } from '@/lib/format.ts';
import { space, useColors } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Grouped } from '@/components/ui/Card';
import { Header, Title } from '@/components/ui/Header';
import { Press } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { ItemEditSheet } from '@/components/owem/ItemEditSheet';
import { ItemRow } from '@/components/owem/ItemRow';
import { Banner } from '@/components/owem/Provenance';

export default function Review() {
  const c = useColors();
  const { id, receiptId } = useLocalSearchParams<{ id: string; receiptId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items } = useEvent(id);
  const { updateItem, deleteItem, confirmReceipt } = useOwem();
  const [editing, setEditing] = useState<string | null>(null);

  const subtotal = sum(items.map((i) => i.totalPrice));
  const shaky = useMemo(
    () => items.filter((i) => i.provenance === 'AI_SUGGESTED' && (i.confidence ?? 1) < CONFIDENCE_FLOOR),
    [items],
  );
  const item = items.find((i) => i.id === editing) ?? null;
  const allConfirmed = items.every((i) => i.provenance === 'USER_CONFIRMED');

  const next = () => {
    void confirmReceipt(id, receiptId);
    router.push({ pathname: '/event/[id]/charges', params: { id, receiptId } });
  };

  return (
    <Screen>
      <Header right={<Txt variant="callout" color="inkSecondary">{pluralise(items.length, 'line')}</Txt>} />
      <Title text="Review items" sub="Tap any line to see what was printed." />

      <View style={{ padding: space[4], gap: space[4], flex: 1 }}>
        <Grouped inset={52}>
          <Banner
            tone="positive"
            text={`The ${items.length} lines add up to ${formatMoney(subtotal)} — the printed subtotal.`}
          />
          {shaky.length > 0 ? (
            <Banner
              tone="warning"
              text={`The model wasn't sure about ${pluralise(shaky.length, 'line')}.`}
              action={
                <Press onPress={() => setEditing(shaky[0].id)}>
                  <Txt variant="footnote" style={{ fontWeight: '600', color: c.ink }}>Show me</Txt>
                </Press>
              }
            />
          ) : allConfirmed ? (
            <Banner tone="neutral" icon="check" text="Every line has been through your hands." />
          ) : (
            <Banner
              tone="neutral"
              icon="check"
              text="The lines it was unsure about are settled. Confirming the rest marks them as yours."
            />
          )}
        </Grouped>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: space[12] }}
          showsVerticalScrollIndicator={false}
        >
          <Grouped inset={64}>
            {items.map((i) => (
              <ItemRow key={i.id} item={i} onPress={() => setEditing(i.id)} />
            ))}
          </Grouped>
        </ScrollView>
      </View>

      <View style={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[4] }}>
        <Button
          label={
            shaky.length > 0
              ? `${pluralise(shaky.length, 'line needs', 'lines need')} you`
              : `Confirm all ${items.length} lines`
          }
          disabled={shaky.length > 0}
          onPress={next}
        />
      </View>

      <ItemEditSheet
        item={item}
        lineCount={items.length}
        open={item !== null}
        onClose={() => setEditing(null)}
        onConfirm={(patch) => {
          if (editing) void updateItem(id, receiptId, editing, patch.normalizedName, patch.totalPrice);
          setEditing(null);
        }}
        onDelete={() => {
          if (editing) void deleteItem(id, receiptId, editing);
          setEditing(null);
        }}
      />
    </Screen>
  );
}
