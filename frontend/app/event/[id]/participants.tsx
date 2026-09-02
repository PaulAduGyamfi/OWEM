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

const DRAFT = 'new';

export default function Participants() {
  const c = useColors();
  const params = useLocalSearchParams<{
    id: string;
    title?: string;
    place?: string;
    occurredAt?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createEvent, addParticipant, removeParticipant, busy } = useOwem();
  const { participants, items } = useEvent(params.id);

  const drafting = params.id === DRAFT;
  const [pending, setPending] = useState<string[]>([]);
  const [name, setName] = useState('');

  const names = drafting ? ['You', ...pending] : participants.map((p) => p.displayName);
  const headcount = names.length;

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (names.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setName('');
      return;
    }
    if (drafting) setPending((prev) => [...prev, trimmed]);
    else void addParticipant(params.id, trimmed);
    setName('');
  };

  const next = async () => {
    if (!drafting) {
      router.push(
        items.length > 0
          ? { pathname: '/event/[id]/assign', params: { id: params.id } }
          : { pathname: '/event/[id]/capture', params: { id: params.id } },
      );
      return;
    }
    const id = await createEvent(
      params.title ?? 'Dinner',
      params.place || null,
      params.occurredAt ?? null,
    );
    if (!id) return;
    for (const person of pending) await addParticipant(id, person);
    router.replace({ pathname: '/event/[id]/capture', params: { id } });
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
              label="Add this name"
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
            {pluralise(headcount, 'person', 'people')}
          </Txt>
        </View>

        <Grouped inset={68}>
          {names.map((person, i) => {
            const isPayer = drafting ? i === 0 : (participants[i]?.isPayer ?? false);
            return (
              <Row key={person} height={64}>
                <Avatar name={person} payer={isPayer} />
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong">{person}</Txt>
                  {isPayer && <Txt variant="footnote" color="inkSecondary">You</Txt>}
                </View>
                {isPayer ? (
                  <Badge label="Paid the bill" tone="accent" />
                ) : (
                  <Press
                    onPress={() =>
                      drafting
                        ? setPending((prev) => prev.filter((n) => n !== person))
                        : void removeParticipant(params.id, participants[i].id)
                    }
                    label={`Remove ${person}`}
                    style={{
                      width: 32, height: 32, borderRadius: radius.full,
                      backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon name="close" size={16} color={c.inkSecondary} strokeWidth={2} />
                  </Press>
                )}
              </Row>
            );
          })}
        </Grouped>
      </ScrollView>

      <View style={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[4] }}>
        <Button
          label={items.length > 0 && !drafting ? 'Assign items' : 'Next: the receipt'}
          icon="arrowRight"
          disabled={headcount < 2 || busy}
          onPress={() => void next()}
        />
      </View>
    </Screen>
  );
}
