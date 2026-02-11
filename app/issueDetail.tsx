
import { fetchIssue, rejectIssue } from "@/api/IssueDetail";
import CustomText from "@/components/CustomText";
import IssueImage from "@/components/IssueImage/IssueImage";
import { APIResponse } from "@/models/APIResponse";
import { ensureUserIsNearIssue } from "@/utils/DistanceCheck";
import { calculateDaysActive, formatDate } from "@/utils/FormatDate";
import { formatLocationString } from "@/utils/ImageProcessing";
import { 
    calculateHaversineDistance,
    getLocationWithPermission,
 } from "@/utils/LocationService";
import { handleShare } from "@/utils/Share";
import { useUser } from "@/utils/UserContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useState } from 'react';

import { ActivityIndicator, Alert, ScrollView, TouchableOpacity, View } from 'react-native';

const DISTANCE_THRESHOLD = 50; // 50 meters

const IssueDetailScreen = () => {
    const params = useLocalSearchParams<{ id?: string; issueId?: string; refresh?: string }>();
    const navigation = useNavigation();
    const router = useRouter();
    const { user } = useUser();
    const [issueData, setIssueData] = useState<APIResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [checkingDistance, setCheckingDistance] = useState(false);

    useEffect(() => {
        const loadIssue = async () => {
            try {
                setLoading(true);
                setError(null);
                setIsDeleting(false);
                // Get issue ID from route params, check both 'id' and 'issueId'
                const issueId = params.issueId
                    ? parseInt(params.issueId, 10)
                    : params.id
                    ? parseInt(params.id, 10)
                    : 1;
                console.log('Loading issue with ID:', issueId);
                const data = await fetchIssue(issueId);
                setIssueData(data);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load issue';
                setError(errorMessage);
                console.error('Error loading issue:', err);
            } finally {
                setLoading(false);
            }
        };

        loadIssue();
    }, [params.id, params.issueId, params.refresh]);

    // Update header title dynamically based on locality hashtags
    useLayoutEffect(() => {
        if (issueData?.data?.issue?.location?.locality?.hashtags) {
            const hashtags = issueData.data.issue.location.locality.hashtags;
            const headerTitle = hashtags.length > 0 
                ? hashtags.join(' ')
                : 'Issue Detail';
            
            navigation.setOptions({
                title: headerTitle,
            });
        } else {
            // Fallback title while loading or if no hashtags
            navigation.setOptions({
                title: 'Issue Detail',
            });
        }
    }, [issueData, navigation]);

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#6200EE" />
                <CustomText className="mt-4">Loading issue...</CustomText>
            </View>
        );
    }

    if (error || !issueData) {
        return (
            <View className="flex-1 justify-center items-center px-4">
                <MaterialIcons name="error-outline" size={48} color="#9B2226" />
                <CustomText className="mt-4 text-center text-red-600 font-semibold">
                    {error || 'Failed to load issue data'}
                </CustomText>
                <CustomText className="mt-2 text-center text-gray-600 text-sm">
                    Check console logs for details
                </CustomText>
            </View>
        );
    }

    const { issue } = issueData.data;

    // Sort media by created_at ascending (oldest first) so the original report is at index 0
    const sortedMedia = [...issue.media_urls].sort((a, b) => {
        if (!a.created_at || !b.created_at) return 0;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    // Process media items for the slideshow (with username, description, timestamp, profile_photo per image)
    const mediaItems = sortedMedia.map((media, index) => ({
        url: media.url,
        description: media.description || (index === 0 ? issue.description : undefined),
        username: media.username || (index === 0 ? issue.user.username : undefined),
        profile_photo: media.profile_photo || (index === 0 ? issue.user.profilePictureUrl : undefined),
        created_at: media.created_at ? formatDate(media.created_at) : undefined,
        days_active: media.created_at ? calculateDaysActive(media.created_at) : undefined,
    }));

    const locationString = formatLocationString(issue.location);
    const formattedDate = formatDate(issue.created_at);
    const daysActive = calculateDaysActive(issue.created_at);

    // Get issue ID for share functionality
    const issueId = params.issueId
        ? parseInt(params.issueId, 10)
        : params.id
        ? parseInt(params.id, 10)
        : undefined;

    const handleUpdate = async () => {
        if (!issueId) return;

        try {
            setCheckingDistance(true);
            const isNear = await ensureUserIsNearIssue(issue.location.lat, issue.location.lng);
            if (!isNear) {
                return;
            }

            // If within distance threshold, navigate to update screen
            router.push({
                pathname: "/CameraCapture",
                params: {
                    mode: "update",
                    issueType: issue.type.toUpperCase(),
                    issueId: issueId,
                },
            });
        } catch (err) {
            console.error("Distance check error:", err);
            Alert.alert("Error", "Unable to check your distance from the issue. Please try again.");
        } finally {
            setCheckingDistance(false);
        }
    };

    const handleDelete = async () => {
        if (!issueId) return;
        setIsDeleting(true);
        try {
            await rejectIssue(issueId);
            router.replace("/(tabs)");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to delete issue";
            Alert.alert("Error", msg);
            setIsDeleting(false);
        }
    };

    return (
        <ScrollView className="bg-gray-50">
            {/* Image Card — image + description + reported/updated by (updates with slideshow) */}
            <View className="bg-white mx-3 mt-3 rounded-xl shadow-md overflow-hidden" style={{ elevation: 3 }}>
                <IssueImage
                    mediaItems={mediaItems}
                    location={locationString}
                    timestamp={formattedDate}
                    className="w-full"
                />
            </View>

            {/* Update Button */}
            <TouchableOpacity
                onPress={handleUpdate}
                disabled={checkingDistance}
                className="flex-row items-center justify-center gap-2 bg-[#2563EB] mx-3 mt-3 py-3 rounded-xl"
                style={{ elevation: 2 }}
            >
                {checkingDistance ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                    <MaterialIcons name="camera-alt" size={20} color="#fff" />
                    <CustomText className="text-white font-semibold p">
                    Update Issue
                    </CustomText>
                    </>
                )}
            </TouchableOpacity>


            {/* Issue Details Card */}
            <View className="bg-white p-5 mt-3 mx-3 rounded-xl shadow-md" style={{ elevation: 3 }}>
                 {/* Location Details */}
                <View className="mb-3">
                    <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                            <MaterialIcons name="location-on" size={20} color="#256D1B" />
                            <CustomText className="ml-2 font-bold">Location</CustomText>
                        </View>
                        <TouchableOpacity
                            onPress={() => handleShare(issueId, issue.type)}
                            className="p-2"
                        >
                            <MaterialIcons name="share" size={26} color="#256D1B" />
                        </TouchableOpacity>
                    </View>
                    <CustomText className="text-gray-700 ml-7">
                        {issue.location.colloquial_name || issue.location.address}
                    </CustomText>
                    <CustomText className="text-gray-500 text-sm ml-7">
                        {issue.location.lat.toFixed(6)}, {issue.location.lng.toFixed(6)}
                    </CustomText>
                </View>
                {/* Issue Type */}
                <View className="flex-row items-center mb-3">
                    <MaterialIcons name="category" size={20} color="#256D1B" />
                    <CustomText className="ml-2 text-lg font-bold capitalize">
                        {issue.type}
                    </CustomText>
                </View>

                {/* Verify Count */}
                <View className="flex-row items-center mb-3">
                    <MaterialIcons name="verified" size={20} color="#256D1B" />
                    <CustomText className="ml-2 text-gray-700">
                        {issue.verify_count} {issue.verify_count === 1 ? 'verification' : 'verifications'}
                    </CustomText>
                </View>
                {/* Status */}
                {issue.status && (
                    <TouchableOpacity
                        onPress={() => Alert.alert(
                            "Issue Status",
                            issue.status === "OPEN"
                                ? "This issue is open and visible to the community. Updates and verifications can be added."
                                : issue.status === "RESOLVE"
                                ? "This issue has been resolved and closed."
                                : issue.status === "ONHOLD"
                                ? "This issue is on hold and is being reviewed by the admin before it goes public."
                                : issue.status === "REJECTED"
                                ? "This issue has been rejected and removed."
                                : `Current status: ${issue.status}`
                        )}
                        className="mb-3 flex-row items-center self-start bg-gray-100 px-3 py-2 rounded-full gap-2"
                    >
                        <CustomText className="text-xs text-gray-600 uppercase font-semibold">
                            {issue.status}
                        </CustomText>
                        <MaterialIcons name="info-outline" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                )}

                {/* Hashtags */}
                {issue.location.locality?.hashtags && issue.location.locality.hashtags.length > 0 && (
                    <View className="flex-row flex-wrap mb-3">
                        {issue.location.locality.hashtags.map((tag: string, index: number) => (
                            <View key={index} className="bg-green-100 px-3 py-1 rounded-full mr-2 mb-2">
                                <CustomText className="text-green-700 font-bold">{tag}</CustomText>
                            </View>
                        ))}
                    </View>
                )}

                {/* Timestamp */}
                <View className="flex-row items-center">
                    <MaterialIcons name="access-time" size={20} color="#666" />
                    <CustomText className="ml-2 text-gray-600 text-sm">
                        {formattedDate} • {daysActive}
                    </CustomText>
                </View>
            </View>

            {/* Delete Button - only visible to the original reporter */}
            {user?.username === issue.user.username && (
                <TouchableOpacity
                    onPress={handleDelete}
                    disabled={isDeleting}
                    className="flex-row items-center justify-center gap-2 mx-3 mb-6 py-3"
                    style={{ elevation: 2 }}
                >
                    {isDeleting ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                        <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                    )}
                    <CustomText className="text-red-500 font-semibold">
                        {isDeleting ? "Deleting..." : "Delete Issue"}
                    </CustomText>
                </TouchableOpacity>
            )}

        </ScrollView>
    );
};



export default IssueDetailScreen;