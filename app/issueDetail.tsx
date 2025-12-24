
import { MaterialIcons } from "@expo/vector-icons";
import React from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';
import CustomText from "@/components/CustomText";
import IssueImage from "@/components/IssueImage";
import { Linking } from "react-native";

const IssueDetailScreen = () => {
    return (
        <ScrollView className="px-2" >
            {/* Main Image Header */}
            <IssueImage
                imageSource={require("../assets/plothole.jpg")}
                location="Iblur Lake Rd. Lat: 27.1751°N Long: 78.0421°E"
                timestamp="2025-12-17 15:30:44 IST"
                daysActive="17days"
                onShare={() => {
                    Linking.openURL("https://smalltech.in");
                }}
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
                    <CustomText className="mt-3 text-sm text-gray-700">
                        Verified by{" "}
                        <CustomText className="font-bold text-black text-lg">16</CustomText>{" "}
                        locals
                    </CustomText>
                </View>
                <View className="w-1/2 pl-2 items-center">
                    {/* Description */}
                    <CustomText className="text-gray-700 text-sm leading-5 text-center">
                        From the looks of it, it looks like a beautiful aesthetic crater. Like it
                        was destined to be part of this road...
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