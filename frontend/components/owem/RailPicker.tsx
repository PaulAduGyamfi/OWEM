import { View } from 'react-native';
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from '@/lib/types.ts';
import { radius, space, useColors } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { Press } from '@/components/ui/Pressable';
import { Txt } from '@/components/ui/Txt';

export const RAILS: PaymentMethod[] = ['venmo', 'cashapp', 'zelle', 'applecash', 'cash'];

export const DEEP_LINK: Record<PaymentMethod, ((amount: string, note: string) => string) | null> = {
  venmo: (amount, note) =>
    `venmo://paycharge?txn=charge&amount=${amount}&note=${encodeURIComponent(note)}`,
  cashapp: (amount) => `https://cash.app/$/${amount}`,
  zelle: () => 'https://www.zellepay.com/',
  applecash: () => 'messages://',
  cash: null,
  other: null,
};

export function RailPicker({
  value, onChange,
}: {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: space[2] }}>
      {RAILS.map((m) => {
        const on = m === value;
        return (
          <Press key={m} haptic="select" onPress={() => onChange(m)} style={{ flex: 1, alignItems: 'center', gap: space[2] }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: radius.full,
                backgroundColor: on ? c.accentSoft : c.surfaceAlt,
                borderWidth: on ? 2 : 0,
                borderColor: c.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {m === 'cash' ? (
                <Icon name="cash" size={22} color={c.ink} />
              ) : (
                <Txt style={{ fontSize: 18, fontWeight: '700', color: c.ink }}>
                  {PAYMENT_METHOD_LABEL[m].charAt(0)}
                </Txt>
              )}
            </View>
            <Txt variant="caption" color={on ? 'ink' : 'inkSecondary'} center>
              {PAYMENT_METHOD_LABEL[m]}
            </Txt>
          </Press>
        );
      })}
    </View>
  );
}
