import { useState, useEffect, useCallback } from 'react';

interface UseExpirationProps {
  expiresAt?: string | null;
  onExpired?: () => void;
  onWarning?: (minutesLeft: number) => void;
}

interface UseExpirationReturn {
  timeLeft: number; // em segundos
  isExpired: boolean;
  minutesLeft: number;
  secondsLeft: number;
  formattedTime: string;
  isWarning: boolean; // true quando restam 2 minutos ou menos
  isCritical: boolean; // true quando resta 1 minuto ou menos
}

export const useExpiration = ({
  expiresAt,
  onExpired,
  onWarning
}: UseExpirationProps): UseExpirationReturn => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [warningTriggered, setWarningTriggered] = useState<boolean>(false);

  const calculateTimeLeft = useCallback(() => {
    if (!expiresAt) return 0;
    
    const expirationTime = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    const difference = expirationTime - now;
    
    return Math.max(0, Math.floor(difference / 1000));
  }, [expiresAt]);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining <= 0 && !isExpired) {
        setIsExpired(true);
        onExpired?.();
      }
      
      // Aviso quando restam 2 minutos ou menos
      const minutesRemaining = Math.floor(remaining / 60);
      if (minutesRemaining <= 2 && minutesRemaining > 0 && !warningTriggered) {
        setWarningTriggered(true);
        onWarning?.(minutesRemaining);
      }
    };

    // Atualização inicial
    updateTimer();

    // Configurar interval para atualizar a cada segundo
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [calculateTimeLeft, isExpired, onExpired, onWarning, warningTriggered]);

  // Reset warning quando expiresAt muda
  useEffect(() => {
    setWarningTriggered(false);
    setIsExpired(false);
  }, [expiresAt]);

  const minutesLeft = Math.floor(timeLeft / 60);
  const secondsLeft = timeLeft % 60;
  
  const formattedTime = `${minutesLeft.toString().padStart(2, '0')}:${secondsLeft.toString().padStart(2, '0')}`;
  
  const isWarning = timeLeft <= 120 && timeLeft > 0; // 2 minutos
  const isCritical = timeLeft <= 60 && timeLeft > 0; // 1 minuto

  return {
    timeLeft,
    isExpired,
    minutesLeft,
    secondsLeft,
    formattedTime,
    isWarning,
    isCritical
  };
};