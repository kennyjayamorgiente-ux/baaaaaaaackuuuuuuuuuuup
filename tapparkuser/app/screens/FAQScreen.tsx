import React, { useState } from 'react';
import {
  View, 
  Text, 
  ScrollView,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import SharedHeader from '../../components/SharedHeader';
import { useThemeColors, useTheme } from '../../contexts/ThemeContext';
import { useLoading } from '../../contexts/LoadingContext';
import { SvgXml } from 'react-native-svg';
import { 
  tapParkLogoSvg,
  maroonSimpleArrowDownSvg,
  darkTapParkLogoSvg,
  darkSimpleArrowDownSvg
} from '../assets/icons/index2';
import { getFaqScreenStyles } from '../styles/faqScreenStyles';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive calculations
// Enhanced responsive calculations
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const isLargeScreen = screenWidth >= 414 && screenWidth < 768;
const isTablet = screenWidth >= 768 && screenWidth < 1024;
const isLargeTablet = screenWidth >= 1024;

const getResponsiveFontSize = (baseSize: number) => {
  if (isSmallScreen) return baseSize * 0.85;
  if (isMediumScreen) return baseSize * 0.95;
  if (isLargeScreen) return baseSize;
  if (isTablet) return baseSize * 1.1;
  if (isLargeTablet) return baseSize * 1.2;
  return baseSize;
};

const getResponsiveSize = (baseSize: number) => {
  if (isSmallScreen) return baseSize * 0.8;
  if (isMediumScreen) return baseSize * 0.9;
  if (isLargeScreen) return baseSize;
  if (isTablet) return baseSize * 1.05;
  if (isLargeTablet) return baseSize * 1.1;
  return baseSize;
};

const getResponsivePadding = (basePadding: number) => {
  if (isSmallScreen) return basePadding * 0.8;
  if (isMediumScreen) return basePadding * 0.9;
  if (isLargeScreen) return basePadding;
  if (isTablet) return basePadding * 1.1;
  if (isLargeTablet) return basePadding * 1.2;
  return basePadding;
};

const getResponsiveMargin = (baseMargin: number) => {
  if (isSmallScreen) return baseMargin * 0.8;
  if (isMediumScreen) return baseMargin * 0.9;
  if (isLargeScreen) return baseMargin;
  if (isTablet) return baseMargin * 1.1;
  if (isLargeTablet) return baseMargin * 1.2;
  return baseMargin;
};

const FAQScreen = () => {
  const router = useRouter();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const { showLoading, hideLoading } = useLoading();
  const faqScreenStyles = getFaqScreenStyles(colors);
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const faqData = [
    {
      question: "What is TapPark?",
      answer: "TapPark is a smart parking management system that helps you find, reserve, and pay for parking spots in real-time. It uses advanced technology to optimize parking availability and reduce traffic congestion."
    },
    {
      question: "How does TapPark Work?",
      answer: "TapPark uses sensors, mobile apps, and cloud technology to monitor parking spaces. Users can view available spots, make reservations, and pay through the app. The system provides real-time updates on parking availability."
    },
    {
      question: "What are the benefits of using TapPark?",
      answer: "Benefits include reduced time searching for parking, guaranteed parking spots, contactless payments, real-time availability updates, reduced traffic congestion, and better parking space utilization."
    },
    {
      question: "Can I reserve parking spot in advance?",
      answer: "Yes! TapPark allows you to reserve parking spots in advance. You can book a spot up to 24 hours ahead of time, ensuring you have a guaranteed parking space when you arrive."
    },
    {
      question: "How does TapPark help with traffic?",
      answer: "By reducing the time drivers spend searching for parking, TapPark helps decrease traffic congestion. Real-time availability information and advance reservations minimize circling and waiting, leading to smoother traffic flow."
    },
    {
      question: "What kind of technology does TapPark use?",
      answer: "TapPark uses IoT sensors, mobile applications, cloud computing, real-time data processing, GPS tracking, and secure payment systems to provide a comprehensive parking management solution."
    },
    {
      question: "How will I know if a parking spot is available?",
      answer: "The TapPark app shows real-time availability of parking spots. You'll see green indicators for available spots, red for occupied, and yellow for reserved spots. The system updates every few seconds."
    },
    {
      question: "How do I book a parking spot using TapPark?",
      answer: "Simply open the TapPark app, select your desired location, view available spots on the map, tap on an available spot, confirm your reservation, and pay through the app. You'll receive a confirmation with parking details."
    }
  ];

  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(item => item !== index)
        : [...prev, index]
    );
  };

  return (
    <View style={faqScreenStyles.container}>
      <SharedHeader 
        title="FAQs" 
        showBackButton={true}
        onBackPress={() => {
          showLoading();
          router.back();
          setTimeout(() => hideLoading(), 500);
        }}
      />
      
      <View style={faqScreenStyles.scrollContainer}>
        {/* Background Section */}
        <View style={faqScreenStyles.backgroundSection} />
        
        {/* Profile Content Card */}
        <View style={faqScreenStyles.profileCard}>
          {/* Profile Picture Section */}
          <View style={faqScreenStyles.profilePictureSection}>
            <View style={faqScreenStyles.profilePictureContainer}>
              <SvgXml 
                xml={isDarkMode ? darkTapParkLogoSvg : tapParkLogoSvg}
                width={getResponsiveSize(120)}
                height={getResponsiveSize(120)}
              />
            </View>
            <View style={faqScreenStyles.userInfoContainer}>
              <Text style={faqScreenStyles.userName}>FREQUENTLY ASKED</Text>
              <Text style={faqScreenStyles.userEmail}>QUESTIONS</Text>
            </View>
          </View>

          {/* FAQ Content */}
          <ScrollView 
            style={faqScreenStyles.faqScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={faqScreenStyles.faqContent}
          >
            {faqData.map((faq, index) => (
              <TouchableOpacity
                key={index}
                style={faqScreenStyles.faqItem}
                onPress={() => toggleExpanded(index)}
                activeOpacity={0.7}
              >
                <View style={faqScreenStyles.faqQuestionContainer}>
                  <Text style={faqScreenStyles.faqQuestion}>{faq.question}</Text>
                  <SvgXml 
                    xml={isDarkMode ? darkSimpleArrowDownSvg : maroonSimpleArrowDownSvg}
                    width={getResponsiveSize(16)}
                    height={getResponsiveSize(16)}
                    style={[
                      faqScreenStyles.chevronIcon,
                      { transform: [{ rotate: expandedItems.includes(index) ? '180deg' : '0deg' }] }
                    ]}
                  />
                </View>
                
                {expandedItems.includes(index) && (
                  <View style={faqScreenStyles.faqAnswerContainer}>
                    <Text style={faqScreenStyles.faqAnswer}>{faq.answer}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

// Styles are now in faqScreenStyles.ts

export default FAQScreen;
