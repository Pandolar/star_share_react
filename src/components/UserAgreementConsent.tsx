import React from 'react';
import { Checkbox } from '@heroui/react';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';

interface UserAgreementConsentProps {
  isSelected: boolean;
  onValueChange: (selected: boolean) => void;
  className?: string;
}

export const useUserAgreementRequirement = () => {
  const { isWhiteLabel, loading, userAgreementUrl } = useWhiteLabel();
  const isVisible = !loading && !isWhiteLabel && Boolean(userAgreementUrl);
  return {
    isVisible,
    isRequired: loading || isVisible,
    userAgreementUrl,
  };
};

export const UserAgreementConsent: React.FC<UserAgreementConsentProps> = ({
  isSelected,
  onValueChange,
  className = '',
}) => {
  const { isVisible, userAgreementUrl } = useUserAgreementRequirement();
  if (!isVisible) return null;

  return (
    <div className={`flex items-start gap-2 text-xs text-default-500 ${className}`}>
      <Checkbox
        size="sm"
        isSelected={isSelected}
        onValueChange={onValueChange}
        aria-label="同意用户协议"
        classNames={{ wrapper: 'mt-0.5', label: 'hidden' }}
      />
      <span className="leading-6">
        我已阅读并同意
        <a
          href={userAgreementUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="ml-1 text-primary hover:underline"
        >
          《用户协议》
        </a>
      </span>
    </div>
  );
};
