
import { fetchIssue } from "@/api/IssueDetail";
import CustomText from "@/components/CustomText";
import IssueImage from "@/components/IssueImage";
import { APIResponse } from "@/modals/IssueDetail";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Share, TouchableOpacity, View } from 'react-native';

// Helper function to format date
const formatDate = (dateString: string): string => {
    if (!dateString) return "";

    // Fix: If the string doesn't end with 'Z', append it to force UTC interpretation
    const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
    const date = new Date(utcString);
    console.log("Original:", dateString, "Converted:", date.toString())
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false, 
        timeZoneName: 'short',
    }).replace(/,/g, ''); 
};


// Helper function to calculate days active
const calculateDaysActive = (dateString: string): string => {
    if (!dateString) return "";
  
    const utcString = dateString.endsWith("Z")
      ? dateString
      : `${dateString}Z`;
  
    const date = new Date(utcString);
    if (isNaN(date.getTime())) return "";
  
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
    return `${diffDays} days`;
  };

  
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
    
    // Get all image URLs from media
    const imageUrls = issue.media_urls && issue.media_urls.length > 0
        ?  issue.media_urls.map(media => media.url)
            .filter(url => url && url.trim() !== '')
            .map(url => {
              // If URL is relative, make it absolute (assuming it's from the backend)
              if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
              }
              // If relative URL, you might need to prepend API base URL
              // For now, return as-is and let the backend provide full URLs
              return url;
            })
        : [];
    
    console.log('[IssueDetail] Image URLs:', imageUrls);
    console.log('[IssueDetail] Media URLs count:', issue.media_urls?.length || 0);
    
    // Fallback to default image if no images available
    const defaultImage = require("../assets/plothole.jpg");
    const imageSources = imageUrls.length > 0 ? imageUrls : [defaultImage];
    
    // Format location string with correct field names
    const locationString = issue.location 
        ? `${issue.location.address || ''}${issue.location.colloquialName ? `, ${issue.location.colloquialName}` : ''} Lat: ${issue.location.lat || 'N/A'}°N Long: ${issue.location.lng || 'N/A'}°E`.trim()
        : undefined;
    
        const formattedDate = formatDate(issue.created_at);
        const daysActive = calculateDaysActive(issue.created_at);

    // Share function to open native share sheet
    const handleShare = async () => {
        try {
            const shareUrl = `https://smalltech.in`;
            const shareMessage = `Check our website: ${shareUrl}`;
            
            const result = await Share.share({
                message: shareMessage,
                url: shareUrl, 
                title: 'Share Issue', 
            });

            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    console.log('Shared with:', result.activityType);
                } else {
                    console.log('Shared successfully');
                }
            } else if (result.action === Share.dismissedAction) {
                console.log('Share dismissed');
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

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
                    <View className="items-end mr-2">
                        <CustomText className="h2 font-bold">{issue.vote_count}</CustomText>
                        <CustomText className=" h3">upvotes</CustomText>
                    </View>
                    <MaterialIcons name="star" size={36} color="#FFB800" />
                </View>
            </View>

            {/* Map + Description */}
            <View className="flex-row py-4">
                <View className="w-1/2 pr-2 items-center">
                    {/* Map */}
                    <View className="h-32 w-full">
                        <Image
                            source={require("../assets/map.png")}
                            className="h-full w-full rounded-lg"
                        />
                    </View>
                    {/* Verified */}
                    <CustomText className="mt-3 p text-gray-700">
                        Verified by{" "}
                        <CustomText className="font-bold text-black h2">{issue.verify_count}</CustomText>{" "}
                        locals
                    </CustomText>
                </View>
                <View className="w-1/2 pl-2 items-center">
                    {/* Description */}
                    <CustomText className="text-gray-700 p leading-5 text-center">
                        {issue.description}
                    </CustomText>
                    <TouchableOpacity className="mt-4 bg-[#82C458] px-2 py-2 rounded-xl active:opacity-80">
                        <CustomText className="text-white">Update Issue</CustomText>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};



export default IssueDetailScreen;