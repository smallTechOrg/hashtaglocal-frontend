import CustomText from "@/components/CustomText";
import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, TouchableOpacity, View } from "react-native";

export default function CameraCapture() {
  const { mode, issueType, issueId } = useLocalSearchParams<{
    mode?: string;
    issueType?: string;
    issueId?: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [zoom, setZoom] = useState(0);
  const cameraRef = useRef<CameraView>(null);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo) {
        // Navigate immediately - location will be fetched on IssueForm
        router.replace({
          pathname: "/IssueForm",
          params: {
            imageUri: photo.uri,
            timestamp: new Date().toISOString(),
            ...(mode === "verify" && { mode: "verify", issueType, issueId }),
          },
        });
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
      Alert.alert(
        "Capture Failed",
        "Failed to capture the image. Please try again."
      );
    } finally {
      setIsCapturing(false);
    }
  };

  // Loading state while checking permissions
  if (permission === null) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="large" color="#6200EE" />
      </View>
    );
  }

  // Camera permission not granted
  if (!permission.granted) {
    const handleCameraPermission = async () => {
      if (permission.canAskAgain) {
        await requestPermission();
      } else {
        Alert.alert(
          "Camera Permission Required",
          "Camera access was denied. Please enable it in Settings to continue.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
      }
    };

    return (
      <View className="flex-1 justify-center items-center bg-black px-6">
        <MaterialIcons name="camera-alt" size={64} color="#6200EE" />
        <CustomText className="mt-4 text-white text-center text-lg">
          Camera access is required to report issues
        </CustomText>
        <TouchableOpacity
          onPress={handleCameraPermission}
          className="mt-6 bg-primary px-8 py-3 rounded-lg"
        >
          <CustomText className="text-white font-semibold">Grant Permission</CustomText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        flash={flash}
        zoom={zoom}
      >
        {/* Top Controls */}
        <View className="absolute top-0 left-0 right-0 pt-12 px-6">
          <View className="flex-row justify-between items-center">
            {/* Flash Toggle */}
            <TouchableOpacity
              onPress={() => setFlash(flash === "off" ? "on" : "off")}
              className="bg-black/50 p-3 rounded-full"
            >
              <MaterialIcons
                name={flash === "off" ? "flash-off" : "flash-on"}
                size={28}
                color="white"
              />
            </TouchableOpacity>

            {/* Camera Flip */}
            <TouchableOpacity
              onPress={() => setFacing(facing === "back" ? "front" : "back")}
              className="bg-black/50 p-3 rounded-full"
            >
              <MaterialIcons name="flip-camera-ios" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Controls */}
        <View className="absolute bottom-0 left-0 right-0 pb-10 bg-black/50">
          {/* Zoom Slider */}
          <View className="px-6 pb-4">
            <View className="flex-row items-center justify-between mb-2">
              <CustomText className="text-white text-sm">Zoom: {zoom.toFixed(1)}x</CustomText>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setZoom(0)}
                  className={`px-3 py-1 rounded ${zoom === 0 ? 'bg-white' : 'bg-white/30'}`}
                >
                  <CustomText className={zoom === 0 ? 'text-black' : 'text-white'}>1x</CustomText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setZoom(0.5)}
                  className={`px-3 py-1 rounded ${zoom === 0.5 ? 'bg-white' : 'bg-white/30'}`}
                >
                  <CustomText className={zoom === 0.5 ? 'text-black' : 'text-white'}>2x</CustomText>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Capture Button */}
          <View className="items-center">
            <TouchableOpacity
              onPress={handleCapture}
              disabled={isCapturing}
              className="w-20 h-20 rounded-full bg-white items-center justify-center border-4 border-gray-300"
            >
              {isCapturing ? (
                <ActivityIndicator size="small" color="#6200EE" />
              ) : (
                <View className="w-16 h-16 rounded-full bg-white border-2 border-gray-400" />
              )}
            </TouchableOpacity>
            <CustomText className="text-white mt-3">Tap to capture</CustomText>
          </View>
        </View>
      </CameraView>
    </View>
  );
}
