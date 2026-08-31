import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pluralise } from '@/lib/format.ts';
import { useEvent, useOwem } from '@/lib/store';
import { radius, space, useColors } from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Grouped, Row } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Header, StepLabel, Title } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { Press } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';

export default function Participants() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addParticipant, removeParticipant } = useOwem();
  const { participants } = useEvent(id);
  const [name, setName] = useState('');

  const add = () => {
    if (!name.trim()) return;
    addParticipant(id, name);
    setName('');
  };

  return (
    <Screen>
      <Header right={<StepLabel step={2} of={5} />} />
      <Title text="Who was there?" sub="Names only. Nobody gets a text, nobody installs anything." />

      <View style={{ paddingHorizontal: space[4], paddingTop: space[5] }}>
        <Field
          value={name}
          onChangeText={setName}
          placeholder="Add a name"
          onSubmitEditing={add}
          right={
            <Press
              onPress={add}
              haptic="select"
              style={{
                width: 36, height: 36, borderRadius: radius.full,
                backgroundColor: name.trim() ? c.ink : c.border,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="plus" size={20} color={c.onInk} strokeWidth={2} />
            </Press>
          }
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: space[4], gap: space[3] }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Txt variant="title3">At the table</Txt>
          <Txt variant="footnote" color="inkSecondary">
            {pluralise(participants.length, 'person', 'people')}
          </Txt>
        </View>

        <Grouped inset={68}>
          {participants.map((p) => (
            <Row key={p.id} height={64}>
              <Avatar name={p.displayName} payer={p.isPayer} />
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong">{p.displayName}</Txt>
                {p.isPayer && <Txt variant="footnote" color="inkSecondary">You</Txt>}
              </View>
              {p.isPayer ? (
                <Badge label="Paid the bill" tone="accent" />
              ) : (
                <Press
                  onPress={() => void removeParticipant(id, p.id)}
                  style={{
                    width: 32, height: 32, borderRadius: radius.full,
                    backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon name="close" size={16} color={c.inkSecondary} strokeWidth={2} />
                </Press>
              )}
            </Row>
          ))}
        </Grouped>
      </ScrollView>

      <View style={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[4] }}>
        <Button
          label="Next: the receipt"
          icon="arrowRight"
          disabled={participants.length < 2}
          onPress={() => router.push({ pathname: '/event/[id]/capture', params: { id } })}
        />
      </View>
    </Screen>
  );
}
