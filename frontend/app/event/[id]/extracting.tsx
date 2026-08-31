import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useOwem } from '@/lib/store';
import { radius, space, useColors } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Card, Grouped, Row } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { Skeleton, Spinner } from '@/components/ui/Progress';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Banner } from '@/components/owem/Provenance';

const STEPS = ['Photo uploaded', 'Finding the line items', 'Checking the maths'];

export default function Extracting() {
  const c = useColors();
  const { id, photoUri } = useLocalSearchParams<{ id: string; photoUri?: string }>();
  const router = useRouter();
  const { extractReceipt } = useOwem();
  const [step, setStep] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const ticks = [
      setTimeout(() => setStep(1), 700),
      setTimeout(() => setStep(2), 2600),
    ];

    void (async () => {
      try {
        const outcome = await extractReceipt(id, {
          uri: photoUri ?? '',
          name: 'receipt.jpg',
          type: 'image/jpeg',
        });
        setStep(3);
        router.replace({
          pathname: '/event/[id]/review',
          params: {
            id,
            receiptId: outcome?.receipt.id ?? '',
            problems: outcome?.problems.join(' · ') ?? '',
          },
        });
      } catch (error) {
        setFailure(
          error instanceof Error ? error.message : 'The receipt could not be read.',
        );
      }
    })();

    return () => ticks.forEach(clearTimeout);
  }, []);

  if (failure) {
    return (
      <Screen>
        <Header close />
        <View style={{ padding: space[4], gap: space[5] }}>
          <Txt variant="title1">That didn't read</Txt>
          <Banner tone="warning" text={failure} />
          <Txt variant="body" color="inkSecondary">
            A clearer photo usually fixes it — flat, all four edges in frame. Or type the
            lines in and skip the model entirely.
          </Txt>
          <View style={{ gap: space[3], paddingTop: space[4] }}>
            <Button
              label="Try another photo"
              onPress={() => router.replace({ pathname: '/event/[id]/capture', params: { id } })}
            />
            <Button
              label="Type it in instead"
              variant="secondary"
              onPress={() => router.replace({ pathname: '/event/[id]/manual', params: { id } })}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header close />

      <View style={{ paddingHorizontal: space[4], flexDirection: 'row', gap: space[4], alignItems: 'center' }}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={{ width: 56, height: 72, borderRadius: radius.sm, backgroundColor: c.surfaceAlt }}
            contentFit="cover"
          />
        ) : (
          <View style={{ width: 56, height: 72, borderRadius: radius.sm, backgroundColor: c.surfaceAlt }} />
        )}
        <Txt variant="title1">Reading the{'\n'}receipt</Txt>
      </View>

      <View style={{ padding: space[4], paddingTop: space[8], gap: space[5] }}>
        <Grouped inset={52}>
          {STEPS.map((label, i) => (
            <Row key={label}>
              <View style={{ width: 24, alignItems: 'center' }}>
                {i < step ? (
                  <View
                    style={{
                      width: 24, height: 24, borderRadius: radius.full,
                      backgroundColor: c.positiveSoft, alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon name="check" size={14} color={c.positive} strokeWidth={3} />
                  </View>
                ) : i === step ? (
                  <Spinner size={24} />
                ) : (
                  <View style={{ width: 24, height: 24, borderRadius: radius.full, borderWidth: 1.5, borderColor: c.border }} />
                )}
              </View>
              <Txt
                variant="body"
                color={i < step ? 'inkSecondary' : i === step ? 'ink' : 'inkTertiary'}
                style={i === step ? { fontWeight: '600' } : undefined}
              >
                {label}
              </Txt>
            </Row>
          ))}
        </Grouped>

        <View style={{ gap: space[3] }}>
          {[0.64, 0.48, 0.56].map((w, i) => (
            <Card key={i} style={{ opacity: i > step ? 0.55 : 1 }}>
              <Row height={56}>
                <View style={{ width: 36, height: 36, borderRadius: radius.sm, backgroundColor: c.surfaceAlt }} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width={`${w * 100}%`} />
                  <Skeleton width="34%" height={8} />
                </View>
                <Skeleton width={44} />
              </Row>
            </Card>
          ))}
        </View>

        <Banner
          tone="neutral"
          icon="receipt"
          text="Nothing here counts yet. Every line the model reads waits for you to confirm it before it can touch anyone’s balance."
        />
      </View>
    </Screen>
  );
}
