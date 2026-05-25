
import { fetchIssue, rejectIssue } from "@/api/IssueDetail";
import CustomText from "@/components/CustomText";
import IssueImage from "@/components/IssueImage/IssueImage";
import KarmaBadge from "@/components/KarmaBadge";
import { APIResponse } from "@/models/APIResponse";
import { ensureUserIsNearIssue } from "@/utils/DistanceCheck";
import { calculateDaysActive, formatDate } from "@/utils/FormatDate";
import { formatLocationString } from "@/utils/ImageProcessing";
import { handleShare } from "@/utils/Share";
import { useUser } from "@/utils/UserContext";
import { trackIssueDetailOpened } from "@/utils/analytics";
import { MaterialIcons } from "@expo/vector-icons";
import { getCrashlytics, log, recordError as recordCrashError } from "@react-native-firebase/crashlytics";
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DISTANCE_THRESHOLD = 50; // 50 meters

const IssueDetailScreen = () => {
    const params = useLocalSearchParams<{ id?: string; issueId?: string; refresh?: string }>();
    const navigation = useNavigation();
    const router = useRouter();
    const { user } = useUser();
    const insets = useSafeAreaInsets();
    const [issueData, setIssueData] = useState<APIResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [checkingDistance, setCheckingDistance] = useState(false);
    const [showStatusDetails, setShowStatusDetails] = useState(false);
    const [showPortalStatusDetails, setShowPortalStatusDetails] = useState(false);
    const isFocused = useIsFocused();
    const isFocusedRef = useRef(isFocused);

    useEffect(() => {
        isFocusedRef.current = isFocused;
    }, [isFocused]);

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
                trackIssueDetailOpened(issueId);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load issue';
                setError(errorMessage);
                console.error('Error loading issue:', err);
                const crashlytics = getCrashlytics();
                log(crashlytics, `Issue detail load failed (id: ${params.issueId ?? params.id})`);
                recordCrashError(crashlytics, err instanceof Error ? err : new Error(errorMessage));
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
                headerRight: () => <KarmaBadge />,
            });
        } else {
            // Fallback title while loading or if no hashtags
            navigation.setOptions({
                title: 'Issue Detail',
                headerRight: () => <KarmaBadge />,
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

    const portalData = issue.gov_portal_data || [];
    
    // helper for portal duration text
    const getPortalDurationText = (portal: any) => {
        if (!portal.updated_at) return "";

        const start = new Date(portal.created_at);
        const end = new Date(portal.updated_at);

        const diffDays = Math.floor(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (portal.status === "OPEN") {
            return `Open for ${diffDays} days`;
        }

        if (portal.status === "CLOSED") {
            return `Closed in ${diffDays} days`;
        }

        return "";
    };

    const formatMetaKey = (key: string) => {
        return key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    // Sort media by created_at ascending (oldest first) so the original report is at index 0
    const sortedMedia = [...issue.media_urls].sort((a, b) => {
        if (!a.created_at || !b.created_at) return 0;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    // Process media items for the slideshow (with username, description, timestamp, profile_photo per image)
    const mediaItems = sortedMedia.map((media, index) => ({
        url: media.url,
        url_thumbnail: media.url_thumbnail,
        description: media.description || (index === 0 ? issue.description : undefined),
        username: media.username || (index === 0 ? issue.user.username : undefined),
        profile_photo: media.profile_photo || (index === 0 ? issue.user.profile_photo : undefined),
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
        if (!issueId || checkingDistance) return;

        try {
            setCheckingDistance(true);
            const isNear = await ensureUserIsNearIssue(issue.location.lat, issue.location.lng);

            // If user left the screen, stop here
            if (!isFocusedRef.current) return;

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
            if (isFocusedRef.current) {
                console.error("Distance check error:", err);
                const crashlytics = getCrashlytics();
                log(crashlytics, `Distance check failed on issue detail (id: ${issueId})`);
                recordCrashError(crashlytics, err instanceof Error ? err : new Error(String(err)));
                Alert.alert("Error", "Unable to check your distance from the issue. Please try again.");
            }
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
            const crashlytics = getCrashlytics();
            log(crashlytics, `Issue delete failed (id: ${issueId})`);
            recordCrashError(crashlytics, err instanceof Error ? err : new Error(msg));
            Alert.alert("Error", msg);
            setIsDeleting(false);
        }
    };

    const openPortalLink = async (url: string) => {
        try {
            await WebBrowser.openBrowserAsync(url);
        } catch (err) {
            Alert.alert("Error", "Unable to open portal link.");
        }
    };

    return (
        <ScrollView className="bg-gray-50" contentContainerStyle={{ paddingBottom: insets.bottom + 25 }}>
            {/* Image Card — image + description + reported/updated by (updates with slideshow) */}
            <View className="bg-white mx-3 mt-3 rounded-xl shadow-md overflow-hidden" style={{ elevation: 3 }}>
                <IssueImage
                    mediaItems={mediaItems}
                    location={locationString}
                    timestamp={formattedDate}
                    className="w-full"
                />
            </View>

            {/* Update Button — hidden for RESOLVED and REJECTED issues */}
            {issue.status !== 'RESOLVED' && issue.status !== 'REJECTED' && (
                <TouchableOpacity
                    onPress={handleUpdate}
                    disabled={checkingDistance}
                    className="flex-row items-center justify-center gap-2 bg-[#2563EB] mx-3 mt-3 py-3 rounded-xl"
                    style={{ elevation: 2 }}
                >
                    {checkingDistance ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <MaterialIcons name="camera-alt" size={20} color="#fff" />
                    )}
                    <CustomText className="text-white font-semibold p">
                        Update Issue
                    </CustomText>
                </TouchableOpacity>
            )}


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

                {/* Status - Prominent */}
                {issue.status && (
                    <TouchableOpacity
                        onPress={() => setShowStatusDetails(!showStatusDetails)}
                        className="mb-4"
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center gap-2 bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
                            <MaterialIcons name="info" size={20} color="#2563EB" />
                            <CustomText className="text-sm text-blue-900 uppercase font-bold">
                                {issue.status}
                            </CustomText>
                        </View>
                        {showStatusDetails && (
                            <CustomText className="text-gray-600 text-sm mt-2">
                                {issue.status === "OPEN"
                                    ? "This issue is open and visible to the community. Updates and verifications can be added."
                                    : issue.status === "RESOLVED"
                                    ? "This issue has been resolved and closed."
                                    : issue.status === "ONHOLD"
                                    ? "This issue is on hold and is being reviewed by the admin before it goes public."
                                    : issue.status === "PENDING"
                                    ? "This issue is pending to be resolved and is being reviewed by our community."
                                    : issue.status === "REJECTED"
                                    ? "This issue has been rejected and removed."
                                    : `Current status: ${issue.status}`}
                            </CustomText>
                        )}
                    </TouchableOpacity>
                )}

                {/* Issue Type & Verify Count - Side by Side */}
                <View className="flex-row gap-4 mb-3">
                    <View className="flex-1 flex-row items-center">
                        <MaterialIcons name="category" size={20} color="#256D1B" />
                        <CustomText className="ml-2 text-lg font-bold capitalize">
                            {issue.type}
                        </CustomText>
                    </View>
                    <View className="flex-1 flex-row items-center">
                        <MaterialIcons name="verified" size={20} color="#256D1B" />
                        <CustomText className="ml-2 text-gray-700">
                            {issue.verify_count} {issue.verify_count === 1 ? 'verification' : 'verifications'}
                        </CustomText>
                    </View>
                </View>

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
                <View className="flex-row items-center justify-end">
                    <MaterialIcons name="access-time" size={16} color="#666" />
                    <CustomText className="text-gray-600 text-sm ml-1">
                        {daysActive}
                    </CustomText>
                </View>
            </View>

            {/* Government Portal Tracking */}
            {portalData.length > 0 && (
            <View className="bg-white p-5 mt-3 mx-3 rounded-xl shadow-md" style={{ elevation: 3 }}>

            <View className="flex-row items-center mb-3">
            <MaterialIcons name="account-balance" size={20} color="#2563EB" />
            <CustomText className="ml-2 font-bold text-lg">
            Government Portal Tracking
            </CustomText>
            </View>

            {portalData.map((portal, index) => (

            <View key={index} className="border-t border-gray-200 pt-3 mb-4">

            {/* Tracking ID + Portal name */}
            <View className="flex-row justify-between items-center mb-2">

            <View className="flex-row items-center">
            <MaterialIcons name="confirmation-number" size={18} color="#256D1B" />
            <CustomText className="ml-2 text-gray-700">
            Tracking ID: {portal.tracking_id}
            </CustomText>
            </View>

            <CustomText className="text-green-700 font-semibold">
            {portal.portal_name}
            </CustomText>

            </View>

            {/* Status */}
            <TouchableOpacity
                onPress={() => setShowPortalStatusDetails(!showPortalStatusDetails)}
                className="mb-2"
                activeOpacity={0.7}
            >

            <View className="flex-row items-center gap-2 bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">

            <MaterialIcons name="info" size={18} color="#2563EB" />

            <CustomText className="text-blue-900 font-bold uppercase">
            {portal.status}
            </CustomText>

            </View>

            {showPortalStatusDetails && (

            <CustomText className="text-gray-600 text-sm mt-2">

            {portal.status === "OPEN"
            ? "The complaint has been registered on the government portal and is currently open."

            : portal.status === "CLOSED"
            ? "The government portal says issue has been resolved. Click a Image to veriy"

            : `Current status: ${portal.status}`}

            </CustomText>

            )}

            </TouchableOpacity>

            {/* Duration */}
            <CustomText className="text-gray-700 text-sm mb-2">
            {getPortalDurationText(portal)}
            </CustomText>

            {/* Metadata */}
            {portal.meta_data &&
            Object.keys(portal.meta_data).length > 0 && (

            <View className="mt-2 bg-gray-50 rounded p-3">

            {Object.entries(portal.meta_data).map(([key, value], i) => (

            <View key={i} className="flex-row mb-1">

            <CustomText className="font-semibold text-gray-700">
            {formatMetaKey(key)}:
            </CustomText>

            <CustomText className="ml-2 text-gray-600">
            {typeof value === "object"
            ? JSON.stringify(value)
            : String(value)}
            </CustomText>

            </View>

            ))}

            </View>

            )}

            {/* Portal link */}
            {portal.portal_track_link && (
            <TouchableOpacity
            onPress={() => openPortalLink(portal.portal_track_link)}
            className="flex-row items-center justify-end mt-2 mb-2"
            >
            <MaterialIcons name="open-in-new" size={18} color="#2563EB" />
            <CustomText className="ml-2 text-blue-600 underline">
            Check issue status on portal
            </CustomText>
            </TouchableOpacity>
            )}

            </View>

            ))}

            </View>
            )}

            {/* Delete Button - visible to original reporter or admins */}
            {(user?.username === issue.user.username || user?.user_role === "ADMIN") && (
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