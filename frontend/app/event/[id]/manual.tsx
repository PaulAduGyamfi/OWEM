import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMoney, parseAmount, sum } from '@/lib/money.ts';
import { pluralise } from '@/lib/format.ts';
import { useEvent, useOwem } from '@/lib/store';
import { radius, space, useColors } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Header, Title } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { Press } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] as const;

/** The path that never needs a model: eight items typed in still gets you exact
 *  tax-proportional balances. */
export default function ManualEntry() {
  const c = useColors();
  const { id, receiptId } = useLocalSearchParams<{ id: string; receiptId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addItem } = useOwem();
  const { items } = useEvent(id);
  const [name, setName] = useState('');
  const [digits, setDigits] = useState('');

  const parsed = parseAmount(digits || '0');
  const runningTotal = sum(items.map((i) => i.totalPrice));
  const canAdd = name.trim().length > 0 && parsed !== null && parsed > 0;

  const press = (k: (typeof KEYS)[number]) => {
    if (k === 'del') return setDigits((d) => d.slice(0, -1));
    if (k === '.' && digits.includes('.')) return;
    const next = digits + k;
    if (parseAmount(next) === null && next !== '.') return;
    setDigits(next);
  };

  const add = () => {
    if (!canAdd || parsed === null) return;
    addItem(receiptId, { name: name.trim(), price: parsed });
    setName('');
    setDigits('');
  };

  return (
    <Screen>
      <Header
        right={
          <Press onPress={() => router.push({ pathname: '/event/[id]/charges', params: { id, receiptId } })}>
            <Txt variant="callout" style={{ fontWeight: '600' }}>Done</Txt>
          </Press>
        }
      />
      <Title
        text="Type it in"
        sub={`${pluralise(items.length, 'line')} so far · ${formatMoney(runningTotal)}`}
      />

      <View style={{ padding: space[4], gap: space[5], flex: 1 }}>
        <Field value={name} onChangeText={setName} placeholder="Garlic Knots" autoFocus />

        <View style={{ alignItems: 'center', gap: space[1] }}>
          <Txt variant="displayXl" tnum>{formatMoney(parsed ?? (0 as never))}</Txt>
          <Txt variant="footnote" color="inkSecondary">Line total, as printed</Txt>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], justifyContent: 'space-between' }}>
          {KEYS.map((k) => (
            <Press
              key={k}
              onPress={() => press(k)}
              haptic="select"
              style={{
                width: '31%',
                height: 56,
                borderRadius: radius.lg,
                backgroundColor: k === 'del' ? c.surfaceAlt : c.surface,
                borderWidth: k === 'del' ? 0 : 0.5,
                borderColor: c.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {k === 'del' ? (
                <Icon name="backspace" size={24} color={c.inkSecondary} />
              ) : (
                <Txt tnum style={{ fontSize: 22, fontWeight: '600' }}>{k}</Txt>
              )}
            </Press>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[4] }}>
        <Button label="Add line" iconLeft="plus" disabled={!canAdd} onPress={add} />
      </View>
    </Screen>
  );
}
