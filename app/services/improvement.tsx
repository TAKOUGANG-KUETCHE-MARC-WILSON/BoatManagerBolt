import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { PenTool as Tool } from 'lucide-react-native';
import ServiceForm from '@/components/ServiceForm';

export default function ImprovementScreen() {
  const handleSubmit = (formData: any) => {
    console.log('Form submitted:', formData);
    // Handle form submission
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <ServiceForm
          title="Amélioration de votre bateau"
          fields={[
            {
              name: 'improvementType',
              label: "",
              placeholder: "Décrivez les améliorations que vous souhaitez apporter à votre bateau",
              icon: Tool,
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