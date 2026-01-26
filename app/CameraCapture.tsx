import { uploadImage } from "@/api/IssueDetail";
import CustomText from "@/components/CustomText";
import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, TouchableOpacity, View } from "react-native";

interface CapturedData {
  imageUri: string;
  latitude: number;
  longitude: number;
  address: string;
  timestamp: Date;
}

export default function CameraCapture() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string>("");
  const [addressDetails, setAddressDetails] = useState<Location.LocationGeocodedAddress | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status === "granted");

        if (status === "granted") {
        
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setLocation(currentLocation);

          // Get address from coordinates
          try {
            const [addressResult] = await Location.reverseGeocodeAsync({
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            });

            if (addressResult) {
              setAddressDetails(addressResult);
              const addressParts = [
                addressResult.street,
                addressResult.city,
                addressResult.region,
              ].filter(Boolean);
              setAddress(addressParts.join(", "));
            }
          } catch {
            // Reverse geocoding failed, continue without address
            console.log("Reverse geocoding failed");
          }
        }
      } catch (error) {
        console.error("Location error:", error);
        setLocationPermission(false);
      }
    })();
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo) {
        // Get fresh location for this photo
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        let currentAddress = "";
        let currentAddressDetails = null;
        
        // Get fresh address from coordinates
        try {
          const [addressResult] = await Location.reverseGeocodeAsync({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          });

          if (addressResult) {
            currentAddressDetails = addressResult;
            const addressParts = [
              addressResult.street,
              addressResult.city,
              addressResult.region,
            ].filter(Boolean);
            currentAddress = addressParts.join(", ");
          }
        } catch {
          console.log("Reverse geocoding failed");
        }

        // Upload image to GCP
        const gcsPath = await uploadImage(photo.uri, "image/jpeg");
        console.log("Image uploaded to GCP:", gcsPath);

        const capturedData: CapturedData = {
          imageUri: photo.uri,
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          address: currentAddress,
          timestamp: new Date(),
        };

        // Navigate to IssueForm with captured data and GCS path
        router.push({
          pathname: "/IssueForm",
          params: {
            imageUri: capturedData.imageUri,
            gcsPath: gcsPath,
            latitude: capturedData.latitude.toString(),
            longitude: capturedData.longitude.toString(),
            address: capturedData.address,
            timestamp: capturedData.timestamp.toISOString(),
            addressDetails: currentAddressDetails ? JSON.stringify(currentAddressDetails) : undefined,
          },
        });
      }
    } catch (error) {
      console.error("Error capturing/uploading photo:", error);
      Alert.alert(
        "Upload Failed",
        "Failed to upload the image. Please try again."
      );
    } finally {
      setIsCapturing(false);
    }
  };

  // Loading state while checking permissions
  if (permission === null || locationPermission === null) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="large" color="#6200EE" />
        <CustomText className="mt-4 text-white">Checking permissions...</CustomText>
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

  // Location permission not granted
  if (!locationPermission) {
    const handleLocationPermission = async () => {
      // First check current permission status
      const { status: currentStatus } = await Location.getForegroundPermissionsAsync();

      if (currentStatus === "denied") {
        // Permission was denied before, need to open settings on iOS
        Alert.alert(
          "Location Permission Required",
          "Location access was denied. Please enable it in Settings to continue.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // Request permission (will show dialog if not yet asked)
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted");

      if (status === "granted") {
        // Fetch location after permission granted
        try {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation(currentLocation);
        } catch (error) {
          console.error("Error getting location:", error);
        }
      }
    };

    return (
      <View className="flex-1 justify-center items-center bg-black px-6">
        <MaterialIcons name="location-off" size={64} color="#6200EE" />
        <CustomText className="mt-4 text-white text-center text-lg">
          Location access is required to tag the issue location
        </CustomText>
        <TouchableOpacity
          onPress={handleLocationPermission}
          className="mt-6 bg-primary px-8 py-3 rounded-lg"
        >
          <CustomText className="text-white font-semibold">Grant Permission</CustomText>
        </TouchableOpacity>
      </View>
    );
  }

  // Waiting for location
  if (!location) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="large" color="#6200EE" />
        <CustomText className="mt-4 text-white">Getting location...</CustomText>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
      >
        {/* Bottom capture button */}
        <View className="absolute bottom-0 left-0 right-0 pb-10 items-center bg-black/50">
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
      </CameraView>
    </View>
  );
}
