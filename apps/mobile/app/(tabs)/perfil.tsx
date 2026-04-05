import DocumentScanner from "react-native-document-scanner-plugin";
import { signOut } from "@axyscare/core-db";
import { useState } from "react";
import { Alert, Image, Text } from "react-native";
import { Card, PrimaryButton, Screen, SectionTitle } from "../../components/ui";
import { supabase } from "../../lib/client";
import { useSession } from "../../lib/providers";

export default function ProfileTab() {
  const { user } = useSession();
  const [scannedImage, setScannedImage] = useState<string | null>(null);

  return (
    <Screen>
      <Card>
        <SectionTitle
          title="Perfil"
          subtitle="Sesión, escaneo documental y salida segura desde móvil."
        />
        <Text>{user?.email ?? "Sin usuario"}</Text>
        <PrimaryButton
          title="Escanear documento"
          onPress={async () => {
            try {
              const result = await DocumentScanner.scanDocument();
              if (result.scannedImages?.length) {
                setScannedImage(result.scannedImages[0]);
              }
            } catch (error) {
              Alert.alert("Escáner", error instanceof Error ? error.message : "No se pudo escanear.");
            }
          }}
        />
        <PrimaryButton
          title="Cerrar sesión"
          onPress={async () => {
            await signOut(supabase);
          }}
        />
      </Card>
      {scannedImage ? (
        <Card>
          <SectionTitle title="Último escaneo" />
          <Image source={{ uri: scannedImage }} style={{ width: "100%", height: 320, borderRadius: 16 }} resizeMode="contain" />
        </Card>
      ) : null}
    </Screen>
  );
}

