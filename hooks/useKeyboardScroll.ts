import { useEffect, RefObject } from "react";
import { Keyboard, ScrollView, TextInput } from "react-native";

export function useKeyboardScroll(
  scrollViewRef: RefObject<ScrollView | null>,
  inputRef: RefObject<TextInput | null>
) {
  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        if (inputRef.current) {
          inputRef.current.measure((_x, _y, _width, _height, _pageX, pageY) => {
            scrollViewRef.current?.scrollTo({
              y: pageY - 150,
              animated: true,
            });
          });
        }
      }
    );

    return () => {
      keyboardShowListener.remove();
    };
  }, [scrollViewRef, inputRef]);
}
