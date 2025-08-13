import React, { useState } from "react";
import { TouchableWithoutFeedback, Keyboard } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  VStack,
  HStack,
  Text,
  Heading,
  Box,
  ScrollView
} from "@gluestack-ui/themed";
import Input from "../ui/Input";
import DatePicker from "../ui/DatePicker";
import Button from "../ui/Button";
import LoadingSpinner from "../ui/LoadingSpinner";
import { validateEmail, validatePassword } from "../../utils/validation";

const AuthForm = ({ type = "login", onSubmit, loading = false }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    birthdate: "",
    gender: "",
  });
  const [errors, setErrors] = useState({});

  const isRegister = type === "register";
  const isForgotPassword = type === "forgot-password";
  const isAdminEmail = formData.email.toLowerCase() === "admin@gmail.com";

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!validatePassword(formData.password)) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (isRegister && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.birthdate) {
      newErrors.birthdate = "Birth date is required";
    }

    if (!formData.gender) {
      newErrors.gender = "Gender is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
    setErrors({});
  };

  const handleSubmit = () => {
    if (isRegister && step === 1) {
      handleNext();
      return;
    }

    if (isRegister && step === 2) {
      if (!validateStep2()) return;
    } else if (!isForgotPassword) {
      if (!validateStep1()) return;
    }

    const data = { email: formData.email };

    if (!isForgotPassword) {
      data.password = formData.password;
    }

    if (isRegister) {
      data.profileData = {
        name: formData.name,
        birthdate: formData.birthdate,
        gender: formData.gender,
      };
    }

    onSubmit(data);
  };

  const getTitle = () => {
    if (isRegister) {
      if (isAdminEmail && step === 1) {
        return "Create Admin Account";
      }
      return step === 1 ? "Create Account" : "Personal Information";
    }
    switch (type) {
      case "forgot-password":
        return "Reset Password";
      default:
        return "Welcome Back";
    }
  };

  const getButtonText = () => {
    if (isRegister) {
      if (isAdminEmail && step === 1) {
        return "Create Admin Account";
      }
      return step === 1 ? "Next" : "Create Account";
    }
    switch (type) {
      case "forgot-password":
        return "Send Reset Email";
      default:
        return "Sign In";
    }
  };

  const getDateLimits = () => {
    const today = new Date();
    const maxDate = new Date();
    maxDate.setFullYear(today.getFullYear() - 3);

    const minDate = new Date();
    minDate.setFullYear(today.getFullYear() - 100);

    return { maxDate, minDate };
  };

  if (loading) {
    return <LoadingSpinner text="Please wait..." />;
  }

  const { maxDate, minDate } = getDateLimits();

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <VStack flex={1} space="lg">
        <Heading size="xl" textAlign="center">
          {getTitle()}
        </Heading>

        {isRegister && isAdminEmail && step === 1 && (
          <Box 
            bg="$primary100" 
            p="$3" 
            borderRadius="$md" 
            borderWidth={1} 
            borderColor="$primary200"
          >
            <Text color="$primary600" textAlign="center" fontWeight="$medium">
              🔐 Admin account will be created with default settings
            </Text>
          </Box>
        )}

        <ScrollView
          flex={1}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <VStack space="md">
            {(!isRegister || step === 1) && (
              <>
                <Input
                  label="Email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChangeText={(value) => updateFormData("email", value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                />

                {!isForgotPassword && (
                  <>
                    <Input
                      label="Password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChangeText={(value) => updateFormData("password", value)}
                      secureTextEntry
                      error={errors.password}
                    />

                    {isRegister && (
                      <Input
                        label="Confirm Password"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChangeText={(value) =>
                          updateFormData("confirmPassword", value)
                        }
                        secureTextEntry
                        error={errors.confirmPassword}
                      />
                    )}
                  </>
                )}
              </>
            )}

            {isRegister && step === 2 && !isAdminEmail && (
              <>
                <Input
                  label="Name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChangeText={(value) => updateFormData("name", value)}
                  autoCapitalize="words"
                  error={errors.name}
                />

                <DatePicker
                  label="Birth Date"
                  placeholder="Select birth date"
                  value={formData.birthdate}
                  onChange={(value) => updateFormData("birthdate", value)}
                  maximumDate={maxDate}
                  minimumDate={minDate}
                  error={errors.birthdate}
                />

                <VStack space="sm">
                  <Text fontSize="$sm" fontWeight="$medium" color="$textLight700">
                    Gender
                  </Text>
                  <HStack space="sm">
                    <Button
                      title="Male"
                      onPress={() => updateFormData("gender", "male")}
                      variant={formData.gender === "male" ? "solid" : "outline"}
                      flex={1}
                    />
                    <Button
                      title="Female"
                      onPress={() => updateFormData("gender", "female")}
                      variant={formData.gender === "female" ? "solid" : "outline"}
                      flex={1}
                    />
                  </HStack>
                  {errors.gender && (
                    <Text fontSize="$xs" color="$error500">
                      {errors.gender}
                    </Text>
                  )}
                </VStack>
              </>
            )}
          </VStack>
        </ScrollView>

        <VStack space="sm" pt="$4">
          {isRegister && step === 2 && !isAdminEmail && (
            <Button
              title="Back"
              onPress={handleBack}
              variant="outline"
              style={{ borderColor: "#378e40" }}
            />
          )}

          <Button
            title={getButtonText()}
            onPress={handleSubmit}
          />
        </VStack>
      </VStack>
    </TouchableWithoutFeedback>
  );
};


export default AuthForm;
