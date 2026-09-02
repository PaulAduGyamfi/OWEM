import { useLocalSearchParams, useRouter } from 'expo-router';
import { ReceiptCamera } from '@/components/owem/ReceiptCamera';

export default function Capture() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <ReceiptCamera
      onCapture={(uri) =>
        router.replace({ pathname: '/event/[id]/extracting', params: { id, photoUri: uri } })
      }
      onManual={() => router.replace({ pathname: '/event/[id]/manual', params: { id } })}
      onClose={() => router.back()}
    />
  );
}
