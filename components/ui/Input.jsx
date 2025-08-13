import React, { useState } from "react";
import {
  VStack,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  Input as GluestackInput,
  InputField,
  InputSlot,
  InputIcon,
  FormControlError,
  FormControlErrorText,
  Button,
} from "@gluestack-ui/themed";
import { Eye, EyeOff } from "lucide-react-native";

const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  error,
  style,
  multiline = false,
  numberOfLines,
  size = "md",
  variant = "outline",
  isInvalid = false,
  isDisabled = false,
  ...props
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <VStack space="xs" style={style}>
      <FormControl 
        isInvalid={isInvalid || !!error} 
        isDisabled={isDisabled}
      >
        {label && (
          <FormControlLabel mb="$1">
            <FormControlLabelText>{label}</FormControlLabelText>
          </FormControlLabel>
        )}
        
        <GluestackInput variant={variant} size={size}>
          <InputField
            placeholder={placeholder}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            multiline={multiline}
            numberOfLines={numberOfLines}
            autoCorrect={false}
            spellCheck={false}
            {...props}
          />
          {secureTextEntry && (
            <InputSlot pr="$3" onPress={togglePasswordVisibility}>
              <InputIcon as={isPasswordVisible ? EyeOff : Eye} />
            </InputSlot>
          )}
        </GluestackInput>
        
        {(error || isInvalid) && (
          <FormControlError>
            <FormControlErrorText>
              {error}
            </FormControlErrorText>
          </FormControlError>
        )}
      </FormControl>
    </VStack>
  );
};


export default Input;
