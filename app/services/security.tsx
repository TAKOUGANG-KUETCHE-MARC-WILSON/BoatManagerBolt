import { View, StyleSheet, ScrollView, Text, TextInput } from 'react-native';
import ServiceForm from '@/components/ServiceForm';

export default function SecurityScreen() {
  const handleSubmit = (formData: any) => {
    console.log('Form submitted:', formData);
    // Handle form submission
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <ServiceForm
          title="Sécurité de mon bateau"
          description="Expression de mon besoin"
          fields={[
            {
              name: 'securityDetails',
              label: "",
              placeholder: "Instructions particulières",
              icon: () => null,
              multiline: true,
            },
          ]}
          submitLabel="Envoyer"
          onSubmit={handleSubmit}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 24,
    flex: 1,
    height: '100%'
  }
});