import { LocationMetaData } from "@/models/Location";
import { formatLocationString } from "@/utils/ImageProcessing";
import { getFastLocationWithProgressiveWatch } from "@/utils/LocationService";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Alert, Linking } from "react-native";

export function useLocation(imageUri: string) {
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [latitude, setLatitude] = useState<string | null>(null);
  const [longitude, setLongitude] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [addressDetails, setAddressDetails] =
    useState<Location.LocationGeocodedAddress | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Reset on new image
  useEffect(() => {
    setLatitude(null);
    setLongitude(null);
  }, [imageUri]);

  // Fetch location
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        setIsLoadingLocation(true);
        setLocationError(null);

        const result = await getFastLocationWithProgressiveWatch({
          instantLoad: false,
          accuracyThresholdMeters: 30,
          timeoutMs: 15000,
        });

        if (!result.success) {
          if (result.error.code === "PERMISSION_DENIED") {
            setLocationError("Location permission denied");
            Alert.alert(
              "Location Permission Required",
              "Location access is needed to tag the issue location. Please enable it in Settings.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() },
              ]
            );
          } else {
            setLocationError("Failed to get location");
          }
          return;
        }

        const { latitude: lat, longitude: lng } = result.location;
        setLatitude(lat.toString());
        setLongitude(lng.toString());

        try {
          const [addressResult] = await Location.reverseGeocodeAsync({
            latitude: lat,
            longitude: lng,
          });

          if (addressResult) {
            setAddressDetails(addressResult);
            const addressParts = [
              addressResult.street,
              addressResult.city,
            ].filter(Boolean);
            setAddress(addressParts.join(", "));
          }
        } catch {
          console.log("Reverse geocoding failed - using coordinates only");
        }
      } catch (error) {
        console.error("Location error:", error);
        setLocationError("Failed to get location");
      } finally {
        setIsLoadingLocation(false);
      }
    };

    fetchLocation();
  }, [imageUri]);

  const locationMetaData: LocationMetaData = {
    city: addressDetails?.city || null,
    district: addressDetails?.district || addressDetails?.subregion || null,
    street_number: addressDetails?.streetNumber || null,
    street: addressDetails?.street || null,
    region: addressDetails?.region || null,
    sub_region: addressDetails?.subregion || null,
    country: addressDetails?.country || null,
    postal_code: addressDetails?.postalCode || null,
    name: addressDetails?.name || null,
    iso_country_code: addressDetails?.isoCountryCode || null,
    timezone: addressDetails?.timezone || null,
    formatted_address: address || null,
  };

  const locationString = isLoadingLocation
    ? "Getting location..."
    : formatLocationString({
        address: address || "",
        lat: latitude || "N/A",
        lng: longitude || "N/A",
      });

  return {
    latitude,
    longitude,
    isLoadingLocation,
    locationError,
    locationMetaData,
    locationString: locationString || "",
  };
}
