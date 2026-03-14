import React, { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';

interface TypewriterTextProps {
  text: string;
  style: any;
  onComplete?: () => void;
  delay?: number;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ text, style, onComplete, delay = 0 }) => {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDisplayed('');
    indexRef.current = 0;

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        const next = indexRef.current + 1;
        setDisplayed(text.slice(0, next));
        indexRef.current = next;
        if (next >= text.length) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          onComplete?.();
        }
      }, 38);
    }, delay);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, delay]);

  return <Text style={style}>{displayed}</Text>;
};

export default TypewriterText;
