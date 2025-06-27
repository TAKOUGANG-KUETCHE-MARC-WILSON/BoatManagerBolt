import React from 'react';
import { Platform, View, Text, TextInput, TouchableOpacity } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Calendar, Clock } from 'lucide-react-native';

const ReminderDateTimePicker = ({
  date,
  setDate,
  time,
  setTime,
  isDatePickerVisible,
  setDatePickerVisible,
  isTimePickerVisible,
  setTimePickerVisible
}) => {
  return (
    <View style={{ gap: 20 }}>
      {/* DATE */}
      <View>
        <Text style={{ marginBottom: 5, fontWeight: 'bold' }}>Date du rappel</Text>
        {Platform.OS === 'web' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef5ff', padding: 10, borderRadius: 10 }}>
            <Calendar size={20} color="#0066cc" />
            <TextInput
              type="date"
              style={{ marginLeft: 10, flex: 1 }}
              value={date}
              onChange={(e) => setDate(e.nativeEvent.text)}
            />
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef5ff', padding: 10, borderRadius: 10 }}
              onPress={() => setDatePickerVisible(true)}
            >
              <Calendar size={20} color="#0066cc" />
              <Text style={{ marginLeft: 10, color: '#0066cc' }}>
                {date || 'Sélectionner une date'}
              </Text>
            </TouchableOpacity>

            <DateTimePickerModal
              isVisible={isDatePickerVisible}
              mode="date"
              onConfirm={(selectedDate) => {
                setDate(selectedDate.toISOString().split('T')[0]);
                setDatePickerVisible(false);
              }}
              onCancel={() => setDatePickerVisible(false)}
            />
          </>
        )}
      </View>

      {/* HEURE */}
      <View>
        <Text style={{ marginBottom: 5, fontWeight: 'bold' }}>Heure du rappel</Text>
        {Platform.OS === 'web' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef5ff', padding: 10, borderRadius: 10 }}>
            <Clock size={20} color="#0066cc" />
            <TextInput
              type="time"
              style={{ marginLeft: 10, flex: 1 }}
              value={time}
              onChange={(e) => setTime(e.nativeEvent.text)}
            />
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef5ff', padding: 10, borderRadius: 10 }}
              onPress={() => setTimePickerVisible(true)}
            >
              <Clock size={20} color="#0066cc" />
              <Text style={{ marginLeft: 10, color: '#0066cc' }}>
                {time || 'Sélectionner une heure'}
              </Text>
            </TouchableOpacity>

            <DateTimePickerModal
              isVisible={isTimePickerVisible}
              mode="time"
              onConfirm={(selectedTime) => {
                const hour = selectedTime.getHours().toString().padStart(2, '0');
                const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                setTime(`${hour}:${minutes}`);
                setTimePickerVisible(false);
              }}
              onCancel={() => setTimePickerVisible(false)}
            />
          </>
        )}
      </View>
    </View>
  );
};

export default ReminderDateTimePicker;
