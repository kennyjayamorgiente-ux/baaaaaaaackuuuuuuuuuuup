import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { getHomeScreenStyles } from '../styles/homeScreenStyles';

interface StepFlowIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

const StepFlowIndicator: React.FC<StepFlowIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepLabels
}) => {
  const colors = useThemeColors();
  const styles = getHomeScreenStyles(colors);

  const renderStep = (stepIndex: number) => {
    const isActive = stepIndex === currentStep;
    const isCompleted = stepIndex < currentStep;
    
    return (
      <View key={stepIndex} style={styles.stepIndicator}>
        <View style={[
          styles.stepCircle,
          isActive && styles.stepCircleActive,
          isCompleted && styles.stepCircleCompleted
        ]}>
          <Text style={[
            {
              fontSize: 14,
              fontWeight: '600',
              color: '#FFFFFF'
            }
          ]}>
            {isCompleted ? '✓' : (stepIndex + 1).toString()}
          </Text>
        </View>
        <Text style={[
          styles.stepText,
          isActive && styles.stepTextActive,
          isCompleted && styles.stepTextCompleted
        ]}>
          {stepLabels[stepIndex] || `Step ${stepIndex + 1}`}
        </Text>
      </View>
    );
  };

  const renderDivider = (dividerIndex: number) => {
    const isCompleted = dividerIndex < currentStep;
    
    return (
      <View
        key={`divider-${dividerIndex}`}
        style={[
          styles.stepDivider,
          isCompleted && styles.stepDividerCompleted
        ]}
      />
    );
  };

  return (
    <View style={styles.stepFlowContainer}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <React.Fragment key={index}>
          {renderStep(index)}
          {index < totalSteps - 1 && renderDivider(index)}
        </React.Fragment>
      ))}
    </View>
  );
};

export default StepFlowIndicator;
