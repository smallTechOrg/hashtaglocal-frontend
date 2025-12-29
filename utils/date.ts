export const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    const utc = dateString.endsWith("Z") ? dateString : `${dateString}Z`;
    return new Date(utc).toISOString();
  };
  
  export const calculateDaysActive = (dateString: string): string => {
    if (!dateString) return "";
    const utc = dateString.endsWith("Z") ? dateString : `${dateString}Z`;
    const diff =
      new Date().getTime() - new Date(utc).getTime();
    return `${Math.floor(diff / 86400000)} days`;
  };
  