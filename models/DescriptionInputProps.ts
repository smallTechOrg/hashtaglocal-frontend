import { RefObject } from "react";
import { TextInput } from "react-native";

export interface DescriptionInputProps {
  description: string;
  onChangeText: (text: string) => void;
  inputRef: RefObject<TextInput | null>;
}
