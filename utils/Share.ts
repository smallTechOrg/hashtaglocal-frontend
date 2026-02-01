import { Share } from 'react-native';
//  Opens the native share sheet to share issue information

export const handleShare = async (issueId?: number, issueType?: string) => {
    try {
        const shareUrl = issueId 
            ? `https://local.smalltech.in/issue/index?id=${issueId}`
            : `https://local.smalltech.in/`;
        const shareMessage = issueId && issueType
            ? `Check out this ${issueType} issue: ${shareUrl}`
            : `Check our website: ${shareUrl}`;

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
