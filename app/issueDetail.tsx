
import { fetchIssue } from "@/api/IssueDetail";
import CustomText from "@/components/CustomText";
import IssueImage from "@/components/IssueImage/IssueImage";
import { APIResponse } from "@/models/APIResponse";
import { calculateDaysActive, formatDate } from "@/utils/FormatDate";
import { formatLocationString, processImageUrls } from "@/utils/ImageProcessing";
import { handleShare } from "@/utils/Share";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, View } from 'react-native';

  
const IssueDetailScreen = () => {
    const params = useLocalSearchParams<{ id?: string; issueId?: string }>();
    const navigation = useNavigation();
    const [issueData, setIssueData] = useState<APIResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadIssue = async () => {
            try {
                setLoading(true);
                setError(null);
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
    }, [params.id, params.issueId]);

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

    // Process images and location using utility functions
    const defaultImage = require("../assets/pothole.jpg");
    const imageSources = processImageUrls(issue.media_urls, defaultImage);
    const locationString = formatLocationString(issue.location);
    const formattedDate = formatDate(issue.created_at);
    const daysActive = calculateDaysActive(issue.created_at);

    // Get issue ID for share functionality
    const issueId = params.issueId 
        ? parseInt(params.issueId, 10) 
        : params.id 
        ? parseInt(params.id, 10) 
        : undefined;

    return (
        <ScrollView className="bg-gray-50">
            {/* Main Image Header */}
            <View className="bg-white shadow-sm">
                <IssueImage
                    imageSources={imageSources}
                    location={locationString}
                    timestamp={formattedDate}
                    daysActive={daysActive}
                    onShare={() => handleShare(issueId, issue.type)}
                    className="w-full"
                />
            </View>
         
            {/* Issue Details Card */}
            <View className="bg-white p-5 mt-3 mx-3 rounded-xl shadow-md" style={{ elevation: 3 }}>
                {/* Issue Type */}
                <View className="flex-row items-center mb-3">
                    <MaterialIcons name="category" size={20} color="#256D1B" />
                    <CustomText className="ml-2 text-lg font-bold capitalize">
                        {issue.type}
                    </CustomText>
                </View>

                {/* Description */}
                {issue.description && (
                    <View className="mb-3">
                        <CustomText className="text-gray-700">
                            {issue.description}
                        </CustomText>
                    </View>
                )}

                {/* User Info */}
                <View className="flex-row items-center mb-3 pb-3 border-b border-gray-200">
                    <Image
                        source={{ uri: issue.user.profile_photo }}
                        style={{ width: 32, height: 32, borderRadius: 16 }}
                    />
                    <CustomText className="ml-2 text-gray-600">
                        Reported by <CustomText className="font-bold">{issue.user.username}</CustomText>
                    </CustomText>
                </View>

                {/* Location Details */}
                <View className="mb-3">
                    <View className="flex-row items-center mb-2">
                        <MaterialIcons name="location-on" size={20} color="#256D1B" />
                        <CustomText className="ml-2 font-bold">Location</CustomText>
                    </View>
                    <CustomText className="text-gray-700 ml-7">
                        {issue.location.colloquial_name || issue.location.address}
                    </CustomText>
                    <CustomText className="text-gray-500 text-sm ml-7">
                        {issue.location.lat.toFixed(6)}, {issue.location.lng.toFixed(6)}
                    </CustomText>
                </View>

                {/* Hashtags */}
                {issue.location.locality?.hashtags && issue.location.locality.hashtags.length > 0 && (
                    <View className="flex-row flex-wrap mb-3">
                        {issue.location.locality.hashtags.map((tag, index) => (
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

        </ScrollView>
    );
};



export default IssueDetailScreen;