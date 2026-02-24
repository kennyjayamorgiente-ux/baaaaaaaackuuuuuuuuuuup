import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Path } from 'react-native-svg';
import { useThemeColors } from '../contexts/ThemeContext';

type GaugeConfig = {
  [key: string]: unknown;
  circleColor?: string;
  waveColor?: string;
  circleThickness?: number;
  waveAnimateTime?: number;
};

type LiquidGaugeProps = {
  value?: number;
  width?: number;
  height?: number;
  config?: GaugeConfig;
};

const clamp = (num: number, min: number, max: number) => Math.min(max, Math.max(min, num));

const LiquidGauge: React.FC<LiquidGaugeProps> = ({
  value = 50,
  width = 150,
  height = 150,
  config,
}) => {
  const colors = useThemeColors();
  const circleColor = config?.circleColor ?? colors.border;
  const waveColor = config?.waveColor ?? colors.primary;
  const circleThickness = config?.circleThickness ?? 0.09;
  const waveAnimateTime = config?.waveAnimateTime ?? 1500;

  const radius = Math.min(width, height) / 2;
  const strokeWidth = Math.max(2, radius * circleThickness);
  const innerRadius = radius - strokeWidth * 1.2;
  const centerX = width / 2;
  const centerY = height / 2;
  const fillPercent = clamp(value, 0, 100) / 100;
  const amplitude = innerRadius * 0.08;
  const frequency = (Math.PI * 2) / (innerRadius * 1.6);
  const clipId = useMemo(() => `liquid-clip-${Math.random().toString(36).slice(2)}`, []);

  const [phase, setPhase] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    const speed = (Math.PI * 2) / Math.max(700, waveAnimateTime);

    const loop = (ts: number) => {
      if (!lastTsRef.current) {
        lastTsRef.current = ts;
      }
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;

      setPhase(prev => prev + dt * speed);
      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [waveAnimateTime]);

  const pathD = useMemo(() => {
    const left = centerX - innerRadius;
    const right = centerX + innerRadius;
    const bottom = centerY + innerRadius;
    const waterY = centerY + innerRadius - fillPercent * innerRadius * 2;
    const step = 4;

    let d = `M ${left} ${bottom} L ${left} ${waterY} `;
    for (let x = left; x <= right; x += step) {
      const y = waterY + amplitude * Math.sin((x - left) * frequency + phase);
      d += `L ${x} ${y} `;
    }
    d += `L ${right} ${bottom} Z`;
    return d;
  }, [amplitude, centerX, centerY, fillPercent, frequency, innerRadius, phase]);

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <ClipPath id={clipId}>
            <Circle cx={centerX} cy={centerY} r={innerRadius} />
          </ClipPath>
        </Defs>

        <Circle
          cx={centerX}
          cy={centerY}
          r={radius - strokeWidth * 0.5}
          fill="transparent"
          stroke={circleColor}
          strokeWidth={strokeWidth}
        />

        <Path d={pathD} fill={waveColor} clipPath={`url(#${clipId})`} />
      </Svg>
    </View>
  );
};

export { LiquidGauge };
