type AuthEventCallback = () => void;

const listeners: Set<AuthEventCallback> = new Set();

export const authEvents = {
  onSessionExpired: (callback: AuthEventCallback) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  emitSessionExpired: () => {
    listeners.forEach((callback) => callback());
  },
};
