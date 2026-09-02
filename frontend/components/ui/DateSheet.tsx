import { useState } from 'react';
import { View } from 'react-native';
import { radius, space, useColors } from '@/theme';
import { Icon } from './Icon';
import { Press } from './Pressable';
import { Sheet } from './Sheet';
import { Txt } from './Txt';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CELL = 40;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function monthGrid(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const blanks: null[] = Array(first.getDay()).fill(null);
  return [
    ...blanks,
    ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
}

export function DateSheet({
  open, onClose, value, onChange,
}: {
  open: boolean;
  onClose: () => void;
  value: Date;
  onChange: (date: Date) => void;
}) {
  const c = useColors();
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const today = new Date();

  const step = (by: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));

  const pick = (date: Date) => {
    onChange(date);
    onClose();
  };

  const arrow = (name: 'back' | 'forward', by: number) => (
    <Press
      onPress={() => step(by)}
      haptic="select"
      style={{
        width: 36,
        height: 36,
        borderRadius: radius.full,
        backgroundColor: c.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={name} size={18} color={c.ink} strokeWidth={2} />
    </Press>
  );

  return (
    <Sheet open={open} onClose={onClose} title="When was it?" subtitle="Pick the day the bill was paid.">
      <View style={{ gap: space[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {arrow('back', -1)}
          <Txt variant="bodyStrong">
            {MONTHS[month.getMonth()]} {month.getFullYear()}
          </Txt>
          {arrow('forward', 1)}
        </View>

        <View style={{ flexDirection: 'row', width: CELL * 7, alignSelf: 'center' }}>
          {WEEKDAYS.map((day, i) => (
            <Txt key={i} variant="caption" color="inkTertiary" center style={{ width: CELL }}>
              {day}
            </Txt>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: CELL * 7, alignSelf: 'center' }}>
          {monthGrid(month).map((date, i) => {
            if (!date) return <View key={i} style={{ width: CELL, height: CELL }} />;
            const selected = sameDay(date, value);
            const isToday = sameDay(date, today);
            const future = startOfDay(date) > startOfDay(today);
            return (
              <Press
                key={i}
                onPress={() => pick(date)}
                haptic="select"
                disabled={future}
                style={{
                  width: CELL,
                  height: CELL,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: radius.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? c.ink : 'transparent',
                    borderWidth: !selected && isToday ? 1 : 0,
                    borderColor: c.border,
                  }}
                >
                  <Txt
                    variant="callout"
                    tnum
                    style={{
                      color: future ? c.inkTertiary : selected ? c.onInk : c.ink,
                      fontWeight: selected || isToday ? '600' : '400',
                    }}
                  >
                    {date.getDate()}
                  </Txt>
                </View>
              </Press>
            );
          })}
        </View>

        <Press
          onPress={() => pick(today)}
          haptic="select"
          style={{
            height: 44,
            borderRadius: radius.md,
            backgroundColor: c.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt variant="callout" style={{ fontWeight: '600' }}>Today</Txt>
        </Press>
      </View>
    </Sheet>
  );
}
