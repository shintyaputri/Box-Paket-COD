import React from "react";
import { 
  Button as GluestackButton, 
  ButtonText 
} from "@gluestack-ui/themed";

const Button = ({
  title,
  onPress,
  variant = "solid",
  disabled = false,
  size = "md",
  action = "primary",
  style,
  textStyle,
  ...props
}) => {
  return (
    <GluestackButton
      variant={variant}
      size={size}
      action={action}
      isDisabled={disabled}
      onPress={onPress}
      style={style}
      {...props}
    >
      <ButtonText style={textStyle}>
        {title}
      </ButtonText>
    </GluestackButton>
  );
};


export default Button;
