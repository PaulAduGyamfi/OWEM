import { useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, space } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { Press } from '@/components/ui/Pressable';
import { Txt } from '@/components/ui/Txt';

export default function Capture() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [taking, setTaking] = useState(false);

  const goExtract = (uri: string) =>
    router.replace({ pathname: '/event/[id]/extracting', params: { id, photoUri: uri } });

  const shoot = async () => {
    if (taking) return;
    setTaking(true);
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.6, imageType: 'jpg' });
      if (photo?.uri) goExtract(photo.uri);
    } finally {
      setTaking(false);
    }
  };

  const fromLibrary = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.6,
      allowsEditing: false,
    });
    if (!picked.canceled && picked.assets[0]?.uri) goExtract(picked.assets[0].uri);
  };

  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', paddingTop: insets.top }}>
        <Header close tint="rgba(255,255,255,0.14)" onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: space[6], gap: space[4] }}>
          <Txt variant="title1" style={{ color: '#FFFFFF' }}>
            OWEM needs the camera
          </Txt>
          <Txt variant="body" style={{ color: 'rgba(255,255,255,0.65)' }}>
            To read a receipt it has to see one. The photo goes to your own server and
            nowhere else, and it is deleted 30 days after the event closes.
          </Txt>
        </View>
        <View style={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[6], gap: space[3] }}>
          <Button label="Allow the camera" onPress={requestPermission} />
          <Button label="Type it in instead" variant="secondary" onPress={() =>
            router.replace({ pathname: '/event/[id]/manual', params: { id } })} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', paddingTop: insets.top }}>
      <CameraView
        ref={camera}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        facing="back"
      />

      <Header close tint="rgba(255,255,255,0.14)" onBack={() => router.back()} />
      <Txt
        variant="bodyStrong"
        center
        style={{ color: '#FFFFFF', position: 'absolute', top: insets.top + space[5], left: 0, right: 0 }}
      >
        Photograph the receipt
      </Txt>

      {/* Framing brackets. */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 302, height: 440 }}>
          {([
            { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
            { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
            { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
            { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
          ] as const).map((corner, i) => (
            <View key={i} style={{ position: 'absolute', width: 36, height: 36, borderColor: '#FFFFFF', ...corner }} />
          ))}
        </View>
      </View>

      <Txt variant="footnote" center style={{ color: 'rgba(255,255,255,0.65)', paddingBottom: space[6] }}>
        Get all four edges in frame. Creases are fine.
      </Txt>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space[8],
          paddingBottom: insets.bottom + space[6],
        }}
      >
        <Press
          onPress={fromLibrary}
          style={{
            width: 56, height: 56, borderRadius: radius.md,
            backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="photo" size={24} color="#FFFFFF" />
        </Press>

        <Press
          onPress={shoot}
          haptic="select"
          disabled={taking}
          style={{
            width: 76, height: 76, borderRadius: radius.full,
            borderWidth: 4, borderColor: 'rgba(255,255,255,0.35)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 62, height: 62, borderRadius: radius.full,
              backgroundColor: palette.light.accent,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {taking && <ActivityIndicator color="#000000" />}
          </View>
        </Press>

        <Press onPress={() => router.replace({ pathname: '/event/[id]/manual', params: { id } })} style={{ width: 56 }}>
          <Txt variant="footnote" center style={{ color: '#FFFFFF', fontWeight: '600' }}>
            Type it{'\n'}instead
          </Txt>
        </Press>
      </View>
    </View>
  );
}
