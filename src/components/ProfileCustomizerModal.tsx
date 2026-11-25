import { AnimatePresence } from 'motion/react';
import {
  ProfileCustomizerDialog,
  type ProfileCustomizerDialogProps,
} from './profile/ProfileCustomizerDialog';

interface ProfileCustomizerModalProps extends ProfileCustomizerDialogProps {
  open: boolean;
}

/**
 * Accessible modal wrapper mounting the profile customizer dialog when opened.
 */
export function ProfileCustomizerModal({ open, ...props }: ProfileCustomizerModalProps) {
  return (
    <AnimatePresence>
      {open && <ProfileCustomizerDialog key={props.initialProfile.city} {...props} />}
    </AnimatePresence>
  );
}
