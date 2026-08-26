import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMoney } from '@/lib/money.ts';
import { formatShortDay, pluralise } from '@/lib/format.ts';
import { api, useEvent, useOwem } from '@/lib/store';
import { PAYMENT_METHOD_LABEL } from '@/lib/types.ts';
import { radius, space, springs, useColors, useTheme } from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Button, ButtonRow } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { Txt } from '@/components/ui/Txt';

/** The reward moment: system green on its own tint, and one lime action. */
export default function Settled() {
  const c = useColors();
  const { scheme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { s, closeEvent } = useOwem();
  const { event, settlement, participants, payer, summary, payments } = useEvent(id);

  const scale = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withSpring(1, { ...springs.hero, reduceMotion: ReduceMotion.System });
  }, [scale]);
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!event || !settlement || !summary) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  const paidRows = settlement.lines
    .filter((l) => l.participantId !== payer?.id)
    .map((l) => {
      const person = participants.find((p) => p.id === l.participantId)!;
      const theirs = payments.filter((p) => p.participantId === l.participantId);
      const paid = api.paidBy(s, id, l.participantId);
      return { person, paid, methods: theirs, last: theirs.at(-1) };
    });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <LinearGradient
        colors={scheme === 'dark' ? ['#0A1A10', '#000000'] : ['#F1FBF4', '#F2F2F7']}
        locations={[0, 0.42]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420 }}
      />
      <View style={{ paddingTop: insets.top }}>
        <Header close onBack={() => router.dismissTo('/(tabs)')} tint={c.surfaceAlt} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: space[10] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', paddingTop: space[6], gap: space[5] }}>
          <Animated.View
            style={[
              {
                width: 88, height: 88, borderRadius: radius.full,
                backgroundColor: c.positive, alignItems: 'center', justifyContent: 'center',
              },
              markStyle,
            ]}
          >
            <Icon name="check" size={44} color={scheme === 'dark' ? c.bg : '#FFFFFF'} strokeWidth={2.4} />
          </Animated.View>

          <View style={{ gap: space[2], paddingHorizontal: space[6] }}>
            <Txt variant="title1" center>Everyone's square</Txt>
            <Txt variant="body" color="inkSecondary" center tnum>
              {formatMoney(summary.owedToPayer)} back, from {pluralise(paidRows.length, 'person', 'people')}.
            </Txt>
          </View>
        </View>

        <View style={{ padding: space[4], paddingTop: space[8] }}>
          <Card style={{ paddingVertical: space[1] }}>
            {paidRows.map((r, i) => (
              <Animated.View
                key={r.person.id}
                entering={FadeInDown.delay(120 + i * 60).duration(320)}
                style={{
                  height: 60,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space[3],
                  paddingHorizontal: space[4],
                }}
              >
                <Avatar name={r.person.displayName} size={32} />
                <View style={{ flex: 1 }}>
                  <Txt variant="callout" style={{ fontWeight: '600' }}>{r.person.displayName}</Txt>
                  <Txt variant="footnote" color="inkSecondary">
                    {r.methods.length > 1
                      ? `${r.methods.length} payments`
                      : r.last
                        ? PAYMENT_METHOD_LABEL[r.last.method]
                        : '—'}
                    {r.last ? ` · ${formatShortDay(r.last.recordedAt)}` : ''}
                  </Txt>
                </View>
                <Money value={r.paid} sign color="positiveText" />
              </Animated.View>
            ))}
            <View style={{ height: 0.5, backgroundColor: c.border, marginHorizontal: space[4] }} />
            <View
              style={{
                height: 56,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: space[4],
              }}
            >
              <Txt variant="bodyStrong">Collected</Txt>
              <Money value={summary.collected} variant="title2" />
            </View>
          </Card>

          <Txt variant="footnote" color="inkSecondary" center style={{ paddingTop: space[6] }}>
            The receipt photo is deleted 30 days after this event closes.
          </Txt>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[4] }}>
        <ButtonRow>
          <Button
            label="Share summary"
            variant="secondary"
            flex
            onPress={() => router.push({ pathname: '/event/[id]/settlement', params: { id } })}
          />
          <Button
            label="Close event"
            flex
            onPress={() => {
              closeEvent(id);
              router.dismissTo('/(tabs)');
            }}
          />
        </ButtonRow>
      </View>
    </View>
  );
}
