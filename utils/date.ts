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
  
export const calculateDaysActive = (dateString: string): string => {
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
  