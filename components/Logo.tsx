import { StyleSheet } from 'react-native';
import { PlatformImage } from './PlatformImage';

export function Logo({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const styles = StyleSheet.create({
    logo: {
      width: size === 'small' ? 100 : size === 'large' ? 200 : 150,
      height: size === 'small' ? 100 : size === 'large' ? 200 : 150,
    },
  });

  return (
    <PlatformImage
      source={{ uri: 'https://res.cloudinary.com/dm89xtogy/image/upload/v1744128786/LOGO_YOURBOATMANAGER_p8a3jv.jpg' }}
      style={styles.logo}
      alt="Logo"
      resizeMode="contain"
    />
  );
}