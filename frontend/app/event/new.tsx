import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDay } from '@/lib/format.ts';
import { space, useColors } from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Grouped, Row } from '@/components/ui/Card';
import { DateSheet } from '@/components/ui/DateSheet';
import { Field } from '@/components/ui/Field';
import { Header, Title } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Banner } from '@/components/owem/Provenance';

export default function NewEvent() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [when, setWhen] = useState(() => new Date());
  const [picking, setPicking] = useState(false);

  const go = () =>
    router.push({
      pathname: '/event/[id]/participants',
      params: {
        id: 'new',
        title: title.trim() || "Dinner at Rosati's",
        place: place.trim(),
        occurredAt: when.toISOString(),
      },
    });

  return (
    <Screen>
      <Header />
      <View style={{ gap: space[6], flex: 1 }}>
        <Title text="New event" sub="One dinner, one bill, one settlement." />

        <View style={{ paddingHorizontal: space[4], gap: space[6] }}>
          <Field
            label="What was it"
            value={title}
            onChangeText={setTitle}
            placeholder="Dinner at Rosati's"
            autoFocus
            onSubmitEditing={go}
          />
          <Field label="Where" value={place} onChangeText={setPlace} placeholder="Rosati's, Logan Square" />

          <View style={{ gap: space[2] }}>
            <Txt variant="caption" color="inkSecondary">DETAILS</Txt>
            <Grouped inset={space[4]}>
              <Row onPress={() => setPicking(true)}>
                <Txt variant="bodyStrong" style={{ flex: 1 }}>When</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Txt variant="callout" color="inkSecondary" tnum>{formatDay(when.toISOString())}</Txt>
                  <Icon name="forward" size={18} color={c.inkTertiary} />
                </View>
              </Row>
              <Row>
                <Txt variant="bodyStrong" style={{ flex: 1 }}>Currency</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Txt variant="callout" color="inkSecondary">USD</Txt>
                </View>
              </Row>
              <Row>
                <Txt variant="bodyStrong" style={{ flex: 1 }}>Who paid</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                  <Avatar name="Paul" size={28} payer />
                  <Txt variant="callout" color="inkSecondary">You</Txt>
                </View>
              </Row>
            </Grouped>
          </View>

          <Banner
            tone="accent"
            text="You're the only one with an account. Everyone else is just a name on this bill."
          />
        </View>

        <View style={{ flex: 1 }} />
        <View style={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[4] }}>
          <Button label="Add people" icon="arrowRight" onPress={go} />
        </View>
      </View>

      <DateSheet open={picking} onClose={() => setPicking(false)} value={when} onChange={setWhen} />
    </Screen>
  );
}
