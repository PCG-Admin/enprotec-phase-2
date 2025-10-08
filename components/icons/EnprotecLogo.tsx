import React from 'react';
import { IconProps } from './IconProps';

const EnprotecLogo: React.FC<IconProps> = ({ className = 'h-8' }) => (
  <img
    src="https://ndjaufwwbtekysvrmhwm.supabase.co/storage/v1/object/public/pcg-images/BR002-White%20w%20slogan%20Landscape-2500px-Rev03%20(1).png"
    alt="Enprotec Logo"
    className={className}
  />
);

export default EnprotecLogo;