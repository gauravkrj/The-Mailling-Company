import React from 'react';
import { HERO_AVATAR } from '../../utils/avatar';

interface AvatarLoaderProps {
  message?: string;
  subtext?: string;
  avatarSrc?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function AvatarLoader({
  message = 'Processing...',
  subtext = 'Please wait a moment while we finish generating content',
  avatarSrc = HERO_AVATAR,
  size = 'md',
}: AvatarLoaderProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 font-sans">
      <div className="relative">
        <img
          src={avatarSrc}
          alt="Loading animation avatar"
          className={`${sizeClasses} rounded-2xl border-2 border-black object-cover shadow-sm bg-[#FEF6EA] animate-bounce`}
          style={{ animationDuration: '1.2s' }}
        />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#054048] border border-black flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white animate-ping" />
        </div>
      </div>

      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-extrabold text-[#1A1A1A]">{message}</h4>
        {subtext && <p className="text-xs text-[#5A5A5A] font-medium leading-relaxed">{subtext}</p>}
      </div>
    </div>
  );
}
