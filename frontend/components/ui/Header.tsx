import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { radius, space, TAP, useColors } from '@/theme';
import { Icon } from './Icon';
import { Press } from './Pressable';
import { Txt } from './Txt';

/** Chrome floats, content scrolls. The header is just a back affordance and
 *  whatever context belongs on the right. */
export function Header({
  right, onBack, close = false, tint,
}: {
  right?: ReactNode;
  onBack?: () => void;
  close?: boolean;
  tint?: string;
}) {
  const c = useColors();
  const router = useRouter();
  return (
    <View
      style={{
        height: TAP + space[4],
        paddingHorizontal: space[4],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Press
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')))}
        style={{
          width: TAP,
          height: TAP,
          borderRadius: radius.full,
          backgroundColor: tint ?? c.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={close ? 'close' : 'back'} size={close ? 20 : 22} color={c.ink} strokeWidth={close ? 2 : 1.75} />
      </Press>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>{right}</View>
    </View>
  );
}

export function StepLabel({ step, of }: { step: number; of: number }) {
  return <Txt variant="callout" color="inkSecondary">Step {step} of {of}</Txt>;
}

/** The page hero. Title-1, with an optional line underneath. */
export function Title({ text, sub }: { text: string; sub?: string }) {
  return (
    <View style={{ paddingHorizontal: space[4], gap: space[1] + 2 }}>
      <Txt variant="title1">{text}</Txt>
      {sub && <Txt variant="body" color="inkSecondary">{sub}</Txt>}
    </View>
  );
}
