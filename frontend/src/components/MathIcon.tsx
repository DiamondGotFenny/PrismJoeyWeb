import React from 'react';
import '../styles/MathIcon.css';

interface MathIconProps {
  character: string | number;
  size?: 'small' | 'medium' | 'large';
  color?:
    | 'red'
    | 'orange'
    | 'yellow'
    | 'green'
    | 'blue'
    | 'indigo'
    | 'violet'
    | 'auto'
    | 'equals-special';
}

const MathIcon: React.FC<MathIconProps> = ({
  character,
  size = 'medium',
  color = 'auto',
}) => {
  const charStr = character.toString();

  const getAutoColor = (char: string): string => {
    if (char === '+') return 'red'; // As per image 3+5
    if (char === '-') return 'red'; // Assuming minus is also red like plus
    if (char === '*' || char === '×') return 'orange';
    if (char === '/' || char === '÷') return 'violet';
    if (char === '?') return 'violet'; // As per image
    // For numbers, use their value to cycle, but specific overrides from image: 3 is green, 5 is blue
    if (char === '3') return 'green';
    if (char === '5') return 'blue';

    const colors = [
      'red',
      'orange',
      'yellow',
      'green',
      'blue',
      'indigo',
      'violet',
    ];
    const num = parseInt(char);
    if (!isNaN(num)) {
      return colors[num % colors.length];
    }
    return 'blue'; // Default
  };

  let finalColor = color === 'auto' ? getAutoColor(charStr) : color;
  if (charStr === '=') finalColor = 'equals-special'; // Force special color for equals sign

  // Special SVG for Equals Sign
  if (finalColor === 'equals-special') {
    const baseSize = size === 'large' ? 38 : size === 'medium' ? 30 : 22;
    const barHeight = baseSize * 0.22;
    const barWidth = baseSize * 0.8;
    const borderRadius = baseSize * 0.08;
    const spacing = baseSize * 0.12;
    const outlineWidth = baseSize * 0.07;

    // Colors from your image for the equals sign
    const topBarFill = '#FFD24C'; // Prism Yellow
    const bottomBarFill = '#34C759'; // Prism Green
    const topBarOutline =
      color === 'auto' || color === 'equals-special'
        ? '#D1A000'
        : colorMix(topBarFill, 'black', 0.3); // Darker yellow
    const bottomBarOutline =
      color === 'auto' || color === 'equals-special'
        ? '#288E4C'
        : colorMix(bottomBarFill, 'black', 0.3); // Darker green

    // Helper for mixing color (simplified)
    function colorMix(color1: string, color2: string, weight: number): string {
      // This is a placeholder. A real color mixing function would be more complex.
      // For simplicity, just return a darkened version of color1 if color2 is black.
      if (color2 === 'black') {
        const r = parseInt(color1.slice(1, 3), 16);
        const g = parseInt(color1.slice(3, 5), 16);
        const b = parseInt(color1.slice(5, 7), 16);
        const factor = 1 - weight;
        return `#${Math.round(r * factor)
          .toString(16)
          .padStart(2, '0')}${Math.round(g * factor)
          .toString(16)
          .padStart(2, '0')}${Math.round(b * factor)
          .toString(16)
          .padStart(2, '0')}`;
      }
      return color1; // Fallback
    }

    return (
      <svg
        className={`math-icon math-icon--${size} math-icon--equals-special`}
        viewBox={`0 0 ${barWidth + 2 * outlineWidth} ${2 * barHeight + spacing + 2 * outlineWidth}`}
        width={`${baseSize}px`}
        height={`${baseSize * 0.8}px`} // Adjust aspect ratio for equals
        aria-label="Equals sign"
      >
        <g transform={`translate(${outlineWidth}, ${outlineWidth})`}>
          {/* Top Bar */}
          <rect
            x="0"
            y="0"
            width={barWidth}
            height={barHeight}
            rx={borderRadius}
            ry={borderRadius}
            fill={topBarFill}
            stroke={topBarOutline}
            strokeWidth={outlineWidth}
          />
          {/* Bottom Bar */}
          <rect
            x="0"
            y={barHeight + spacing}
            width={barWidth}
            height={barHeight}
            rx={borderRadius}
            ry={borderRadius}
            fill={bottomBarFill}
            stroke={bottomBarOutline}
            strokeWidth={outlineWidth}
          />
        </g>
      </svg>
    );
  }

  // Default rendering for other characters
  return (
    <span
      className={`math-icon math-icon--${size} math-icon--${finalColor}`}
      role="img"
      aria-label={`Math character ${character}`}
    >
      {character}
    </span>
  );
};

export default MathIcon;
