
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
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, View } from 'react-native';

  
const IssueDetailScreen = () => {
    const params = useLocalSearchParams<{ id?: string }>();
    const navigation = useNavigation();
    const [issueData, setIssueData] = useState<APIResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadIssue = async () => {
            try {
                setLoading(true);
                setError(null);
                // Get issue ID from route params, default to 1 if not provided
                const issueId = params.id ? parseInt(params.id, 10) : 1;
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
    }, [params.id]);

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

    return (
        <ScrollView className="px-2" >
            {/* Main Image Header */}
            <IssueImage
                imageSources={imageSources}
                location={locationString}
                timestamp={formattedDate}
                daysActive={daysActive}
                onShare={handleShare}
                className="self-center mt-4 h-64"
            />

            {/* Stats Bar */}
            <View className="flex-row justify-between items-center py-2 ">
                <CustomText className="h3 ">
                    Rank <CustomText className="font-bold h2">#{issue.rank}</CustomText>
                </CustomText>
                <View className="flex-row items-center">
                    <View className="items-end">
                        <CustomText className="h2 font-bold">{issue.vote_count} <CustomText className=" h3">upvotes</CustomText></CustomText>
                       
                    </View>
                    <MaterialIcons name="star" size={40} color="#FFB800" />
                </View>
            </View>


            <View className="flex-row justify-between">
            
                   
                    {/* Verified */}
                    <CustomText className=" p text-gray-700">
                        Verified by{" "}
                        <CustomText className="font-bold text-black h2">{issue.verify_count}</CustomText>{" "}
                        locals
                    </CustomText>
             
                 
                    <TouchableOpacity className=" bg-[#82C458] px-2 py-2 rounded-xl active:opacity-80">
                        <CustomText className="text-white">Update Issue</CustomText>
                    </TouchableOpacity>
                
            </View>
        </ScrollView>
    );
};



export default IssueDetailScreen;