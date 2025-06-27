import { Image, Platform, ImageStyle, StyleProp, StyleSheet } from 'react-native';

interface PlatformImageProps {
  source: { uri: string } | number;
  style?: StyleProp<ImageStyle>;
  alt?: string;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
}

export function PlatformImage({ source, style, alt = 'Image', resizeMode }: PlatformImageProps) {
  if (Platform.OS === 'web') {
    // On web, directly spread the style object without flattening
    const webStyle = {
      ...(style as Object || {}),
      objectFit: resizeMode === 'contain' ? 'contain' : 
                 resizeMode === 'cover' ? 'cover' : 
                 resizeMode === 'stretch' ? 'fill' : 
                 resizeMode === 'center' ? 'none' : 'cover'
    };

    return (
      <img 
        src={typeof source === 'number' ? source : source.uri}
        style={webStyle}
        alt={alt}
      />
    );
  }

  return <Image source={source} style={style} resizeMode={resizeMode} />;
}