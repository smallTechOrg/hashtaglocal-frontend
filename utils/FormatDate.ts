export const formatDate = (dateString: string): string => {
    if (!dateString) return "";

    // Fix: If the string doesn't end with 'Z', append it to force UTC interpretation
    const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
    const date = new Date(utcString);
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
  
export const formatEventDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const utc = dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`;
    const date = new Date(utc);
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

export const formatEventTime = (dateStr: string): string => {
    if (!dateStr) return "";
    const utc = dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`;
    const date = new Date(utc);
    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
    });
};

export const calculateDaysActive = (dateString: string): string => {
    if (!dateString) return "";

    const utcString = dateString.endsWith("Z")
        ? dateString
        : `${dateString}Z`;

    const date = new Date(utcString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
};
  