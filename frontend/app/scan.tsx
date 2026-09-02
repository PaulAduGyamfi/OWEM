import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useOwem } from '@/lib/store';
import { ReceiptCamera } from '@/components/owem/ReceiptCamera';

export default function Scan() {
  const router = useRouter();
  const { createEvent } = useOwem();
  const [creating, setCreating] = useState(false);

  const start = async (next: 'extracting' | 'manual', photoUri?: string) => {
    if (creating) return;
    setCreating(true);
    const id = await createEvent('Dinner', null, null);
    if (!id) {
      setCreating(false);
      return;
    }
    router.replace(
      next === 'extracting'
        ? { pathname: '/event/[id]/extracting', params: { id, photoUri } }
        : { pathname: '/event/[id]/manual', params: { id } },
    );
  };

  return (
    <ReceiptCamera
      busy={creating}
      onCapture={(uri) => void start('extracting', uri)}
      onManual={() => void start('manual')}
      onClose={() => router.back()}
    />
  );
}
