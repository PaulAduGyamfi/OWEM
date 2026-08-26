import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useOwem } from '@/lib/store';
import { radius, space, useColors } from '@/theme';
import { Card, Grouped, Row } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { Skeleton, Spinner } from '@/components/ui/Progress';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Banner } from '@/components/owem/Provenance';

const STEPS = ['Photo uploaded', 'Finding the line items', 'Checking the maths'];

/** The model reading the receipt. Stand-in for POST /receipts/{id} extraction. */
export default function Extracting() {
  const c = useColors();
  const { id, receiptId } = useLocalSearchParams<{ id: string; receiptId: string }>();
  const router = useRouter();
  const { applyExtraction } = useOwem();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const a = setTimeout(() => setStep(1), 900);
    const b = setTimeout(() => setStep(2), 2000);
    const done = setTimeout(() => {
      applyExtraction(receiptId);
      router.replace({ pathname: '/event/[id]/review', params: { id, receiptId } });
    }, 2900);
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(done); };
    // Runs once: this screen exists only to cover the wait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <Header close />

      <View style={{ paddingHorizontal: space[4], flexDirection: 'row', gap: space[4], alignItems: 'center' }}>
        <View
          style={{
            width: 56, height: 72, borderRadius: radius.sm, backgroundColor: '#F5F3EE',
            padding: space[2], gap: 4, justifyContent: 'center',
          }}
        >
          {[100, 80, 100, 60, 100, 70].map((w, i) => (
            <View key={i} style={{ height: 3, width: `${w}%`, backgroundColor: '#D8D8DD' }} />
          ))}
        </View>
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
                  <View
                    style={{ width: 24, height: 24, borderRadius: radius.full, borderWidth: 1.5, borderColor: c.border }}
                  />
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
          text="Nothing here counts yet. Every line the model reads waits for you to confirm it before it can touch anyone's balance."
        />
      </View>
    </Screen>
  );
}
