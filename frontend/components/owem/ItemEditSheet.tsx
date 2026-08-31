import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatAmount, parseAmount } from '@/lib/money.ts';
import type { ReceiptItem } from '@/lib/types.ts';
import { CONFIDENCE_FLOOR } from '@/lib/types.ts';
import { space, useColors } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Grouped, Row } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Press } from '@/components/ui/Pressable';
import { Sheet } from '@/components/ui/Sheet';
import { Stepper } from '@/components/ui/Stepper';
import { Txt } from '@/components/ui/Txt';
import { Banner } from './Provenance';
import { MONO } from './ItemRow';

export function ItemEditSheet({
  item, lineCount, open, onClose, onConfirm, onDelete,
}: {
  item: ReceiptItem | null;
  lineCount: number;
  open: boolean;
  onClose: () => void;
  onConfirm: (patch: { normalizedName: string; quantity: number; totalPrice: ReceiptItem['totalPrice'] }) => void;
  onDelete: () => void;
}) {
  const c = useColors();
  const [price, setPrice] = useState('');
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!item) return;
    setPrice(formatAmount(item.totalPrice));
    setName(item.normalizedName);
    setQty(item.quantity);
  }, [item]);

  if (!item) return null;

  const parsed = parseAmount(price);
  const lowConfidence = item.confidence !== null && item.confidence < CONFIDENCE_FLOOR;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item.normalizedName}
      subtitle={`Line ${item.lineNumber} of ${lineCount}`}
      detent="large"
    >
      <View style={{ flex: 1, gap: space[4] }}>
        {lowConfidence && item.confidence !== null && (
          <Banner
            tone="warning"
            text={`The model was ${Math.round(item.confidence * 100)}% sure of this price. Check it against the paper before you confirm.`}
          />
        )}

        <Grouped inset={space[4]}>
          <Row>
            <Txt variant="callout" color="inkSecondary" style={{ flex: 1 }}>Printed as</Txt>
            <Txt variant="callout" style={{ fontFamily: MONO, fontWeight: '600' }}>{item.rawName}</Txt>
          </Row>
          <Row>
            <Txt variant="callout" color="inkSecondary" style={{ flex: 1 }}>Quantity</Txt>
            <Stepper value={qty} onChange={setQty} />
          </Row>
        </Grouped>

        <Field label="Reads as" value={name} onChangeText={setName} placeholder="What it actually was" />

        <Field
          label="Price"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
          error={parsed === null ? 'Enter an amount like 16.50, with at most two decimals.' : null}
          right={<Txt variant="footnote" color="inkTertiary" style={{ paddingRight: space[3] }}>USD</Txt>}
        />

        <View style={{ flex: 1 }} />

        <View style={{ gap: space[2] }}>
          <Button
            label="That's right"
            iconLeft="check"
            disabled={parsed === null || !name.trim()}
            onPress={() => {
              if (parsed === null) return;
              onConfirm({ normalizedName: name.trim(), quantity: qty, totalPrice: parsed });
            }}
          />
          <Press onPress={onDelete} style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Txt variant="callout" style={{ color: c.negativeText, fontWeight: '600' }}>Remove this line</Txt>
          </Press>
        </View>
        <Txt variant="footnote" color="inkSecondary" center>
          Confirming marks this line as yours, not the model's.
        </Txt>
      </View>
    </Sheet>
  );
}
