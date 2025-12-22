import IssueCard from "@/components/IssueCard";
import { MaterialIcons } from "@expo/vector-icons";
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import '../global.css';
import CustomText from "@/components/CustomText";

const IssueDetailScreen = () => {
    return (
        <ScrollView className="px-2" >
            {/* Main Image Header */}
            <IssueCard
                imageSource={require("../assets/plothole.jpg")}
                location="Iblur Lake Rd. Lat: 27.1751°N Long: 78.0421°E"
                timestamp="2025-12-17 15:30:44 IST"
                daysActive="17days"
                onShare={() => console.log('Shared!')}
                className="self-center mt-4"
            />

            {/* Stats Bar */}
            <View className="flex-row justify-between items-center py-2 ">
                <CustomText className="text-md ">Rank <CustomText className="font-bold text-lg">#25</CustomText></CustomText>
                <View className="flex-row items-center">
                    <View className="items-end mr-2">
                        <CustomText className="text-lg font-bold">120</CustomText>
                        <CustomText className=" text-md">upvotes</CustomText>
                    </View>
                    <MaterialIcons name="star" size={36} color="#FFB800" />
                </View>
            </View>

            {/* Map and Description Section */}
            <View className="flex-row py-2">
                <View className="w-1/2 pr-2">
                    <View className="h-32 w-full">
                        <Image
                            source={require("../assets/map.png")}
                            className="h-full w-full"
                        />
                    </View>
                </View>
                <View className="w-1/2 pl-2">
                    <CustomText className="text-gray-700 text-sm leading-5 text-center">
                        From the looks of it, it looks like a beautiful aesthetic crater. Like it was destined to be part of this road...
                    </CustomText>
                </View>
            </View>

            {/* Verification and Action */}
            <View className="flex-row justify-between items-center py-4">
                <CustomText>Verified by <CustomText className="font-bold text-black text-lg">16</CustomText> locals</CustomText>
                <TouchableOpacity className="bg-[#82C458] px-6 py-3 rounded-xl active:opacity-80">
                    <CustomText className="text-white">Update Issue</CustomText>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};



export default IssueDetailScreen;