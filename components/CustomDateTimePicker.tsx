import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Props {
  isVisible: boolean;
  mode: 'date' | 'time';
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

const CustomDateTimePicker: React.FC<Props> = ({
  isVisible,
  mode,
  value,
  onConfirm,
  onCancel,
}) => {
  const [tempDate, setTempDate] = useState(value);

  useEffect(() => {
    setTempDate(value); // reset if props change
  }, [value]);

  const handleConfirm = () => {
    onConfirm(tempDate);
  };

  if (!isVisible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={isVisible}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <DateTimePicker
            value={tempDate}
            mode={mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              if (Platform.OS === 'android') {
                if (event.type === 'dismissed') {
                  onCancel();
                } else {
                  onConfirm(selectedDate || value);
                }
              } else {
                if (selectedDate) setTempDate(selectedDate);
              }
            }}
            themeVariant="dark"
            style={Platform.OS === 'ios' ? { backgroundColor: '#0066CC' } : undefined}
          />

          {Platform.OS === 'ios' && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity onPress={onCancel} style={styles.button}>
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={styles.button}>
                <Text style={[styles.buttonText, { fontWeight: 'bold' }]}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default CustomDateTimePicker;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Platform.OS === 'ios' ? '#0066CC' : '#fff',
    paddingTop: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
  },
  button: {
    padding: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
