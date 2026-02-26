import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Clock, AlertTriangle, X } from 'lucide-react';

interface ExpirationNotificationProps {
  timeRemaining: number;
  type: 'cart' | 'checkout';
  onExtendTime?: () => void;
  onDismiss?: () => void;
  isVisible: boolean;
  className?: string;
}

export const ExpirationNotification: React.FC<ExpirationNotificationProps> = ({
  timeRemaining,
  type,
  onExtendTime,
  onDismiss,
  isVisible,
  className = ''
}) => {
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const seconds = Math.floor(timeRemaining / 1000);
  const isExpired = timeRemaining <= 0;
  const isCritical = seconds <= 60; 
  const isWarning = seconds <= 180; 

  useEffect(() => {
    if (isExpired && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isExpired, onDismiss]);

  useEffect(() => {
    if (isVisible) {
      if (isCritical && timeRemaining > 0) {
        toast.error(
          `Seu ${type === 'cart' ? 'carrinho' : 'checkout'} expira em ${formatTime(timeRemaining)}!`,
          {
            duration: 5000,
            action: onExtendTime ? {
              label: 'Estender tempo',
              onClick: onExtendTime
            } : undefined
          }
        );
      } else if (isWarning && !isCritical && timeRemaining > 0) {
        toast.warning(
          `Seu ${type === 'cart' ? 'carrinho' : 'checkout'} expira em ${formatTime(timeRemaining)}`,
          {
            duration: 3000,
            action: onExtendTime ? {
              label: 'Estender tempo',
              onClick: onExtendTime
            } : undefined
          }
        );
      }
    }
  }, [isCritical, isWarning, timeRemaining, type, onExtendTime, isVisible]);

  if (!isVisible || isExpired) {
    return null;
  }

  return (
    <Alert 
      className={`border-2 ${
        isCritical 
          ? 'border-red-500 bg-red-50' 
          : isWarning 
            ? 'border-yellow-500 bg-yellow-50' 
            : 'border-blue-500 bg-blue-50'
      } ${className}`}
    >
      <div className="flex items-center gap-2">
        {isCritical ? (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        ) : (
          <Clock className="h-4 w-4 text-blue-600" />
        )}
        
        <AlertDescription className={`flex-1 font-medium ${
          isCritical 
            ? 'text-red-800' 
            : isWarning 
              ? 'text-yellow-800' 
              : 'text-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <span>
              {type === 'cart' ? 'Carrinho' : 'Checkout'} expira em: 
              <span className="font-mono ml-1 font-bold">
                {formatTime(timeRemaining)}
              </span>
            </span>
            
            <div className="flex items-center gap-2">
              {onExtendTime && (
                <Button
                  size="sm"
                  variant={isCritical ? "destructive" : "default"}
                  onClick={onExtendTime}
                  className="h-6 px-2 text-xs"
                >
                  Renovar
                </Button>
              )}
              
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </div>
    </Alert>
  );
};
