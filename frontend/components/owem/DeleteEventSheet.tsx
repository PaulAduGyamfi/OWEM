import { View } from 'react-native';
import { radius, space, useColors } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Press } from '@/components/ui/Pressable';
import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';

export function DeleteEventSheet({
  event, onClose, onConfirm,
}: {
  event: { id: string; title: string; settled: boolean } | null;
  onClose: () => void;
  onConfirm: (eventId: string) => void;
}) {
  const c = useColors();

  return (
    <Sheet
      open={event !== null}
      onClose={onClose}
      title={`Delete ${event?.title ?? 'this event'}?`}
      subtitle={
        event?.settled
          ? 'This one has a settlement. Deleting it destroys the record of what everyone was told they owed.'
          : 'The receipt, the people and every amount go with it. This cannot be undone.'
      }
    >
      <View style={{ gap: space[3] }}>
        <Press
          onPress={() => event && onConfirm(event.id)}
          haptic="warn"
          label="Delete this event"
          style={{
            height: 56,
            borderRadius: radius.full,
            backgroundColor: c.negativeSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt variant="bodyStrong" style={{ color: c.negativeText }}>Delete event</Txt>
        </Press>
        <Button label="Keep it" variant="secondary" onPress={onClose} />
      </View>
    </Sheet>
  );
}
